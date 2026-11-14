# Buscador de Chamba

A system that finds job postings that fit the user's experience and prepares a tailored CV for each one, so the user decides whether to apply.

## Language

**Base CV**:
Verbatim transcription of the user's CV (`my-data/cv-base.md`); the only source of truth about their experience.
_Avoid_: Master resume, general CV

**Job posting**:
An opening published by a company that could interest the user.
_Avoid_: Job, offer, vacancy

**Search profile**:
The user's criteria for considering a posting: roles, seniority, location and work authorization, languages, minimum salary and dealbreakers (`my-data/search-profile.md`).
_Avoid_: Filters, preferences

**Dealbreaker**:
A condition that discards a posting regardless of fit (e.g. phone as the main channel).
_Avoid_: Red flag

**Affinity**:
How well a posting fits the user's experience, scored 1–5; it doesn't require meeting every requirement.
_Avoid_: Match, compatibility

**Gap**:
A posting requirement the base CV doesn't demonstrate.
_Avoid_: Missing skill

**Skill to confirm**:
A skill the user hasn't documented but might have; it enters a tailored CV only after the user confirms it.
_Avoid_: Invented skill

**Tailored CV**:
The base CV reordered and reworded for one specific posting, as an ATS-friendly PDF.
_Avoid_: Custom CV, personalized resume

**To verify**:
Status of a posting that is neither discarded nor accepted yet because a fact is missing (eligible country, salary, or the page didn't load).
_Avoid_: Doubtful, pending
