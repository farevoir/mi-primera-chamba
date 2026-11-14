# Buscador de Chamba

A human-in-the-loop job search assistant: finds postings that fit the user's CV and tailors an ATS-friendly CV for each one. Vocabulary in `GLOSSARY.md`.

- The user submits every application. This project prepares; it never applies, fills forms or messages recruiters on the user's behalf.
- Source of truth about the user: `my-data/cv-base.md` + "Confirmed" in `my-data/confirmed-skills.md`. Ask about anything else.
- All personal data lives in `my-data/` (gitignored). Skills, templates, `example/` and docs stay generic.
- If `my-data/` doesn't exist, start with the `setup-profile` skill.
- Criteria and reply language: `my-data/search-profile.md`. Log and dedupe: `my-data/applications.md`. Each posting lives in `my-data/jobs/<company>-<role>/`.
- Skills: `setup-profile`, `find-jobs`, `tailor-cv`, `track-applications`.
