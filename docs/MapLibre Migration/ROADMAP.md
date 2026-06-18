# MapLibre v2 — Tool Migration Roadmap

This document outlines the prioritized build order for porting the v1 Leaflet toolset to the v2 MapLibre canvas. The roadmap is sequenced so that each phase builds on the foundation of the previous one: **read-only viewing first, then interaction, then editing**.

All development for v2 takes place in the parallel, isolated [CourseCanvasV2.jsx](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/features/map_v2/CourseCanvasV2.jsx) canvas.

---

## Phase 1: Hole Navigation & View Control
> *Foundation that all subsequent data loading and tools depend on*

| Tool | Description | Rationale |
| :--- | :--- | :--- |
| **Hole Selector** | Left sidebar containing a component that displays the current hole and allows the user to proceed to the next hole or previous hole. When the final hole is reached and the user clicks next hole, they will be taken to the first hole, and the same logic applies for the previous hole. | Every other tool is hole-scoped. Markers, planning guides, and overlays need to be filtered by the active hole. |
| **Overlay Hole-Filtering** | Only show terrain overlays linked to the active hole | Currently, the v2 prototype renders ALL course overlays at once. This scopes the view to the selected hole.  There will be a "course view" that will be implemented later that will provide an overview of all holes from a bird's eye view. |
| **Fly-to-Hole** | Auto-center + zoom when switching holes | Requires computing a bounding box from the active hole's overlays or markers and executing a smooth MapLibre camera flyTo. |
| **Workspace Mode Toggle** | Mapping ↔ Planning switcher in the header | Controls the visibility of specialized sidebars and tools in subsequent phases. |

**Dependencies Unlocked**: Hole-scoped data and coordinate boundaries for all subsequent phases.

---

## Phase 2: Map Markers (Read-Only Rendering)
> *Lightweight — plotting point geometries without editing interactions*

| Tool | Description | Rationale |
| :--- | :--- | :--- |
| **Green Center Marker** | Flag icon placed at the green center coordinate | Core spatial reference point. Renders via a MapLibre `symbol` layer. |
| **Tee Back Marker** | Marker icon placed at the back tee location | Reference point for hole length measurements. MapLibre `symbol` layer. |
| **Planning Markers** | Shot markers (tee, landing areas, pin) | Renders the planned shot sequences for the active hole. |
| **Distance Polylines** | Dashed lines connecting planning markers with yardage labels | Visual-only guides. Uses MapLibre `line` and `symbol` layers. |
| **Dispersion Ellipses** | Club dispersion polygons at landing zones | Pulls from existing `useClubs` + dispersion utils to render MapLibre `fill` layers. |

**Dependencies Unlocked**: Visual marker context for interactive terrain inspection.

---

## Phase 3: Terrain Inspection & Selection
> *First interactive feature — clicking polygons to inspect properties*

| Tool | Description | Rationale |
| :--- | :--- | :--- |
| **Click-to-Select Overlay** | Click a terrain polygon to highlight it | MapLibre makes this trivial using `queryRenderedFeatures` on click. Highlighting updates feature state or layers (e.g., thicker border, increased opacity). |
| **Inspector Panel** | Right sidebar displaying selected overlay properties | Displays terrain type, custom labels, and linked holes. Reuses existing visual design from `RegionPropertiesForm`. |
| **Hover Highlight** | Cursor changes to pointer + subtle opacity bump | Handled efficiently using MapLibre feature states on mouse-enter and mouse-leave. |
| **Deselect Interaction** | Click empty map area or press `Escape` | Resets selection state and hides the inspector. |

**Dependencies Unlocked**: Selected feature reference state needed for editing in Phase 4 and Phase 5.

---

## Phase 4: Point Placement & Editing Tools
> *First map-modification features — clicking and dragging points on the WebGL canvas*

| Tool | Description | Rationale |
| :--- | :--- | :--- |
| **"Back Tee" Placement** | Activate tool → click map → upsert Tee Back marker | Changes cursor to crosshair, captures map click coordinate, and saves via [mapApi](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/services/api/mapApi.js). |
| **Planning Marker Placement** | Click-to-place tee, landing, and pin positions | Extends point placement pattern to multi-shot sequences. |
| **Marker Drag-to-Move** | Drag existing markers to reposition them | Handled using MapLibre's `mousedown`, `mousemove`, and `mouseup` events on symbol layers. |

**Dependencies Unlocked**: Marker placement coordinates needed for hole stats and planning distances.

---

## Phase 5: Polygon Drawing & Region Management
> *Core canvas feature — drawing new polygons and modifying existing boundaries*

| Tool | Description | Rationale |
| :--- | :--- | :--- |
| **Polygon Draw Tool** | Click-to-place vertices, close loop to create polygon | MapLibre does not have built-in drawing tools. Needs a custom interaction layer or integration with `@mapbox/mapbox-gl-draw`. |
| **Region Draft Workflow** | Draw → assign terrain type/label/holes → save | Reuses the existing `RegionOverlayAssignForm` styling. |
| **Region Properties Editing** | Select existing overlay → change properties → save | Updates database attributes via existing `updateRegionProperties` API. |
| **Region Deletion** | Delete selected overlay with confirmation | Calls `terrainApi.removeOverlay` and removes from MapLibre source. |
| **Geometry Editing** | Reshape existing polygons (vertex drag/insert/delete) | Displays draggable vertex handles for the selected polygon to allow fine-tuning shape boundaries. |

> [!IMPORTANT]
> **Drawing Engine Technical Decision**:
> Leaflet v1 uses `@geoman-io/leaflet-geoman-free` for polygon manipulation. MapLibre has no built-in equivalent. Options to evaluate:
> 1. **`@mapbox/mapbox-gl-draw`**: Mature library, handles drawing and editing. Needs theme styling to match dark UI. (Recommended)
> 2. **Custom Vector Overlay Canvas**: Handle SVG overlay drawing mapped to GeoJSON coordinates. Low dependency risk, but requires custom coordinate projection logic.

---

## Phase 6: Advanced & Power-User Tools
> *Completing feature parity with v1 and adding new analytical tools*

| Tool | Description | Priority |
| :--- | :--- | :--- |
| **OSM Feature Import** | Fetch OpenStreetMap geometries in view → click to import | Medium — useful for initial bulk mapping but not daily-driver. |
| **Poly-Alignment Snap** | Snap adjacent polygon boundaries together | Medium — quality-of-life tool executing PostGIS alignment RPCs. |
| **Planning Area Drawing** | Draw freeform planning zones (rectangles, circles) | Lower — planning-mode specific. |
| **LiDAR / Contours Toggle** | Toggle topographic elevation contour overlays | Lower — specialized green-slope analysis. |
| **Hole Stats Panel** | Side-form to edit Par, Stroke Index, and Yardage | Low — simple React form, can be added at any time. |
| **Planning Distances Table** | Table listing shot-by-shot planning yardages | Low — simple React component linked to planning marker positions. |
