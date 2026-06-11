# Technical Debt & TODOs

## Refactoring

### Frontend & Supabase RPC Optimization for Terrain Overlays
Currently, adding a new terrain overlay (e.g., a Green) from the frontend triggers multiple network calls:
1. `terrainApi.addOverlay` calls `upsert_terrain_overlay` RPC to insert the polygon into the `terrain_overlays` table.
2. It then manually calls `supabase.from('terrain_overlay_holes').insert()` to link the polygon to the respective hole.

To prevent the React frontend from juggling multiple simultaneous database writes and to improve atomicity, we should refactor `upsert_terrain_overlay` to accept an array of `hole_ids`. The RPC can then handle both the polygon insertion and the linking internally in a single server-side database transaction.
