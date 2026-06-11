-- Drop the legacy function signature
DROP FUNCTION IF EXISTS public.upsert_terrain_overlay(uuid, uuid, text, smallint, jsonb);

-- Recreate with p_hole_ids array parameter
CREATE OR REPLACE FUNCTION public.upsert_terrain_overlay(
  p_id uuid,
  p_course_id uuid,
  p_terrain_type text,
  p_risk_tier smallint,
  p_geojson_data jsonb,
  p_hole_ids uuid[] DEFAULT NULL
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_shape geometry;
  v_row jsonb;
  v_effective_course_id uuid;
  v_course_user_id uuid;
  v_overlay_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    SELECT course_id INTO v_effective_course_id FROM terrain_overlays WHERE id = p_id;
  ELSE
    v_effective_course_id := p_course_id;
  END IF;

  SELECT user_id INTO v_course_user_id FROM courses WHERE id = v_effective_course_id;
  IF auth.uid() IS NULL OR auth.uid() <> v_course_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_shape := ST_SetSRID(
    ST_GeomFromGeoJSON(
      CASE 
        WHEN p_geojson_data->>'type' = 'Feature' THEN (p_geojson_data->'geometry')::text
        ELSE p_geojson_data::text
      END
    ), 
    4326
  );

  IF p_id IS NULL THEN
    INSERT INTO terrain_overlays (course_id, terrain_type, risk_tier, shape, geojson_data)
    VALUES (p_course_id, p_terrain_type, p_risk_tier, v_shape, p_geojson_data)
    RETURNING id INTO v_overlay_id;
  ELSE
    UPDATE terrain_overlays
    SET shape = v_shape,
        terrain_type = p_terrain_type,
        risk_tier = p_risk_tier,
        geojson_data = p_geojson_data
    WHERE id = p_id
    RETURNING id INTO v_overlay_id;
  END IF;

  -- Transactional linking to holes
  IF p_hole_ids IS NOT NULL THEN
    DELETE FROM terrain_overlay_holes WHERE terrain_overlay_id = v_overlay_id;
    IF array_length(p_hole_ids, 1) > 0 THEN
      INSERT INTO terrain_overlay_holes (terrain_overlay_id, hole_id)
      SELECT v_overlay_id, unnest(p_hole_ids);
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'id', id,
    'course_id', course_id,
    'terrain_type', terrain_type,
    'risk_tier', risk_tier,
    'geojson_data', geojson_data
  ) INTO v_row
  FROM terrain_overlays
  WHERE id = v_overlay_id;

  RETURN v_row;
END;
$function$;
