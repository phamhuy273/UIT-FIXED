# Student duplicate warning MVP

Students are warned before posting and can confirm that they encounter the same
issue instead of adding a new report to the admin queue. A warning never forces
a merge/rejection. Students may explicitly continue with a different/uncertain
issue, and may always post while AI is unavailable.

## Local setup

Backend: `npm ci`, `npm run db:generate`, review/apply the additive migration with
`npm run db:migrate`, then `npm run ai:warmup` and `npm run ai:index`.
Start backend/frontend with their existing start/dev scripts.

The migration adds nullable observation/recurrence fields and separate confirmation
and embedding tables. Existing report times stay unknown. No existing workflow
enum, report-to-incident unique relationship, staff assignment or resolution changes.
Confirmations reference reports (including pending ones), not only incidents.
Foreign keys preserve confirmations; deleting the derived embedding is safe.

The multilingual MiniLM ONNX model is pinned to a revision, runs on CPU through
Transformers.js v3, and is cached under ignored `backend/.cache/models`.
Only model files are downloaded. Report text is processed locally. Set
`AI_MODEL_OFFLINE=true` after downloading to disallow remote model loads.
Model selection source: https://huggingface.co/Xenova/paraphrase-multilingual-MiniLM-L12-v2

Optional backend environment variables:

- `AI_DUPLICATES_ENABLED=false`: disable suggestions, keep ordinary reporting.
- `AI_DUPLICATE_THRESHOLD=0.80`: provisional cosine similarity threshold, not probability.
- `AI_MODEL_OFFLINE=true`: use cached model files only.

Vectors are stored as 384-dimensional PostgreSQL float arrays. This MVP compares
a bounded set in the app and requires no pgvector/container replacement. For larger
datasets, measure candidate recall/latency before adding pgvector indexing.

## Detection and timing

- Input: location, category, title, description, optional observation day + morning/afternoon.
- UI debounce: 1 second; stale requests/results cannot apply to a changed draft.
- Same room AND same category are required BEFORE embedding/title/description comparison.
  A different category is excluded without calling the model for that candidate.
- Pending reports and unresolved approved incidents remain eligible even when old.
- Resolved incidents with a repair in the last 30 days are recurrence candidates.
- A whole observation half-day after resolution: possible recurrence, new PENDING report can reference
  the old incident. Original resolution/history is preserved.
- A whole half-day before resolution: possible late report; confirmation is allowed.
- If the repair falls within the selected half-day, or the student does not know the
  day/half-day, ordering is unknown. Ask “before repair” vs “failed again after repair”.
  The first permits a late confirmation; the second permits a recurrence report.
  An explicit choice cannot override a wholly earlier/later half-day.
- Morning means 00:00–12:00 and afternoon means 12:00–24:00, in campus UTC+7.
  `observedAt` stores the beginning of that bucket, not an exact observation time.
  The UI collects a date and Sáng/Chiều/Không rõ; it does not collect hours/minutes.
  Legacy exact timestamps are treated as half-day observations on incoming requests;
  existing stored rows are not rewritten. This refinement needs no extra migration.
- Reopened incidents are evaluated as open even if they have past resolutions.
- At most 100 recent candidate reports per room are evaluated. `partial` signals
  truncated coverage. At most 3 suggestions are displayed. Scores are not exposed
  as confidence percentages.

Embeddings are cached by model revision and content hash. Checks lazily create or
refresh missing/stale embeddings; failures retry on a subsequent check. `ai:index`
provides resumable bulk backfill before a pilot. Do not run inference inside a DB
transaction. There is no distributed job queue in this MVP.

The runtime allows at most 2 checks in flight, at most 12 checks/student/minute,
and returns an unavailable result after 5 seconds. A timed-out job remains tracked
until it actually finishes so clients cannot flood the CPU queue. Rate limiting
is per-process for local deployment; multiple server replicas need a shared limiter.

## APIs and privacy

All endpoints require JWT and STUDENT role, and use the existing response envelope.

- `POST /api/v1/incident-reports/check-duplicates`: non-persisted draft check.
- `POST /api/v1/incident-reports/:id/confirmations`: expectedUpdatedAt plus optional
  observedAt (half-day start), optional relativeToRepair BEFORE/AFTER for uncertain
  ordering. Locks/rechecks report and incident; same student/report is idempotent.
- `GET /api/v1/incident-reports/my-confirmations?page=1&limit=10`: paginated own tracking.
- `POST /api/v1/incident-reports`: accepts optional observedAt/recurrenceOfIncidentId;
  server validates same room/category, resolved target and temporal order. When
  relativeToRepair AFTER resolves ambiguity, the creation history records the choice.

Shared projections contain only reference labels, controlled symptom labels,
status, timestamps and confirmation count. They never return the author's identity,
raw title/description, photos, private repair notes, embeddings or other followers.
Initial reporting ownership/access remains unchanged. Admin's existing review
modal displays how many additional students confirmed the issue.

Cancellation/rejection of the root remains visible to existing followers and blocks
new confirmations. Followers may explicitly submit a separate report. The system
does not silently promote a follower into a new report or discard their confirmation.

## Manual verification

1. Student A posts a report in a teaching room with a clear symptom.
2. Student B selects that room and writes a paraphrase; wait for the warning.
3. Choose same issue: no new report is created; the issue appears under
   “Sự cố tôi cùng gặp”; admin sees an increased confirmation count.
4. Retry confirmation: the count does not increase again.
5. Choose different/uncertain issue: posting a separate report remains possible.
6. Resolve the original incident in a morning; choose that day's afternoon.
   The warning offers recurrence instead of joining the resolved issue.
7. Choose an earlier day/half-day: late confirmation is permitted. Choose the same
   half-day as repair: it must ask before/after, with no guessed exact time.
   Leave the half-day unknown: only an explicit before/after choice can link to the
   resolved issue; independent new reporting remains available.
8. Cancel/reject a root with followers: tracking shows the actual outcome and a
   link for creating a separate report.
9. Disable AI or remove network access with a cold cache: posting still works.

## Validation and limits

### Admin view-only duplicate groups

The owner selected **group for viewing only; review/reject each report separately**.
No merge, linked canonical report, new lifecycle status, bulk rejection or extra
migration is introduced by this admin feature.

`GET /api/v1/incident-reports/pending-groups` is ADMIN-only, accepts the existing
validated page/limit/building filter and returns groups before pagination. It
considers up to 200 pending reports ordered by urgency and oldest first. A group
requires the same room, category and recurrence reference, plus pairwise semantic
similarity above the configured threshold. Complete-link grouping avoids a chain
where A resembles B and B resembles C but A and C differ. Group urgency is the
highest member urgency; ties use the oldest member. Cached vectors use model/hash;
grouping cache fingerprints pending IDs and updatedAt so review/edit invalidates it.

The queue defaults to “Gom báo cáo tương tự”. Open a group to see all original
authors, text, observation half-days and photos, then choose a comparison report.
“Xem & duyệt riêng” opens the existing review modal. “Từ chối do trùng” only opens
that modal with a proposed reason referencing the comparison code; the Admin must
still confirm rejection and may edit/cancel. Approval continues into normal dispatch.
The choice of comparison report never changes the data or creates shared tracking.

Groups are suggestions, not persisted duplicate verdicts. Refresh/review recomputes
them; a remaining pending report can be suggested again until individually processed.
AI failure/busy/timeout displays individual reports, preserving all existing actions.
Only one admin grouping job is allowed in flight per process, cached for identical
snapshots, with a 5s response deadline; unfinished work stays tracked. If more than
200 pending reports match, the UI explicitly shows partial coverage and provides
“Danh sách thường” to view the entire queue. This fallback is always available.

Automated HTTP tests mock model transport to isolate permissions, state, timing,
idempotency, privacy, stale cache and fallback behavior. `ai:warmup` is a real local
model smoke test; a few sample pairs do not establish model accuracy.

Before broad rollout, label a Vietnamese evaluation set by physical incident, split
train/calibration/test by incident, and measure precision/recall, false warnings,
latency and actual queue reduction. The default threshold is provisional.
Same-room multiple devices, vague descriptions, spelling differences and model
truncation can still produce incorrect suggestions. Students retain the final choice.
Extra text unrelated to the symptom (including test labels and mixed-language
boilerplate) reduced similarity noticeably in manual smoke checks. The threshold
was not lowered just to make those examples match; calibration on real Vietnamese
reports is still needed before relying on automated suggestions at larger scale.
Images are not analyzed or transferred to a common report. Pre-uploaded unsubmitted
photos remain temporary uploads under their existing owner; no cleanup is claimed.
Two independent simultaneous posts can still create two reports if both students
continue/new input arrives before a suggestion. No automatic merge or hard block
is performed. Admin triage remains available for those cases.
