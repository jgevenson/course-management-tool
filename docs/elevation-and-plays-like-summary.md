<!-- AI assisted development -->
# Elevation and plays-like distance (technical reference)

This document describes how the **Open-Yardage Architect** map editor records per-marker ground elevation and how **plays-like** 3D distance is computed in PostgreSQL. It is intended for developers maintaining or extending the feature.

---

## 1. Purpose and scope

- **Elevation:** Each map reference marker (`hole_map_markers`) and each planning marker (`hole_planning_markers`) can store an **elevation in yards** (AMSL), derived at save time from the USGS Elevation Point Query Service (EPQS). Values are **optional** (`NULL` if lookup fails or schema is not migrated).
- **Plays-like distance:** A server-side function combines **horizontal** great-ellipse distance (from PostGIS geography) with **vertical** difference using stored yard elevations, returning a single distance in **yards**. The app may call this RPC for UI that shows “true” 3D yardage; the on-map segment labels still use 2D haversine unless wired to the RPC.

---

## 2. Data model

| Table | Column | Type | Semantics |
|--------|--------|------|-----------|
| `hole_map_markers` | `elevation` | `numeric` (nullable) | Elevation in **yards** above mean sea level at marker placement. |
| `hole_planning_markers` | `elevation` | `numeric` (nullable) | Same. |

`lat` / `lng` (or `long` in the base table for planning) remain the horizontal position; `marker_geom` is updated by the same RPCs that set lat/lng/elevation.

**Views** `hole_map_markers_view` and `hole_planning_markers_view` expose `elevation` to the client. The planning view also exposes `long` and `lng` (alias) for compatibility with UI code.

---

## 3. USGS EPQS and `fetchElevation`

**Module:** [`src/features/map/utils/fetchElevation.js`](../src/features/map/utils/fetchElevation.js)

| Item | Detail |
|------|--------|
| Endpoint | `https://epqs.nationalmap.gov/v1/json` |
| Query | `x` = **longitude**, `y` = **latitude**, `wkid=4326`, `units=Meters`, `includeDate=false` |
| Response | JSON with numeric `value` = elevation in **meters** |
| Output | Meters × **1.09361** → **yards**, rounded to 2 decimal places |
| Invalid input | Non-finite `lat`/`lng` → `null` (no network call) |
| Failure | Any non-OK HTTP, network error, or non-numeric `value` → **`null`** (never throws) |

`fetchElevation` supports an optional `AbortSignal` for cancellation (e.g. future use); the current map flow does not abort in-flight requests when starting another drag.

**Tests:** [`src/features/map/utils/__tests__/fetchElevation.test.js`](../src/features/map/utils/__tests__/fetchElevation.test.js)

---

## 4. HTTP API layer (`mapApi`)

**File:** [`src/services/api/mapApi.js`](../src/services/api/mapApi.js)

### Reads (`fetchHolesWithMarkers`)

- Selects `elevation` from both marker views together with lat/lng and kinds/types.
- **Backward compatibility:** If PostgREST returns an error whose message/details indicate an unknown **`elevation`** column, the client **retries** the same query **without** `elevation` so older databases still load markers.

### Writes (`upsertHoleMarker`, `upsertPlanningMarker`, `movePlanningMarker`)

- All pass **`p_elevation`** into `add_map_marker` / `add_planning_marker` when the migration is applied.
- **Backward compatibility:** If the RPC error suggests a missing `p_elevation` parameter or missing function overload, the client **retries** the call **without** `p_elevation`.

### Contract

- `elevation` may be `null` from `fetchElevation`; the RPC stores `NULL` in the column.

---

## 5. React state and optimistic UI (`useHoles`)

**File:** [`src/hooks/useHoles.js`](../src/hooks/useHoles.js)

Marker placement and moves are **optimistic** for responsiveness:

1. **Synchronous** `setHoles` updates apply new `lat` / `lng` (and for new planning rows, a temporary `pending-{uuid}` id until the server responds).
2. A **fire-and-forget** async IIFE runs: `await fetchElevation` → `await mapApi.*` → second `setHoles` merge with the **server row** (including `elevation` when present).
3. The main thread is not blocked after step 1; multiple markers can be adjusted while earlier background saves complete.
4. **Errors** from the background save set **`markerMessage`** (red banner in [`MapEditorHeader`](../src/features/map/components/MapEditorHeader.jsx)). Successful saves have **no** dedicated “saved” toast (by design, to avoid layout shift).

**Exports used by the map:** `placeMarker`, `movePlanningMarker`, `moveMapMarker`, plus hole loading and stats helpers.

---

## 6. Leaflet integration (`HoleMapPoints`)

**File:** [`src/features/map/components/HoleMapPoints.jsx`](../src/features/map/components/HoleMapPoints.jsx)

| Event | Behavior |
|-------|----------|
| **`drag`** (planning markers only) | Updates an imperative ref map of live positions and redraws polylines/labels/dispersion **without** calling Supabase or USGS. |
| **`dragend`** | Reads final lat/lng, calls `onMarkerMove` / `onPick` / `onMapMarkerMove` **synchronously** (no `await`). Network work happens inside `useHoles`. |

Reference tee/green markers only attach **`dragend`** (no heavy work during drag).

---

## 7. Database logic

DDL lives under **`supabase/migrations/`** (e.g. migration adding elevation and RPCs). Applying changes is done via your Supabase workflow (SQL editor, MCP, CI)—this repo does not require the Supabase CLI.

### 7.1 View recreation

`hole_planning_markers_view` / `hole_map_markers_view` are **`DROP VIEW IF EXISTS ... CASCADE`** then **`CREATE VIEW`** when replacing definitions, because `CREATE OR REPLACE VIEW` cannot rename columns in ways that conflict with existing view columns (e.g. `lng` vs `long`).

### 7.2 Marker RPCs

- **`add_map_marker`** — Upserts by `(hole_id, marker_kind)`; sets `lat`, `lng`, `elevation`, and `marker_geom` (`ST_SetSRID(ST_MakePoint(lng, lat), 4326)`).
- **`add_planning_marker`** — Upserts by `(hole_id, user_id, marker_type, sequence_order)`; writes `long` from `p_lng`, `elevation`, and geometry.

Both accept **`p_elevation numeric DEFAULT NULL`**.

### 7.3 `calculate_plays_like_distance`

**Signature:**

```text
calculate_plays_like_distance(
  p_a_id uuid,
  p_a_table text,
  p_b_id uuid,
  p_b_table text
) RETURNS numeric
```

**Table arguments:** Each of `p_a_table` and `p_b_table` must be the literal name **`hole_planning_markers`** or **`hole_map_markers`**. The function loads `marker_geom` and `elevation` from those tables by id.

**Computation:**

1. Horizontal distance: `ST_Distance(geom_a::geography, geom_b::geography)` → meters; multiply by **1.09361** → yards (`v_dist_yd`).
2. Vertical: \(\Delta\) elevation in yards = `COALESCE(elev_b, 0) - COALESCE(elev_a, 0)` (missing elevation treated as **0** for the delta).
3. Result: \(\sqrt{v\_dist\_yd^2 + \Delta^2}\), rounded to 2 decimal places.

If either geometry is missing, returns **`NULL`**.

**Invocation from JS:** `supabase.rpc('calculate_plays_like_distance', { p_a_id, p_a_table, p_b_id, p_b_table })`.

---

## 8. Units consistency

| Layer | Horizontal distance | Elevation |
|-------|----------------------|-----------|
| EPQS | meters | meters → converted in client to yards |
| Stored columns | lat/lng degrees | yards |
| `calculate_plays_like_distance` | yards (from geography × 1.09361) | yards |
| On-map haversine labels ([`geoDistance.js`](../src/features/map/utils/geoDistance.js)) | yards | N/A (2D only) |

The coefficient **1.09361** matches the meters→yards factor used alongside EPQS conversion.

---

## 9. Operational notes

- **Backfill:** Existing rows created before elevation existed keep `elevation` **NULL** until the user moves/saves the marker again or a batch job updates them.
- **UI consumption of plays-like:** Not wired into [`PlanningDistancesPanel`](../src/features/map/components/HoleWorkspace/PlanningDistancesPanel.jsx) by default; integrate by calling the RPC with two marker ids and explicit table names when needed.
- **Schema docs:** Regenerate [`DATABASE_SCHEMA.md`](DATABASE_SCHEMA.md) with `npm run db:docs` when the database matches production (requires env access to `get_db_metadata`).

---

## 10. Related files (quick index)

| Topic | Location |
|-------|----------|
| EPQS client | [`src/features/map/utils/fetchElevation.js`](../src/features/map/utils/fetchElevation.js) |
| REST/RPC wrapper | [`src/services/api/mapApi.js`](../src/services/api/mapApi.js) |
| Hole/marker state | [`src/hooks/useHoles.js`](../src/hooks/useHoles.js) |
| Map interactions | [`src/features/map/components/HoleMapPoints.jsx`](../src/features/map/components/HoleMapPoints.jsx) |
| Editor shell / errors | [`src/features/map/components/MapCanvas.jsx`](../src/features/map/components/MapCanvas.jsx), [`MapEditorHeader.jsx`](../src/features/map/components/MapEditorHeader.jsx) |
