# Applications

Log of every job posting seen; its main job is to never show the same posting twice. Before showing a posting, check that its link isn't already here.

Statuses: `new` · `to verify` · `discarded` · `cv ready` · `closed` · `expired` · `applied` · `interview` · `rejected` · `offer`

The system sets `new`, `to verify`, `discarded` and `cv ready`; `node scripts/jobs.mjs tidy` sets `closed` (the posting disappeared from the employer's ATS) and `expired` ("to verify" for more than 30 days). Outcome statuses (`applied` onward) are optional: they come from application confirmation or rejection emails, or from what the user says.

| Date | Company | Role | Link | Affinity | Status | Notes |
|---|---|---|---|---|---|---|
