import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.js"
import type { JobCard } from "../src/helpers.js"

interface SearchResponse {
  meta: {
    count: number
    page: number
    pagesFetched: number
    location: string
    category: string | null
    query: string | null
    filter: string | null
    browsePath: string
    totalOnPortal: number | null
  }
  results: JobCard[]
}

/**
 * Live smoke tests. These hit wuzzuf.net, so they are deliberately few and
 * single-page: robots.txt declares Crawl-delay: 10 and this suite must not
 * behave like a crawler. Each test below makes at most one request.
 */
describe("live search", () => {
  test("returns real, fully-populated results", async () => {
    const r = await runCLI([
      "search",
      "--category", "Computer-Software",
      "--location", "cairo",
      "--limit", "5",
    ])
    const body = parseJSON<SearchResponse>(r)

    expect(body.results.length).toBeGreaterThan(0)
    expect(body.meta.count).toBe(body.results.length)
    expect(body.meta.pagesFetched).toBe(1)

    for (const job of body.results) {
      expect(job.id).toBeTruthy()
      expect(job.title).toBeTruthy()
      // A title that still contains markup means the parser regressed.
      expect(job.title).not.toContain("<")
      expect(job.url).toStartWith("https://wuzzuf.net/jobs/p/")
      expect(job.company).toBeTruthy()
      expect(job.location).toBeTruthy()
      // The store gives a real timestamp; ISO or nothing, never a raw label.
      if (job.date !== null) {
        expect(job.date).toMatch(/^\d{4}-\d{2}-\d{2}T/)
      }
    }
  })

  test("--query browses the slugified page and returns matching roles", async () => {
    const r = await runCLI([
      "search",
      "--query", "AI Engineer",
      "--location", "cairo",
      "--limit", "5",
    ])
    const body = parseJSON<SearchResponse>(r)
    expect(body.meta.query).toBe("AI Engineer")
    expect(body.meta.browsePath).toBe("https://wuzzuf.net/a/Ai-Engineer-Jobs-in-cairo")
    expect(body.results.length).toBeGreaterThan(0)
    // The browse page matches server-side; every result should still be an AI role.
    for (const job of body.results) {
      expect(job.title.toLowerCase()).toContain("ai")
    }
  })

  test("--filter narrows client-side over the fetched results", async () => {
    const r = await runCLI([
      "search",
      "--category", "Computer-Software",
      "--location", "cairo",
      "--filter", "engineer",
      "--limit", "10",
    ])
    const body = parseJSON<SearchResponse>(r)
    expect(body.meta.filter).toBe("engineer")
    for (const job of body.results) {
      const haystack = [job.title, job.company, job.careerLevel].join(" ").toLowerCase()
      expect(haystack).toContain("engineer")
    }
  })

  test("rejects --query and --category together", async () => {
    const r = await runCLI(["search", "-q", "ai", "-c", "Computer-Software"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("CONFLICTING_TERM_FLAGS")
  })

  test("table format renders a header and rows", async () => {
    const r = await runCLI([
      "search",
      "--category", "Computer-Software",
      "--location", "cairo",
      "--limit", "3",
      "--format", "table",
    ])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain("TITLE")
    expect(r.stdout).toContain("COMPANY")
  })
})

describe("live detail", () => {
  test("fetches a full posting for an id taken from search", async () => {
    const s = await runCLI([
      "search",
      "--category", "Computer-Software",
      "--location", "cairo",
      "--limit", "1",
    ])
    const body = parseJSON<SearchResponse>(s)
    expect(body.results.length).toBeGreaterThan(0)
    const id = body.results[0].id

    const d = await runCLI(["detail", id, "--format", "plain"])
    expect(d.exitCode).toBe(0)
    expect(d.stdout).toContain("JOB DESCRIPTION")
    expect(d.stdout).toContain("URL: https://wuzzuf.net/jobs/p/")
    // Entities decoded and tags stripped.
    expect(d.stdout).not.toContain("&amp;")
    expect(d.stdout).not.toMatch(/<\/?(p|li|ul|div|strong)>/)
  })

  test("reports a nonexistent posting as NOT_FOUND on stderr", async () => {
    const r = await runCLI(["detail", "zzzznotarealid99"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(JSON.parse(r.stderr).code).toBe("NOT_FOUND")
  })
})
