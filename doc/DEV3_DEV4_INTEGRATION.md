# Dev 3 and Dev 4 integration

The integration branch is based on `develop` after Dev 1's auth merge. It ports
Dev 2 master-data APIs, official room snapshot, UI components, layout and cascade
without replacing Dev 1's authoritative Prisma schema or initial migration.

## Resulting user flows

- A student logs in through the existing JWT flow, chooses a classroom/category,
  proposes optional urgency, supplies a title/description and up to 3 photos,
  then submits a PENDING report.
- The student sees only their own reports and may cancel a PENDING report with
  a reason. Cancellation is a state transition, not record deletion.
- Admin sees pending reports ordered CRITICAL, HIGH, MEDIUM, LOW, then unspecified
  urgency. Within each urgency, older reports come first. Building filter and
  pagination are applied by the backend.
- Admin can inspect photos, confirm/change category and urgency, approve, or
  reject with a reason. Approval creates exactly one PENDING_ASSIGNMENT incident.
- History is stored for report creation/cancellation/approval/rejection and for
  incident creation. Staff assignment/repair workflows remain later work.

## Routes

| Route | Access | Screen |
| --- | --- | --- |
| `/login`, `/register` | Guest | Existing Dev 1 auth |
| `/` | STUDENT | Own report list |
| `/reports/new` | STUDENT | Mobile-friendly report form |
| `/account` | STUDENT | Existing account view |
| `/admin` | ADMIN | Pending triage queue |
| `/admin/account` | ADMIN | Existing account view |
| `/staff` | TECH_STAFF | Existing staff placeholder/account view |
| `/media` | Authenticated | Existing upload page |
| `/dev2.html` | Development preview | Standalone Dev 2 component/API checks |

MainLayout now connects to the React Router and auth store from Dev 1. The app
entry supplies QueryClientProvider and imports shared foundation/workflow CSS.
Report query keys include the signed-in user ID; logout clears the query cache.
Lists refresh every 30 seconds and after mutations; no WebSocket behavior is claimed.

## API

All endpoints use the existing `{ statusCode, message, data, timestamp }` envelope.
IDs are numbers and the actor always comes from the verified JWT/database user.

| Endpoint | Role | Behavior |
| --- | --- | --- |
| `POST /api/v1/incident-reports` | STUDENT | Create report and claim owned uploads |
| `GET /api/v1/incident-reports/my?page=1&limit=10` | STUDENT | Paginated own reports |
| `DELETE /api/v1/incident-reports/:id` | STUDENT | Cancel own pending report, body `{ reason }` |
| `GET /api/v1/incident-reports/pending?page=1&limit=10&buildingId=1` | ADMIN | Priority queue; building filter optional |
| `PATCH /api/v1/incident-reports/:id/review` | ADMIN | Approve or reject |

Create body:

```json
{
  "buildingId": 1,
  "locationId": 1,
  "categoryId": 1,
  "title": "Máy chiếu không lên nguồn",
  "description": "Đã kiểm tra nguồn điện nhưng máy chiếu vẫn không khởi động.",
  "urgency": "HIGH",
  "mediaIds": []
}
```

`urgency` and `mediaIds` are optional. Title is 5-160 characters and description
10-3000 characters after trimming. A report accepts 0-3 unique owned upload IDs.
The code `IR-YYYY-XXXX` is derived from the creation year and immutable numeric
report ID, so codes remain stable and do not need a separate DB column. Sequence
numbers do not restart at each calendar year.

Review bodies:

```json
{ "action": "APPROVE", "categoryId": 1, "urgency": "CRITICAL" }
```

```json
{ "action": "REJECT", "reason": "Báo cáo trùng với phiếu đã tiếp nhận." }
```

Approval may omit category/urgency to reuse the report values, but effective
urgency must be non-null and category must still be active. Cancellation and
rejection require a trimmed reason of 3-1000 characters. Page >=1; limit 1-100.
Invalid payloads return 400, missing/foreign own reports 404, unauthorized roles
403, and attempts to process a non-pending report 409.

## Consistency and media

Create, cancel and review use DB transactions. Conditional updates from PENDING
prevent concurrent approvals/cancellations from both succeeding. Approval,
report history, incident and incident history commit or roll back together.

Media upload/list/delete now require JWT. Temporary uploads belong to the
authenticated user. Submission atomically moves ownership from `user_id` to
`report_id` to honor the single-parent constraint. Already used or foreign
uploads are rejected and the whole submission rolls back. Deleting an upload
locks its row so it cannot be attached during deletion. Attached report photos
cannot be removed through the temporary-upload deletion endpoint.

The upload interceptor enforces 5MB before retaining a file, and validates
PNG/JPEG/WebP content. Frontend shows previews, upload errors and a maximum of
three selected images. Real Cloudinary upload and deletion were verified with
the user's supplied env; no secrets are committed.

The SQL migration after Dev 1's initial migration enforces role/department and
single-parent media checks, same-building location/floor and report/location
foreign keys, one current assignment, and history/incident consistency.

## Local database and env

This session uses a separate local DB `uit_fixed_integrated` to avoid resetting
the earlier `scrum_db`, whose migration history came from the older Dev 2 branch.
The provided env was installed in ignored `backend/.env` while retaining the
integration DATABASE_URL. The earlier local configuration is backed up in
ignored `backend/.env.before-integration.local`. Real JWT/Cloudinary values are
never printed in logs or included in source control.

Use the migration history on the current branch. Do not replay the older Dev 2
bootstrap migrations onto this DB, or mark an incompatible schema as baselined.

```powershell
# backend/
npm.cmd ci
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run start:dev

# frontend/ in another terminal
npm.cmd ci
npm.cmd run dev
```

Seed retains 113 teaching rooms in A/B/C/E and 5 categories. Sports grounds,
meeting rooms, auditoriums and Nước / Vệ sinh are excluded. Original portal floor
values are retained; see `backend/prisma/data/README.md` for source caveats.

## Verification

```powershell
# backend/; controller/e2e tests open localhost sockets
npm.cmd run build
npm.cmd test -- --maxWorkers=1 --no-file-parallelism
npm.cmd run test:e2e -- --maxWorkers=1 --no-file-parallelism

# frontend/
npm.cmd run build
npm.cmd run lint
npm.cmd run test:master-data
```

Verified 77 unit/controller tests, 17 HTTP e2e tests and 4 frontend selection
tests. HTTP tests cover actor spoofing, roles, pagination, location/category
validation, cancellation, priority order, duplicate reviews, review/cancel races,
photo ownership, real multipart validation and concurrent upload claims. The e2e
suite mocks the external Cloudinary upload transport and cleans its own fixtures.
Real Cloudinary was separately verified and its tiny test image removed.

Browser verification covered student submission, admin filtering/approval,
rejection reason display back to the student, and mobile cancellation at 390px.
Local UI-only student/admin accounts and three explicitly labeled test reports
are retained for manual review; credentials are in ignored
`backend/.env.demo-accounts.local`, not in normal seed or Git.

Dev 1's current registration behavior is preserved, including immediate account
activation. SMTP/OTP activation and staff assignment/repair are not added by
this integration.
