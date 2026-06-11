# Architecture Evaluation: Wall-to-Wall Topographic Elevation

This document outlines the technical strategy for fetching, storing, and rendering high-resolution topographic elevation grids and contour lines across golf course holes.

---

## 1. Grid Generation (Frontend vs. Backend)

To generate contours and slope vectors, we require a dense grid of elevation points. We compare two approaches for generating and querying this grid:

### Option A: Point Grid Generation via Frontend + USGS EPQS (Not Recommended)
The frontend calculates a grid of coordinates inside the hole boundary and calls the USGS Point Elevation Query Service (EPQS) in batches to resolve elevations.
*   **Drawbacks:**
    *   **High Latency:** Querying thousands of individual points requires massive batching, leading to hundreds of API requests.
    *   **Rate Limiting:** Firing thousands of concurrent requests will result in temporary or permanent IP bans by the USGS API.
    *   **Heavy Client Load:** Processing coordinate calculations and point lists in the browser causes UI lag.

### Option B: Bounding Box GeoTIFF Fetch + Backend/Serverless Parse (Recommended)
Instead of querying individual points, we query the USGS 3DEP Web Coverage Service (WCS) `exportImage` endpoint for a single GeoTIFF covering the entire hole bounding box.
*   **How it works:**
    1.  The system calculates the bounding box (`bbox`) of the hole boundary.
    2.  It sends a **single HTTP request** to the USGS ImageServer requesting a Float32 GeoTIFF.
    3.  A backend service (e.g. a Supabase Edge Function or database-triggered worker) parses the GeoTIFF, extracts the elevation raster, and maps it to a coordinate grid.
*   **Pros:**
    *   **Single Request:** Bypasses rate limits completely by fetching the entire grid in one request.
    *   **Bandwidth Efficient:** GeoTIFFs are highly compressed; downloading a single image is much faster than processing thousands of JSON API responses.
    *   **Centralized Math:** Moves the parsing and point-in-polygon math off the client's device.

---

## 2. The Masking Strategy (Intersection)

To create a clean jigsaw map with varying details, we need to mask the elevation grid using our new `vw_planar_terrain_overlays` view.

### Spatial Join Masking in PostGIS
We can load the elevation grid points as a temporary set of geometries (or store them in a table) and perform a spatial join against `vw_planar_terrain_overlays`:
```sql
SELECT 
  p.x, p.y, p.z,
  v.terrain_type
FROM grid_points p
JOIN public.vw_planar_terrain_overlays v 
  ON ST_Contains(v.shape, ST_SetSRID(ST_Point(p.lon, p.lat), 4326))
WHERE v.course_id = :course_id;
```
This leverages PostGIS spatial indexing (`gist` on `shape`) to identify the terrain type of each point instantly.

### Terrain-Specific Density Control
Once each grid point is tagged with its `terrain_type`, we filter and render them selectively:
*   **Greens (`green`)**: High density (1-foot grid, 1-foot contour intervals) for precise read modeling.
*   **Fairways (`fairway`)**: Medium density (3-yard grid, 3-foot or 5-foot contour intervals).
*   **Roughs (`rough`)**: Low density (5-yard grid, 10-foot contour intervals) for basic topographic context.
*   **Water (`water`)**: Ignored entirely (points inside water polygons are discarded to prevent contour line clutter).

---

## 3. API Rate Limiting & Caching

To prevent API bans and ensure sub-second map load times, we will implement a caching and queueing system.

### Database Caching Table: `hole_elevation_grids`
We will create a table to cache the parsed elevation grids in Supabase:
```sql
CREATE TABLE public.hole_elevation_grids (
    hole_id uuid PRIMARY KEY REFERENCES public.holes(id) ON DELETE CASCADE,
    grid_spacing_feet float8 NOT NULL DEFAULT 3.0,
    bbox jsonb NOT NULL,
    matrix_data jsonb NOT NULL, -- Cached array of {x, y, z, slope, aspect, terrain_type}
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Request Flow
1.  **Check Cache:** The frontend queries `hole_elevation_grids` for the active `hole_id`.
2.  **Serve Instantly:** If cache hits, return the grid matrix directly.
3.  **On-Demand Fetch:** If cache misses:
    *   Trigger a Supabase Edge Function to fetch the GeoTIFF from USGS.
    *   Parse the TIFF, apply the `vw_planar_terrain_overlays` mask, and save the result to `hole_elevation_grids`.
    *   Return the processed grid to the frontend.

---

## 4. Visual Rendering Strategy

To render thousands of contour lines and slope vectors smoothly at 60 FPS, we must avoid standard SVG-based Leaflet layers (which pollute the DOM).

### 1. Contour Lines (Isolines) via `d3-contour`
*   Use `d3-contour` (either in the client or pre-rendered in the database) to calculate isolines from the 2D elevation grid.
*   `d3-contour` outputs standard GeoJSON MultiPolygons representing the elevation bands.

### 2. Rendering via Leaflet Canvas (Crucial for Performance)
*   Instead of creating thousands of SVG elements, initialize Leaflet layers using the **Canvas Renderer**:
    ```javascript
    const canvasRenderer = L.canvas({ padding: 0.5 });
    
    L.geoJSON(contourGeoJson, {
      renderer: canvasRenderer,
      style: { color: '#475569', weight: 1, opacity: 0.6 }
    }).addTo(map);
    ```
*   This draws all lines and arrows onto a single HTML5 `<canvas>` element, keeping zooming and panning perfectly smooth.

### 3. Slope Arrow Sub-sampling
*   Drawing an arrow on every 1-yard point will clutter the screen.
*   We will sub-sample the grid (e.g., drawing one arrow every 5–10 yards) and render them directly onto the canvas as custom vector paths pointing in the direction of the `aspect_deg`.
