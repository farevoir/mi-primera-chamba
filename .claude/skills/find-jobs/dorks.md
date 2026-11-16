# Discovery dorks

Search queries that go straight to where companies publish openings (their ATS and career pages) instead of the big job boards everyone else uses. The point of every dork is to **name a company**: once you have one hosted on a supported ATS, add its board to `my-data/profile/targets.json` and `scripts/jobs.mjs` watches it daily for free.

Build them from `my-data/profile/search-profile.md`: `{role}` from target and adjacent roles, `{place}` from the countries/regions the user can work for (e.g. `Mexico`, `LATAM`, `"Latin America"`), `{lang}` from posting languages.

## How to run them

WebSearch often ignores `site:` and quoted operators. Put the domain in `allowed_domains` instead and keep the query to plain terms; that is the reliable form of a `site:` dork. Run 3–4 in parallel per discovery round, rotating families so successive runs cover different ground. Record in the profile's "Source notes" which dorks produced new companies.

## 1. ATS dorks (highest yield)

Query `{role} {place} remote`, one call per domain group:

| ATS | `allowed_domains` | Board id for `targets.json` |
|---|---|---|
| Greenhouse | `boards.greenhouse.io`, `job-boards.greenhouse.io` | path segment after the domain |
| Lever | `jobs.lever.co` | path segment after the domain |
| Ashby | `jobs.ashbyhq.com` | path segment after the domain |
| Workable | `apply.workable.com` | path segment after the domain (not `/j/` links) |
| SmartRecruiters | `jobs.smartrecruiters.com` | path segment after the domain |
| Breezy | `breezy.hr` | subdomain |
| Recruitee | `recruitee.com` | subdomain |
| Teamtailor | `teamtailor.com` | subdomain |
| Rippling | `ats.rippling.com` | path segment after the domain |

Not covered by the script yet (read with the web-fetch agent): `jobs.jobvite.com`, `bamboohr.com`, `jobs.personio.de`, `pinpointhq.com`, `myworkdayjobs.com`.

## 2. Company career pages

- `"careers" {role} "remote" {place}` and `"join our team" "support engineer" {place}`, no domain filter.
- `"we're hiring" "customer support" {place} remote` with `allowed_domains: ["notion.site"]`: startups often publish openings as Notion pages.
- Spanish-language variants when the profile accepts Spanish: `"soporte técnico" "remoto" "vacante" {place}`.

## 3. Hiring signals (company first, posting later)

- Funding: `"raises" "Series A" OR "Series B" SaaS "customer support"` and `"LATAM" "expands" support team`, restricted to news sites (`techcrunch.com`, `contxto.com`, `latamlist.com`). Series A/B companies build support teams, often in LATAM; seed-stage rarely do. Check their careers page for an ATS board and add it to `targets.json` even if no support role is open yet.
- Hacker News "Who is hiring": `allowed_domains: ["news.ycombinator.com", "hnhiring.com"]`, query `support engineer remote {place}`.
- Founders posting openings: LinkedIn can't be read; give the user a LinkedIn search for posts (`"hiring" "support engineer" LATAM`, filtered to the past 24 hours) instead.

## Limits

- Company and posting information only. Searches for people's personal emails, phone numbers or private profiles are out of scope; `outreach` uses only contact routes people publish.
- Respect each site's terms: read pages one at a time through the web-fetch agent or the ATS public APIs, no bulk crawling.
