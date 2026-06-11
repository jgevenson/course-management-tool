-- create_align_selected_features.sql
-- Migration to add align_selected_features RPC for snapping vertices of two overlapping/adjacent polygons.

CREATE OR REPLACE FUNCTION public.align_selected_features(
    master_id uuid,
    adjust_id uuid,
    tolerance_meters float8
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    master_geom geometry;
    adjust_geom geometry;
    snapped_geom geometry;
    final_geom geometry;
    course_id_var uuid;
    course_user_id uuid;
    lat_rad float8;
    cos_lat float8;
    mercator_tolerance float8;
BEGIN
    -- 1. Fetch shapes and course_id
    SELECT shape INTO master_geom 
    FROM public.terrain_overlays 
    WHERE id = master_id AND is_active = true;
    
    IF master_geom IS NULL THEN
        RAISE EXCEPTION 'Master shape not found or inactive';
    END IF;

    SELECT shape, course_id INTO adjust_geom, course_id_var 
    FROM public.terrain_overlays 
    WHERE id = adjust_id AND is_active = true;
    
    IF adjust_geom IS NULL THEN
        RAISE EXCEPTION 'Adjust shape not found or inactive';
    END IF;

    -- 2. Authorization Check (matching upsert_terrain_overlay)
    SELECT user_id INTO course_user_id 
    FROM public.courses 
    WHERE id = course_id_var;
    
    IF auth.uid() IS NULL OR auth.uid() <> course_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 3. Snap and clean geometry
    -- Convert tolerance from meters to Web Mercator (EPSG:3857) units at the center latitude of adjust_geom
    lat_rad := radians(ST_Y(ST_Centroid(adjust_geom)));
    cos_lat := cos(lat_rad);
    IF cos_lat = 0 THEN
        cos_lat := 1.0;
    END IF;
    mercator_tolerance := tolerance_meters / cos_lat;

    -- Perform snapping in EPSG:3857 (Web Mercator) where units are meters.
    -- Transform both geometries to 3857.
    adjust_geom := ST_Transform(adjust_geom, 3857);
    master_geom := ST_Transform(master_geom, 3857);

    -- Snap each ring of each polygon component individually to prevent interior rings (holes)
    -- from collapsing or merging with the exterior ring.
    WITH dumped_polys AS (
        SELECT (ST_Dump(adjust_geom)).geom as poly
    ),
    snapped_polys AS (
        SELECT 
            ST_MakeValid(
                ST_MakePolygon(
                    ST_Snap(ST_ExteriorRing(poly), master_geom, mercator_tolerance),
                    COALESCE(
                        ARRAY(
                            SELECT ST_Snap(ST_InteriorRingN(poly, i), master_geom, mercator_tolerance)
                            FROM generate_series(1, ST_NumInteriorRings(poly)) i
                        ),
                        '{}'::geometry[]
                    )
                )
            ) as snapped_poly
        FROM dumped_polys
    )
    SELECT ST_Multi(ST_Collect(snapped_poly)) INTO snapped_geom
    FROM snapped_polys;

    -- Transform back to EPSG:4326, dissolve redundant vertices, and extract only the polygon parts.
    final_geom := ST_Transform(
        ST_CollectionExtract(
            ST_RemoveRepeatedPoints(ST_MakeValid(snapped_geom), 0.001),
            3
        ),
        4326
    );

    -- Ensure the snapped geometry did not collapse completely
    IF final_geom IS NULL OR ST_IsEmpty(final_geom) THEN
        RAISE EXCEPTION 'Snapping resulted in an empty or collapsed geometry. Aborting alignment.';
    END IF;

    -- 4. Update the database row (both shape and geojson_data)
    UPDATE public.terrain_overlays
    SET shape = final_geom,
        geojson_data = jsonb_set(geojson_data, '{geometry}', ST_AsGeoJSON(final_geom)::jsonb)
    WHERE id = adjust_id;

    -- 5. Return the newly updated geometry as GeoJSON
    RETURN ST_AsGeoJSON(final_geom)::jsonb;
END;
$$;

COMMENT ON FUNCTION public.align_selected_features(uuid, uuid, float8) 
IS 'Snaps vertices of an adjust shape to a master shape within tolerance_meters, dissolving redundant coordinates and returning updated GeoJSON geometry.';
