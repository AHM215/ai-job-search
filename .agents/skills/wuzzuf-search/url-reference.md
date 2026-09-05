# Wuzzuf URL Reference

Public, unauthenticated pages used by this skill, plus the robots.txt analysis that
decided which endpoints it is allowed to touch. This is the file to update if Wuzzuf
changes its markup or its crawling rules.

Verified against live responses on **2026-09-05**.

## Access rules (read this before changing any endpoint)

`https://wuzzuf.net/robots.txt` is served through Cloudflare and carries three things
that constrain this skill:

1. **The keyword-search endpoint is disallowed for every user agent.** Under
   `User-agent: *`, commented "*Block search queries*":

   ```
   Disallow: /*?q=
   Disallow: /&filters
   Disallow: /?filters
   Disallow: /*filters
   Disallow: /*?l=     Disallow: /*&l=
   Disallow: /*?t=     Disallow: /*&t=
   Disallow: /*?o=     Disallow: /*&o=
   Disallow: /*?a=     Disallow: /*&a=
   Disallow: /*?ref=   Disallow: /*?utm_
   ```

   So `/search/jobs/?q=…` and every faceted `?filters[...]` URL are **off-limits**.
   The CLI never requests them.

2. **`Crawl-delay: 10`**, honored by `CRAWL_DELAY_MS` in `cli/src/helpers.ts`. The
   `--delay` flag can raise it but is clamped so it can never go below it.

3. **AI crawlers are named and disallowed**, `ClaudeBot` among them
   (alongside `GPTBot`, `CCBot`, `Google-Extended`, `Bytespider`, `meta-externalagent`):

   ```
   User-agent: ClaudeBot
   Disallow: /
   ```

   The file also states "*As a condition of accessing this website, you agree to abide
   by the following content signals*" and sets
   `Content-Signal: search=yes, ai-train=no, use=reference`.

**Consequence:** this skill is personal-use-only tooling, not a crawler. It reads only
paths that match no `Disallow` rule, keeps volume to a handful of requests, spaces them
by the declared crawl delay, and never trains on or redistributes the content.

## Search — browsing pages (allowed)

```
GET https://wuzzuf.net/a/<Term>-Jobs-in-<location>
GET https://wuzzuf.net/a/Jobs-in-<location>          # catch-all, no term
```

These are Wuzzuf's public SEO landing pages, listed in its own
`https://wuzzuf.net/sitemap.xml` → `sitemap-browsing-pages-1.xml` (5,246 URLs). They
match no `Disallow` rule.

`<Term>` accepts an **arbitrary keyword**, not just Wuzzuf's fixed categories, which is
what gives this skill real server-side matching without the disallowed search endpoint:

| URL | Total results |
|-----|---------------|
| `/a/Ai-Engineer-Jobs-in-cairo` | 6 (all genuinely AI Engineer roles) |
| `/a/Machine-Learning-Jobs-in-egypt` | 10 |
| `/a/Computer-Software-Jobs-in-cairo` | 1,096 |
| `/a/IT-Software-Development-Jobs-in-cairo` | 2,232 |
| `/a/Jobs-in-cairo` | all Cairo postings |

Slugs are **case-insensitive** (`It-Software-Development` returns the same 2,232 as
`IT-Software-Development`), so `slugifyTerm()` may safely title-case each word.

> **Caveat:** an unrecognized term does not error. `/a/Totally-Bogus-Category-Jobs-in-cairo`
> returns HTTP 200 with a generic set of ~100 postings, and an unknown location returns
> `totalResultsCount: 0`. Nothing in the response reliably flags "term not recognized" —
> `metaTemplateType.data.attributes.keyword` echoes the raw slug for unmatched terms, but
> it *also* does so for some real categories (`computer-and-network-security`), so it is
> not a usable validity signal. Treat a suspiciously round 100-result total as a probable
> typo, and use `--filter` when you need a guaranteed client-side narrowing.

### Pagination

```
GET https://wuzzuf.net/a/<Term>-Jobs-in-<location>?start=<n>
```

`start` is a **0-based page index, not a row offset** — confirmed from the page's own
`<link rel="next" href="…?start=1">` on page 1. 20 results per page. `?start=` matches no
`Disallow` rule (unlike `?filters`, `?a=`, `?l=`, `?t=`, `?o=`).

## Detail — job pages (allowed)

```
GET https://wuzzuf.net/jobs/p/<id>-<slug>
GET https://wuzzuf.net/jobs/p/<id>            # 302 → the canonical slug URL
```

The bare 12-character public id is enough; Wuzzuf redirects to the full slug. Nothing
under `/jobs/p/` is disallowed.

> An unknown id **does not 404** — it 302s to a listing page. So "not found" is detected
> by the absence of a matching job entity in the store, never by HTTP status.

## Response structure — the embedded store (primary parser)

Both listing and detail pages server-render the whole Redux store into a bootstrap
`<script>`:

```js
Wuzzuf.initialStoreState = { … };
```

`extractStore()` reads it with a string- and escape-aware brace counter, so braces inside
job descriptions cannot terminate the object early.

**This is the primary data source, and deliberately so:** the rendered DOM's class names
are Emotion hashes (`css-o171kl`, `css-16x61xq`) that change on every deploy, whereas the
store is a stable, typed schema that also carries fields the HTML never renders.

### Paths that matter

| Path | Contents |
|------|----------|
| `entities.job.collection[<uuid>]` | The job objects |
| `entities.company.collection[<id>]` | Employer names, resolved via the job's `relationships.company.data.id` |
| `browsingPage.sets[<path>].resultsOrder` | **Authoritative display order** (array of job uuids) |
| `browsingPage.sets[<path>].totalResultsCount` | Portal-wide total for the query |

> Order by `resultsOrder`, never by `entities.job.collection` key order: the collection is
> an unordered map that also holds "similar jobs" pulled in from other pages, so iterating
> it both scrambles the order and leaks in postings that are not on this page.

### Job attributes used

| Field | Notes |
|-------|-------|
| `title` | |
| `slug` / `uri` | Public id is the leading token of the slug (`hzym2kelzjqn-…`) |
| `postedAt` | **`MM/DD/YYYY HH:MM:SS`** — verified against a card labeled "3 hours ago" on 2026-09-05. `parsePostedAt()` returns `null` rather than guessing on any other shape, because a misparsed date silently corrupts `--jobage`. |
| `expireAt` | Same format |
| `status` | `"active"` / otherwise → `isActive` |
| `hideCompany` | `true` → the UI shows **"Confidential"** and renders no company link |
| `location` | `{ area?, city?, country? }`, each optional and each `{ name }` |
| `careerLevel` | `{ name }`, e.g. "Entry Level", "Experienced" |
| `workplaceArrangement` | `{ displayedName }`, e.g. "On-site", "Hybrid" |
| `workTypes` | Array of `{ name }`, e.g. "full_time" |
| `workExperienceYears` | `{ min, max }` |
| `salary` | `{ min, max, currency: { code }, period: { name }, additionalDetails }` — often all null |
| `keywords` | Array of `{ name }` — the posting's skill tags |
| `description`, `requirements` | HTML strings, rendered by `htmlToText()` |

The visible "Job Details" panel (Experience Needed / Career Level / Salary) is **hydrated
client-side and is empty in the served HTML** — those values exist only in the store,
which is another reason the store is the primary source.

## Response structure — the DOM (fallback only)

`parseDomCards()` runs only if the store is missing or unparseable. It anchors on
structure, never on Emotion hashes:

- Split the page on `href="/jobs/p/` so each card is parsed from its own chunk — one
  malformed card cannot break the rest, and a card missing a field cannot borrow the next
  card's value.
- Title: the `<a>` that opens the chunk, inside an `<h2>`.
- Meta block: the first `<div>` after that `</h2>`, extracted **depth-aware**
  (`extractFirstDiv`) because the posted-date sits in a nested `<div>`; a non-greedy
  `</div>` match truncates the block and loses the date.
- Company: the first `<a>` in the meta block, matched **by tag, not by href** — a
  confidential employer renders `<a … class="…">Confidential -</a>` with **no `href`**.
  Trailing `" -"` is stripped.
- Location: the first `<span>` in the meta block. Wuzzuf splits text nodes with empty
  comments (`Cairo, <!-- -->Egypt`), so comments are stripped before the text is read.
- Date: the DOM carries only a relative label ("3 hours ago"), so the fallback sets
  `date: null` and keeps the label in `postedAtRaw` rather than inventing a timestamp.

## Blocked alternatives (checked 2026-09-05)

Recorded so nobody re-investigates them. Every one of these was probed to the point of a
definite root cause.

| Portal | Status | Root cause |
|--------|--------|-----------|
| `naukrigulf.com` | **Blocked** | Akamai edge rejects the `www` host for this network. See below. |
| `bayt.com` | **Blocked** | Cloudflare WAF hard `403` ("Sorry, you have been blocked") even on robots-allowed paths with full browser headers. Not a header problem. |
| `gulftalent.com` | **Blocked** | Akamai `Access Denied` on `robots.txt` itself. |
| `laimoon.com` | **Not a job board** | Reachable with a permissive robots.txt, but the site is now "Laimoon Course Guide" — every `/jobs` path 404s. |
| `ae.indeed.com` | **Disallowed** | Reachable, but `robots.txt` has `Disallow: /jobs/AE/` — the UAE listings path this would need. |

### Naukrigulf — full diagnosis

Its `robots.txt` is *permissive* (no AI-crawler ban, no `Crawl-delay`, job paths allowed),
so policy was never the obstacle. The block is purely at the network edge, and it is not
something a client can fix:

| Probe | Result |
|-------|--------|
| TLS handshake to `www.naukrigulf.com` | Succeeds (cert `*.naukri.com`) |
| Raw HTTP/1.1 over that TLS session | Server accepts, then closes with **zero bytes** |
| `curl` over HTTP/2 | `RST_STREAM INTERNAL_ERROR` |
| Bun `fetch` — favicon (`max-age` ≈ 9 yrs, `server: nginx`) | **200** — edge-cached object |
| Bun `fetch` — `robots.txt` | 200 only on a cache hit; times out otherwise |
| Bun `fetch` — sitemap, search pages, `/spapi/` | All time out — every origin-backed path |
| All three Akamai edge IPs via `curl --resolve` | Identical failure — not a bad edge node |
| A second, unrelated network | Times out |
| **Real (non-headless) Chrome on the maintainer's own machine** | **`ERR_HTTP2_PROTOCOL_ERROR`** |

That last row rules out the fixable causes: it is not a TLS/JA3 fingerprint mismatch, not
header shaping, and not headless detection, because a genuine browser on a consumer
connection fails identically. Only long-cached static objects are served; anything
requiring an origin fetch is dropped.

The only remaining lever would be forging a browser TLS fingerprint (curl-impersonate /
JA3 spoofing) or synthesising Akamai's `_abck` bot-manager cookies. **That is deliberate
detection evasion and is out of scope for this repo** — it also breaks silently and risks
getting the user's IP banned. If the network situation changes, re-probe with Bun's
`fetch` (its BoringSSL stack got furthest) before rebuilding anything.

### Gulf coverage without a Gulf portal skill

`linkedin-search` already covers Gulf markets well and needs no new skill — verified live:

```
bun run .agents/skills/linkedin-search/cli/src/cli.ts \
  search -q "AI Engineer" -l "Dubai, United Arab Emirates" --format table
```

returned current AI Engineer roles at Meydan Free Zone, BlackStone eIT, MultiBank Group,
Dyson and others. Prefer that over building a thin skill on a marginal board.
