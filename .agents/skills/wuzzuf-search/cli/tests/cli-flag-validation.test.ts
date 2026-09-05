import { describe, expect, test } from "bun:test"
import { runCLI } from "./helpers.js"

/**
 * The portal-skill contract requires that a bogus flag or a missing required
 * argument exits 1 with a JSON error on stderr, and that stdout stays clean.
 * These run offline - validation happens before any request is made.
 */
describe("flag validation", () => {
  test("rejects an unknown long flag", async () => {
    const r = await runCLI(["search", "--nonsense", "x"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    const err = JSON.parse(r.stderr)
    expect(err.code).toBe("UNKNOWN_FLAG")
    expect(err.error).toContain("--nonsense")
  })

  test("rejects an unknown single-dash flag", async () => {
    const r = await runCLI(["search", "-z", "x"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("UNKNOWN_FLAG")
  })

  test("rejects a non-integer --jobage instead of silently dropping the filter", async () => {
    const r = await runCLI(["search", "--jobage", "0.5"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("rejects a zero --limit", async () => {
    const r = await runCLI(["search", "--limit", "0"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("rejects a non-numeric --delay", async () => {
    const r = await runCLI(["search", "--delay", "abc"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ARG")
  })

  test("rejects a negative --delay rather than accepting it", async () => {
    // "-5" is consumed as a flag token, so this surfaces as UNKNOWN_FLAG; what
    // matters is that it is refused instead of silently disabling the delay.
    const r = await runCLI(["search", "--delay", "-5"])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toBe("")
    expect(JSON.parse(r.stderr).error).toBeTruthy()
  })

  test("detail requires an id", async () => {
    const r = await runCLI(["detail"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("NO_ID")
  })

  test("detail rejects an unparseable id without making a request", async () => {
    const r = await runCLI(["detail", "!!!"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_ID")
  })

  test("rejects an unknown command", async () => {
    const r = await runCLI(["frobnicate"])
    expect(r.exitCode).toBe(1)
    expect(JSON.parse(r.stderr).code).toBe("BAD_CMD")
  })

  test("prints help and exits 0 for search --help", async () => {
    const r = await runCLI(["search", "--help"])
    expect(r.exitCode).toBe(0)
    expect(r.stdout).toContain("USAGE")
  })

  test("bare invocation prints help and exits 1", async () => {
    const r = await runCLI([])
    expect(r.exitCode).toBe(1)
    expect(r.stdout).toContain("USAGE")
  })
})
