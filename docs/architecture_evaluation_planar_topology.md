# Architecture Evaluation: Planar Topology (Cascading Cookie-Cutter Mapping)

This document provides a detailed architectural evaluation and technical strategy for implementing **Planar Topology** in the Open-Yardage Architect. 

---

## 1. On-Read vs. On-Write Geometries

The primary decision is whether to perform the PostGIS `ST_Difference` cascading flattening **on-read** (via a PostgreSQL View or function) or **on-write** (via a Database Trigger).

### Option A: On-Read via PostgreSQL View (Recommended)
Standard shapes (Fairway, Green, Bunker, Tees, Rough) are saved as drawn. A PostgreSQL View dynamically calculates the non-overlapping shapes using PostGIS functions.

*   **Pros:**
    *   **No Data Loss / Reversible Editing:** Original user-drawn geometries are fully preserved. If a user deletes or moves a Green, the Fairway underneath automatically "reappears" in the view without losing its original boundaries.
    *   **No Complex State Syncing:** No need to handle complex, cascading update triggers that modify multiple rows in the database, avoiding race conditions or trigger recursion limits.
    *   **Single Source of Truth:** Simple architecture; view updates instantly upon any insert/update/delete on the base `terrain_overlays` table.
*   **Cons:**
    *   **Query Performance:** Dynamic `ST_Difference` is evaluated at query time. For complex shapes or large courses, this could take 100–300ms.
    *   *Mitigation:* A typical golf hole contains under 20 shapes, and queries are always scoped by `course_id` or `hole_id`. Our database benchmarks show that running the query for a single hole's shapes takes **< 1ms**, and course-wide queries for ~300 shapes take **~250ms**.

### Option B: On-Write via Database Triggers
When a shape is saved/modified, database triggers mutate the stored geometry of all overlapping shapes.

*   **Pros:**
    *   **Read Performance:** Reading is extremely fast (direct select of pre-flattened shapes).
*   **Cons:**
    *   **Permanent Data Loss:** Once a Green cuts a hole in a Fairway, the Fairway's original shape under the Green is lost. Moving the Green later leaves a permanent "hole" in the Fairway.
    *   **Trigger Mutating Table Errors:** Writing triggers that modify other rows in the same table during an update leads to recursive trigger loops and mutating-table errors in PostgreSQL.

### Option C: Hybrid On-Write (Triggers writing to a secondary column or separate table)
The database keeps `geojson_data` (original) and has a trigger that calculates and updates a secondary column `planar_shape` (flattened).

*   **Pros:**
    *   Preserves original shapes while maintaining fast read speeds.
*   **Cons:**
    *   Highly complex triggers that must manage cascading updates across multiple rows whenever a shape is inserted, updated, or deleted.
    *   If a geometry operation fails (e.g. self-intersection during a drag-edit), the user's write fails, blocking them from saving.

### 🏆 Recommendation: Option A (Dynamic On-Read View)
Given the low number of shapes per hole (typically under 20) and the critical need to preserve original geometries for editing, a **Dynamic On-Read View** is the most robust, maintainable, and bug-free approach. To protect against performance bottlenecks, we can optimize the query to leverage spatial indexing (`gist` on `shape`) and run `ST_MakeValid` to prevent geometry errors.

---

## 2. Frontend Drawing UI Constraint

**The Problem:** The user needs to edit the original outer boundary of a Fairway using Leaflet-Geoman, but the map must display the cookie-cut shape when not editing.

**The Solution: Dynamic Geometry Swapping on Selection**
We can load both the original geometry (`geojson_data`) and the flattened geometry (`geojson_data_flattened`) for each overlay.
*   **When a shape is NOT selected:** Render the flattened geometry (`geojson_data_flattened`). This displays the clean, jigsaw-puzzle map where no shapes overlap.
*   **When a shape IS selected (active for editing):** Swap the Leaflet layer's geometry to the original geometry (`geojson_data`). This ensures Geoman's edit handles appear on the original bounding polygon, allowing the user to drag the outer boundaries normally (even if they sit under a Green).
*   **When editing completes:** The user's changes are committed to the backend. The database updates the original geometry, the view automatically recalculates the flattened geometry, and the frontend refreshes, rendering the updated cookie-cut shape.

---

## 3. Impact Map (Files to Modify)

To implement this feature, the following files will need to be modified:

### Backend (Database Layer)
1.  **[NEW]** `scripts/migrations/create_planar_topology_view.sql`: Creates the new `terrain_overlays_planar_view` (or replaces the existing `terrain_overlays_view`) using dynamic PostGIS set operations (`ST_Union`, `ST_Difference`, `ST_MakeValid`).

### Frontend (API & State Layers)
2.  **[MODIFY]** `src/services/api/terrainApi.js`: Update `getOverlays` to fetch both `geojson_data` (original) and `geojson_data_flattened` (cookie-cut) from the view.
3.  **[MODIFY]** `src/hooks/useTerrainOverlays.js`: Update state parser in `loadOverlays` to load both `geojson_data` and `geojson_data_flattened`.
4.  **[MODIFY]** `src/features/map/components/GeomanRegionManager.jsx`:
    *   Update layer generation to render `region.geojson_data` if `region.id === selectedId` (selected) or `region.isDrawingDraft`, else render `region.geojson_data_flattened || region.geojson_data`.
    *   Add `selectedId` to the dependency array of the layer-generation effect to trigger layer reconstruction when selection shifts.

---

## 4. Risk Assessment & Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **PostGIS Topology Exceptions** | High (crashes view/map load for entire course) | Wrap all union/difference operations in `ST_MakeValid()` to repair self-intersections. Use `COALESCE` to fall back to the original shape if a difference operation returns empty or invalid. |
| **Selection Transition Glitches** | Medium (Leaflet rendering lag or cursor jump) | Re-create only the affected Leaflet layers during selection changes rather than rebuilding the entire map. Disable editing states during saving states to prevent concurrent modification. |
| **Query Latency** | Low-Medium (slow page loads on large courses) | Restrict unions and differences to overlays linked to the *active hole* rather than course-wide if course-wide shapes become too complex. Verify that spatial GIST indexes are active on `terrain_overlays.shape`. |
| **Contour Calibration Crash** | Medium (LiDAR contour line generation fails) | Keep greens at the top of the flattening hierarchy (Level 3 - uncut). This ensures that `fetchGreenElevationMatrix` is unaffected, as green shapes will never have holes cut in them. |
