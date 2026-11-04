# Dev 2 scope review

Historical scope note: this review describes the standalone Dev 2 branch. The
user later explicitly authorized implementing Dev 3/4 and integrating their
routes/media flows with Dev 1/2. Those additional edits are documented in
`DEV3_DEV4_INTEGRATION.md` and are intentional on the integration branch.

Reviewed against the four assignment screenshots supplied by the user.
This is a file ownership and functional scope review, not a merge test against
teammates' branches (those branches are not available in this checkout).

| Owner | Owned work | Dev 2 integration boundary |
| --- | --- | --- |
| Dev 1 | Auth, RBAC, user profile, protected routes, auth state | No auth/users/guards/stores/routes changes. Auth owner integrates guards, current user and role-aware navigation. |
| Dev 2 | Master-data read APIs, seed, shared UI/layout, cascade selector | Implemented under master-data, components/ui, components/layout and prisma/seed.ts. |
| Dev 3 | Report creation, own report list/cancellation, report form and media integration | Supplies controlled LocationSelection and consumes category API. Dev 2 does not create report endpoints/forms or attach report photos. |
| Dev 4 | Pending queue, review API, approval/rejection, incident creation | Consumes Badge, Modal, location/category data and layout. Dev 2 does not implement triage, priority sorting or review transactions. |

## Changes made to prevent overlap

- Restored original `frontend/src/App.tsx`, `main.tsx`, `index.css` and
  `frontend/index.html`. No application routing or provider setup is imposed.
- Removed the extra media gallery page. The existing ImageUploader and media
  frontend feature are untouched.
- Moved location/category browsing and UI examples into `frontend/src/dev/`,
  with an independent development entry at `/dev2.html`.
- Split opt-in shared styles (`styles/foundation.css`) from preview styles
  (`dev/dev2.css`). Importing the cascade feature alone does not import demo CSS.
- Kept MainLayout/Sidebar/Navbar independent of auth state and router packages.
  The consumer provides navigation items, selected item, actions and callbacks.
- Kept incident report and admin feature scaffolds untouched. No write API,
  urgency selection workflow, review workflow or report submission was added.

## Shared files that still need coordination

- `backend/src/app.module.ts`: one import and one module registration for
  MasterDataModule. Other developers can register their modules alongside it.
- Backend package configuration adds Prisma DB commands and seed configuration;
  frontend package configuration adds a focused cascade test command. Retain
  other developers' dependency/script additions when merging.
- All consumers use the existing Axios client and response envelope. Dev 1 owns
  token injection/refresh and authorization behavior. Dev 2 does not modify it.

## Earlier schema work is separate from Dev 2

The user separately requested conversion of the complete latest DBML to Prisma
before authorizing Dev 2 implementation. The schema, migrations, local DB setup,
and backend media numeric-ID compatibility changes come from that request.
Do not attribute these to the Dev 2 feature or silently drop them: the updated
Prisma client requires numeric IDs. Keep this schema prerequisite separate from
Dev 2 in commits/PR review, and coordinate ID types with Devs 1, 3 and 4.

Suggested Conventional Commit groups:

1. `chore(prisma): align database schema with latest DBML`
2. `feat(master-data): add location tree category APIs and demo seed`
3. `feat(ui): add shared components layout and location cascade`
4. `docs(dev2): document contracts and integration boundaries`

Keep schema prerequisites and Dev 2 changes in separate Conventional Commits.
