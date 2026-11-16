---
name: track-applications
description: Brings my-data/applications.md up to date from the user's mailbox and the daily scan, then reports where the search stands. Use when the user asks how their search is going, what's new or what needs follow-up, or mentions news on a posting (applied, interview, rejection, offer).
---

# Track applications

Keeps `my-data/applications.md` current **without relying on the user to report anything**, and turns it into a short status report. Vocabulary in `GLOSSARY.md`. The log's main job is deduplication; outcome statuses (applied, interview, rejected, offer) are a bonus that comes from the mailbox or from what the user volunteers.

## Steps

1. **Tidy.** Run `node scripts/jobs.mjs tidy`: postings gone from their employer's ATS become closed, and stale "to verify" rows become expired.

2. **Read application emails.** When a Gmail or Outlook connector is available, search each connected mailbox for messages received since `mailCheckedAt` in `my-data/.state/scan-state.json` (first time: the last 30 days):
   - Confirmations: `"thank you for applying" OR "thanks for applying" OR "application received" OR "received your application"`.
   - Outcomes: `unfortunately OR "other candidates" OR "not moving forward" OR interview OR "next steps" OR assessment`.
   Add Spanish equivalents when the profile accepts Spanish postings (`"tu postulación" OR lamentamos OR entrevista`). Read a message in full only when its summary doesn't make the outcome clear.
   For each message from an employer or ATS, match it to a row by company and role, then update: confirmation → applied (with date), invitation to talk or a test → interview, rejection or "position filled" → rejected, offer → offer. A confirmation for a posting not in the log gets a new row, marked as found by email. Ignore every other email and keep nothing from it. Never reply, label, move or delete mail. Then set `mailCheckedAt` to now.
   Done when every application email since the last check is reflected in the log.

3. **Apply what the user said.** For news the user gave in the conversation, update the matching row with a dated note; ask only when more than one row could match.

4. **Report**, in one short screen:
   - **Changes made**: what tidy and the mailbox updated, so the user can correct a wrong match.
   - **New today**: postings in `my-data/new-postings.md` that aren't in the log yet; offer `find-jobs` to review them.
   - **Pending actions found in email**: tests, assessments or scheduling requests with their deadlines.
   - **Interviews**: point to that posting's `job.md` talking points and offer to prepare.
   - **Follow-up due**: rows applied 14+ days ago with no later news; offer a short follow-up or an `outreach` message for the user to send.
   - **Ready to tailor**: "new" rows at or above the tailored-CV threshold without a CV.
   - Counts per status, in one line.
