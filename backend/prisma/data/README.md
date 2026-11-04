# UIT public room catalog

Application scope: **teaching rooms only** (LT and TH in buildings A/B/C/E).
Seed imports 113 rooms: A 7, B 64, C 30, E 12. Sports areas, meeting rooms (PH)
and auditoriums (HT) are excluded. The 14 previously imported out-of-scope
locations are soft-deactivated; the Sân tập group and unused floors are hidden.
The full 127-entry source snapshot below is retained only for provenance and
reproducible filtering, not as the list offered by the application.

Source: https://portal.uit.edu.vn/lich-phong

Snapshot retrieved on 2026-11-04 from the public room calendar's JSON payload.
Only room metadata is retained. Bookings, class schedules, attendees and account
information are not stored.

| Portal place | Application group | Unique locations |
| --- | --- | ---: |
| Nhà A | Tòa A | 10 |
| Nhà B | Tòa B | 64 |
| Nhà C | Tòa C | 31 |
| Nhà E | Tòa E | 14 |
| Sân tập | Sân tập | 8 |
| Total | | 127 |

The PH (meeting room) tab returns 4 rooms already included in these places;
records are deduplicated by the portal room ID. `Sân tập` is a logical place
group represented by the existing Building model, not a fifth physical tower.
This is the calendar's published catalog, not a claim to inventory every space
on campus.

## Exact source mapping

- `place_name` maps explicitly to the application group name above.
- `name` is stored as the Location name; code, portal ID, capacity, source URL,
  snapshot date and original floor/type are retained in Location.description.
- The portal's room ID is provenance, not the local autoincrement primary key.
- `floor` supplies Floor.name/Floor.floorNumber. No floor is inferred from code.
- `room_type_code` is stored unchanged as Location.locationType. The snapshot
  contains LT, TH, PH and HT. No unverified type reclassification is applied.
- On this snapshot A215/A315 have source floor `1`; E112/E114/E116/E118 have
  source floor `11`; HTE has source floor `12`. Sân tập entries have source
  floor `1`. These are preserved, even when code/physical usage suggests another
  interpretation. Confirm with UIT before correcting them.

## Refresh and import

From the repository root, using PowerShell with normal HTTPS verification:

```powershell
& ./backend/prisma/data/refresh-uit-rooms.ps1
```

Review the snapshot diff, then from `backend/`:

```powershell
npx.cmd vitest run prisma/data/portal-catalog.spec.ts
npm.cmd run db:seed
```

Refresh visits only the six tab codes published by the calendar client. It parses
JSON; it never executes page scripts. It rejects missing groups or conflicting
metadata and does not replace the snapshot until all requests complete.

Seed validates the snapshot before changing DB records. Repeated imports reuse
portal markers and local IDs; legacy sample rooms matching a verified room code
are upgraded in place. Other generated sample locations are soft-deactivated,
not deleted. Empty legacy sample floors absent from the real catalog are also
deactivated. Existing activation choices and manually maintained records are
preserved. A record absent from a future portal snapshot is not automatically
deleted or deactivated, since the calendar might temporarily omit it.
