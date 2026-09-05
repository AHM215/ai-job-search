---
name: wuzzuf-search
version: 1.0.0
description: >
  Make sure to use this skill whenever the user wants to search for jobs in Egypt,
  find Egyptian job listings, look for work in Cairo, Giza, Alexandria or anywhere
  in Egypt, or asks anything about the Egyptian job market — even if they don't
  mention Wuzzuf or wuzzuf.net explicitly. Also invoke it for questions about open
  positions, vacancies, hiring, salaries or employers in Egypt, and for looking up
  a specific Wuzzuf posting. Wuzzuf is Egypt's largest tech and white-collar job
  board (it also carries some Saudi listings). Postings are mostly in English with
  Arabic mixed in. Trigger phrases (English): jobs in Egypt, Cairo jobs, Egyptian
  job market, job search Egypt, vacancies in Cairo, hiring in Egypt, Wuzzuf.
  Trigger phrases (Arabic): وظائف, وظائف مصر, وظائف القاهرة, البحث عن عمل,
  فرص عمل, التقديم على وظيفة, وظائف خالية.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/wuzzuf-search/cli/src/cli.ts *)
---

# Wuzzuf Search Skill

Search live job listings from [Wuzzuf](https://wuzzuf.net), Egypt's largest tech and
white-collar job board. No authentication, no API key, and **zero runtime
dependencies** — it runs with just `bun`.

## ⚠️ Personal use only — and read this before changing any endpoint

Wuzzuf's `robots.txt` restricts automated access in three ways that shape this skill:

1. **Its keyword-search endpoint is disallowed for every user agent** —
   `Disallow: /*?q=`, commented "*Block search queries*", along with every faceted
   `?filters[...]` URL. **This CLI never requests them.** It reads only the public
   `/a/` browsing pages and `/jobs/p/` detail pages, which match no `Disallow` rule
   and are listed in Wuzzuf's own sitemap.
2. **`Crawl-delay: 10`** — honored by default between every request. `--delay` can
   raise it, and is clamped so it can never go below it.
3. **`ClaudeBot` is explicitly disallowed** (along with GPTBot, CCBot and
   Google-Extended), and the file declares `ai-train=no, use=reference` as a
   condition of access.

So: **keep volume low, don't use this commercially or for bulk collection, and don't
train on what it returns.** It is personal job-search tooling run at human scale, on
your own responsibility. Point 3 is a clear signal from the site — you should be
comfortable with that before using this.

Full analysis, with the exact rules quoted, is in [`url-reference.md`](./url-reference.md).

## When to use this skill

- Search for job openings anywhere in Egypt (Cairo, Giza, Alexandria, and district-level
  areas like New Cairo, Maadi, Nasr City, Heliopolis, Sheikh Zayed)
- Filter by recency, or narrow to a category or seniority
- Get the full description, requirements, salary and skill tags of a specific posting

## Commands

### Search job listings

```bash
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — search keywords, e.g. `"AI Engineer"`. Slugified into
  Wuzzuf's public browse page (`/a/Ai-Engineer-Jobs-in-cairo`), which gives **real
  server-side matching** without touching the disallowed search endpoint.
- `--location <slug>` / `-l <slug>` — location slug. Default `egypt`. e.g. `cairo`,
  `giza`, `alexandria`, `new-cairo`, `maadi`, `nasr-city`, `heliopolis`.
- `--category <slug>` / `-c <slug>` — browse an explicit Wuzzuf category instead of a
  keyword, e.g. `IT-Software-Development`, `Computer-Software`, `Engineering`.
  **Conflicts with `--query`** (both fill the same URL slot); passing both exits 1.
- `--filter <text>` — extra **client-side** narrowing over the fetched results; every
  term must appear in the title, company or level (AND).
- `--jobage <days>` — keep postings newer than N days (client-side, from the real
  `postedAt` timestamp).
- `--page <n>` — 1-indexed start page (20 results/page). Default 1.
- `--pages <n>` — sweep N consecutive pages from `--page`. Default 1. Each extra page is
  one more request, spaced by the crawl delay.
- `--limit <n>` / `-n <n>` — cap results emitted; stops paging early once reached.
- `--delay <ms>` — delay between requests. Default `10000`; lower values are raised.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts detail <id|slug|url> [--format json|plain]
```

`id` is the 12-character public id from `search` results (e.g. `f3fqbcncr7i6`). A full
slug or a `wuzzuf.net/jobs/p/...` URL also works. Returns the description, requirements,
career level, experience range, workplace arrangement, salary and skill tags.

## Usage examples

```bash
# AI Engineer roles in Cairo
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts search -q "AI Engineer" -l cairo --format table

# Machine-learning roles across Egypt, posted in the last 30 days
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts search -q "Machine Learning" -l egypt --jobage 30 --format table

# LLM / GenAI roles, sweeping 3 pages
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts search -q "Generative AI" -l egypt --pages 3 --format table

# Data roles in Giza
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts search -q "Data Scientist" -l giza --format table

# Browse a whole category, then narrow client-side to senior roles
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts search -c "IT-Software-Development" -l cairo --filter "senior" --limit 20 --format table

# Full details for a specific job
bun run .agents/skills/wuzzuf-search/cli/src/cli.ts detail f3fqbcncr7i6 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing ids to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the
process exits with code `1`.

## Notes

- **Data comes from the page's embedded Redux store**, not from scraping the rendered
  HTML. Wuzzuf's CSS class names are Emotion hashes (`css-o171kl`) that change on every
  deploy, so a class-based parser would break constantly. A structural DOM parser is kept
  as a fallback for if the store ever disappears.
- **`--query` is not re-checked client-side.** The browse page matches server-side and
  returns genuinely related roles whose titles need not contain your words (a
  `Machine Learning` search surfaces "AI Engineer"). Use `--filter` when you want a strict
  title match.
- **An unrecognized `--query`/`--category` term does not error.** Wuzzuf answers any slug
  with HTTP 200; a term it doesn't know returns a generic set of ~100 postings, and an
  unknown `--location` returns 0 results. Nothing in the response reliably distinguishes
  the two, so treat a round 100-result total as a probable typo. Check `meta.browsePath`
  in the JSON output to see exactly which URL was fetched.
- **"Confidential" is a real employer value**, not a parsing failure — Wuzzuf hides the
  company on some postings (`hideCompany: true`) and renders no company link.
- Dates are real ISO timestamps from the store, so `--jobage` is exact. The DOM fallback
  can only see relative labels ("3 hours ago") and reports `date: null` in that case
  rather than inventing one.
- An unknown job id redirects rather than returning 404, so `detail` reports `NOT_FOUND`
  based on the job being absent from the store.
- Salary is frequently `null` — most Egyptian postings don't publish one.
- Wuzzuf's own category tagging is loose: employers pick their own categories, so a
  category browse can surface unrelated titles. `--filter` cleans that up.
