---
name: incident-module
description: Implement and modify UIT-FIXED incident features in the NestJS backend. Use when working on incident reporting, review, approval, rejection, department assignment, reassignment, acceptance, progress updates, resolution, incident history, or incident-related media integration.
---

# UIT-FIXED Incident Module

## 1. Use When

Activate this skill when implementing or modifying:

- Student incident reporting.
- Admin incident review, approval, and rejection.
- Department assignment and reassignment.
- Technical staff assignment acceptance.
- Incident progress updates and resolution.
- Incident history and assignment history.
- Incident evidence and Media integration.

## 2. Don't Use When

- Implementing login, registration, JWT, or general RBAC: use the authentication skill.
- Creating unrelated NestJS modules or generic API utilities: use `nestjs-expert`.
- Designing general database models or Prisma migrations: use `database-prisma`.
- Modifying unrelated frontend features: use the frontend skills.

Always follow `uit-fixed-workflow` for business rules and role permissions.

## 3. Project Context

UIT-FIXED is a UIT campus facility incident reporting and management application.

Technology:

- NestJS 12
- TypeScript
- Prisma 6
- PostgreSQL 16
- Existing Media and Cloudinary integration
- Existing Vitest and Supertest setup

Before implementation, inspect the actual repository. Do not assume that suggested models, fields, routes, or services already exist.

## 4. Workflow

For every incident-related task:

1. Identify the User Story and its Acceptance Criteria.
2. Read `uit-fixed-workflow` and inspect the relevant business rules.
3. Inspect the existing Prisma schema, migrations, modules, DTOs, guards, and services.
4. Identify affected APIs, models, relations, and history records.
5. Define the implementation plan and expected changes.
6. Implement only the requested scope.
7. Add or update tests for business logic, permissions, and error cases.
8. Run relevant tests, lint, and TypeScript checks.
9. Review the final diff and report the results.

For non-trivial changes, present the implementation plan before editing code.

## 5. Incident Lifecycle

Follow the existing approved workflow:

- PENDING → APPROVED → ASSIGNED → IN_PROGRESS → RESOLVED
- PENDING → REJECTED

Rules:

- New incidents start as PENDING.
- Only ADMIN can approve or reject pending incidents.
- Rejection requires a reason.
- Only APPROVED incidents can be assigned.
- Assignment changes status to ASSIGNED.
- The eligible TECH_STAFF member acknowledges the current assignment.
- Acknowledgement changes status to IN_PROGRESS.
- Eligible TECH_STAFF can resolve incidents in IN_PROGRESS.
- Resolution changes status to RESOLVED.
- Clients must not directly control incident status.

Do not introduce new statuses or transitions without approval.

## 6. Core Business Operations

Implement business operations through explicit backend endpoints and service methods.

### Reporting
- Associate the incident with the authenticated student.
- Validate title, description, category, and location.
- Support evidence through the existing Media module.
- Set the initial status to PENDING.

### Review
- Allow ADMIN to review pending incidents.
- Support approval and rejection.
- Require a rejection reason.
- Record the action and actor in incident history.

### Assignment
- Allow ADMIN to assign approved incidents to a Department.
- Use Building.defaultDepartmentId as a suggestion only.
- Allow ADMIN to override the suggested Department.
- Require manual assignment when no default Department exists.
- Preserve previous assignment records.

### Acceptance
- Allow eligible TECH_STAFF to acknowledge the current assignment.
- Verify that the staff member belongs to the assigned Department.
- Update the incident status to IN_PROGRESS.
- Record the accepting user and timestamp.

### Progress
- Allow eligible TECH_STAFF to add progress notes.
- Preserve relevant progress history.
- Do not allow arbitrary status changes through progress updates.

### Resolution
- Allow eligible TECH_STAFF to resolve incidents in IN_PROGRESS.
- Require resolution notes.
- Support after-repair evidence through the existing Media module.
- Record the resolution action in incident history.

Inspect existing routes before adding endpoints. Follow existing API naming conventions and avoid duplicate functionality.

## 7. Assignment and History Integrity

Distinguish these concepts:

- `Building.defaultDepartmentId`: suggested Department.
- `IncidentAssignment.departmentId`: actual Department assigned to an incident.

Requirements:

- Each TECH_STAFF belongs to exactly one Department.
- A Department can have multiple TECH_STAFF members.
- A Department can manage multiple Buildings.
- An incident can have multiple assignment records over time.
- At most one assignment can be current.
- Reassignment must preserve previous assignments.
- The current assignment determines which Department can process the incident.

Never delete assignment history during reassignment.

## 8. Transaction Integrity

Use Prisma transactions when an operation modifies multiple related records.

Examples:

| Operation | Related changes |
|---|---|
| Approve | Incident status + IncidentHistory |
| Reject | Incident status + rejection reason + IncidentHistory |
| Assign | Incident status + IncidentAssignment + IncidentHistory |
| Reassign | Previous assignment + current assignment + IncidentHistory |
| Accept | Assignment acceptance + Incident status + IncidentHistory |
| Resolve | Incident status + resolution information + IncidentHistory |

Requirements:

- Related changes must succeed or roll back together.
- Prevent invalid status transitions.
- Prevent multiple current assignments.
- Consider concurrent requests and race conditions.
- Use database constraints and appropriate transaction mechanisms where possible.

Inspect the actual schema before deciding the implementation.

## 9. Media Integration

- Reuse the existing Media module.
- Reuse the existing Cloudinary integration.
- Do not create another upload service.
- Distinguish initial incident evidence from after-repair evidence.
- Validate that the authenticated user is authorized to associate media with the incident.
- Do not expose private media information.

Inspect the current Media model and API before modifying relationships.

## 10. Authorization

Follow the authenticated identity and authorization rules from the project's authentication infrastructure.

- STUDENT can create incidents and view only their own incidents.
- ADMIN can view and manage all incidents.
- TECH_STAFF can process incidents assigned to their Department.
- Only ADMIN can approve, reject, assign, and reassign.
- Only eligible TECH_STAFF can acknowledge, update progress, and resolve.

Never trust user ID, role, or department ID supplied by the client as proof of authorization.

Do not duplicate authentication or RBAC implementations inside the Incident module.

## 11. Testing

Use the existing Vitest and Supertest setup.

Cover at least:

### Reporting
- Student creates an incident successfully.
- Invalid input is rejected.
- Student cannot create an incident on behalf of another user.

### Review
- ADMIN can approve a pending incident.
- ADMIN can reject a pending incident with a reason.
- Other roles cannot review incidents.
- Already processed incidents cannot be reviewed again.

### Assignment
- ADMIN can assign an approved incident.
- ADMIN can override the suggested Department.
- Missing default Department requires manual assignment.
- Reassignment preserves history.
- Concurrent operations cannot create multiple current assignments.

### Acceptance and Resolution
- Staff in the assigned Department can acknowledge and resolve.
- Staff in another Department cannot process the incident.
- Invalid status transitions are rejected.
- Acceptance and resolution update history consistently.

### Visibility
- STUDENT sees only their own incidents.
- TECH_STAFF sees only incidents assigned to their Department.
- ADMIN sees all incidents.

Also test transaction rollback and relevant failure cases.

## 12. Edge Cases

Pay special attention to:

- Incident is rejected while another request attempts to assign it.
- Incident is reassigned while a previous staff member attempts to accept it.
- Two administrators assign the same incident concurrently.
- Staff attempts to resolve an incident already resolved.
- Incident references a deleted or invalid location.
- Media upload succeeds but incident creation fails.
- A Department has no eligible technical staff.

Do not silently ignore these cases. Handle them according to existing business rules and database constraints.

## 13. Related Skills

- `uit-fixed-workflow`: authoritative business rules and lifecycle.
- `nestjs-expert`: NestJS implementation conventions.
- `database-prisma`: database schema and migration conventions.
- Authentication/RBAC skill: identity and access control.

Avoid duplicating the full contents of these skills.

## 14. Completion Report

After implementation, report:

- User Story implemented.
- APIs and service methods changed.
- Database models or migrations affected.
- Authorization rules enforced.
- Tests executed and their actual results.
- Remaining limitations or unresolved edge cases.

Never claim that tests passed unless they were actually executed.