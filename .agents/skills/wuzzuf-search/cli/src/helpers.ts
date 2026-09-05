// Data source: Wuzzuf's public "browsing pages" (/a/<Category>-Jobs-in-<location>)
// and public job pages (/jobs/p/<id>-<slug>). No authentication required.
//
// ROBOTS COMPLIANCE (see ../../url-reference.md for the full analysis):
// wuzzuf.net/robots.txt disallows the keyword-search endpoint for every user
// agent ("Disallow: /*?q=", commented "Block search queries") along with the
// facet params (?filters, ?l=, ?t=, ?o=, ?a=). This CLI therefore NEVER touches
// /search/jobs. It reads only the /a/ browsing pages and /jobs/p/ detail pages,
// which match no Disallow rule, and paginates with ?start= which is likewise
// unrestricted. Keyword matching happens client-side, on data already fetched.
// robots.txt also declares "Crawl-delay: 10", which CRAWL_DELAY_MS honors.

export const BASE = "https://wuzzuf.net"

/** robots.txt declares `Crawl-delay: 10`. Requests are spaced by at least this. */
export const CRAWL_DELAY_MS = 10_000

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

/**
 * Slugify a search term the way Wuzzuf's own browsing-page URLs do:
 * each word title-cased, joined with hyphens ("AI Engineer" -> "Ai-Engineer").
 * Returns "" when nothing usable is left.
 */
export function slugifyTerm(term: string): string {
  return term
    .trim()
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("-")
}

/**
 * Build a browsing-page URL: `/a/<Term>-Jobs-in-<location>`, or the catch-all
 * `/a/Jobs-in-<location>` when no term is given.
 *
 * These are Wuzzuf's public SEO landing pages - listed in its own sitemap.xml
 * and matching no robots.txt Disallow rule. They accept an arbitrary term, so
 * they give real server-side keyword narrowing ("Ai-Engineer-Jobs-in-cairo"
 * returns AI Engineer roles) WITHOUT touching the disallowed `/*?q=` search
 * endpoint.
 *
 * Pagination is `?start=<pageIndex>`, a 0-based *page* number rather than a row
 * offset - verified against the page's own rel="next" link. `start` is not
 * matched by any Disallow rule, unlike the `?filters[...]` facet parameters,
 * which this CLI therefore never sends.
 */
export function buildBrowseUrl(
  location: string,
  term: string | undefined,
  page: number,
): string {
  const loc = location.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const slug = term ? slugifyTerm(term) : ""
  const path = `/a/${slug ? slug + "-" : ""}Jobs-in-${encodeURIComponent(loc)}`
  const start = Math.max(0, page - 1)
  return start === 0 ? `${BASE}${path}` : `${BASE}${path}?start=${start}`
}

export function buildDetailUrl(idOrSlug: string): string {
  return `${BASE}/jobs/p/${idOrSlug}`
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Fetch HTML with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function htmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 1000
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await sleep(delay + jitter)
      delay = Math.min(delay * 2, 16000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  postedAtRaw: string | null
  careerLevel: string | null
  workplaceArrangement: string | null
  jobTypes: string[]
  status: string | null
}

export interface JobDetail extends JobCard {
  description: string | null
  requirements: string | null
  experienceYears: string | null
  salary: string | null
  keywords: string[]
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Primary data source: the embedded Redux store
// ---------------------------------------------------------------------------

/**
 * Wuzzuf server-renders its whole Redux store into a bootstrap <script> as
 * `Wuzzuf.initialStoreState = {...};`. It carries every field the pages show -
 * including real `postedAt` timestamps and `status` - so it is a far more
 * stable source than the rendered DOM, whose class names are Emotion hashes
 * (`css-o171kl`) that change on every deploy.
 *
 * Scans with a brace counter that is string- and escape-aware, so braces inside
 * job descriptions cannot terminate the object early.
 */
export function extractStore(html: string): any | null {
  const marker = /Wuzzuf\.initialStoreState\s*=\s*/.exec(html)
  if (!marker) return null
  const start = marker.index + marker[0].length
  if (html[start] !== "{") return null

  let depth = 0
  let inString = false
  let escaped = false
  let i = start

  for (; i < html.length; i++) {
    const ch = html[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === "\\") escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        i++
        break
      }
    }
  }
  if (depth !== 0) return null

  try {
    return JSON.parse(html.slice(start, i))
  } catch {
    return null
  }
}

/**
 * Wuzzuf renders `postedAt` as "MM/DD/YYYY HH:MM:SS" (confirmed against a card
 * whose visible label read "3 hours ago"). Returns an ISO-8601 string, or null
 * if the shape is not what we expect - a misparsed date silently corrupts
 * --jobage filtering, so an unknown format must not be guessed at.
 */
export function parsePostedAt(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null
  const m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/)
  if (!m) return null
  const [, mm, dd, yyyy, hh = "00", mi = "00", ss = "00"] = m
  const month = Number(mm)
  const day = Number(dd)
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const iso = `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}Z`
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

function localizedName(node: any): string | null {
  if (!node || typeof node !== "object") return null
  return node.name ?? node.displayedName ?? null
}

function formatLocation(loc: any): string | null {
  if (!loc || typeof loc !== "object") return null
  // area/city/country are each optional and may be null on remote postings.
  const parts = [loc.area, loc.city, loc.country]
    .map((p: any) => (p && typeof p === "object" ? p.name : null))
    .filter((p: any): p is string => typeof p === "string" && p.length > 0)
  return parts.length ? parts.join(", ") : null
}

function formatSalary(salary: any): string | null {
  if (!salary || typeof salary !== "object") return null
  const { min, max, currency, period } = salary
  const code = currency && typeof currency === "object" ? currency.code || currency.name : null
  const per = period && typeof period === "object" ? period.name : null
  if (typeof min === "number" && typeof max === "number") {
    return `${min}-${max}${code ? " " + code : ""}${per ? " (" + per + ")" : ""}`
  }
  if (typeof salary.additionalDetails === "string" && salary.additionalDetails.trim()) {
    return salary.additionalDetails.trim()
  }
  return null
}

function companyName(store: any, job: any): string | null {
  const attrs = job?.attributes ?? {}
  // Wuzzuf hides the employer on confidential postings; the UI prints
  // "Confidential" and no company link is rendered.
  if (attrs.hideCompany) return "Confidential"
  const id = job?.relationships?.company?.data?.id
  if (id === undefined || id === null) return null
  const collection = store?.entities?.company?.collection ?? {}
  const company = collection[String(id)]
  const name = company?.attributes?.name
  return typeof name === "string" && name.trim() ? name.trim() : null
}

/** Short public id (e.g. "hzym2kelzjqn") from a uri/slug like "jobs/p/<id>-<slug>". */
export function publicIdFromSlug(slug: string | null | undefined): string | null {
  if (!slug || typeof slug !== "string") return null
  const m = slug.match(/(?:jobs\/p\/)?([a-z0-9]{6,})(?:-|$)/i)
  return m ? m[1] : null
}

function toCard(store: any, job: any): JobCard | null {
  const a = job?.attributes
  if (!a || typeof a.title !== "string") return null

  const slug: string = a.slug || a.uri || ""
  const id = publicIdFromSlug(slug) ?? (typeof job.id === "string" ? job.id : null)
  if (!id) return null

  const uri: string = a.uri ? (a.uri.startsWith("/") ? a.uri : `/${a.uri}`) : `/jobs/p/${slug}`

  const workTypes = Array.isArray(a.workTypes)
    ? a.workTypes.map(localizedName).filter((n: string | null): n is string => !!n)
    : []

  return {
    id,
    title: a.title.trim(),
    company: companyName(store, job),
    location: formatLocation(a.location),
    date: parsePostedAt(a.postedAt),
    url: `${BASE}${uri}`,
    postedAtRaw: typeof a.postedAt === "string" ? a.postedAt : null,
    careerLevel: localizedName(a.careerLevel),
    workplaceArrangement: localizedName(a.workplaceArrangement),
    jobTypes: workTypes,
    status: typeof a.status === "string" ? a.status : null,
  }
}

/**
 * Cards for a browsing page, in the order the site displays them.
 *
 * `browsingPage.sets[<path>].resultsOrder` is the authoritative ordering;
 * `entities.job.collection` is an unordered map that also holds "similar jobs"
 * from other pages, so ordering by it would both scramble results and leak in
 * postings that are not on this page.
 */
export function parseStoreCards(store: any): { cards: JobCard[]; total: number | null } {
  const jobs = store?.entities?.job?.collection
  if (!jobs || typeof jobs !== "object") return { cards: [], total: null }

  const sets = store?.browsingPage?.sets
  let order: string[] | null = null
  let total: number | null = null

  if (sets && typeof sets === "object") {
    for (const key of Object.keys(sets)) {
      const set = sets[key]
      if (Array.isArray(set?.resultsOrder) && set.resultsOrder.length) {
        order = set.resultsOrder
        total = typeof set.totalResultsCount === "number" ? set.totalResultsCount : null
        break
      }
    }
  }

  const ids = order ?? Object.keys(jobs)
  const cards: JobCard[] = []
  for (const id of ids) {
    const card = toCard(store, jobs[id])
    if (card) cards.push(card)
  }
  return { cards, total }
}

/** The single job a /jobs/p/ page is about, matched by its public id. */
export function parseStoreDetail(store: any, wantedId: string): JobDetail | null {
  const jobs = store?.entities?.job?.collection
  if (!jobs || typeof jobs !== "object") return null

  const want = wantedId.toLowerCase()
  for (const key of Object.keys(jobs)) {
    const job = jobs[key]
    const a = job?.attributes
    if (!a) continue
    const slug: string = a.slug || a.uri || ""
    const pub = publicIdFromSlug(slug)
    if (!pub || pub.toLowerCase() !== want) continue

    const card = toCard(store, job)
    if (!card) continue

    const years =
      a.workExperienceYears && typeof a.workExperienceYears === "object"
        ? [a.workExperienceYears.min, a.workExperienceYears.max]
            .filter((v: any) => typeof v === "number")
            .join("-") || null
        : null

    return {
      ...card,
      description: htmlToText(a.description),
      requirements: htmlToText(a.requirements),
      experienceYears: years,
      salary: formatSalary(a.salary),
      keywords: Array.isArray(a.keywords)
        ? a.keywords.map(localizedName).filter((n: string | null): n is string => !!n)
        : [],
      isActive: a.status === "active",
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
}

/**
 * Rich-text field (description/requirements) to readable plain text.
 *
 * Break rules are set per tag rather than uniformly, because Wuzzuf wraps each
 * list item's text in its own <p>: a blanket "every close tag is one newline"
 * left paragraphs single-spaced while bullets came out double-spaced. So the
 * paragraph-inside-a-list-item case collapses first, then paragraphs get a
 * blank line and list items a single one.
 */
export function htmlToText(html: string | null | undefined): string | null {
  if (!html || typeof html !== "string") return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<\/li>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/(li|ul|ol|div|h\d)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

// ---------------------------------------------------------------------------
// Fallback: parse the rendered DOM
// ---------------------------------------------------------------------------

/**
 * Inner HTML of the first <div>, tracking nesting depth so a nested close tag
 * does not end the block early (the card's meta block contains a nested <div>
 * holding the posted-date).
 */
export function extractFirstDiv(html: string): string | null {
  const open = /<div[^>]*>/i.exec(html)
  if (!open) return null
  let i = open.index + open[0].length
  let depth = 1
  while (depth > 0 && i < html.length) {
    const nextOpen = html.indexOf("<div", i)
    const nextClose = html.indexOf("</div>", i)
    if (nextClose === -1) return null
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      i = nextOpen + 4
    } else {
      depth--
      i = nextClose + 6
    }
  }
  return html.slice(open.index + open[0].length, i - 6)
}

function textOf(html: string): string {
  // Wuzzuf splits text nodes with empty comments ("Cairo, <!-- -->Egypt").
  const noComments = html.replace(/<!--[\s\S]*?-->/g, "")
  return decodeHtmlEntities(noComments.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * DOM fallback for when the bootstrap store is absent or unparseable.
 *
 * Anchors on structure (the /jobs/p/ link, the <h2> that wraps it, the meta
 * <div> that follows) rather than on Emotion class hashes. Each card is parsed
 * from its own chunk so one malformed card cannot break the rest, and so a
 * card missing a field cannot borrow the next card's value.
 */
export function parseDomCards(html: string): JobCard[] {
  const cards: JobCard[] = []
  const chunks = html.split(/(?=href="\/jobs\/p\/)/).slice(1)

  for (const raw of chunks) {
    const chunk = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    const link = /^href="(\/jobs\/p\/([a-z0-9]+)-[^"]*)"/i.exec(chunk)
    if (!link) continue
    const uri = link[1]
    const id = link[2]

    const titleMatch = /^href="[^"]*"[^>]*>([\s\S]*?)<\/a>/i.exec(chunk)
    const title = titleMatch ? textOf(titleMatch[1]) : ""
    if (!title) continue

    const afterTitle = chunk.split("</h2>")[1] ?? ""
    const meta = extractFirstDiv(afterTitle) ?? ""

    // Company renders as an <a> with no href on confidential postings, so match
    // the tag rather than the link target.
    const companyMatch = /<a[^>]*>([\s\S]*?)<\/a>/i.exec(meta)
    const company = companyMatch ? textOf(companyMatch[1]).replace(/\s*-\s*$/, "") || null : null

    const locMatch = /<span[^>]*>([\s\S]*?)<\/span>/i.exec(meta)
    const location = locMatch ? textOf(locMatch[1]) || null : null

    const dateMatch = /<div[^>]*>([\s\S]*?)<\/div>/i.exec(meta)
    const relative = dateMatch ? textOf(dateMatch[1]) || null : null

    cards.push({
      id,
      title,
      company,
      location,
      // The DOM only carries a relative label ("3 hours ago"); the store's real
      // timestamp is unavailable here, so `date` stays null rather than
      // inventing one, and the raw label is preserved instead.
      date: null,
      url: `${BASE}${uri}`,
      postedAtRaw: relative,
      careerLevel: null,
      workplaceArrangement: null,
      jobTypes: [],
      status: null,
    })
  }
  return cards
}

/** Cards from a browsing page: store first, DOM as fallback. */
export function parseSearchPage(html: string): { cards: JobCard[]; total: number | null } {
  const store = extractStore(html)
  if (store) {
    const parsed = parseStoreCards(store)
    if (parsed.cards.length) return parsed
  }
  return { cards: parseDomCards(html), total: null }
}

// ---------------------------------------------------------------------------
// Client-side filters
// ---------------------------------------------------------------------------

/**
 * Optional client-side narrowing (`--filter`), applied on top of whatever the
 * browse page returned. All whitespace-separated terms must appear (AND), each
 * in the title, company, or the card's level/type labels.
 *
 * This is deliberately NOT applied to `--query`: the browse page already
 * matched server-side and returns genuinely related roles whose titles need not
 * contain the query words (a "Machine-Learning" browse surfaces "AI Engineer"),
 * so AND-ing the query again here would throw away good results.
 */
export function matchesQuery(card: JobCard, query: string | undefined): boolean {
  if (!query || !query.trim()) return true
  const haystack = [
    card.title,
    card.company ?? "",
    card.careerLevel ?? "",
    card.workplaceArrangement ?? "",
    ...card.jobTypes,
  ]
    .join(" ")
    .toLowerCase()
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term))
}

/** Keep postings newer than `days`. Cards with no parsable date are kept. */
export function withinJobAge(card: JobCard, days: number | undefined): boolean {
  if (days === undefined) return true
  if (!card.date) return true
  const posted = Date.parse(card.date)
  if (Number.isNaN(posted)) return true
  return Date.now() - posted <= days * 86_400_000
}
