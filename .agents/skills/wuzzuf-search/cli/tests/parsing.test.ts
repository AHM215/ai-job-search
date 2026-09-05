import { describe, expect, test } from "bun:test"
import {
  buildBrowseUrl,
  slugifyTerm,
  extractStore,
  htmlToText,
  matchesQuery,
  parseDomCards,
  parsePostedAt,
  parseStoreCards,
  publicIdFromSlug,
  withinJobAge,
  type JobCard,
} from "../src/helpers.js"
import { normalizeId } from "../src/commands/detail.js"

// Minimal fixture mirroring the real markup: an Emotion-classed card, plus a
// "Confidential" card whose company anchor carries no href, and whose posted
// date sits in a div nested inside the meta block.
const DOM_FIXTURE = `
<h2 class="css-s5fwzh"><a rel="noreferrer" class="css-o171kl" href="/jobs/p/aaaa1111bbbb-senior-ai-engineer-acme-cairo-egypt" target="_blank">Senior AI Engineer</a></h2>
<div class="css-1k5ee52"><a href="https://wuzzuf.net/jobs/careers/acme-egypt-1" class="css-ipsyv7">Acme -</a> <span class="css-16x61xq">Maadi, <!-- -->Cairo, <!-- -->Egypt </span><div class="css-eg55jf">3 hours ago</div></div>
<h2 class="css-s5fwzh"><a rel="noreferrer" class="css-o171kl" href="/jobs/p/cccc2222dddd-chief-technology-officer-alkahr-msr" target="_blank">Chief Technology Officer</a></h2>
<div class="css-1k5ee52"><a target="_blank" rel="noreferrer" class="css-ipsyv7">Confidential -</a> <span class="css-16x61xq">Cairo, <!-- -->Egypt </span><div class="css-eg55jf">56 minutes ago</div></div>
`

function card(over: Partial<JobCard> = {}): JobCard {
  return {
    id: "x",
    title: "AI Engineer",
    company: "Acme",
    location: "Cairo, Egypt",
    date: null,
    url: "https://wuzzuf.net/jobs/p/x",
    postedAtRaw: null,
    careerLevel: null,
    workplaceArrangement: null,
    jobTypes: [],
    status: null,
    ...over,
  }
}

describe("buildBrowseUrl", () => {
  test("uses the catch-all listing when no category is given", () => {
    expect(buildBrowseUrl("cairo", undefined, 1)).toBe("https://wuzzuf.net/a/Jobs-in-cairo")
  })

  test("inserts the category slug", () => {
    expect(buildBrowseUrl("cairo", "Computer-Software", 1)).toBe(
      "https://wuzzuf.net/a/Computer-Software-Jobs-in-cairo",
    )
  })

  test("paginates with ?start= as a 0-based page index", () => {
    expect(buildBrowseUrl("cairo", undefined, 3)).toBe("https://wuzzuf.net/a/Jobs-in-cairo?start=2")
  })

  test("never emits a robots-disallowed query parameter", () => {
    const url = buildBrowseUrl("new cairo", "IT-Software-Development", 4)
    expect(url).not.toContain("?q=")
    expect(url).not.toContain("filters")
    expect(url).toContain("/a/")
    // Spaces become slug hyphens rather than %20.
    expect(url).toContain("Jobs-in-new-cairo")
  })
})

describe("slugifyTerm", () => {
  test("title-cases each word and joins with hyphens", () => {
    expect(slugifyTerm("AI Engineer")).toBe("Ai-Engineer")
    expect(slugifyTerm("machine learning")).toBe("Machine-Learning")
  })

  test("collapses punctuation and extra whitespace", () => {
    expect(slugifyTerm("  data   science / ml  ")).toBe("Data-Science-Ml")
  })

  test("returns an empty string when nothing usable is left", () => {
    expect(slugifyTerm("   ")).toBe("")
    expect(slugifyTerm("!!!")).toBe("")
  })
})

describe("parsePostedAt", () => {
  test("reads Wuzzuf's MM/DD/YYYY format", () => {
    expect(parsePostedAt("09/05/2026 14:13:06")).toBe("2026-09-05T14:13:06.000Z")
  })

  test("accepts a date with no time part", () => {
    expect(parsePostedAt("12/31/2025")).toBe("2025-12-31T00:00:00.000Z")
  })

  test("returns null rather than guessing at an unknown shape", () => {
    expect(parsePostedAt("3 hours ago")).toBeNull()
    expect(parsePostedAt("2026-09-05")).toBeNull()
    expect(parsePostedAt("")).toBeNull()
    expect(parsePostedAt(null)).toBeNull()
  })

  test("rejects an impossible month", () => {
    expect(parsePostedAt("13/05/2026 00:00:00")).toBeNull()
  })
})

describe("parseDomCards (fallback)", () => {
  const cards = parseDomCards(DOM_FIXTURE)

  test("parses every card", () => {
    expect(cards).toHaveLength(2)
  })

  test("extracts id, title and absolute url", () => {
    expect(cards[0].id).toBe("aaaa1111bbbb")
    expect(cards[0].title).toBe("Senior AI Engineer")
    expect(cards[0].url).toBe(
      "https://wuzzuf.net/jobs/p/aaaa1111bbbb-senior-ai-engineer-acme-cairo-egypt",
    )
  })

  test("strips the trailing dash and the empty comment nodes", () => {
    expect(cards[0].company).toBe("Acme")
    expect(cards[0].location).toBe("Maadi, Cairo, Egypt")
  })

  test("handles a confidential employer whose anchor has no href", () => {
    expect(cards[1].company).toBe("Confidential")
    expect(cards[1].location).toBe("Cairo, Egypt")
  })

  test("reads the date from the nested div instead of borrowing the next card", () => {
    expect(cards[0].postedAtRaw).toBe("3 hours ago")
    expect(cards[1].postedAtRaw).toBe("56 minutes ago")
  })

  test("leaves date null when only a relative label is available", () => {
    expect(cards[0].date).toBeNull()
  })
})

describe("extractStore", () => {
  test("parses a bootstrap store assignment", () => {
    const html = `<script>Wuzzuf.initialStoreState = {"a":{"b":1}};</script>`
    expect(extractStore(html)).toEqual({ a: { b: 1 } })
  })

  test("is not terminated by braces inside strings", () => {
    const html = `<script>Wuzzuf.initialStoreState = {"desc":"a } brace \\" and {more}","n":2};</script>`
    expect(extractStore(html)).toEqual({ desc: 'a } brace " and {more}', n: 2 })
  })

  test("returns null when the marker is absent", () => {
    expect(extractStore("<html></html>")).toBeNull()
  })

  test("returns null on an unterminated object rather than throwing", () => {
    expect(extractStore(`<script>Wuzzuf.initialStoreState = {"a":1</script>`)).toBeNull()
  })
})

describe("parseStoreCards", () => {
  const store = {
    entities: {
      job: {
        collection: {
          "uuid-2": {
            id: "uuid-2",
            attributes: {
              title: "Data Scientist",
              slug: "bbbb2222cccc-data-scientist-beta-giza-egypt",
              uri: "jobs/p/bbbb2222cccc-data-scientist-beta-giza-egypt",
              postedAt: "09/01/2026 08:00:00",
              status: "active",
              hideCompany: true,
              location: { city: { name: "Giza" }, country: { name: "Egypt" } },
            },
          },
          "uuid-1": {
            id: "uuid-1",
            attributes: {
              title: "AI Engineer",
              slug: "aaaa1111bbbb-ai-engineer-acme-cairo-egypt",
              uri: "jobs/p/aaaa1111bbbb-ai-engineer-acme-cairo-egypt",
              postedAt: "09/05/2026 14:13:06",
              status: "active",
              hideCompany: false,
              location: { area: { name: "Maadi" }, city: { name: "Cairo" }, country: { name: "Egypt" } },
              careerLevel: { name: "Experienced" },
              workplaceArrangement: { displayedName: "On-site" },
            },
            relationships: { company: { data: { id: "77", type: "company" } } },
          },
        },
      },
      company: { collection: { "77": { attributes: { name: "Acme" } } } },
    },
    browsingPage: {
      sets: {
        "/a/Jobs-in-cairo": {
          resultsOrder: ["uuid-1", "uuid-2"],
          totalResultsCount: 1096,
        },
      },
    },
  }

  const { cards, total } = parseStoreCards(store)

  test("honors resultsOrder rather than the unordered entity map", () => {
    expect(cards.map((c) => c.id)).toEqual(["aaaa1111bbbb", "bbbb2222cccc"])
  })

  test("resolves the company through the relationship id", () => {
    expect(cards[0].company).toBe("Acme")
  })

  test("reports a hidden employer as Confidential", () => {
    expect(cards[1].company).toBe("Confidential")
  })

  test("joins area, city and country, skipping the missing ones", () => {
    expect(cards[0].location).toBe("Maadi, Cairo, Egypt")
    expect(cards[1].location).toBe("Giza, Egypt")
  })

  test("converts postedAt to ISO", () => {
    expect(cards[0].date).toBe("2026-09-05T14:13:06.000Z")
  })

  test("surfaces the portal-wide total", () => {
    expect(total).toBe(1096)
  })
})

describe("matchesQuery", () => {
  test("matches case-insensitively on the title", () => {
    expect(matchesQuery(card({ title: "Senior AI Engineer" }), "ai engineer")).toBe(true)
  })

  test("requires every term (AND)", () => {
    expect(matchesQuery(card({ title: "Senior AI Engineer" }), "ai golang")).toBe(false)
  })

  test("matches on company and level too", () => {
    expect(matchesQuery(card({ company: "Trigz" }), "trigz")).toBe(true)
    expect(matchesQuery(card({ careerLevel: "Entry Level" }), "entry")).toBe(true)
  })

  test("an empty query keeps everything", () => {
    expect(matchesQuery(card(), undefined)).toBe(true)
    expect(matchesQuery(card(), "   ")).toBe(true)
  })
})

describe("withinJobAge", () => {
  const recent = new Date(Date.now() - 2 * 86_400_000).toISOString()
  const old = new Date(Date.now() - 60 * 86_400_000).toISOString()

  test("keeps postings inside the window", () => {
    expect(withinJobAge(card({ date: recent }), 30)).toBe(true)
  })

  test("drops postings outside it", () => {
    expect(withinJobAge(card({ date: old }), 30)).toBe(false)
  })

  test("keeps undated postings rather than silently dropping them", () => {
    expect(withinJobAge(card({ date: null }), 30)).toBe(true)
  })

  test("no filter keeps everything", () => {
    expect(withinJobAge(card({ date: old }), undefined)).toBe(true)
  })
})

describe("normalizeId", () => {
  test("accepts a bare public id", () => {
    expect(normalizeId("wcxjt9izxp3x")).toBe("wcxjt9izxp3x")
  })

  test("accepts a full slug", () => {
    expect(normalizeId("wcxjt9izxp3x-junior-software-engineer-megasoft")).toBe("wcxjt9izxp3x")
  })

  test("accepts a full URL", () => {
    expect(normalizeId("https://wuzzuf.net/jobs/p/wcxjt9izxp3x-junior-software-engineer")).toBe(
      "wcxjt9izxp3x",
    )
  })

  test("rejects junk", () => {
    expect(normalizeId("")).toBeNull()
    expect(normalizeId("   ")).toBeNull()
    expect(normalizeId("!!!")).toBeNull()
  })
})

describe("publicIdFromSlug", () => {
  test("pulls the id out of a uri", () => {
    expect(publicIdFromSlug("jobs/p/abc123def456-some-title")).toBe("abc123def456")
  })

  test("returns null on empty input", () => {
    expect(publicIdFromSlug(null)).toBeNull()
  })
})

describe("htmlToText", () => {
  test("turns list markup into readable lines", () => {
    expect(htmlToText("<ul><li><p>First</p></li><li><p>Second</p></li></ul>")).toBe(
      "- First\n- Second",
    )
  })

  test("keeps a real paragraph break between prose blocks", () => {
    expect(htmlToText("<p>Intro</p><p>Second para</p>")).toBe("Intro\n\nSecond para")
  })

  test("decodes entities", () => {
    expect(htmlToText("<p>R&amp;D &#38; more</p>")).toBe("R&D & more")
  })

  test("returns null for empty input", () => {
    expect(htmlToText("")).toBeNull()
    expect(htmlToText(null)).toBeNull()
  })
})
