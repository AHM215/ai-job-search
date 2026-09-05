# Search Queries for Job Scraper

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`.

The `site:` query templates in this file are the **WebSearch fallback** for portals without a CLI, company career pages, or temporary CLI failures.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites

Primary (CLI-backed, run first by `/scrape`):
- **linkedin-search** - the workhorse for all three buckets: Middle East, Europe, and worldwide remote. Takes an explicit `--location`, so one CLI covers every target market.
- **freehire-search** - multi-country aggregator over ~50 ATS platforms; good European and remote coverage.
- **wuzzuf-search** - Egypt (and some Saudi) roles. Home-market depth.

WebSearch `site:` fallback (portals without a CLI):
- **wellfound.com/jobs** - startup / remote AI product roles
- **weworkremotely.com** and **remoteok.com** - remote-only boards
- **eu.jobs**, **euraxess.ec.europa.eu** - European postings, often sponsorship-friendly
- Greenhouse, Lever, and Ashby-hosted postings when a company is already targeted

Known-blocked, do not spend requests on these (see `wuzzuf-search/url-reference.md`):
- **bayt.com** - Cloudflare WAF `403`
- **naukrigulf.com** - Akamai edge block
- **gulftalent.com** - Akamai `Access Denied`

## Query Categories

Queries are grouped by priority. Write **each category in every language from your Languages table** (see Language scope above). Combine each query with your location terms (e.g. your city, region, or metro area) where the site supports it.

**Organize by function, not job title.** The same underlying work carries different titles across companies and markets (a "Data Scientist" role at one employer may be posted as "Insights Analyst" or "Data Consultant" at another). Name each priority category after the function it covers, and list several plausible job titles as query variants within that category rather than betting an entire priority tier on one exact title string.

### Priority 1: Core AI Engineer Titles

Highest-priority titles. Run across all three in-scope buckets: Middle East, Europe, worldwide remote.

```text
site:linkedin.com/jobs "AI Engineer" "Remote"
site:linkedin.com/jobs "AI Engineer" ("Egypt" OR "UAE" OR "Saudi Arabia" OR "Qatar" OR "Bahrain" OR "Kuwait" OR "Oman" OR "Jordan")
site:linkedin.com/jobs "AI Engineer" ("Netherlands" OR "Germany" OR "Ireland" OR "United Kingdom" OR "Spain" OR "Portugal" OR "Poland" OR "Sweden" OR "Switzerland" OR "Europe")
site:linkedin.com/jobs "Applied AI Engineer" ("Remote" OR "Egypt" OR "UAE" OR "Germany" OR "Netherlands")
site:linkedin.com/jobs "Generative AI Engineer" ("Remote" OR "Europe" OR "UAE")
site:linkedin.com/jobs "AI Engineer" ("visa sponsorship" OR "relocation") ("Netherlands" OR "Germany" OR "Ireland" OR "United Kingdom" OR "Spain" OR "Portugal" OR "Poland" OR "Sweden" OR "Switzerland" OR "Europe")
site:wellfound.com/jobs "AI Engineer" "Remote"
site:weworkremotely.com "AI Engineer"
```

### Priority 2: LLM / RAG / Agentic Systems

Aligned with LangGraph, AI agents, production RAG, and LLM application engineering.

```text
site:linkedin.com/jobs "LLM Engineer" "Remote"
site:linkedin.com/jobs "LLM Engineer" ("Netherlands" OR "Germany" OR "Ireland" OR "United Kingdom" OR "Spain" OR "Portugal" OR "Poland" OR "Sweden" OR "Switzerland" OR "Europe")
site:linkedin.com/jobs "LLM Engineer" ("Egypt" OR "UAE" OR "Saudi Arabia" OR "Qatar" OR "Bahrain" OR "Kuwait" OR "Oman" OR "Jordan")
site:linkedin.com/jobs "RAG Engineer" ("Remote" OR "Europe" OR "UAE")
site:linkedin.com/jobs "LangGraph" "AI Engineer" "Remote"
site:linkedin.com/jobs "AI agents" "Python" ("Remote" OR "Europe")
site:linkedin.com/jobs "vector database" "LLM Engineer" "Remote"
site:remoteok.com "LLM Engineer"
site:wellfound.com/jobs "LLM Engineer" "Remote"
```

### Priority 3: ML / NLP / Research Entry Roles

Adjacent titles that still match the target stack and seniority.

```text
site:linkedin.com/jobs "Machine Learning Engineer" "Remote"
site:linkedin.com/jobs "Machine Learning Engineer" ("Egypt" OR "UAE" OR "Saudi Arabia" OR "Qatar" OR "Bahrain" OR "Kuwait" OR "Oman" OR "Jordan")
site:linkedin.com/jobs "Machine Learning Engineer" ("Netherlands" OR "Germany" OR "Ireland" OR "United Kingdom" OR "Spain" OR "Portugal" OR "Poland" OR "Sweden" OR "Switzerland" OR "Europe")
site:linkedin.com/jobs "NLP Engineer" ("Remote" OR "Europe" OR "Egypt")
site:linkedin.com/jobs "Data Scientist" "LLM" ("Remote" OR "Europe")
site:linkedin.com/jobs "ML Engineer" ("visa sponsorship" OR "relocation") ("Netherlands" OR "Germany" OR "Ireland" OR "United Kingdom" OR "Spain" OR "Portugal" OR "Poland" OR "Sweden" OR "Switzerland" OR "Europe")
site:wellfound.com/jobs "Machine Learning Engineer" "Remote"
```

### Priority 4: Priority-Skill-Led Queries

Use these when title-only searches are thin or when a portal supports keyword-heavy queries better than exact role titles.

```text
site:linkedin.com/jobs "Python" "FastAPI" "LLM" "Remote"
site:linkedin.com/jobs "LangGraph" "RAG" "Engineer" "Remote"
site:linkedin.com/jobs "pgvector" "LLM" "Engineer" "Remote"
site:linkedin.com/jobs "Qdrant" "AI Engineer" "Remote"
site:linkedin.com/jobs "vLLM" "Generative AI Engineer" "Remote"
site:linkedin.com/jobs "Ollama" "AI Engineer" "Remote"
site:linkedin.com/jobs "Hugging Face" "PyTorch" "NLP Engineer" "Remote"
site:linkedin.com/jobs "evaluation" "reranking" "RAG" "Remote"
site:linkedin.com/jobs "semantic caching" "Redis" "RAG" "Remote"
site:linkedin.com/jobs "Redis" "Celery" "FastAPI" "AI" "Remote"
site:linkedin.com/jobs "Docker" "AWS" "FastAPI" "AI Engineer" "Remote"
```

### Priority 5: Targeted Company Searches

Use these when the user names a company or we identify a strong-fit employer.

```text
site:jobs.ashbyhq.com "[Company Name]" "AI"
site:boards.greenhouse.io "[Company Name]" "AI"
site:jobs.lever.co "[Company Name]" "AI"
site:[company-domain] careers "AI Engineer"
site:[company-domain] careers "Machine Learning Engineer"
```

## Location Filter

**Scope (set by the user, 2026-09-05): Middle East + Europe + worldwide remote.** Anything
outside these three buckets is out of scope and should be skipped, not flagged.

Base facts from the CV:
- Home base: **Cairo, Egypt**
- The current role is **remote**, so remote-first positions are a natural fit
- No visa, relocation, or commute constraints are recorded in the profile

### In scope

**1. Worldwide remote** — any country, provided the role is genuinely remote. Watch for
postings that say "remote" but restrict hiring to a region (e.g. "Remote (US only)",
"must be authorized to work in the US") — those are **out of scope**, because the
restriction is what matters, not the word "remote".

**2. Middle East** — Egypt (Cairo, Giza, Alexandria), UAE, Saudi Arabia, Qatar, Bahrain,
Kuwait, Oman, Jordan, Lebanon.

**3. Europe** — EU/EEA plus the UK and Switzerland. Highest-volume markets for this
profile: Netherlands, Germany, Ireland, UK, Spain, Portugal, Poland, Sweden, Switzerland,
Denmark, Czechia, Estonia.

### Priority order

1. Worldwide / EMEA-wide **remote**
2. **Cairo & Egypt** (onsite, hybrid or remote)
3. **GCC and wider Middle East**
4. **Europe** where the posting states remote-from-outside, **visa sponsorship**, or a
   **relocation package**
5. **Europe onsite/hybrid** that is silent on work rights — still include, but expect the
   Eligibility Gate to mark it unverified

### Out of scope — skip rather than flag

- North and South America, Asia-Pacific, and Africa outside Egypt, **unless** the posting
  is worldwide remote
- Any posting restricting applicants to citizens or permanent residents of a country the
  candidate does not hold status in

### Europe and work authorization — read before ranking European roles

The candidate is based in **Cairo, Egypt** and the profile records **no EU/UK work
rights**. Per `04-job-evaluation.md`'s Eligibility Gate, a posting that is *silent* on work
rights is **PROCEED-but-unverified**, not a rejection — so European roles stay in the pool
rather than being filtered out here.

To keep that pool useful rather than noisy:
- **Prefer** postings containing "visa sponsorship", "sponsorship available", "work
  permit", "relocation package", "relocation support", or "remote (EU)" / "remote (EMEA)".
- **Flag, do not drop**, European onsite roles that say nothing about sponsorship — the
  Eligibility Gate marks them unverified and the user decides.
- **Hard-fail only** on explicit wording: "must hold EU citizenship", "existing right to
  work in the UK required", "no sponsorship available". Quote the line when you do.

## Experience / Seniority Filter

Prefer roles that clearly fit **0-3 years of experience** or internship/new-grad/junior positioning.

Positive signals:
- `0-1 years`
- `1-3 years`
- `junior`
- `entry level`
- `graduate`
- `associate`
- `intern`
- `trainee`

Default exclusions:
- `senior`
- `staff`
- `principal`
- `lead`
- `director`
- `manager`

If a posting is otherwise strong but asks for **4+ years**, flag it as stretch rather than treating it as a default target. If the title includes an excluded seniority term, skip it unless the user explicitly asks for a broader search.

## Priority Skills

Use these skills to refine CLI keyword filters, break ties between similar roles, and generate focus-specific search variants:
- `Python`
- `FastAPI`
- `LangGraph`
- `AI agents`
- `RAG`
- `pgvector`
- `Qdrant`
- `vector databases`
- `vLLM`
- `Ollama`
- `Hugging Face`
- `PyTorch`
- `evaluation`
- `reranking`
- `semantic caching`
- `Redis`
- `Celery`
- `Docker`
- `AWS`

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

**Only include jobs posted within the last 7 days** ("last week" — set by the user,
2026-09-05).

- Pass the window to each portal's own recency flag where one exists: `--jobage 7` for
  `linkedin-search`, `wuzzuf-search` and `freehire-search`; the equivalent documented flag
  elsewhere. Never invent a flag a portal's `SKILL.md` does not document — the CLIs reject
  unknown flags.
- For portals with **no** recency flag, filter client-side after the call: every portal's
  search output carries a `date` field, so drop results older than 7 days.
- A posting whose date cannot be determined is **included but flagged `date unknown`** —
  do not silently discard it.
- A posting inside the window whose **application deadline has already passed** is still
  excluded.

## Adapting Queries

If the user specifies a focus area, prioritize the matching category and add 2-3 custom queries from these evidence-backed themes:
- `LangGraph`
- `RAG`
- `LLM`
- `Generative AI`
- `NLP`
- `FastAPI`
- `AI agents`
- `pgvector`
- `Qdrant`
- `vLLM`
- `Ollama`
- `Hugging Face`
- `PyTorch`
- `evaluation`
- `reranking`
- `semantic caching`
- `Redis`
- `Celery`
- `Docker`
- `AWS`

Default high-signal combinations to try when generating custom queries:
- `Python` + `FastAPI` + `RAG`
- `LangGraph` + `AI agents`
- `pgvector` or `Qdrant` + `vector databases`
- `vLLM` or `Ollama` + `LLM`
- `Hugging Face` + `PyTorch`
- `evaluation` + `reranking` + `semantic caching`

Do not broaden into unrelated software roles unless the user explicitly wants a wider pivot.
