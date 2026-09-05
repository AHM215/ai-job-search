# wuzzuf-cli

Zero-dependency CLI for searching jobs on [Wuzzuf](https://wuzzuf.net), Egypt's largest
tech and white-collar job board. Runs on `bun` alone — `bun install` pulls dev types only.

## Install

```bash
cd .agents/skills/wuzzuf-search/cli && bun install
```

The install is only needed for `bun run typecheck`; the CLI itself runs with no
dependencies.

## Usage

```bash
bun run src/cli.ts search -q "AI Engineer" -l cairo --format table
bun run src/cli.ts detail f3fqbcncr7i6 --format plain
bun run src/cli.ts --help
```

See [`../SKILL.md`](../SKILL.md) for the full flag reference and
[`../url-reference.md`](../url-reference.md) for the endpoint documentation.

## ⚠️ Personal use only

Wuzzuf's `robots.txt` disallows its keyword-search endpoint (`/*?q=`) for every user
agent, declares `Crawl-delay: 10`, and names `ClaudeBot` among fully-disallowed crawlers.

This CLI is built to stay inside those rules: it **never** requests `/search/jobs` or any
faceted `?filters[...]` URL, reading only the public `/a/` browsing pages and `/jobs/p/`
detail pages that match no `Disallow` rule; and it spaces every request by the declared
crawl delay (`--delay` can raise this, never lower it).

Keep volume low, don't use it commercially or for bulk collection, and run it on your own
responsibility. If you change the endpoints, re-read `../url-reference.md` first.

## Architecture

| File | Role |
|------|------|
| `src/cli.ts` | Arg parsing, flag validation, command dispatch, help text |
| `src/helpers.ts` | Fetch with backoff, store extraction, parsers, filters |
| `src/commands/search.ts` | Browse-page paging, filtering, output rendering |
| `src/commands/detail.ts` | Single-posting fetch and rendering |

Parsing reads the page's embedded `Wuzzuf.initialStoreState` Redux store rather than the
rendered DOM, because Wuzzuf's class names are Emotion hashes that change every deploy.
A structural DOM parser is retained as a fallback.

## Tests

```bash
bun run test        # offline unit tests + a few live smoke tests
bun run typecheck
```

`tests/parsing.test.ts` and `tests/cli-flag-validation.test.ts` are offline.
`tests/search.test.ts` makes a small number of live requests — it is deliberately
single-page so the suite never behaves like a crawler.
