---
name: tailor-cv
description: Tailors the user's CV to one job posting and renders an ATS-friendly PDF, without inventing experience. Use when the user pastes a posting (link or text) and wants a CV for it, or when find-jobs surfaces a posting at or above the tailored-CV threshold.
---

# Tailor CV

Produces a **tailored CV** for one **job posting**: the base CV reordered and reworded for that posting, as a one-column PDF with real text. Vocabulary in `GLOSSARY.md`. If `my-data/` is missing, run `setup-profile` first.

The rule that governs everything: **every claim in the tailored CV has backing** in `my-data/cv-base.md` or in the "Confirmed" section of `my-data/confirmed-skills.md`. Tailoring is selecting, ordering and rewording with the posting's vocabulary; numbers, employers, dates, job titles and degrees are copied verbatim. Describe the user by the titles and levels they actually held; a higher title or level (e.g. "Engineer", "L2") goes in only when the base CV or a confirmed skill says so.

## Steps

1. **Read the posting.** If it's a link, read the page; if it can't be opened (LinkedIn, login walls), ask the user to paste the text. Done when you have company, title, requirements, responsibilities, location/eligibility and salary (or "not published").

2. **Check it against `my-data/search-profile.md`.** If it hits a discard rule or dealbreaker, tell the user and ask whether to continue. Missing country or salary → note it as **to verify** and continue.

3. **Map requirements.** Classify each requirement:
   - **Covered**: the base CV or a confirmed skill backs it → note which line.
   - **Gap**: no backing. If the skill is under "Declined" or "To learn", it stays a gap; otherwise it's a **skill to confirm**.
   Done when every requirement has a class.

4. **Ask about skills to confirm.** A short yes/no list (AskUserQuestion when ≤ 4, text when more), asking for one line of real context for each "yes" (where and how they used it). Save each answer in `confirmed-skills.md` (Confirmed, To learn or Declined) with the date. Skip this step when nothing needs confirming.

5. **Write the tailored CV.** Copy `my-data/cv.html` to `my-data/jobs/<company>-<role>/cv.html` (kebab-case, ASCII) and edit:
   - **Summary**: 2–3 lines aimed at the role, in its terms.
   - **Skills**: reorder categories and items so what the posting asks for comes first; add only confirmed skills.
   - **Experience**: reorder bullets by relevance; reword with the posting's keywords where the meaning is identical; cut the least relevant bullets to fit the profile's max pages.
   - Keep standard section names (Summary, Skills, Experience, Education, Languages), one column and real text.

6. **Render the PDF.**
   `node scripts/html-to-pdf.mjs my-data/jobs/<folder>/cv.html`
   It prints the PDF path and page count. Over the profile's max pages → trim and render again. Read the PDF to confirm the text is complete.

7. **Write `my-data/jobs/<folder>/job.md`** with: link, company, role, date, affinity (scale in the profile), a requirements table (covered/gap + backing), what changed from the base CV, and 2–3 talking points for the interview.

8. **Log it in `my-data/applications.md`**: one row with the "cv ready" status (or "to verify"), using the status words listed at the top of that file.

9. **Deliver**: PDF path, affinity, honest gaps and what changed. If the session can send files to the user's device (e.g. SendUserFile under Remote Control), send the PDF. The user submits the application.

Done when the PDF, `job.md` and the `applications.md` row exist, and every claim in the CV has backing.
