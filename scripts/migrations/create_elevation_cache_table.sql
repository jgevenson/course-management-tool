-- Migration to create the hole_elevation_grids table and get_hole_extent / upsert_hole_elevation_grid RPCs.

-- 1. Create cache table
CREATE TABLE IF NOT EXISTS public.hole_elevation_grids (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hole_id uuid NOT NULL REFERENCES public.holes(id) ON DELETE CASCADE,
    resolution_meters integer NOT NULL DEFAULT 3,
    bbox geometry(Polygon, 4326) NOT NULL,
    grid_data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_hole_elevation_grids_hole_res UNIQUE (hole_id, resolution_meters)
);

-- Enable RLS
ALTER TABLE public.hole_elevation_grids ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.hole_elevation_grids;
CREATE POLICY "Enable read access for all users" ON public.hole_elevation_grids FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.hole_elevation_grids;
CREATE POLICY "Enable all access for authenticated users" ON public.hole_elevation_grids FOR ALL USING (auth.role() = 'authenticated');

-- 2. RPC helper to resolve a hole's bounding box extent from planar overlays
CREATE OR REPLACE FUNCTION public.get_hole_extent(p_hole_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_extent geometry;
BEGIN
    SELECT ST_Extent(shape) INTO v_extent
    FROM public.vw_planar_terrain_overlays o
    JOIN public.terrain_overlay_holes h ON o.id = h.terrain_overlay_id
    WHERE h.hole_id = p_hole_id;
    
    IF v_extent IS NULL THEN
        RETURN NULL;
    END IF;
    
    RETURN jsonb_build_object(
        'minLon', ST_XMin(v_extent),
        'minLat', ST_YMin(v_extent),
        'maxLon', ST_XMax(v_extent),
        'maxLat', ST_YMax(v_extent)
    );
END;
$$;

-- 3. RPC helper to upsert grid data and geometry safely from Edge Functions
CREATE OR REPLACE FUNCTION public.upsert_hole_elevation_grid(
    p_hole_id uuid,
    p_resolution integer,
    p_wkt_bbox text,
    p_grid_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.hole_elevation_grids (hole_id, resolution_meters, bbox, grid_data)
    VALUES (
        p_hole_id,
        p_resolution,
        ST_SetSRID(ST_GeomFromText(p_wkt_bbox), 4326),
        p_grid_data
    )
    ON CONFLICT (hole_id, resolution_meters)
    DO UPDATE SET
        bbox = EXCLUDED.bbox,
        grid_data = EXCLUDED.grid_data,
        created_at = now();
    
    RETURN p_grid_data;
END;
$$;
