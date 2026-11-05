---
name: uit-fixed-workflow
description: Authoritative business rules and workflows for UIT-FIXED, a campus facility incident reporting and resolution system for UIT. Use when implementing, reviewing, debugging, or changing authentication, accounts, Reports, Incidents, Assignments, Staff processing, resolution, reopening, permissions, history, locations, or media.
---

# UIT-FIXED Workflow Skill

## 1. Purpose and Scope

This skill defines the authoritative business rules, domain constraints, and workflows for UIT-FIXED.

UIT-FIXED is a facility incident reporting and resolution system for students and facility management personnel at **University of Information Technology (UIT)**.

Use this skill when:

- Implementing or reviewing backend business logic.
- Implementing authentication and authorization.
- Working with Reports, Incidents, Assignments, or Resolutions.
- Implementing role-based access control.
- Managing Departments, Buildings, Floors, Locations, or Categories.
- Working with history, media, or transaction integrity.
- Reviewing whether an implementation follows approved business rules.

### Source-of-truth priority

When sources conflict, follow this priority:

1. Explicitly confirmed decisions from the project owner.
2. This skill, which records the approved business rules.
3. The current approved Prisma schema.
4. Existing implementation, when it does not conflict with approved rules.
5. README and older documentation, only for technical setup or supplementary context.

Do not assume an older README describes the current business workflow.

### Important project constraints

- The system is intended for UIT only.
- Do not expand the product scope to other universities without approval.
- Do not invent actual UIT Departments, Buildings, Floors, Rooms, or other campus reference data.
- Use only reference data supplied or explicitly approved by the project owner.
- Do not modify the database schema or migrations without explicit approval.
- Do not introduce new business states, enums, history actions, or workflows based on assumptions.

---

## 2. Technology Stack and Architecture

### Backend

- NestJS 12
- TypeScript
- Prisma 6
- PostgreSQL 16
- class-validator
- class-transformer
- JWT authentication
- Cloudinary for media storage

### Frontend

- React 19
- Vite 8
- TypeScript
- Axios
- Zustand
- TanStack React Query

### Testing and development

- Vitest
- Supertest
- Oxlint
- Docker Compose

Follow the existing project architecture and coding conventions.

Do not introduce unnecessary architectural changes when implementing a feature.

---

## 3. Roles and Account Rules

The system has exactly three roles:

- `STUDENT`
- `ADMIN`
- `TECH_STAFF`

Each User has exactly one Role.

### STUDENT

- Can register through public registration.
- Can create and manage their own Reports within permitted states.
- Has no Department.
- Cannot perform Admin or Staff operations.

### ADMIN

- Can review and manage all Reports.
- Can approve or reject Reports.
- Can assign and reassign Incidents.
- Can reopen resolved Incidents.
- Can manage user accounts.
- Can manage reference data within the approved project scope.
- Has no Department.

### TECH_STAFF

- Must belong to exactly one Department.
- Can view the work queue permitted for their Department.
- Can reject their own current Assignment.
- Can add progress notes and resolve an Incident only when they are its authorized current assignee.

### Account constraints

- `TECH_STAFF` must have a valid `departmentId`.
- `STUDENT` and `ADMIN` must have `departmentId = null`.
- Public registration can create only `STUDENT`.
- Never accept `role` or `departmentId` from public registration or ordinary profile updates.
- Only Admin can manage ADMIN and TECH_STAFF accounts.
- Backend authorization is authoritative. Never trust a role supplied by the frontend.
- Inactive users cannot access protected endpoints.
- Password hashes must never be returned through APIs.

Admin account management includes:

- Create accounts.
- View accounts.
- Edit accounts.
- Delete accounts.

The exact hard-delete versus soft-delete strategy must respect existing foreign-key constraints and audit-history preservation. Do not change the deletion strategy without approval.

---

## 4. Student Email Validation

The only allowed student email domain is:

`gm.uit.edu.vn`

Email validation must be case-insensitive.

### Accepted

- `student@gm.uit.edu.vn`
- `STUDENT@gm.uit.edu.vn`

### Rejected

- `student@gmail.com`
- `student@uit.edu.vn`
- `student@gm.uit.edu.vn.fake.com`
- `student@fake-gm.uit.edu.vn`
- `student@sub.gm.uit.edu.vn`

### Validation rules

1. Trim leading and trailing whitespace.
2. Validate email format.
3. Normalize email to lowercase before storing or comparing.
4. Validate the exact domain `gm.uit.edu.vn`.
5. Backend validation is authoritative.
6. Frontend validation should mirror backend validation for user experience.

Suggested validation message:

`Vui lòng sử dụng email sinh viên UIT có đuôi @gm.uit.edu.vn.`

Do not use a loose substring check for the email domain.

---

## 5. Authentication Rules

### Current authentication scope

Email activation is deferred.

For the current Auth implementation:

- Do not implement OTP.
- Do not implement SMTP or Nodemailer.
- Do not send activation emails.
- Do not generate activation links.
- Do not create or consume EmailActivationToken records.
- Keep the existing `EmailActivationToken` model and schema unchanged.

Newly registered users must temporarily be created with `isActive = true` so they can log in immediately.

The Prisma schema defaults `User.isActive` to false. Therefore, the registration service must explicitly set `isActive = true`.

### Registration

Registration accepts:

- `fullName`
- `email`
- `password`

`confirmPassword` is frontend-only and must not be treated as an independent persisted field.

Registration rules:

1. Validate required fields.
2. Validate the email format and exact UIT student domain.
3. Normalize the email.
4. Check email uniqueness.
5. Validate the password against the Password Policy below.
6. Hash the password according to the Password Hashing rules below.
7. Create the User with:
   - `role = STUDENT`
   - `departmentId = null`
   - `isActive = true`
8. Never accept a client-supplied role or Department.

### Password Policy

Registration passwords must satisfy:

- Minimum length: 8 characters.
- Maximum size: 72 bytes in UTF-8. bcrypt only uses the first 72 bytes, so longer passwords are rejected.
- At least one Unicode letter. Accented Vietnamese letters count as letters.
- At least one digit.

Apply the same validation policy in frontend and backend.

Backend validation is authoritative.

### Password Hashing

- Use bcrypt with a cost factor of 12.
- Never store plaintext passwords.
- Never return password hashes through APIs.
- Do not change the hashing algorithm or cost factor without explicit approval.

### Login

Login uses email and password.

Rules:

1. Normalize email before lookup.
2. Verify password using bcrypt.
3. Reject invalid credentials with a generic error message.
4. Reject inactive accounts.
5. Issue a JWT after successful authentication.
6. Never return password hashes.

### JWT

- JWT secret and expiration must come from environment variables.
- Never hardcode secrets.
- Keep the JWT payload minimal, such as `sub` and `role`.
- Verify that the user still exists and is active when accessing protected endpoints.
- Load the current role from the database when necessary to avoid trusting stale role information in a token.
- Do not implement refresh tokens unless explicitly approved.

### Authentication components

Follow existing NestJS conventions for:

- JWT Strategy.
- JWT Guard.
- Roles decorator.
- Roles Guard.
- CurrentUser decorator.

Expected authorization behavior:

- `401 Unauthorized`: unauthenticated or invalid authentication.
- `403 Forbidden`: authenticated but insufficient permissions.

### Current user endpoint

`/users/me` must derive the identity from the authenticated JWT.

Never accept an arbitrary `userId` query parameter to retrieve the current user's profile.

### Frontend authentication

The frontend Auth implementation should support:

- Register.
- Login.
- Zustand Auth Store.
- Axios bearer-token interceptor.
- ProtectedRoute.
- Role-based routing.
- Logout.
- Token expiration handling.

Follow the existing token-storage architecture. Do not store passwords.

HttpOnly Secure Cookies may be considered later, but do not derail the current implementation by introducing a different authentication architecture without approval.

---

## 6. Core Domain Model

The current Prisma schema contains these models:

- `User`
- `EmailActivationToken`
- `Department`
- `Building`
- `Floor`
- `Location`
- `Category`
- `Media`
- `IncidentReport`
- `IncidentReportHistory`
- `Incident`
- `IncidentAssignment`
- `IncidentProgressNote`
- `IncidentResolution`
- `IncidentHistory`

### Important enums

`Role`:

- `STUDENT`
- `ADMIN`
- `TECH_STAFF`

`ReportStatus`:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

`IncidentStatus`:

- `PENDING_ASSIGNMENT`
- `ASSIGNED`
- `IN_PROGRESS`
- `RESOLVED`

`ReportHistoryAction`:

- `CREATED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

`IncidentHistoryAction`:

- `CREATED`
- `ASSIGNED`
- `REASSIGNED`
- `REJECTED`
- `RESOLVED`
- `REOPENED`

`IncidentUrgency`:

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`

### Important schema constraints

- IDs and foreign keys use `Int` with autoincrement.
- Do not assume IDs are UUID strings.
- `Incident.reportId` is unique.
- `IncidentReport.urgency` is nullable.
- `Incident.urgency` is required.
- `Incident.deadline` is nullable.
- `IncidentAssignment.assigneeId` is required.
- `IncidentAssignment` contains `isCurrent` and `isActive`.
- `IncidentResolution` stores the resolution note, resolver, and resolution time.
- `Media` can be associated with a Report or a Resolution.
- Deadline is stored on `Incident.deadline`. Assignment records do not store a deadline.

Some partial unique indexes, CHECK constraints, and composite foreign keys are documented as SQL migration considerations. Do not modify or introduce them without approval.

---

## 7. Report Workflow

A Report represents a student's submitted facility issue before Admin approval.

Report and Incident are separate entities with separate statuses and separate history records.

### Report creation

A Student creates a Report.

Initial state:

`PENDING`

The Report includes relevant information such as:

- Student.
- Category.
- Building.
- Location.
- Title.
- Description.
- Optional urgency.
- Optional media attachments.

The Student's urgency is optional.

### Report editing

A Student may edit only their own Report while its status is:

`PENDING`

The exact field-level restrictions for editing have not been fully confirmed.

Do not invent additional field restrictions. Preserve existing approved behavior and ask for clarification before changing it.

### Report cancellation

A Student may cancel only their own Report while its status is `PENDING`.

Cancellation reason is mandatory.

Validation rules:

- The reason must not be empty.
- Trim leading and trailing whitespace before measuring length.
- The reason must contain at least 3 characters.
- The reason must contain at most 1000 characters.
- Backend validation is mandatory.
- The validated reason must be persisted in `IncidentReportHistory.reason`.

When cancelled:

1. Change Report status to `CANCELLED`.
2. Create an `IncidentReportHistory` record.
3. Use action `CANCELLED`.
4. Record the authenticated Student as actor.
5. Persist the cancellation reason.
6. Do not create an Incident.

### Admin approval

Admin can approve a Report only when its status is `PENDING`.

Approval must perform these operations:

1. Change Report status to `APPROVED`.
2. Create an `IncidentReportHistory` record with action `APPROVED`.
3. Create exactly one linked Incident.
4. Set the new Incident status to `PENDING_ASSIGNMENT`.
5. Determine the Incident urgency.
6. Create an `IncidentHistory` record with action `CREATED`.

One Report can have at most one Incident because `Incident.reportId` is unique.

Approval and Incident creation must happen in one database transaction.

### Admin rejection

Admin can reject a Report only when its status is `PENDING`.

Rejection rules:

1. Change Report status to `REJECTED`.
2. Require a non-empty rejection reason.
3. Persist the reason.
4. Create an `IncidentReportHistory` record with action `REJECTED`.
5. Do not create an Incident.

The rejection reason is mandatory even if the frontend already validates it. Backend validation is required.

Apply the same length rule as cancellation: after trimming, at least 3 characters and at most 1000 characters.

### Urgency handling

- Student may optionally provide urgency.
- Admin may override or adjust the submitted urgency.
- `IncidentReport.urgency` may be null.
- `Incident.urgency` must always have a valid value when created.
- Do not assume an urgency default unless explicitly approved or already implemented as an approved rule.

There is no dedicated history action or before/after field for urgency changes. Do not invent an audit mechanism or misuse an existing history action.

---

## 8. Incident Workflow

An Incident is created only after Admin approves its linked Report.

Initial state:

`PENDING_ASSIGNMENT`

Incident urgency is required.

Incident deadline may be null while the Incident is waiting for assignment.

### Incident status lifecycle

The approved status lifecycle is:

`PENDING_ASSIGNMENT → ASSIGNED → IN_PROGRESS → RESOLVED`

Additional transitions include:

- Assignment rejection: `ASSIGNED → PENDING_ASSIGNMENT`
- Reassignment: `ASSIGNED → ASSIGNED` and `IN_PROGRESS → ASSIGNED`
- Reopening: `RESOLVED → ASSIGNED`

Do not introduce additional IncidentStatus values.

### Assignment requirements

Admin must select both:

1. Department.
2. Specific Tech Staff.

The selected Staff member must belong to the selected Department.

There is no self-claim workflow.

A Department's default assignment configuration is only a suggestion. It does not replace Admin's explicit selection.

### Deadline requirements

Deadline must be provided when:

- Creating an initial Assignment.
- Reassigning an Incident.
- Reopening a resolved Incident.

Persist every supplied deadline on `Incident.deadline`. Assignment records do not have a deadline field.

Deadline may be null while an Incident is `PENDING_ASSIGNMENT`.

No confirmed policy currently exists for:

- Past deadlines.
- Timezone authority.
- Deadline editing after assignment.
- Deadline-change audit.

Do not invent these policies.

---

## 9. Assignment Workflow

Every assignment attempt must create a separate `IncidentAssignment` record.

Never overwrite an old Assignment's assignee or Department.

### Creating an Assignment

Admin selects a Department and a specific Staff member.

Create an Assignment with:

- `incidentId`
- `departmentId`
- `assignedById = Admin`
- `assigneeId = selected Staff`
- `isCurrent = true`
- `isActive = true`
- `endedAt = null`

Then:

1. Persist the supplied deadline on `Incident.deadline`.
2. Change Incident status to `ASSIGNED`.
3. Create an `IncidentHistory` record.
4. Set action to `ASSIGNED`.
5. Link the new Assignment through `assignmentId`.

All operations must happen in one transaction.

### Staff rejects an Assignment

A Tech Staff member may reject only their own current Assignment.

When rejected:

1. Set old Assignment `isCurrent = false`.
2. Set old Assignment `isActive = false`.
3. Set `endedAt` to the rejection time.
4. Preserve the old Assignment.
5. Change Incident status from `ASSIGNED` to `PENDING_ASSIGNMENT`.
6. Create an `IncidentHistory` record.
7. Use action `REJECTED`.
8. Record the Staff actor.
9. Link the old Assignment through `assignmentId`.
10. Record the status transition and rejection reason when supplied.

Do not delete or reactivate the old Assignment.

Whether a Staff rejection reason is mandatory is not conclusively confirmed. Preserve existing behavior and ask before introducing a mandatory rule.

### Incident reassignment

When Admin reassigns an Incident, the new Assignment replaces the previous Assignment.

Approved status transitions:

| Previous Incident status | New Incident status |
| --- | --- |
| `ASSIGNED` | `ASSIGNED` |
| `IN_PROGRESS` | `ASSIGNED` |

Reassignment must perform:

1. Validate that the Incident is in `ASSIGNED` or `IN_PROGRESS`.
2. Close the previous Assignment:
   - `isCurrent = false`
   - `isActive = false`
   - `endedAt` = reassignment time.
3. Immediately revoke the previous Staff member's processing authority.
4. Preserve the previous Assignment without modifying its original assignee or Department.
5. Admin selects a new Department and a Staff member belonging to that Department.
6. Require a new Deadline and persist it on `Incident.deadline`.
7. Create a new Assignment:
   - `isCurrent = true`
   - `isActive = true`
   - `endedAt = null`.
8. Set Incident status to `ASSIGNED`.
9. Create an `IncidentHistory` record with action `REASSIGNED`.
10. Record the correct `fromStatus` and `toStatus`.
11. Link the new Assignment through `assignmentId`.
12. Preserve the previous Assignment and all historical records.

All reassignment operations must execute in one database transaction.

The new Staff member receives processing authority through the new current and active Assignment.

Do not reassign an Incident in `PENDING_ASSIGNMENT` or `RESOLVED` through this operation. Reopening a resolved Incident uses the reopening workflow.

### Assignment history preservation

Assignment records are historical records.

Do not delete previous Assignments or modify their original assignee or Department information.

---

## 10. Staff Processing Workflow

A Tech Staff member may process an Incident only if they are its authorized current assignee.

Backend validation must verify:

- Authenticated user has role `TECH_STAFF`.
- `assigneeId` matches the authenticated user.
- Assignment belongs to the requested Incident.
- Assignment is current.
- Assignment is active.
- Incident status permits the requested operation.

Never trust client-supplied:

- `userId`
- `role`
- `departmentId`
- `assignmentId`
- Incident status

### Starting work

Starting work transitions:

`ASSIGNED → IN_PROGRESS`

However, `IncidentHistoryAction` does not currently contain an action for `STARTED` or `IN_PROGRESS`.

Do not:

- Add a new enum value without approval.
- Misuse `ASSIGNED`, `RESOLVED`, or another history action to represent starting work.
- Modify the schema to work around this without approval.

The audit strategy for the `IN_PROGRESS` transition remains an open question.

### Progress notes

A Staff member may add progress notes only when they are the authorized current assignee.

Progress notes are append-only.

Use `IncidentProgressNote`.

Do not overwrite previous notes.

### Resolving an Incident

Only the authorized current assignee can resolve an Incident.

Resolution requires:

- A non-empty `resolutionNote`.
- `resolvedById` derived from the authenticated Staff user.
- `resolvedAt`.
- A new `IncidentResolution` record.

Resolution may include optional media through `Media.resolutionId`.

After successful resolution:

1. Create `IncidentResolution`.
2. Change Incident status to `RESOLVED`.
3. Create `IncidentHistory` with action `RESOLVED`.
4. Link the relevant Assignment.
5. Link the new Resolution.

All operations must happen in one transaction.

---

## 11. Reopening a Resolved Incident

Only Admin can reopen a resolved Incident.

Reopening requires a non-empty reason.

Admin must also select:

- A new Department.
- A new Tech Staff member belonging to that Department.
- A new Deadline.

Reopening must perform:

1. Verify Incident is currently `RESOLVED`.
2. Verify the previous Assignment.
3. Close the previous Assignment:
   - `isCurrent = false`
   - `isActive = false`
   - `endedAt = reopening time`
4. Preserve the previous Assignment.
5. Create a new Assignment:
   - `isCurrent = true`
   - `isActive = true`
   - `endedAt = null`
6. Persist the new deadline on `Incident.deadline`.
7. Change Incident status from `RESOLVED` to `ASSIGNED`.
8. Create `IncidentHistory` with action `REOPENED`.
9. Record Admin as actor.
10. Record the mandatory reason.
11. Link the relevant Assignment references.

All operations must happen in one transaction.

Multiple reopen cycles are allowed.

Preserve all previous:

- Assignments.
- Progress notes.
- Resolutions.
- Incident history.

Never delete previous resolution records when reopening.

---

## 12. Assignment Flags: isCurrent and isActive

These fields have different meanings.

### isCurrent

Represents the current/latest Assignment in the assignment history.

Approved behavior:

| Situation | isCurrent |
| --- | --- |
| New Assignment | true |
| Assignment rejected | false |
| Assignment replaced/reassigned | false |
| Incident resolved but not reopened | true |
| Previous Assignment closed during reopening | false |

### isActive

Represents whether the Assignment is currently effective for processing.

Approved behavior:

| Situation | isActive |
| --- | --- |
| New Assignment | true |
| Assignment rejected | false |
| Assignment reassigned/replaced | false |
| Previous Assignment closed during reopening | false |
| New Assignment during reopening | true |

### Important unresolved case

When an Incident becomes `RESOLVED`:

- The current Assignment remains `isCurrent = true`.
- Its `endedAt` remains null.
- The value of `isActive` is not yet confirmed.

Do not infer that `isActive` must become false simply because the Incident is resolved.

Only close the Assignment when the approved workflow requires it, such as rejection, reassignment, or reopening.

---

## 13. Authorization and Data Visibility

### STUDENT

A Student may:

- Create Reports.
- View their own Reports.
- View linked Incident information according to the approved UI.
- Edit their own Reports while `PENDING`.
- Cancel their own Reports while `PENDING`.

A Student must not access another Student's private Report unless a shared-view rule is explicitly approved.

### ADMIN

Admin may:

- View all Reports.
- Approve or reject pending Reports.
- Set or adjust urgency.
- Assign and reassign Incidents.
- Reopen resolved Incidents.
- Manage user accounts.
- Manage approved reference data.
- View operational records and histories.

### TECH_STAFF

Tech Staff may:

- View the work queue permitted for their Department.
- Reject their own current Assignment.
- Add progress notes when currently assigned.
- Resolve Incidents when currently assigned.

Department work-queue visibility does not mean every Staff member can process every Incident in that queue.

### Separate read and write permissions

The system must distinguish:

1. Department work-queue visibility.
2. Historical or sensitive Incident read access after an Assignment ends or is replaced.
3. Permission to process an Incident.

A Staff member who loses an Assignment immediately loses processing authority.

Historical read access after losing an Assignment is not fully confirmed. Do not grant sensitive historical details by assumption.

### Backend authorization

Always enforce authorization in backend services and guards.

Do not rely only on:

- Frontend route protection.
- Hidden UI buttons.
- Client-supplied role.
- Client-supplied user ID.
- Client-supplied Department ID.

---

## 14. History and Audit Rules

The system has two separate history models.

### IncidentReportHistory

Used only for Report lifecycle events.

Allowed actions:

- `CREATED`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Examples:

| Event | History model | Action |
| --- | --- | --- |
| Student creates Report | IncidentReportHistory | CREATED |
| Admin approves Report | IncidentReportHistory | APPROVED |
| Admin rejects Report | IncidentReportHistory | REJECTED |
| Student cancels Report | IncidentReportHistory | CANCELLED |

Admin rejection reason is mandatory.

Student cancellation reason is mandatory.

### IncidentHistory

Used for Incident lifecycle and Assignment events.

Allowed actions:

- `CREATED`
- `ASSIGNED`
- `REASSIGNED`
- `REJECTED`
- `RESOLVED`
- `REOPENED`

Examples:

| Event | History model | Action |
| --- | --- | --- |
| Incident created after approval | IncidentHistory | CREATED |
| Admin assigns Staff | IncidentHistory | ASSIGNED |
| Admin changes Staff | IncidentHistory | REASSIGNED |
| Staff rejects Assignment | IncidentHistory | REJECTED |
| Staff resolves Incident | IncidentHistory | RESOLVED |
| Admin reopens Incident | IncidentHistory | REOPENED |

### History rules

- History is append-only.
- Never update or delete historical records.
- Do not mix Report history with Incident history.
- Report rejection and Assignment rejection are different events.
- Report rejection uses `IncidentReportHistory`.
- Assignment rejection uses `IncidentHistory`.

There is currently no dedicated history action for:

- Starting work / transitioning to `IN_PROGRESS`.
- Urgency changes.
- Deadline changes.

Do not misuse existing actions to represent these events.

---

## 15. Location and Reference Data

A Report references:

- Category.
- Building.
- Location.

### Location validation

When creating or editing a Report:

1. Validate that the selected Location exists.
2. Validate that the Location belongs to the selected Building.
3. If the Location has a Floor, validate that the Floor belongs to the same Building.

Only active reference data should be selectable for new Reports:

- Category.
- Building.
- Floor.
- Location.

Preserve existing Admin workflows for managing reference data.

### Default Department

`Building.defaultDepartmentId` is only a suggestion for assignment.

It does not automatically assign an Incident.

Admin must explicitly select the actual Department and Tech Staff member.

### Data integrity

Never invent:

- UIT Building names.
- Floor names or numbers.
- Room names.
- Department names.
- Campus organizational structures.

Only use data supplied or explicitly approved by the project owner.

---

## 16. Media and Evidence

The current schema supports media associations through `Media`.

### Report media

Report attachments use:

`Media.reportId`

### Resolution media

Resolution evidence uses:

`Media.resolutionId`

### Ownership and association

Validate:

- Media ownership.
- Uploader identity when applicable.
- Correct Report or Resolution association.
- Whether the media is allowed to be associated with the requested record.

Preserve the existing Cloudinary upload flow.

### Unconfirmed media requirements

The following requirements have not been confirmed:

- Whether Report images are mandatory.
- Whether Resolution evidence is mandatory.
- Maximum number of files.
- Allowed file types.
- Maximum file size.
- Additional allowed media types.

Do not make evidence mandatory.

Do not invent file-count, file-size, or file-type restrictions.

Preserve existing implementation behavior unless a change is explicitly approved.

---

## 17. Transaction Integrity and Concurrency

Use database transactions for multi-record business operations.

### Required transaction operations

#### Approve Report

- Update Report status.
- Create Report history.
- Create Incident.
- Create Incident history.

#### Assign Incident

- Validate Department and Staff.
- Create Assignment.
- Persist `Incident.deadline`.
- Update Incident status to `ASSIGNED`.
- Create Incident history.

#### Reject Assignment

- Close Assignment.
- Update Incident to `PENDING_ASSIGNMENT`.
- Create Incident history.

#### Resolve Incident

- Create Resolution.
- Update Incident to `RESOLVED`.
- Create Incident history.

#### Reopen Incident

- Close previous Assignment.
- Create new Assignment.
- Persist the new `Incident.deadline`.
- Update Incident status to `ASSIGNED`.
- Create Incident history.

#### Reassign Incident

- Validate that the Incident is `ASSIGNED` or `IN_PROGRESS`.
- Close previous Assignment.
- Create new Assignment.
- Persist the new `Incident.deadline`.
- Set Incident status to `ASSIGNED`.
- Create Incident history with the correct `fromStatus` and `toStatus`.

### General integrity rules

- Validate all DTOs and backend inputs.
- Enforce state-transition preconditions in services.
- Prevent duplicate or invalid transitions.
- Handle concurrent operations safely.
- Derive identity and authorization from the authenticated user and database.
- Never trust client-supplied status.
- Never expose password hashes.
- Never expose activation token hashes.
- Preserve append-only history.
- Follow existing NestJS API error conventions.

Add tests for both allowed and forbidden transitions.

---

## 18. Testing Requirements

Tests should cover business rules, authorization, and invalid transitions.

### Authentication

- Successful registration.
- Invalid email domain.
- Invalid email format.
- Duplicate email.
- Password shorter than 8 characters.
- Password without a letter.
- Password without a digit.
- Password longer than 72 UTF-8 bytes.
- Password hashing uses bcrypt cost factor 12.
- Successful login.
- Invalid credentials.
- Inactive account rejection.
- JWT verification.
- Missing or invalid JWT.
- `/users/me` identity derived from JWT.

### Role-based access

- STUDENT cannot access Admin endpoints.
- STUDENT cannot access Staff processing endpoints.
- ADMIN can access authorized management endpoints.
- TECH_STAFF cannot access Admin-only operations.
- Inactive users cannot access protected endpoints.

### Reports

- Student can create a Report.
- Student can view only their own private Reports.
- Student can edit their own pending Report.
- Student cannot edit another Student's Report.
- Student cannot edit a non-pending Report.
- Student can cancel their own pending Report.
- Cancellation requires a reason of 3 to 1000 characters after trimming.
- Student cannot cancel another Student's Report.
- Admin can approve only pending Reports.
- Approval creates exactly one Incident.
- Admin rejection requires a reason.
- Rejection does not create an Incident.
- Duplicate approval does not create duplicate Incidents.

### Assignments

- Admin must select Department and Staff.
- Staff must belong to selected Department.
- Assignment requires Deadline and persists it on `Incident.deadline`.
- New Assignment has correct flags.
- Staff can reject only their own current Assignment.
- Rejection closes the old Assignment.
- Rejection returns Incident to `PENDING_ASSIGNMENT`.
- Reassignment from `ASSIGNED` stays `ASSIGNED`.
- Reassignment from `IN_PROGRESS` returns the Incident to `ASSIGNED`.
- Reassignment preserves the previous Assignment.
- Reassignment revokes previous Staff processing authority.
- Reassignment persists the new Deadline on `Incident.deadline`.
- Reopening creates a new Assignment.
- Reopening requires a reason and Deadline.

### Staff processing

- Only current authorized Staff can add progress notes.
- Only current authorized Staff can resolve an Incident.
- Previous assignees cannot continue processing.
- Resolution requires a non-empty note.
- Resolution creates the correct Resolution and history records.

### Location and media

- Location must belong to selected Building.
- Floor must belong to the same Building.
- Inactive reference data cannot be selected for new Reports.
- Media ownership and association must be validated.

---

## 19. Implementation Guidelines for AI Coding Agents

Before modifying code:

1. Identify the specific feature or business flow.
2. Read this skill.
3. Read only the relevant additional skills.
4. Inspect the existing implementation and related files.
5. Compare existing behavior with the approved rules.
6. Identify missing information or conflicting behavior.
7. Present a concise implementation plan before making broad changes.
8. Implement in small, reviewable phases.
9. Run relevant tests and report results.

### Relevant skills

Use only skills relevant to the task.

Examples:

- Authentication: `nestjs-expert`, `backend-development`, `uit-fixed-workflow`.
- Incident workflow: `incident-module`, `uit-fixed-workflow`, `nestjs-expert`, `backend-development`.
- Database/Prisma: `database-prisma` when database behavior is relevant.
- Frontend: `design-taste-frontend`, `vercel-react-best-practices`.
- UI composition: `vercel-composition-patterns` when appropriate.
- UI review: `web-design-guidelines` when appropriate.

Do not read every skill for every task.

### Database safety

The existing database connection and migrations are already completed.

Do not:

- Re-run Prisma initialization.
- Re-run database setup.
- Run `prisma migrate` without approval.
- Run `prisma db push`.
- Modify Prisma schema without approval.
- Create or modify SQL migrations without approval.
- Change existing primary-key or foreign-key types.

### Code change scope

- Prefer small changes.
- Avoid unrelated refactoring.
- Do not scan the entire repository without a clear reason.
- Inspect only relevant files and dependencies.
- Follow existing naming and folder conventions.
- Do not create duplicate business logic in controllers and services.
- Keep business validation in the appropriate backend service layer.
- Do not rely on frontend validation for security.

### Reporting implementation results

After implementation, summarize:

1. Files changed.
2. Business rules implemented.
3. API or UI behavior affected.
4. Tests executed.
5. Test results.
6. Remaining limitations or unresolved decisions.

Do not claim tests passed unless they were actually executed successfully.

---

## 20. Open Business Questions — Never Guess

The following decisions remain unresolved. If an implementation depends on one of them, ask the project owner before deciding.

### 1. Assignment isActive after resolution

When an Incident becomes `RESOLVED`:

- `isCurrent` remains true.
- `endedAt` remains null.
- Whether `isActive` remains true or becomes false is not confirmed.

Do not infer the value.

### 2. Audit for IN_PROGRESS

IncidentStatus includes `IN_PROGRESS`, but IncidentHistoryAction has no corresponding action.

Do not invent or misuse a history action.

### 3. Urgency-change audit

Admin may adjust urgency, but the schema has no dedicated history action or before/after fields.

Do not invent audit behavior or change the schema without approval.

### 4. Historical Staff read access

Department queue visibility is separate from historical or sensitive Incident access after an Assignment ends.

Do not grant historical access by assumption.

### 5. Deadline edits

It is not confirmed whether Admin can edit a Deadline after assignment or whether changes must be audited.

### 6. Past Deadline and timezone

It is not confirmed whether past deadlines are allowed or which timezone is authoritative.

### 7. Staff Assignment rejection reason

It is not conclusively confirmed whether Staff must always provide a rejection reason.

Preserve existing behavior until clarified.

### 8. Assignment acceptance

There is no acceptance status or field in the current schema.

Do not add an acceptance workflow without approval.

### 9. Report editable fields

Student editing of their own pending Report is confirmed, but exact field-level restrictions are not.

### 10. Media requirements

Mandatory evidence, file count, file types, file size, and allowed media types are unspecified.

Do not invent requirements.

### 11. Account deletion strategy

Admin account deletion is supported as a management requirement, but hard-delete versus soft-delete and history preservation must follow existing referential behavior.

Ask before changing the strategy.

---

## 21. Final Checklist

Before considering an implementation complete, verify the relevant items.

### Reports

- Report and Incident have separate statuses and histories.
- Student edits only their own pending Report.
- Student cancels only their own pending Report.
- Cancellation reason is mandatory, 3 to 1000 characters after trimming.
- Approving a Report creates exactly one Incident.
- New Incident starts as `PENDING_ASSIGNMENT`.
- Rejecting a Report does not create an Incident.
- Admin rejection reason is mandatory.
- Student urgency is optional.
- Incident urgency is required.
- Admin may override Student urgency.

### Assignments and Incidents

- Admin selects both Department and Tech Staff.
- Selected Staff belongs to the selected Department.
- No self-claim workflow.
- Deadline is required for assignment, reassignment, and reopening, and is stored on `Incident.deadline`.
- Each assignment attempt creates a separate Assignment.
- Old Assignments are preserved.
- Rejected Assignment is closed.
- Rejection returns Incident to `PENDING_ASSIGNMENT`.
- Reassignment is allowed only from `ASSIGNED` or `IN_PROGRESS`, and the Incident ends as `ASSIGNED`.
- Reassignment closes the old Assignment.
- Reopening closes the previous Assignment and creates a new one.
- After resolution, current Assignment remains `isCurrent = true` and `endedAt = null` until reopening.
- Do not guess `isActive` after resolution.

### Processing and security

- Only the current authorized assignee can process an Incident.
- Only the current authorized assignee can add progress notes or resolve.
- Progress notes are append-only.
- Resolution requires a non-empty resolution note.
- Resolution creates an IncidentResolution.
- Incident becomes `RESOLVED` after successful resolution.
- Resolution history links the Assignment and Resolution.
- Backend enforces authorization and validates the current Assignment.
- Client-supplied user IDs, roles, Department IDs, and statuses are not trusted.
- Passwords require 8 characters, one Unicode letter, one digit, and at most 72 UTF-8 bytes.
- Passwords are hashed with bcrypt cost factor 12.
- Multi-record operations use transactions.
- History is append-only.
- Media ownership and association are validated.
- No evidence requirement or file limit is invented.
- No UIT location or Department is invented.
- Older README business flows are not treated as the source of truth.
- Admin account management supports create, view, edit, and delete.
- No unauthorized schema or migration changes are made.
