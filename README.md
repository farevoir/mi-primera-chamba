# Mi Primera Chamba

**English** · [Español](README.es.md)

A job search assistant that runs inside [Claude Code](https://claude.com/claude-code). It finds open positions that fit your CV and writes an ATS-friendly CV tailored to each one. **You** decide what to apply to, and **you** submit every application.

> *"Chamba"* is Mexican slang for "job": *Mi Primera Chamba* means "my first job".

![Example of a tailored CV](example/cv-preview.png)
<sub>A tailored CV for a fictional candidate, generated from [`example/`](example/).</sub>

## Why it exists

"Auto-apply" tools send hundreds of generic or AI-inflated applications in your name. Recruiters flag them as spam and interview rates stay low. This project takes the opposite approach:

| Auto-apply bots | Mi Primera Chamba |
|---|---|
| Apply for you, in bulk | Prepares; **you** apply |
| Rewrite your experience freely | **Every claim is backed** by your real CV or a skill you confirmed |
| Hundreds of untargeted applications | 5–10 verified, ranked postings per search |
| Your data on their servers | Your data stays in a local folder that Git ignores |

## What it does

1. **Learns your profile.** It reads your CV and asks a few questions: target roles, countries you can work for, minimum salary, dealbreakers.
2. **Finds jobs early.** A script reads the public job APIs of your target companies (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Breezy, Recruitee, Teamtailor, Rippling) in seconds, at no AI cost. It can run every morning in GitHub Actions and notify you of new postings by email and on your phone, so you can apply in the first days, with your computer off. Claude finds new companies with search dorks aimed at those ATSs instead of the crowded job boards, checks that each posting is open and that you're eligible, and ranks postings by *affinity* (1–5).
3. **Tailors your CV.** For a posting you like, it first writes a short company brief and checks the fit. Then it maps each requirement to your experience and asks you about missing skills instead of inventing them. It renders a one-page PDF with real text and a single column, and checks it for ATS and recruiter-scan issues.
4. **Helps you reach the person hiring.** At small companies it finds who owns the role and drafts a short, personal message for you to send.
5. **Tracks without chores.** It logs every posting seen, so you never get the same posting twice. Closed postings are detected from the employer's ATS, and application outcomes from your confirmation and rejection emails, so you don't have to report anything.

## Requirements

- [Claude Code](https://claude.com/claude-code) (needs a Claude Pro/Max subscription or an API key)
- [Node.js](https://nodejs.org) 18 or newer
- Google Chrome, Microsoft Edge, Chromium or Brave (used headless to print the PDF)
- Windows, macOS or Linux

## Quick start

```bash
git clone https://github.com/farevoir/mi-primera-chamba.git
cd mi-primera-chamba
claude
```

Then just talk to it in plain language, in any language:

| You say | What happens |
|---|---|
| *"Set up my profile, here's my CV: ~/Downloads/cv.pdf"* | `setup-profile`: creates your private `my-data/` folder |
| *"Find me jobs"* | `find-jobs`: returns a ranked list of verified postings |
| *"Make a CV for this posting: <link or pasted text>"* | `tailor-cv`: creates a tailored PDF, a company brief and interview notes |
| *"Who should I message at Acme?"* | `outreach`: finds the person hiring and drafts a message for you to send |
| *"I applied to Acme"* / *"How is my search going?"* | `track-applications`: updates statuses and lists follow-ups |

### Daily alert in the cloud (no computer needed)

Keep `my-data/` in a **private** GitHub repo and let GitHub Actions run the scan every morning, free of charge (about 1 minute of Actions a day). New postings arrive as a GitHub issue, which you get by email and in the GitHub mobile app.

1. Make `my-data/` its own private repo: `git -C my-data init`, commit, then `gh repo create <you>/<name>-data --private --source my-data --push`.
2. Copy [`templates/github-actions/daily-scan.yml`](templates/github-actions/daily-scan.yml) to `my-data/.github/workflows/` and push. Set the repository variable `TOOL_REPO` if you use a fork of this repo.
3. On your computer, the project's Claude Code hooks pull `my-data/` when a session starts and push it when Claude finishes a reply (`scripts/sync-data.mjs`), so both sides stay in sync.

Prefer to keep everything local? Schedule `node scripts/jobs.mjs daily` with Task Scheduler or cron and read `my-data/new-postings.md`.

With the data in GitHub, you can also open the data repo in Claude Code on the web from your phone.

Want to see the output first? Browse [`example/`](example/): a fictional candidate's profile, application log and tailored CV.

## Use it from your phone

Start Claude Code on your computer and turn on **Remote Control**, and you can drive it from the Claude mobile app or claude.ai. Your computer does the work, so it has to stay on and awake. Claude can send you the generated PDFs on your phone, so you can apply right there.

## Project layout

```
my-data/                    YOUR data (git-ignored). Same shape as example/
├── applications.md         Every posting seen and its status: start here
├── new-postings.md         What the daily alert found
├── jobs/<company>-<role>/  Per posting: tailored cv.html + PDF, job.md (brief, gaps, interview notes), outreach.md
├── profile/                About you: cv-base.md, cv.html, confirmed-skills.md, search-profile.md, targets.json
└── .state/                 Internal state of the scripts; no need to open

example/                    A fictional candidate (Jane Doe) showing every output, plus cv-preview.png
templates/                  Blank versions of the profile files, used by setup-profile
.claude/skills/             The skills: setup-profile, find-jobs, tailor-cv, outreach, track-applications
scripts/
├── jobs.mjs                scan · daily · tidy · posting (public ATS APIs, no AI)
├── html-to-pdf.mjs         HTML → PDF with a local Chromium browser, plus CV checks
├── sync-data.mjs           Pulls/pushes my-data/ when it is a private git repo (Claude Code hooks)
└── lib/                    Shared code: ATS adapters, log reader, paths, text helpers
```

You can also render any CV by hand:

```bash
node scripts/html-to-pdf.mjs my-data/profile/cv.html
```

## Privacy

- Everything personal lives in `my-data/`. That folder is in `.gitignore`, so pushing your fork never publishes your CV.
- While you use it, Claude Code sends your CV and the job postings to Anthropic's API to process them. Web searches and page fetches go to the job sites. Nothing else is uploaded.
- Nothing is ever sent to an employer. You submit each application and send each message yourself.
- Searches cover companies and postings only. It never looks up people's private emails or phone numbers.
- If you connect Gmail or Outlook to Claude, `track-applications` reads only application emails (confirmations, rejections, interview invites) to update your log, so you never have to report an application. It never replies to, moves or deletes mail.

## Limits

- LinkedIn and Indeed block automated reading. Paste those postings as text and the CV still gets tailored.
- Job boards are full of stale postings. Expect roughly 2 out of 7 search results to survive verification.
- Salaries are often unpublished. Those postings are marked **to verify** instead of being discarded.
- The CV template is deliberately plain. Single-column, real-text layouts parse best in applicant tracking systems.

## Customize

- **Criteria:** edit `my-data/profile/search-profile.md` or say *"change my search criteria"*.
- **Companies to watch:** add boards to `my-data/profile/targets.json` (e.g. `{ "ats": "greenhouse", "board": "gitlab" }`), then run `node scripts/jobs.mjs scan`.
- **CV design:** edit `templates/cv-template.html` before setup, or `my-data/profile/cv.html` after it. Keep it single-column.
- **Better sources for your country:** `find-jobs` appends what worked to the "Source notes" section of your profile.

## License

[MIT](LICENSE). Use it for your own job search, fork it and adapt it. Please keep the human-in-the-loop spirit: don't turn it into an auto-apply bot.
