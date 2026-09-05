#!/usr/bin/env bun
// Self-contained CLI for searching jobs on Wuzzuf (wuzzuf.net), Egypt's largest
// tech/white-collar job board. No external CLI framework and zero runtime
// dependencies, so it runs anywhere `bun` is available.
//
// ⚠️ Personal use only, and robots-respecting by construction:
// wuzzuf.net/robots.txt disallows the keyword-search endpoint (`/*?q=`) and the
// facet params for every user agent, and names ClaudeBot among fully-disallowed
// crawlers. This CLI therefore never requests /search/jobs; it reads only the
// /a/ browsing pages and /jobs/p/ detail pages (neither is disallowed), spaces
// requests by the declared Crawl-delay: 10, and does keyword matching locally.
// Keep volume low. Run it on your own responsibility.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { CRAWL_DELAY_MS } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = {
    q: "query",
    l: "location",
    c: "category",
    n: "limit",
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `wuzzuf-cli — search jobs on Wuzzuf (wuzzuf.net), Egypt + Saudi Arabia

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <id|slug|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>     Search keywords, e.g. "AI Engineer". Slugified into Wuzzuf's
                         public browse page (/a/Ai-Engineer-Jobs-in-cairo), which gives
                         real server-side matching without using the portal's
                         robots-disallowed search endpoint.
  --location, -l <slug>  Location slug. Default "egypt". e.g. cairo, giza, alexandria,
                         new-cairo, maadi, nasr-city, heliopolis, sheikh-zayed.
  --category, -c <slug>  Browse an explicit Wuzzuf category instead of a keyword, e.g.
                         "IT-Software-Development", "Computer-Software", "Engineering".
                         Conflicts with --query (both set the same URL slot).
  --filter <text>        Extra CLIENT-SIDE narrowing over the fetched results: every
                         term must appear in the title, company or level (AND).
  --jobage <days>        Keep postings newer than N days (client-side, uses postedAt).
  --page <n>             1-indexed start page (20 results/page). Default 1.
  --pages <n>            Sweep N consecutive pages from --page. Default 1. Each extra
                         page costs one request spaced by the crawl delay.
  --limit, -n <n>        Cap results emitted. Stops paging early once reached.
  --delay <ms>           Delay between requests. Default ${CRAWL_DELAY_MS}. Values below
                         ${CRAWL_DELAY_MS} are raised: robots.txt declares Crawl-delay: 10.
  --format <fmt>         json (default) | table | plain.

EXAMPLES
  # AI Engineer roles in Cairo
  bun run src/cli.ts search -q "AI Engineer" -l cairo --format table

  # Machine-learning roles across Egypt, posted in the last 30 days
  bun run src/cli.ts search -q "Machine Learning" -l egypt --jobage 30 --format table

  # LLM / GenAI roles, sweeping 3 pages
  bun run src/cli.ts search -q "Generative AI" -l egypt --pages 3 --format table

  # Browse a whole category, then narrow client-side to senior roles
  bun run src/cli.ts search -c "IT-Software-Development" -l cairo --filter "senior" --limit 20 --format table

  # Full detail for one posting
  bun run src/cli.ts detail wcxjt9izxp3x --format plain

Personal use only — reads Wuzzuf's public browsing pages; keep volume low.
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set([
    "query", "location", "category", "filter", "jobage", "page", "pages", "limit", "delay", "format", "help", "h",
  ]),
  detail: new Set(["format", "help", "h"]),
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  // Reject unknown flags rather than silently discarding them: a dropped filter
  // changes what the search returns with no error. Required by the portal-skill
  // contract in .claude/commands/add-portal.md.
  const knownFlags = KNOWN_FLAGS[cmd]
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || knownFlags.has(key)) continue
      process.stderr.write(
        JSON.stringify({
          error: `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
          code: "UNKNOWN_FLAG",
        }) + "\n",
      )
      return 1
    }
  }

  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"

    // --query and --category both fill the browse-path slug slot; silently
    // preferring one would discard a filter the user asked for.
    if (typeof flags.query === "string" && typeof flags.category === "string") {
      process.stderr.write(
        JSON.stringify({
          error: "--query and --category both set the browse term; pass only one (use --filter to narrow a category further)",
          code: "CONFLICTING_TERM_FLAGS",
        }) + "\n",
      )
      return 1
    }

    // Number(), not parseInt(): parseInt truncates, so "--jobage 0.5" would
    // become 0 and silently drop the filter.
    const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
      const val = typeof raw === "string" ? Number(raw.trim()) : NaN
      if (!Number.isInteger(val) || val < 1) {
        process.stderr.write(
          JSON.stringify({
            error: `--${name} must be a whole number of at least 1, got "${raw}"`,
            code: "BAD_ARG",
          }) + "\n",
        )
        return null
      }
      return val
    }

    for (const name of ["jobage", "page", "pages", "limit"]) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }

    // --delay is allowed to be raised but never lowered past the site's
    // declared Crawl-delay; a 0 here would be a robots violation, not a speedup.
    let delayMs = CRAWL_DELAY_MS
    if (flags.delay !== undefined) {
      const raw = typeof flags.delay === "string" ? Number(flags.delay.trim()) : NaN
      if (!Number.isFinite(raw) || raw < 0) {
        process.stderr.write(
          JSON.stringify({
            error: `--delay must be a non-negative number of milliseconds, got "${flags.delay}"`,
            code: "BAD_ARG",
          }) + "\n",
        )
        return 1
      }
      delayMs = Math.max(CRAWL_DELAY_MS, raw)
    }

    const location =
      typeof flags.location === "string" && flags.location.trim() ? flags.location.trim() : "egypt"

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      location,
      category: typeof flags.category === "string" ? flags.category : undefined,
      filter: typeof flags.filter === "string" ? flags.filter : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : undefined,
      page: flags.page ? parseInt(flags.page as string, 10) : 1,
      pages: flags.pages ? parseInt(flags.pages as string, 10) : 1,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      delayMs,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(
        JSON.stringify({ error: "detail requires an <id|slug|url>", code: "NO_ID" }) + "\n",
      )
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = {
      id,
      format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"],
    }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({
        error: e instanceof Error ? e.message : String(e),
        code: "INTERNAL_ERROR",
      }) + "\n",
    )
    process.exit(1)
  })
