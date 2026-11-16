# Mi Primera Chamba

A human-in-the-loop job search assistant: finds postings that fit the user's CV and tailors an ATS-friendly CV for each one. Vocabulary in `GLOSSARY.md`.

- The user submits every application. This project prepares; it never applies, fills forms or messages recruiters on the user's behalf.
- Source of truth about the user: `my-data/profile/cv-base.md` + "Confirmed" in `my-data/profile/confirmed-skills.md`. Ask about anything else.
- Read `my-data/profile/notes.md` when it exists: context and preferences that must survive a new machine or a lost chat. Record lasting preferences there (dated), not only in local memory.
- All personal data lives in `my-data/` (gitignored). Skills, templates, `example/` and docs stay generic.
- If `my-data/` doesn't exist, start with the `setup-profile` skill.
- Criteria and reply language: `my-data/profile/search-profile.md`. Log and dedupe: `my-data/applications.md`. Each posting lives in `my-data/jobs/<company>-<role>/`.
- Skills: `setup-profile`, `find-jobs`, `tailor-cv`, `outreach`, `track-applications`.
- A daily scan runs `node scripts/jobs.mjs daily` (no AI): it tidies the log (closed/expired) and writes `my-data/new-postings.md`; read it when the user asks what's new. It runs in GitHub Actions on a private data repo (`templates/github-actions/daily-scan.yml`) or any local scheduler.
- When `my-data/` is its own git repo, hooks run `scripts/sync-data.mjs` (pull on session start, push after each reply). If a pull reports a conflict, resolve it before editing `my-data/`.
- `applications.md` is a dedupe log first. Outcome statuses come from application emails (`track-applications` reads them when a Gmail/Outlook connector is available) or from what the user volunteers; never ask the user to report them.
