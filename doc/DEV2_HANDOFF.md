# Dev 2 - Master data and foundation

Integration note: this document describes the standalone Dev 2 delivery.
The later Dev 3/4 integration intentionally connects the shared components to
the main router and provider setup. See `DEV3_DEV4_INTEGRATION.md` for the
current integrated app and official develop migration history.

## Run locally

```powershell
# Repository root
docker compose up -d postgres

# backend/ (see prisma/README.md before migrating an existing database)
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run start:dev

# frontend/ in another terminal
npm.cmd run dev
```

Open `http://localhost:3000/dev2.html` for the isolated Dev 2 preview.
The existing application entrypoint `/`, `App.tsx`, `main.tsx`, `index.html`
and template `index.css` are preserved. The preview is a development-only Vite
entry, not a report form, admin console or replacement application router.

Local backend configuration is in ignored `backend/.env`; copy
`backend/.env.example` if it does not exist. Frontend defaults to
`http://localhost:5000/api/v1`. Set `VITE_API_BASE_URL` to override it.

Seed is additive and serializes concurrent runs with a transaction advisory lock.
The TypeScript seed uses Node's native type stripping; use Node 22.18+ or Node 24
(the verified local runtime). Node 20 cannot run this seed command directly.
It imports the checked-in public room catalog from
`https://portal.uit.edu.vn/lich-phong` (snapshot 2026-11-04), filtered to LT/TH
teaching rooms only: 7 in A, 64 in B, 30 in C and 12 in E, for 113 rooms.
There are 18 active floor groups and 5 incident categories. Sports areas, meeting
rooms (PH) and auditoriums (HT) are excluded; existing imports outside this scope
are soft-deactivated. The raw 127-entry snapshot is kept for provenance. Source floor values
are preserved even when surprising; see `backend/prisma/data/README.md`.

The former `Nước / Vệ sinh` category is no longer seeded and is soft-deactivated
on existing databases, preserving any historical report references.

Seed updates portal-managed metadata, upgrades matching old sample rooms in
place, and soft-deactivates the remaining generated samples. It does not delete
records, reactivate disabled records or overwrite manually maintained records.
Refresh the catalog with `backend/prisma/data/refresh-uit-rooms.ps1`, review the
JSON diff, then rerun seed. Room data is read from the snapshot without requiring
an external HTTP request during normal seeding.

## API contract

Read-only endpoints follow the existing response envelope:

```json
{
  "statusCode": 200,
  "message": "Success",
  "data": [],
  "timestamp": "2026-11-04T00:00:00.000Z"
}
```

- `GET /api/v1/master-data/locations`: `data` is `BuildingOption[]`.
- `GET /api/v1/master-data/categories`: `data` is `CategoryOption[]`.

Location tree:

```ts
interface BuildingOption {
  id: number;
  name: string;
  description: string | null;
  floors: {
    id: number;
    name: string;
    floorNumber: number | null;
    locations: LocationOption[];
  }[];
  locations: LocationOption[]; // Only areas whose floorId is null
}
interface LocationOption {
  id: number;
  name: string;
  description: string | null;
  locationType: string | null;
  floorId: number | null;
}
interface CategoryOption {
  id: number;
  name: string;
  description: string | null;
}
```

Only active buildings, floors, locations and categories are offered. A location
on an inactive floor or a floor from another building is excluded. Buildings and
locations sort by name then ID; floors sort numerically, with null floor numbers
last, then name and ID. Empty results return `200` with an empty array.

No write endpoints or department/staff assignment workflows are introduced.
Auth is currently a scaffold; the auth owner must apply the agreed access policy
to these read endpoints when connecting guards.

## Integrate with Dev 3's report form

The integrating application must supply a TanStack `QueryClientProvider`.
Import `@/styles/foundation.css` once in its entrypoint to use the shared design
tokens and component/layout styles. Only the isolated Dev 2 preview wires these
up automatically; the main application entrypoint is intentionally untouched.

```tsx
import { useState } from 'react';
import {
  LocationSelector, useLocations, useCategories, isValidLocationSelection,
  type LocationSelection,
} from '@/features/master-data';

const [value, setValue] = useState<LocationSelection>({
  buildingId: null, floorId: null, locationId: null,
});
const locations = useLocations();
const categories = useCategories();

<LocationSelector value={value} onChange={setValue} required />;

// Before submitting the actual report:
if (!isValidLocationSelection(locations.data ?? [], value)) {
  // Show validation feedback and stop submission.
}
// Send buildingId and locationId to the report API; floorId is a UI filter.
// Category IDs are numbers from categories.data.
```

`LocationSelector` fetches/caches the tree and handles loading/errors/retry.
`LocationCascade` accepts a supplied tree for other hosts and component tests.
Changing building clears floor/location; changing floor clears location.
The empty floor option represents common areas when they exist. A location
selection is complete only when `isValidLocationSelection` returns true; native
`required` alone cannot validate a disabled room dropdown with no options.
If cached data changes, validate again before submission. The report backend
must independently validate active records and building/location membership.

## Shared components

- `Button`: primary/secondary/danger/ghost/outline, sm/md/lg, loading, disabled,
  leading/trailing content; defaults to `type="button"`.
- `Input`: associated label, required indicator, helper/error IDs, leading/trailing
  content, forwarded ref and native input props.
- `Badge`: `kind="status"` or `kind="urgency"` plus the uppercase `value`.
  CLOSED is a visual variant from Figma only, not a new DB lifecycle state.
- `Modal`: controlled `open`, `onClose`, title, description, children and footer.
  Native dialog supplies focus containment; Escape/backdrop close and focus return
  are supported. Render one active modal at a time.
- `MainLayout`: accepts navigation items, active item, navigation callback,
  page title and optional top-bar actions. Sidebar collapses below 901px;
  mobile menu supports Escape, focus containment and background inertness.

Shared design tokens and component styles are in
`frontend/src/styles/foundation.css`; import this stylesheet explicitly when
integrating the components. Preview-only pages and styles live under
`frontend/src/dev/`, loaded by `frontend/dev2.html`. They are not wired into the
main application and do not submit incident reports. Navigation items and
callbacks are supplied by the consumer; the layout does not decide user roles,
routes, permissions or authentication state.

## Verification

```powershell
# backend/
npm.cmd run build
npx.cmd vitest run src/modules/master-data/master-data.service.spec.ts

# frontend/
npm.cmd run build
npm.cmd run lint
npm.cmd run test:master-data
```

The original standalone branch had incomplete auth/e2e scaffolds. On the later
integration branch, Dev 1's tests and auth are present and pass together with the
new intake/review tests. Cloudinary uploads require real credentials in ignored env.

Commit messages follow `<type>(<scope>): <imperative description>`, for example
`feat(master-data): add active location tree and category endpoints` and
`feat(ui): add shared components and responsive layout`.
