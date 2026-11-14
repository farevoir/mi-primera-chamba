---
name: find-jobs
description: Searches the web for new job postings that fit the user's CV, verifies they are still open, and returns them ranked by affinity. Use when the user asks to find jobs without giving a specific posting.
---

# Find jobs

Delivers a **ranked list of 5–10 verified postings** that meet `my-data/search-profile.md`, scored by **affinity**, none of them already in `my-data/applications.md`. Vocabulary in `GLOSSARY.md`. If `my-data/` is missing, run `setup-profile` first.

## Steps

1. **Load context.** Read `my-data/search-profile.md` (including "Source notes"), `my-data/cv-base.md`, `my-data/confirmed-skills.md` and `my-data/applications.md`. Every link already in `applications.md` is out of this run.

2. **Discover candidates.** Run 3–5 WebSearch calls in parallel (extended mode), varying role, region and source; see "Sources" below and the profile's source notes. Done when you have ~15–25 new candidates or the queries are exhausted.

3. **Verify each candidate on its original page.** Hand all URLs to one `web-fetch` agent (reuse it with SendMessage for later batches). Ask per posting: open?, company/title, eligibility (countries, employee/contractor), level and years, requirements and nice-to-haves, languages, salary, main channels or duties relevant to the profile's dealbreakers, posting date, application URL. A posting counts as **open** only if the employer's page, or an aggregator dated within 30 days, confirms it.

4. **Classify** each verified candidate against the profile:
   - **Discarded**: outside the regions the user can work for, seniority outside the range, hits a dealbreaker, closed, or posted more than ~30 days ago.
   - **To verify**: open but eligible country, salary or page content is missing.
   - **Valid**: the rest. Score affinity 1–5 with the profile's scale, citing which requirements the base CV covers and which are gaps.
   Convert salaries in other currencies at the day's exchange rate before comparing with the minimum.

5. **Log** every candidate (valid, to verify, discarded) in `applications.md` with date, affinity, status and a short note, so the next run skips it. Append any source or query that worked well, or wasted time, to the profile's "Source notes".

6. **Deliver**: valid postings by affinity (descending) with link, why it fits, gaps and alerts (schedule, salary, shifts); then a short "to verify" list. For postings at or above the tailored-CV threshold, ask the skills to confirm and offer to run `tailor-cv`.

Done when every discovered candidate has a status in `applications.md` and the user has the ranking.

## Sources

General lessons, valid for any profile:
- **Discovery**: remote-job aggregators that show posting date and region (Remote Rocketship, Jobgether, Himalayas, We Work Remotely, Remote OK) beat general web search. Many listings are stale, so filter by date. Region pages (e.g. `/country/<country>/jobs/<role>/`) are the most productive.
- **Confirmation**: Greenhouse, Lever, Teamtailor, SmartRecruiters and companies' own career pages load well. Ashby and Workable often return only the title → mark **to verify** and give the user the link.
- A posting URL that redirects to the company's careers index is closed. Expect many 404/410 results; roughly 2 in 7 web results survive verification.
- LinkedIn and Indeed can't be read. If the user pastes a posting from them, go straight to `tailor-cv`.
