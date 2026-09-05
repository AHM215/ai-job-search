import {
  buildDetailUrl,
  extractStore,
  htmlFetch,
  parseStoreDetail,
  publicIdFromSlug,
  writeError,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/**
 * Accept a bare public id ("wcxjt9izxp3x"), a full slug
 * ("wcxjt9izxp3x-junior-software-engineer-..."), or a wuzzuf.net job URL.
 * A bare id is enough: /jobs/p/<id> redirects to the canonical slug URL.
 */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(/wuzzuf\.net\/jobs\/p\/([^/?#]+)/i)
  if (fromUrl) return publicIdFromSlug(fromUrl[1])
  const fromPath = trimmed.match(/^\/?jobs\/p\/([^/?#]+)/i)
  if (fromPath) return publicIdFromSlug(fromPath[1])
  if (/^[a-z0-9]{6,}(-|$)/i.test(trimmed)) return publicIdFromSlug(trimmed)
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = normalizeId(opts.id)
  if (!id) {
    writeError(`Could not parse a Wuzzuf job id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await htmlFetch(buildDetailUrl(id))
    if (!html) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const store = extractStore(html)
    if (!store) {
      writeError(
        "Could not read the job data from the page (the embedded store was missing or unparseable)",
        "PARSE_FAILED",
      )
      return 1
    }
    const job = parseStoreDetail(store, id)
    if (!job) {
      // An unknown id redirects to a listing page rather than 404ing, so a
      // missing job entity - not an HTTP status - is what proves it is gone.
      writeError("Job not found", "NOT_FOUND")
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}`,
        "",
        job.date ? `Posted: ${job.date.slice(0, 10)}` : "",
        job.careerLevel ? `Career level: ${job.careerLevel}` : "",
        job.experienceYears ? `Experience: ${job.experienceYears} yrs` : "",
        job.workplaceArrangement ? `Workplace: ${job.workplaceArrangement}` : "",
        job.jobTypes.length ? `Job type: ${job.jobTypes.join(", ")}` : "",
        job.salary ? `Salary: ${job.salary}` : "",
        job.keywords.length ? `Keywords: ${job.keywords.join(", ")}` : "",
        `Status: ${job.isActive ? "ACTIVE" : "CLOSED / EXPIRED"}`,
        "",
        "JOB DESCRIPTION",
        job.description || "(none)",
        "",
        "JOB REQUIREMENTS",
        job.requirements || "(none)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
