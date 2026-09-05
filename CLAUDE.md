# Job Application Assistant for Ahmed Ashraf Hagras

## Role
This repo is a job application workspace. Claude acts as a career advisor and application assistant for Ahmed Ashraf Hagras, helping with:
1. **Job fit evaluation** - Assess job postings against the candidate's documented skills, experience, and constraints
2. **CV tailoring** - Adapt existing CV templates (LaTeX/moderncv) to target specific roles
3. **Cover letter writing** - Draft targeted cover letters using existing templates (LaTeX)
4. **Interview preparation** - Prepare answers, questions, and talking points for interviews
5. **Career strategy** - Advise on positioning and personal branding using the CV as the factual source of truth

## Candidate Profile

### Identity
- **Name:** Ahmed Ashraf Hagras
- **Location:** Cairo, Egypt (no explicit commute or location constraints recorded)
- **Languages:**
  | Language | Level |
  |----------|-------|
  | Arabic | Native |
  | English | Professional working proficiency |
  <!-- Every language you work in professionally, with your level (CEFR, "native," "professional
  working proficiency," whatever your CV/LinkedIn use - no need to force it into one scale). An
  undeclared language is a hard deal-breaker if a posting requires it; a declared language at a
  lower level than a posting wants is flagged for your own judgment, not auto-rejected. See
  04-job-evaluation.md's Language Gate. -->
- **CV language:** English <!-- English unless your market expects otherwise; /setup asks -->

- **Status:** AI Engineer at Trigz Ai
- **LinkedIn headline:** "AI-focused Python Developer specializing in LLM applications, RAG systems, and multi-agent architectures"

### Education
<!-- List your degrees, most recent first -->
- **Bachelor of Science in Computer Science and Automatic Control Engineering** (2019-2024) - **Tanta University**
  - Topics: Machine Learning, Deep Learning, Signal Processing, Control Systems

### Professional Experience
<!-- List your roles, most recent first -->
- **AI Engineer** (Apr. 2026 - Present) - **Trigz Ai** (Remote)
  - Built multi-agent AI systems with LangGraph integrated into a SaaS platform across Magento, Salla, and Zid.
  - Delivered an AI WhatsApp chatbot via Meta API with less than 2.5s end-to-end response time and OCR pipelines for structured data extraction.
  - Engineered document automation workflows with pgvector, Celery, and advanced prompt management.
- **AI Engineer** (Mar. 2024 - Aug. 2024) - **MT College** (Cairo, Egypt)
  - Built an Arabic Speech-to-Text system on 50K+ audio samples, achieving MLT 40.71 and a Top 10 finish in a 2024 national competition.
  - Integrated speaker diarization with pyannote 3.1 for multi-speaker segmentation in NLP pipelines.
  - Fine-tuned an Arabic text summarization model on 10K+ articles, achieving ROUGE-L 0.42 and a Top 15 finish in a 2023 national competition.
- **AI Engineer Intern** (Jan. 2023 - Nov. 2023) - **Instant** (Cairo, Egypt)
  - Built ML and deep learning foundations in training, evaluation, and optimization.
  - Applied data preprocessing and feature engineering to improve model performance.
  - Developed practical familiarity with core NLP techniques including tokenization, embeddings, and sequence modeling.

### Technical Skills
- **Primary:** Python, FastAPI, LangGraph, RAG systems, multi-agent systems, prompt engineering
- **Secondary:** PyTorch, Scikit-Learn, Hugging Face Transformers, TensorFlow, Botpress, AWS, Docker, MLflow
- **Domain:** LLM applications, conversational AI, NLP, speech processing, OCR-driven document automation
- **Software:** PostgreSQL, MySQL, PGvector, Qdrant, FAISS, Chroma, Celery, Redis, RabbitMQ, Grafana, Prometheus, Linux, Git, Gradio, Jupyter

### Certifications
<!-- List relevant certifications with dates -->
- **AWS Certified Cloud Practitioner** - completed 2024

### Publications
<!-- List peer-reviewed publications, if any -->
- None recorded in current profile materials.

### Awards
<!-- List relevant awards, hackathons, competitions -->
- Top 10 - Arabic Speech Recognition Competition (2024 national competition)
- Top 15 - Arabic Text Summarization Competition (2023 national competition)

### Behavioral Profile
<!-- Your behavioral assessment results (PI, DISC, Myers-Briggs, or self-assessment) -->
- **Execution-oriented builder** - Ships end-to-end AI systems from experimentation through production delivery.
- **Applied problem solver** - Focuses on latency, cost efficiency, and measurable user impact.
- **Strengths:** Multi-agent architecture, production LLM systems, pragmatic experimentation
- **Growth areas:** Not explicitly recorded in current profile materials
- **Thrives in:** Product-oriented AI engineering and applied ML environments

### What Excites You
<!-- What motivates you professionally -->
- LLM applications and multi-agent systems
- Building production AI products with measurable user impact

### Target Sectors
<!-- Industries and companies you're targeting -->
- Applied AI / GenAI platforms: e-commerce automation, SaaS products, workflow tools
- ML / NLP product teams: conversational AI, speech technology, document intelligence

### Deal-breakers
<!-- Hard constraints on job search. Language requirements are handled separately and
automatically from your Languages table above - don't duplicate them here. -->
- None recorded in current profile materials

## Repo Structure
- `cv/` - LaTeX CV variants
- `cover_letters/` - LaTeX cover letters
- `.claude/skills/` - AI skill definitions for the application workflow
- `.agents/skills/` - Job search CLI tools

## Workflow for New Job Applications
1. User provides a job posting (URL or text)
2. **Always evaluate fit first** using documented skills, experience, and location facts before proceeding
3. If the fit is strong enough: create targeted CV (`cv/main_<company>_<role>.tex`) and cover letter (`cover_letters/cover_<company>_<role>.tex`)
4. **Verify both documents** using the checklist below
5. Prepare interview talking points grounded in real experience and clearly labeled projects

**Important:** Keep a strict distinction between professional experience and independent projects. Never present a personal project as paid employment or client work unless the employer is explicitly named in the CV.

## Verification Checklist
After creating or updating a CV or cover letter, re-read the generated file and verify **all** of the following before presenting to the user. Report the results as a pass/fail checklist.

### Factual accuracy
- [ ] All claims match the CV-backed profile in `CLAUDE.md` and `.claude/skills/job-application-assistant/01-candidate-profile.md`
- [ ] Job titles, dates, company names, locations, and project labels are correct
- [ ] Tools, certifications, awards, and metrics appear only if documented
- [ ] Professional experience and independent projects remain clearly separated
- [ ] All company-specific claims have been independently verified via WebFetch/WebSearch and not copied blindly from the posting

### Targeting
- [ ] Profile statement / opening paragraph is tailored to the role
- [ ] Skills and experience bullets are reframed to match the job requirements without changing substance
- [ ] Key job requirements are addressed, with genuine gaps acknowledged
- [ ] Nice-to-have requirements are highlighted only where supported by the profile

### Consistency
- [ ] CV follows the standard template in use for that output
- [ ] Cover letter uses the established cover letter template
- [ ] Tone is consistent across CV and cover letter
- [ ] No contradictions between CV and cover letter content

### Quality
- [ ] No LaTeX syntax errors
- [ ] No spelling or grammar errors
- [ ] Agentic coding / AI tooling references mention **Claude Code** by name when relevant
- [ ] Cover letter is addressed correctly
- [ ] Cover letter fits approximately one page

### Compiled PDF verification (MANDATORY - never skip)
Both documents MUST be compiled and visually inspected via the Read tool on the PDF output. "Looks fine in the .tex" is not acceptable - LaTeX page-break decisions are unpredictable. Iterate until these all pass:
- [ ] CV compiled with **lualatex** (pdflatex often fails on modern MiKTeX with fontawesome5 font-expansion errors). Cover letter compiled with **xelatex** (cover.cls requires fontspec). If a custom template is active (registered via `/add-template`), compile with its declared command instead — see the `ACTIVE-TEMPLATE` block in `05-cv-templates.md`/`06-cover-letter-templates.md`.
- [ ] **CV is exactly 2 pages** - not 1, not 3
- [ ] **No orphaned `\cventry` titles** - a job/education title must never sit at the bottom of a page with its bullets spilling to the next page. Use `\needspace{5\baselineskip}` before each `\cventry` to prevent this, and `\enlargethispage{2-3\baselineskip}` to rescue a trailing section that just barely spills
- [ ] **Cover letter is exactly 1 page** - signature block must fit with the body, never overflow
- [ ] **Cover letter bullet font matches body font** - `\lettercontent{}` must not wrap `\begin{itemize}...\end{itemize}` (the command's trailing `\\` errors on `\end{itemize}`, and moving itemize outside loses the Raleway font). Standard pattern: close `\lettercontent{}`, then wrap the list in `{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont \begin{itemize}...\end{itemize}\par}`

### ATS & keyword verification (CV)
ATS parsers read the PDF's embedded text layer, not the rendered page. Extract it with `python tools/verify_pdf.py cv/main_<company>_<role>.pdf --dump-text cv/main_<company>_<role>.txt` (pypdf, then `pdftotext -layout -enc UTF-8`) and verify what a parser sees. If both extractors are missing, skip the parseability items with a warning and check keyword coverage from the visual PDF read instead.
- [ ] CV text layer extracts cleanly - no `(cid:*)` markers, `�` replacement characters, or text visible in the PDF but absent from the extraction
- [ ] Email and phone appear as **literal text** in the extraction (icon-glyph noise like `MOBILE-ALT`/`Envelope` is harmless, but a contact detail carried only by an icon or hyperlink is invisible to ATS)
- [ ] Reading order of the extracted text matches the visual order (single-column stock template is safe; multi-column custom templates are where this breaks)
- [ ] Posting keywords covered or honestly absent - synonym-only matches tightened to the posting's exact term where truthfully applicable, keywords the profile genuinely supports added to experience bullets, genuine gaps left visible and **never stuffed**
