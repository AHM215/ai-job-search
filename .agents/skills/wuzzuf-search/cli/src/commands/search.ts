import {
  CRAWL_DELAY_MS,
  buildBrowseUrl,
  htmlFetch,
  matchesQuery,
  parseSearchPage,
  sleep,
  withinJobAge,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  /** Drives the browse-page slug (server-side keyword narrowing). */
  query?: string
  location: string
  /** Explicit browse term, e.g. "Computer-Software". Mutually exclusive with query. */
  category?: string
  /** Client-side AND narrowing applied to whatever the browse page returned. */
  filter?: string
  jobage?: number
  page: number
  pages: number
  limit?: number
  delayMs: number
  format: "json" | "table" | "plain"
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const rows = cards.map((c) => {
    const title = (c.title || "").slice(0, 44).padEnd(44)
    const company = (c.company || "—").slice(0, 24).padEnd(24)
    const loc = (c.location || "—").slice(0, 26).padEnd(26)
    const date = (c.date ? c.date.slice(0, 10) : c.postedAtRaw || "—").slice(0, 12)
    return `${c.id.padEnd(13)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(13) +
    " " +
    "TITLE".padEnd(44) +
    " " +
    "COMPANY".padEnd(24) +
    " " +
    "LOCATION".padEnd(26) +
    " POSTED"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    // query and category occupy the same slot in the browse path; the CLI
    // rejects passing both, so at most one is set here.
    const browseTerm = opts.category ?? opts.query
    const collected: JobCard[] = []
    const seen = new Set<string>()
    let total: number | null = null
    let pagesFetched = 0

    for (let i = 0; i < opts.pages; i++) {
      // robots.txt declares Crawl-delay: 10 - space out every request after the
      // first, including when sweeping pages for client-side matches.
      if (i > 0) await sleep(opts.delayMs)

      const url = buildBrowseUrl(opts.location, browseTerm, opts.page + i)
      const html = await htmlFetch(url)
      pagesFetched++
      if (!html) break

      const { cards, total: pageTotal } = parseSearchPage(html)
      if (total === null && pageTotal !== null) total = pageTotal
      if (cards.length === 0) break

      for (const card of cards) {
        if (seen.has(card.id)) continue
        seen.add(card.id)
        if (!matchesQuery(card, opts.filter)) continue
        if (!withinJobAge(card, opts.jobage)) continue
        collected.push(card)
      }

      if (opts.limit !== undefined && collected.length >= opts.limit) break
    }

    const results =
      opts.limit !== undefined && opts.limit >= 0 ? collected.slice(0, opts.limit) : collected

    if (opts.format === "table") {
      process.stdout.write(renderTable(results) + "\n")
    } else if (opts.format === "plain") {
      const body = results
        .map(
          (c) =>
            `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${
              c.date ? c.date.slice(0, 10) : c.postedAtRaw || "—"
            }\n  id: ${c.id}\n  ${c.url}`,
        )
        .join("\n\n")
      process.stdout.write((body || "No results.") + "\n")
    } else {
      process.stdout.write(
        JSON.stringify(
          {
            meta: {
              count: results.length,
              page: opts.page,
              pagesFetched,
              location: opts.location,
              category: opts.category ?? null,
              query: opts.query ?? null,
              filter: opts.filter ?? null,
              browsePath: buildBrowseUrl(opts.location, browseTerm, opts.page),
              totalOnPortal: total,
            },
            results,
          },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}

export { CRAWL_DELAY_MS }
