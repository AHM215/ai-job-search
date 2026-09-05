# Template: ahmed-ai-cv

- **Type:** CV
- **Engine:** lualatex
- **Page limit:** 2 page(s)
- **Fonts:** TeX Gyre Heros + Fira Mono + Font Awesome 5 (system / TeX-distribution fonts - must be installed)
- **Class/packages:** article; non-default packages include fullpage, titlesec, marvosym, enumitem, hyperref, fancyhdr, tabularx, fontawesome5, FiraMono, contour, ulem, tgheros

## Compile command

    cd templates/cv/ahmed-ai-cv && lualatex -interaction=nonstopmode _compile_test.tex

## Style rules

- Preserve the single-column letterpaper layout, compact vertical rhythm, and all custom macros exactly as defined in `template.tex`.
- Keep the centered header with Font Awesome icons, monospaced contact details, and the blue `SECTIONCOLOR` link treatment.
- Keep section headings uppercase with the thick light-grey rule, gray secondary text, and the existing tabular two-column heading layout for roles and projects.
- Preserve the current section order: Summary, Education, Experience, Projects, Skills, Certifications, Volunteer Experience, Languages.
- Enforce a hard maximum of 2 pages by trimming bullet density or content relevance rather than changing margins, colors, fonts, or section styling.

## Known pitfalls

- The verified engine is `lualatex`; start there for all real compiles.
- Avoid literal Unicode em dashes (`—`) in body text with this font stack. Use `---` or `\textemdash{}` instead.
- Fonts come from the TeX installation, not bundled files. A machine missing `fontawesome5`, `FiraMono`, or `tgheros` packages will fail to match the verified output.
