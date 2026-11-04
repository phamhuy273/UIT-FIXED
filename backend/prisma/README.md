# Database setup

Run PostgreSQL from the repository root:

```powershell
docker compose up -d postgres
```

For local backend development, run these commands from `backend/`:

```powershell
Copy-Item .env.example .env # Only when .env does not already exist
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:status
```

The local connection uses `127.0.0.1:5432/scrum_db`. Docker Compose injects
the connection using hostname `postgres` for the backend container instead.
Do not commit `.env` or real credentials.

## Existing databases created with db push

The baseline migration represents the original `users` and `media` schema.
Only if an existing database matches that original schema exactly, mark the
baseline as applied before running `db:migrate`:

```powershell
npx.cmd prisma migrate resolve --applied 20261104000100_baseline
npm.cmd run db:migrate
```

A new empty database runs all three migrations normally. No reset is needed.
The MVP migration renames the old `USER` role to `STUDENT` in place. The third
migration updates to the latest DBML: integer IDs and direct staff assignment.

The third migration takes table locks and refuses to proceed if any application
table contains data. Replacing UUIDs with integers on a populated database needs
a separate migration that maps every old ID and foreign key. Do not bypass this
guard or reset a populated database.

## Mapping and constraints

- The 15 models, 6 enums, column nullability, indexes and 28 relationships
  follow the supplied DBML. Prisma fields use camelCase and SQL keeps snake_case.
- IDs and foreign keys are integers; primary keys use `autoincrement()`.
  All date/time columns use PostgreSQL `timestamptz(6)`.
  `updated_at` is maintained by Prisma; raw SQL inserts must supply it.
- `locations.floor_id` is optional. The latest DBML uses separate foreign keys.
  Validate that a location's floor belongs to its building and that a report's
  location belongs to the selected building in application code or future SQL
  constraints; the individual foreign keys alone do not enforce these rules.
- Report urgency is an optional `IncidentUrgency` enum. Admin-confirmed incident
  urgency is required; incident `deadline` is optional.
- Admin selects a department then directly assigns a staff member using required
  `assignee_id`. There is no acceptance step or `accepted_at` field. Staff can
  reject with a reason recorded under the `REJECTED` history action.
- Assignment `is_current` identifies current allocation; `is_active` indicates
  whether it occupies staff workload. User `is_active` means account activation.
- Reports and report histories support `CANCELLED`; only pending reports can be
  cancelled, with a required reason. Incidents cannot be cancelled.
- Custom SQL enforces TECH_STAFF department membership, mutually exclusive media
  user/report/resolution ownership, and one current assignment per incident.
  Keep these migrations: Prisma schema alone does not express those constraints.
- Token invalidation/consumption, report approval and incident creation,
  append-only histories, cancellation/rejection reasons, staff role/department
  validation, department deactivation rules, and actor permissions require
  application transactions and authorization; importing the schema does not
  implement those workflows.

Migrations create the structure only. Run `npm.cmd run db:seed` separately to add
teaching rooms (LT/TH) from the public UIT calendar for buildings A, B, C, E,
plus incident categories. Seed imports 113 rooms from the 127-entry raw snapshot;
sports areas, meeting rooms and auditoriums are excluded and prior imports hidden.
See `prisma/data/README.md` for source mapping, caveats and refresh instructions.
No user accounts are seeded. See `doc/DEV2_HANDOFF.md` at the repository root.
