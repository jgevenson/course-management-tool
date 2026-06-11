# Technical Debt & TODOs

## Refactoring

### Frontend & Supabase RPC Optimization for Terrain Overlays
Currently, adding a new terrain overlay (e.g., a Green) from the frontend triggers multiple network calls:
1. `terrainApi.addOverlay` calls `upsert_terrain_overlay` RPC to insert the polygon into the `terrain_overlays` table.
2. It then manually calls `supabase.from('terrain_overlay_holes').insert()` to link the polygon to the respective hole.

To prevent the React frontend from juggling multiple simultaneous database writes and to improve atomicity, we should refactor `upsert_terrain_overlay` to accept an array of `hole_ids`. The RPC can then handle both the polygon insertion and the linking internally in a single server-side database transaction.

## Defects

### Unable to Draw New Shapes in Mapping Mode
- **Description**: Users are unable to draw a new shape while in mapping mode. Clicking the button does not trigger the drawing interaction.
- **Steps to reproduce**:
  1. Enter mapping mode.
  2. Click the button to draw a new shape.
  3. Observe that shape drawing does not initiate.

### Defect: Interior Rings (Donut Holes) Disappear When Entering Edit Mode in Leaflet-Geoman
- **Description**: When a user interacts with a "donut" polygon (a shape containing an interior ring/hole, such as a Fairway with a Green cut out of it) to edit its properties or vertices, the interior ring is immediately deleted. The shape visually fills in, becoming a solid polygon, and Leaflet-Geoman edit markers only appear on the exterior boundary.
- **Steps to Reproduce**:
  1. Draw an outer polygon (e.g., Fairway).
  2. Use Leaflet-Geoman's cut/hole tool to create an interior ring inside the polygon (e.g., a Green).
  3. Save the shape.
  4. Click on the outer polygon to select it or trigger `pm:edit` mode.
  5. Observe the interior ring instantly disappearing, filling with the outer polygon's color.
- **Expected Behavior**: Clicking on a donut polygon should preserve its topology. The interior ring should remain visually intact, and Geoman edit markers should appear on both the exterior boundary and the interior hole boundary.
- **Actual Behavior**: The hole is destroyed, and the polygon reverts to a solid shape comprising only the exterior coordinates.
- **Root Cause Analysis**: The bug occurs during the React state update when the component intercepts the selection or edit event (e.g., `onClick`, `pm:edit`, or `pm:update`). The frontend logic is currently extracting coordinates using manual array parsing—likely something akin to `layer.getLatLngs()[0]`. By hardcoding the `[0]` index, the application successfully grabs the array for the exterior ring but completely discards the subsequent arrays containing the interior rings. When this flattened data is pushed to state, the map re-renders the shape without its holes.
- **Action Items for Resolution**:
  1. **Audit Coordinate Extraction**: Locate all instances where polygon coordinates are extracted from Leaflet layers for state management or database payloads using `.getLatLngs()`.
  2. **Implement Native GeoJSON**: Replace the manual array parsing with Leaflet's native GeoJSON exporter: `layer.toGeoJSON().geometry`. This ensures the nested array structure required for complex polygons (`[ [Exterior Ring Coordinates], [Interior Ring Coordinates] ]`) is mathematically preserved.
  3. **Payload Sanitization**: Ensure the updated logic properly handles `FeatureGroup` or `MultiPolygon` types by safely iterating and extracting only the raw `.geometry` object. Do not accidentally pass a full GeoJSON `Feature` wrapper to our PostGIS backend, as `ST_GeomFromGeoJSON` expects raw geometry.

### Defect: Map Canvas Panning/Shifting During Vertex Manipulation
- **Description**: While modifying the geometry of an existing region (e.g., Fairways, Greens) in the mapping interface, the map abruptly shifts or pans out from underneath the cursor. This specifically triggers when a user creates a new mid-point vertex on an existing polygon edge and attempts to drag it to a new location.
- **Severity**: High (Significantly blocks core user workflow and precision mapping)
- **Steps to Reproduce**:
  1. Navigate to the Open-Yardage Architect dashboard and open a course hole (e.g., Hole 11).
  2. Enter **Mapping/Planning Mode**.
  3. Select an existing region polygon (e.g., Fairway) to expose its vertices.
  4. Hover over an existing segment boundary to reveal a mid-point edit handle.
  5. Click to add/engage the new vertex.
  6. Click and hold the newly created vertex, and begin dragging it to reshape the polygon.
- **Actual Behavior**: The moment the drag action initiates, the entire Leaflet map canvas violently shifts, jumps, or pans. The dragging action struggles to track the cursor properly because the underlying coordinate system is moving simultaneously.
- **Expected Behavior**: The map container should remain completely locked and stationary. The drag interaction should be cleanly isolated to the specific Leaflet-Geoman vertex marker, updating only the polygon's SVG/Canvas layer visually until the drag is released.
- **Suspected Root Causes (Technical Context)**:
  - **Event Propagation**: The pointer/drag events from the marker are "leaking" through to the underlying Leaflet map instance (`map.dragging`), causing the map to attempt to pan simultaneously.
  - **Browser Focus/Scroll Bug**: Leaflet-Geoman often assigns `tabindex` or forces `.focus()` on active edit markers. If the map container has specific CSS transforms or boundary constraints, the browser's layout engine miscalculates the marker's position and triggers a native, forced scroll to bring the "focused" element to the center.
  - **React Re-render Cycle**: The `onDrag` or `onVertexAdded` event may be triggering a React state update that inadvertently causes the map component to re-render or explicitly reset its center coordinates mid-drag.
- **Technical Instructions / Action Items**:
  - **Prevent Event Propagation (Drag Conflict)**: Check the Leaflet-Geoman configuration when edit mode is enabled. Ensure that map dragging is strictly disabled while a shape is actively being edited, or verify that the marker drag events (`pm:dragstart`, `pm:markerdragstart`) are calling `event.originalEvent.stopPropagation()` or `L.DomEvent.disableClickPropagation()`.
  - **Suppress the Native Browser Focus/Scroll Issue**: Leaflet-Geoman sometimes forces browser focus onto the active marker's DOM node. In complex UI layouts, this triggers an aggressive layout shift (native browser scroll). Hook into the Geoman initialization or edit events, intercept the generated marker icons/handles and forcefully remove their `tabindex` attributes, or intercept the focus event so the browser doesn't try to auto-scroll the map container.
  - **Isolate React State Updates**: Check the component that handles the mapping interface (`src/features/map/components/` or similar). Ensure we are NOT updating global React state (like map center coordinates or bounding boxes) rapidly during the `onDrag` event. State should only be synchronized on `pm:dragend` or `pm:edit` to prevent React from re-rendering the map mid-drag.
