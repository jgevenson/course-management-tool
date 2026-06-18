# MapLibre v2 Prototype — Current Implementation Details

This document provides a highly detailed technical breakdown of the MapLibre GL JS (v2) parallel prototype. It outlines the architectural decisions, data pipelines, visual styling systems, and comparison with the legacy Leaflet (v1) implementation.

The prototype is fully implemented and accessible in development at `/v2/course/:courseId` (for example, `/v2/course/21856943-87b3-4fc6-a9e0-fed43c992e4a` to test on *Blue Top Ridge*).

---

## 1. Motivation for Migration
The open-yardage course mapping canvas has historically used Leaflet (DOM-based rendering) for its interface. While functional, it suffers from several core limitations:
1. **Map-Shifting on Rotation**: Leaflet's DOM-based rotation causes coordinate shifting and rendering artifacts, making it difficult to maintain precise alignment when rotating the viewport.
2. **Donut-Polygon Topologies**: Leaflet requires complex, brittle plugins or custom SVG paths to natively render polygons with holes (e.g., a green with a bunker in the center, or a fairway surrounding a tee box).
3. **Performance Scaling**: Rendering hundreds of individual SVG polygons (such as the 298 distinct overlays on *Blue Top Ridge*) degrades DOM performance.
4. **Lack of 3D Perspective**: Leaflet does not natively support viewport pitching/tilting (3D perspective), which is vital for visualizing slope and elevation.

**MapLibre GL JS** resolves these issues natively by utilizing a **WebGL/WebGPU-accelerated canvas**, providing smooth 60fps rendering, hardware-accelerated drawing, native support for nested polygon rings (donut holes), and full 3D pitch and rotation.

---

## 2. Architecture & File Structure

The MapLibre v2 implementation is designed for **strict isolation**. It does not modify, delete, or refactor any existing Leaflet v1 files or routing, ensuring zero regressions on the stable production code.

### File Manifest
* **Main Component**: [CourseCanvasV2.jsx](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/features/map_v2/CourseCanvasV2.jsx) (408 lines) — Contains the React mounting shell and raw MapLibre GL JS instance/lifecycle management.
* **Stylesheet**: [CourseCanvasV2.css](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/features/map_v2/CourseCanvasV2.css) (276 lines) — CSS rules using a BEM-inspired hierarchy, including dark-theme overrides for MapLibre widgets.
* **Routing**: [App.jsx](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/App.jsx) (Lines 69–76) — Mounts the v2 component at the parallel path `/v2/course/:id`.

### Component Lifecycle
Rather than wrapping MapLibre in a React library (which adds unnecessary abstraction and overhead), the component uses raw MapLibre GL JS instantiated inside a React `useEffect` hook:

```javascript
const mapContainerRef = useRef(null)
const mapRef = useRef(null)

useEffect(() => {
  if (!mapContainerRef.current || !courseState.course || mapRef.current) return

  const map = new maplibregl.Map({
    container: mapContainerRef.current,
    style: { ... },
    center: [lng, lat],
    zoom: 16,
    pitchWithRotate: true,
    dragRotate: true,
    maxZoom: 22,
  })
  
  mapRef.current = map
  return () => {
    map.remove()
    mapRef.current = null
  }
}, [courseState.course])
```

---

## 3. Map Configuration & Tile Styling

### Imagery Base Layer
Since we are bypassing Mapbox/MapLibre online style endpoints, the map is configured with an **inline style object** conforming to the Mapbox Style Specification. It fetches raster tiles directly from the Esri World Imagery REST service:

* **Tile URL**: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
* **Tile Size**: `256px`
* **Maximum Native Zoom**: `19` (MapLibre upscales tiles to `22` using bilateral filtering)
* **Attribution**: Credited to Esri, USDA, USGS, IGN, and the GIS user community.

### Interactive Options
* `pitchWithRotate: true` & `dragRotate: true`: Enables 3D camera controls. Users can pitch the map (tilt up to 60°) and rotate the heading.
* **Navigation Control**: Mounted at `top-right`, with `visualizePitch: true` enabled (making the compass ring tilt dynamically as the user pitches the map).
* **Scale Control**: Mounted at `bottom-right`, set to `imperial` units (feet/yards), matching standard golf metrics.

---

## 4. Database Integration & Data Pipeline

### Coordinate Order Translation
Leaflet uses `[latitude, longitude]` ordering for coordinates, whereas MapLibre GL JS and the GeoJSON specification strictly enforce `[longitude, latitude]` (X, Y).
* When loading the course center coordinates, the values are swapped:
  ```javascript
  const center = [course.course_lng, course.course_lat]
  ```

### Terrain Data Querying
The component utilizes the existing [terrainApi.getOverlays](file:///c:/Users/Jacob.Evenson/course-managment-tool/course-management-tool/src/services/api/terrainApi.js#L7) hook, which retrieves database rows from the `vw_planar_terrain_overlays` view.

```
[Database] ────> [terrainApi.getOverlays] ────> [overlaysToFeatureCollection] ────> [MapLibre Source]
```

### The GeoJSON Format Gotcha (Fixed)
The database view returns `geojson_data` as a **bare PostGIS geometry object** (e.g. `{ type: "Polygon", coordinates: [...] }`), whereas standard MapLibre inputs require a GeoJSON **Feature** wrapper.
To handle this, a helper function `overlaysToFeatureCollection` was built to normalize both bare geometries and full GeoJSON Features:

```javascript
function overlaysToFeatureCollection(overlays) {
  const features = (overlays ?? [])
    .filter((o) => o.geojson_data)
    .map((o) => {
      const gj = o.geojson_data
      // Extract geometry: if Feature, get .geometry; if bare geometry, use directly.
      const geometry = gj.type === 'Feature' ? gj.geometry : gj

      if (!geometry || !geometry.coordinates) return null

      return {
        type: 'Feature',
        geometry,
        properties: {
          ...((gj.type === 'Feature' && gj.properties) || {}),
          id: o.id,
          terrain_type: o.terrain_type,
          label: o.label,
        },
      }
    })
    .filter(Boolean)

  return { type: 'FeatureCollection', features }
}
```

---

## 5. Data-Driven Styling & Layers

Instead of rendering separate SVG nodes for each polygon, the prototype loads all 298 overlays into a single MapLibre **GeoJSON Source** (`course-terrain`) and renders them using two WebGL layers:

### 1. Fill Layer (`terrain-fills`)
* **Type**: `fill`
* **Opacity**: `0.35`
* **Color Expression**: Handled dynamically on the GPU using a MapLibre `match` expression mapping `terrain_type` directly to colors:

```javascript
const TERRAIN_COLORS = {
  green:     '#14b8a6', // Teal
  tee:       '#a3e635', // Lime
  fairway:   '#22c55e', // Green
  rough:     '#166534', // Dark green
  bunker:    '#fde68a', // Sand/Yellow
  water:     '#38bdf8', // Blue
  trees_ob:  '#57534e', // Stone gray
  cart_path: '#94a3b8', // Slate gray
  unknown:   '#9ca3af',
}
```

This color palette mirrors `src/features/map/utils/regionTerrain.js` from v1, ensuring full visual consistency between the two versions.

### 2. Outline Layer (`terrain-outlines`)
* **Type**: `line`
* **Color**: `#ffffff` (White)
* **Width**: `1.5px`
* **Opacity**: `0.6`
* Provides a clean, crisp separation between adjacent terrain polygons.

---

## 6. UI & UX Features

### Dark Theme Palette
The canvas layout is styled with a modern dark theme to highlight the aerial imagery:
* **Background**: Slate-900 (`#0f172a`)
* **Sidebars**: Translucent slate background with backdrop filters: `background: rgba(15, 23, 42, 0.92); backdrop-filter: blur(4px);`
* **Glow Badge**: A custom `"MapLibre v2"` badge in the header features a breathing purple animation indicator (`animation: v2-pulse 2s infinite`).

### MapLibre Widget Styling Overrides
By default, MapLibre UI controls are bright white with sharp shadows. In `CourseCanvasV2.css`, these are overridden to integrate with the dark theme:
* Buttons are given a semi-transparent dark background (`rgba(15, 23, 42, 0.9)`) and thin border.
* The control icons are inverted using a CSS filter (`filter: invert(1)`) to make them white.

### Dynamic Legend
Instead of showing a hardcoded legend for all possible terrain types, the legend is built dynamically based on the overlays **actually present** on the active course:
```javascript
const activeTerrainTypes = [...new Set(overlays.map((o) => o.terrain_type))].sort()
```
Only the active types (e.g., green, tee, fairway, bunker, etc.) are rendered in the legend panel.

### Pitch/Rotate Hint
Since 3D controls (Right-click + drag or Ctrl + drag) are unfamiliar to some users, a floating instruction banner appears at the top center of the canvas: `"Right-click + drag to pitch & rotate"`.
To keep the UI clean, the component listens for the first `pitchstart` or `rotate` event from MapLibre and transitions the hint out of view (`opacity: 0`).

---

## 7. Comparative Analysis (v1 vs. v2)

| Feature | Legacy Leaflet (v1) | MapLibre GL JS (v2) |
| :--- | :--- | :--- |
| **Rendering Tech** | HTML DOM & SVG elements | WebGL / GPU-accelerated canvas |
| **Rotation** | CSS-transform based (buggy alignment) | Native matrix-based camera rotation |
| **Donut Polygons** | Prone to rendering errors / overlapping | Native GeoJSON ring hole rendering |
| **3D Tilt (Pitch)** | Unsupported (flat 2D only) | Supported (up to 60° tilt) |
| **Styling Performance** | Individual React nodes / Leaflet Path states | Unified GeoJSON Source + GPU Expressions |
| **Scale Unit** | Metric / Imperial (custom toggles) | Standard imperial (Scale Control) |
| **Interaction Cursor** | Handled per path element | Managed via global canvas pointer overrides |

---

## 8. Development Reference
* **Route**: `/v2/course/:id`
* **Component Location**: `src/features/map_v2/CourseCanvasV2.jsx`
* **Style Location**: `src/features/map_v2/CourseCanvasV2.css`
* **Entry Point Integration**: Imported and declared as a standard `<Route>` in `src/App.jsx`.
* **Testing Command**: Run the test runner `npm run test` or check the route locally via `npm run dev`.
