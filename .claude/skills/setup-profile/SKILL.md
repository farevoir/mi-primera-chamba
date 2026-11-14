---
name: setup-profile
description: Onboarding that turns the user's CV into the base CV and builds their search profile in my-data/. Use when my-data/ is missing, when the user is new or wants to start over, or when they want to change their search criteria.
---

# Set up profile

Creates everything in `my-data/` that the other skills read. Vocabulary in `GLOSSARY.md`. Reply in the language the user writes in.

## Steps

1. **Check `my-data/`.** If it already holds data, ask which of these the user wants: update search criteria only (go to step 3), replace the CV (steps 2 and 5), or start over (all steps; keep the old folder as `my-data-backup-<date>/` and confirm before touching anything). Done when you know which steps to run.

2. **Build the base CV.** Ask for the CV as a file path (PDF, DOCX, TXT) or pasted text; copy a CV file into `my-data/`. Read it in full and write `my-data/cv-base.md` with the structure of `example/cv-base.md`: contact, skills, experience (title — employer — location — dates, then bullets), education, languages, and any certifications or projects. The base CV is a **verbatim transcription**: every number, title, date and phrase exactly as the user wrote it. Show the user a short summary (roles, dates, contact) and ask them to confirm it. Done when every section of the original CV is in `cv-base.md` and the user confirmed it.

3. **Ask the search criteria.** Use AskUserQuestion, at most 4 questions per round, 2 rounds:
   - Round 1: target roles (and adjacent roles) · seniority range · work mode and country of residence · countries/regions they can legally work for, and contract types (employee, contractor, EOR).
   - Round 2: posting languages · minimum salary with currency and period (or none) · dealbreakers (e.g. call centers, night shifts, industries) · paper size (Letter in the Americas, A4 elsewhere).
   Reply language is the one the user writes in. Max CV pages: 1, or 2 if the base CV shows 10+ years of experience. Done when every `<placeholder>` in `templates/search-profile.md` has an answer.

4. **Write the profile files.** From `templates/`, create `my-data/search-profile.md` (filled in; write the affinity-5 line from the user's strongest experience), `my-data/confirmed-skills.md`, `my-data/applications.md`, and the empty folder `my-data/jobs/`. Also create `my-data/targets.json` from `templates/targets.json`: set `titleInclude`/`titleExclude` from the target roles and seniority, and `locationInclude`/`descriptionInclude` from the countries and regions they can work for. Keep the starter boards and add companies the user names. Run `node scripts/jobs.mjs scan` once and remove boards it reports as failed.

5. **Build the base CV page.** Copy `templates/cv-template.html` to `my-data/cv.html` and fill it with the full content of `cv-base.md`: the user's name in `<title>` and `<h1>`, `@page` size from the profile. Render it:
   `node scripts/html-to-pdf.mjs my-data/cv.html`
   If the script finds no browser, tell the user to install Chrome, Edge or Chromium (or set `CHROME_PATH`). Read the PDF and check that all text appears. Done when the PDF exists and matches `cv-base.md`.

6. **Hand off.** Tell the user what was created and how to use the project from here: ask to "find jobs", paste a posting to get a tailored CV, or ask "how is my search going". Remind them that `my-data/` stays on their machine and out of Git.
