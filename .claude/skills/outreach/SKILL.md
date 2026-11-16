---
name: outreach
description: Finds the person hiring for a job posting and drafts a short, personal message for the user to send themselves. Use when the user wants to contact a hiring manager, founder or recruiter about a posting, or after applying to a posting at or above the tailored-CV threshold at a small company.
---

# Outreach

Gets the user in front of the person who decides, before the pile of applications does. Vocabulary in `GLOSSARY.md`. The user sends every message; this skill finds, drafts and logs. Drafts live in the posting's folder, and nothing is sent on the user's behalf.

Outreach pays off most at companies small enough that a team lead or founder reads messages (roughly under 200 people) and for postings the user has applied to or is about to apply to. A message adds to the application; it doesn't replace it.

## Steps

1. **Pick the posting.** Read its `my-data/jobs/<folder>/job.md` (run `tailor-cv` first if there is none; add the "Company brief" section if an older `job.md` lacks it) and its row in `my-data/applications.md`. Done when you know the role, the company brief, and the user's strongest backed match for it.

2. **Find the hiring person.** In order: a name in the posting itself ("Hi, I'm Joe, Head of Customer Success"); the company's team, about or blog pages; then web search for the likely owner of the role (Head of Support / Customer Success / Customer Experience, or a founder at small companies). LinkedIn profiles can't be read: give the user a LinkedIn search to run themselves (e.g. `"Head of Customer Success" Whippy`). Record name, role and source. Use only contact routes the person or company publishes (LinkedIn, a published email, a careers or contact address); skip email-guessing and scraping tools. Done when you have a person with a source, or have told the user none was found and offered the company's hiring contact instead.

3. **Draft the message.** Write it in the posting's language, in the user's voice, under 5 lines:
   - Line 1: who the user is and the role they applied to.
   - Line 2–3: one concrete reason this company (a detail from the company brief or the posting, not praise) and one backed result that maps to the role's main problem.
   - Last line: a light ask (a short call, or where to send more detail).
   Every claim follows the same backing rule as `tailor-cv`. Produce two versions: a LinkedIn connection note within 200 characters, and a message or email of up to 5 lines with a subject line. Done when both fit their limits and every claim is backed.

4. **Save.** Write `my-data/jobs/<folder>/outreach.md` with the person (name, role, source, contact route), both drafts, and a two-line follow-up draft. Add `Outreach: <date> (<name>)` to the posting's notes in `applications.md` so a later run doesn't draft a second message. Whether it was sent is not tracked.

5. **Deliver.** Show the user who to contact, why them, and both drafts. If they ask for an email draft and a Gmail or Outlook connector is available, create a **draft** in their mailbox for them to review and send; never send it.

## Follow-up

The follow-up draft is for 5–7 business days without a reply: two lines adding something new (a relevant fix the user made, a question about the product), then stop. The user decides when to send it.
