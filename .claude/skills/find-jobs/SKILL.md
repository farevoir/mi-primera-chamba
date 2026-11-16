---
name: find-jobs
description: Searches for new job postings that fit the user's CV, verifies they are still open, and returns them ranked by affinity. Use when the user asks to find jobs without giving a specific posting.
---

# Find jobs

Delivers a **ranked list of 5–10 verified postings** that meet `my-data/profile/search-profile.md`, scored by **affinity**, none of them already in `my-data/applications.md`. Vocabulary in `GLOSSARY.md`. If `my-data/` is missing, run `setup-profile` first.

Code does the mechanical reading; you spend judgment on discovery and scoring. `scripts/jobs.mjs` reads public ATS APIs in full, for free (supported ATSs are listed in [`dorks.md`](dorks.md)), and already hides postings logged in `applications.md`.

## Steps

1. **Load context.** Read `my-data/profile/search-profile.md` (including "Source notes"), `my-data/profile/cv-base.md` and `my-data/profile/confirmed-skills.md`.

2. **Scan target companies.** Run `node scripts/jobs.mjs scan`. It checks every board in `my-data/profile/targets.json` and prints matching postings from the last 90 days that aren't logged yet. ATS APIs list only open postings, so everything it prints is open. Remove or fix any board it reports as failed.

3. **Discover new companies.** Run 3–4 WebSearch calls in parallel (extended mode) built from the dork families in [`dorks.md`](dorks.md), rotating families between runs, plus the profile's source notes. For each result hosted on an ATS that `scripts/jobs.mjs` supports, add its company board to `targets.json`, so future scans cover it for free. Done when you have ~15–25 new candidates between steps 2 and 3, or the queries are exhausted.

4. **Verify each candidate.**
   - Any link: `node scripts/jobs.mjs posting <url>` prints the full posting, reports it closed, or says its ATS is not supported.
   - Any other page: one `web-fetch` agent with all remaining URLs (reuse it with SendMessage). Tell it to skip postings already in `applications.md`, and ask per posting: open?, eligibility (countries, employee/contractor), level and years, requirements, languages, salary, main channels, schedule, date, apply URL.
   A posting counts as **open** only if the employer's page or API, or an aggregator dated within 30 days, confirms it.

5. **Classify** each verified candidate against the profile:
   - **Discarded**: outside the regions the user can work for, seniority or years outside the range, hits a dealbreaker, or closed. An aggregator listing older than ~30 days with no employer confirmation counts as closed; a posting the employer's API still lists is open whatever its age.
   - **To verify**: open but eligible country, salary or page content is missing.
   - **Valid**: the rest. Score affinity 1–5 with the profile's scale, citing which requirements the base CV covers and which are gaps.
   Convert salaries in other currencies at the day's exchange rate before comparing with the minimum.

6. **Log** every candidate in `applications.md` with date, affinity, status and a note. Valid and to-verify notes carry what the user needs to decide (eligibility, level, key gaps, schedule, salary); discarded notes are one short reason. Append sources or queries that worked, or wasted time, to the profile's "Source notes".

7. **Deliver**: valid postings by affinity (descending) with link, why it fits, gaps and alerts (schedule, salary, shifts); then a short "to verify" list. For postings at or above the tailored-CV threshold, ask the skills to confirm and offer to run `tailor-cv`.

Done when every candidate has a status in `applications.md` and the user has the ranking.

## Sources

General lessons, valid for any profile:
- **Discovery**: remote-job aggregators that show posting date and region (Remote Rocketship, Jobgether, Himalayas, Freehire, Remote OK) and Hacker News "Who is hiring" (hnhiring.com) beat general web search. Many aggregator listings are stale or closed, and their location tags are sometimes wrong: trust the employer's page or API. Their value is naming companies to add to `targets.json`.
- Aggregator boards hosted on an ATS (e.g. Jobgether on Lever) flood the scan with other countries; keep them out of `targets.json`.
- A posting URL that redirects to the company's careers index is closed.
- LinkedIn and Indeed can't be read. If the user pastes a posting from them, go straight to `tailor-cv`.
