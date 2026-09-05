# Search Queries for Job Scraper

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Shipped country-agnostic CLIs include `linkedin-search` and `freehire-search`.

The `site:` query templates in this file are the **WebSearch fallback** for portals without a CLI, company career pages, or temporary CLI failures.

**Language scope:** write every query category in every language listed in your CLAUDE.md Languages table (typically 1-2, sometimes more). A posting requiring a language you have *not* declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* than you declared in a language you *do* work in is flagged for your own judgment, not excluded — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule. Translate each category's keywords rather than machine-translating word-for-word (e.g. "Frontend Developer" -> "Desarrollador Frontend", not a literal word-for-word translation) if you work in more than one language.

## Search Sites

Primary:
- **linkedin.com/jobs** - primary surface for Egypt, GCC, and worldwide remote AI roles
- **wuzzuf.net/jobs** - Egypt-focused fallback for Cairo and Egypt-based roles
- **wellfound.com/jobs** - startup-focused fallback for remote AI product and applied GenAI roles
- **bayt.com/en/jobs** - GCC-focused fallback for UAE, Saudi Arabia, Qatar, Bahrain, Kuwait, and Jordan roles

Secondary:
- Direct Google `site:` searches for company career pages
- Greenhouse, Lever, and Ashby-hosted company postings when a company is already targeted

## Query Categories

Queries are grouped by priority. Write **each category in every language from your Languages table** (see Language scope above). Combine each query with your location terms (e.g. your city, region, or metro area) where the site supports it.

**Organize by function, not job title.** The same underlying work carries different titles across companies and markets (a "Data Scientist" role at one employer may be posted as "Insights Analyst" or "Data Consultant" at another). Name each priority category after the function it covers, and list several plausible job titles as query variants within that category rather than betting an entire priority tier on one exact title string.

### Priority 1: Core AI Engineer Titles

These are the highest-priority titles and should be searched first across Cairo, Egypt, GCC, and worldwide remote roles.

```text
site:linkedin.com/jobs "AI Engineer" ("Cairo" OR "Egypt")
site:linkedin.com/jobs "Junior AI Engineer" ("Cairo" OR "Egypt")
site:linkedin.com/jobs "Junior AI/ML Engineer" ("Egypt" OR "UAE" OR "Saudi Arabia" OR "Qatar" OR "Bahrain" OR "Kuwait" OR "Jordan")
site:linkedin.com/jobs "Applied AI Engineer" ("Egypt" OR "UAE" OR "Saudi Arabia" OR "Qatar" OR "Bahrain" OR "Kuwait" OR "Jordan")
site:linkedin.com/jobs "Generative AI Engineer" ("Egypt" OR "UAE" OR "Remote")
site:wuzzuf.net/jobs "AI Engineer" Cairo
site:bayt.com/en/jobs "AI Engineer" ("UAE" OR "Saudi Arabia" OR "Qatar")
site:wellfound.com/jobs "AI Engineer" "Remote"
```

### Priority 2: LLM / RAG / Agentic Systems

These align with LangGraph, AI agents, production RAG systems, and LLM application engineering.

```text
site:linkedin.com/jobs "LLM Engineer" ("Remote" OR "Egypt" OR "UAE" OR "Saudi Arabia" OR "Qatar" OR "Bahrain" OR "Kuwait" OR "Jordan")
site:linkedin.com/jobs "RAG Engineer" ("Remote" OR "Egypt" OR "UAE")
site:linkedin.com/jobs "LangGraph" "AI Engineer" "Remote"
site:linkedin.com/jobs "AI agents" "Python" ("Remote" OR "UAE")
site:linkedin.com/jobs "Generative AI Engineer" "RAG" ("Remote" OR "Saudi Arabia")
site:linkedin.com/jobs "vector database" "LLM Engineer" "Remote"
site:wellfound.com/jobs "LLM Engineer" "Remote"
```

### Priority 3: ML / NLP / Research Entry Roles

These capture adjacent core titles that still match the target stack and juniority level.

```text
site:linkedin.com/jobs "Machine Learning Engineer" ("Cairo" OR "Egypt" OR "Jordan")
site:linkedin.com/jobs "ML Specialist" ("Egypt" OR "UAE" OR "Saudi Arabia")
site:linkedin.com/jobs "NLP Engineer" ("Egypt" OR "Remote")
site:linkedin.com/jobs "AI Research Intern" ("Egypt" OR "UAE" OR "Remote")
site:wuzzuf.net/jobs "Machine Learning Engineer" Cairo
site:wuzzuf.net/jobs "NLP Engineer" Cairo
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

Base assumptions from the CV:
- Home base: **Cairo, Egypt**
- Remote roles are relevant because the current role is remote
- Cairo-based onsite or hybrid roles are relevant
- GCC-based roles are in scope

Treat these as default acceptable locations unless the user later narrows the scope:
- Cairo
- Egypt
- UAE
- Saudi Arabia
- Qatar
- Bahrain
- Kuwait
- Jordan
- Worldwide remote

Prioritize locations in this order:
1. Cairo, Egypt
2. Egypt-wide
3. Worldwide remote
4. UAE / Saudi Arabia / Qatar / Bahrain / Kuwait / Jordan

Flag rather than auto-reject:
- Other MENA locations not listed above
- Relocation-heavy roles outside the target geography

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

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag it as `date unknown`.

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
