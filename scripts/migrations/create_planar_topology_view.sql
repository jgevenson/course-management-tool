-- Migration to add safe_difference helper function and create vw_planar_terrain_overlays.
-- Hierarchy:
-- Rank 4: green
-- Rank 3: bunker, water, tee, and other custom terrain types
-- Rank 2: fairway
-- Rank 1: rough
-- Rank 0: hole_boundary, base_boundary, boundary

-- 1. Helper function for error handling fallback
CREATE OR REPLACE FUNCTION public.safe_difference(geom_a geometry, geom_b geometry)
RETURNS geometry
LANGUAGE plpgsql
AS $$
BEGIN
  IF geom_a IS NULL THEN
    RETURN NULL;
  END IF;
  IF geom_b IS NULL THEN
    RETURN geom_a;
  END IF;
  
  -- Snap geom_a to geom_b with a 0.000001 degree tolerance (~11cm) to fix Leaflet's 6 decimal 
  -- place precision loss upon save, ensuring perfect boundaries and no vertex shifting.
  RETURN ST_Difference(ST_MakeValid(geom_a), ST_MakeValid(geom_b));
EXCEPTION WHEN OTHERS THEN
  -- Fallback to original geom_a if ST_Difference fails due to topology issues
  RETURN geom_a;
END;
$$;

-- 2. Main View
CREATE OR REPLACE VIEW public.vw_planar_terrain_overlays AS
WITH course_shapes AS (
  SELECT 
    id,
    course_id,
    terrain_type,
    risk_tier,
    label,
    is_active,
    created_at,
    shape AS raw_shape,
    geojson_data AS raw_geojson_data
  FROM public.terrain_overlays
  WHERE is_active = true
),
-- Level 4 (Top): Greens
rank4 AS (
  SELECT 
    id,
    course_id,
    terrain_type,
    risk_tier,
    label,
    is_active,
    created_at,
    raw_shape,
    ST_MakeValid(raw_shape) AS shape
  FROM course_shapes
  WHERE terrain_type = 'green'
),
rank4_unions AS (
  SELECT 
    course_id, 
    ST_Union(ST_MakeValid(raw_shape)) AS geom
  FROM course_shapes
  WHERE terrain_type = 'green'
  GROUP BY course_id
),
-- Level 3: Bunkers, Water, Tees, and others
rank3 AS (
  SELECT 
    c.id,
    c.course_id,
    c.terrain_type,
    c.risk_tier,
    c.label,
    c.is_active,
    c.created_at,
    c.raw_shape,
    ST_CollectionExtract(
      ST_MakeValid(
        safe_difference(c.raw_shape, r4.geom)
      ),
      3
    ) AS shape
  FROM course_shapes c
  LEFT JOIN rank4_unions r4 ON c.course_id = r4.course_id
  WHERE c.terrain_type IN ('bunker', 'water', 'tee') 
     OR (c.terrain_type NOT IN ('green', 'fairway', 'rough', 'hole_boundary', 'base_boundary', 'boundary'))
),
rank3_unions AS (
  SELECT 
    c.course_id, 
    ST_Union(ST_MakeValid(c.raw_shape)) AS geom
  FROM course_shapes c
  WHERE c.terrain_type IN ('bunker', 'water', 'tee') 
     OR (c.terrain_type NOT IN ('green', 'fairway', 'rough', 'hole_boundary', 'base_boundary', 'boundary'))
  GROUP BY c.course_id
),
rank3_plus_4_unions AS (
  SELECT 
    course_id,
    ST_Union(geom) AS geom
  FROM (
    SELECT course_id, geom FROM rank4_unions
    UNION ALL
    SELECT course_id, geom FROM rank3_unions
  ) sub
  GROUP BY course_id
),
-- Level 2: Fairways
rank2 AS (
  SELECT 
    c.id,
    c.course_id,
    c.terrain_type,
    c.risk_tier,
    c.label,
    c.is_active,
    c.created_at,
    c.raw_shape,
    ST_CollectionExtract(
      ST_MakeValid(
        safe_difference(c.raw_shape, r34.geom)
      ),
      3
    ) AS shape
  FROM course_shapes c
  LEFT JOIN rank3_plus_4_unions r34 ON c.course_id = r34.course_id
  WHERE c.terrain_type = 'fairway'
),
rank2_unions AS (
  SELECT 
    c.course_id, 
    ST_Union(ST_MakeValid(c.raw_shape)) AS geom
  FROM course_shapes c
  WHERE c.terrain_type = 'fairway'
  GROUP BY c.course_id
),
rank2_plus_3_plus_4_unions AS (
  SELECT 
    course_id,
    ST_Union(geom) AS geom
  FROM (
    SELECT course_id, geom FROM rank3_plus_4_unions
    UNION ALL
    SELECT course_id, geom FROM rank2_unions
  ) sub
  GROUP BY course_id
),
-- Level 1: Rough
rank1 AS (
  SELECT 
    c.id,
    c.course_id,
    c.terrain_type,
    c.risk_tier,
    c.label,
    c.is_active,
    c.created_at,
    c.raw_shape,
    ST_CollectionExtract(
      ST_MakeValid(
        safe_difference(c.raw_shape, r234.geom)
      ),
      3
    ) AS shape
  FROM course_shapes c
  LEFT JOIN rank2_plus_3_plus_4_unions r234 ON c.course_id = r234.course_id
  WHERE c.terrain_type = 'rough'
),
rank1_unions AS (
  SELECT 
    c.course_id, 
    ST_Union(ST_MakeValid(c.raw_shape)) AS geom
  FROM course_shapes c
  WHERE c.terrain_type = 'rough'
  GROUP BY c.course_id
),
rank1_plus_2_plus_3_plus_4_unions AS (
  SELECT 
    course_id,
    ST_Union(geom) AS geom
  FROM (
    SELECT course_id, geom FROM rank2_plus_3_plus_4_unions
    UNION ALL
    SELECT course_id, geom FROM rank1_unions
  ) sub
  GROUP BY course_id
),
-- Level 0: Hole Boundary / Default
rank0 AS (
  SELECT 
    c.id,
    c.course_id,
    c.terrain_type,
    c.risk_tier,
    c.label,
    c.is_active,
    c.created_at,
    c.raw_shape,
    ST_CollectionExtract(
      ST_MakeValid(
        safe_difference(c.raw_shape, r1234.geom)
      ),
      3
    ) AS shape
  FROM course_shapes c
  LEFT JOIN rank1_plus_2_plus_3_plus_4_unions r1234 ON c.course_id = r1234.course_id
  WHERE c.terrain_type IN ('hole_boundary', 'base_boundary', 'boundary')
),
combined_shapes AS (
  SELECT * FROM rank4
  UNION ALL
  SELECT * FROM rank3
  UNION ALL
  SELECT * FROM rank2
  UNION ALL
  SELECT * FROM rank1
  UNION ALL
  SELECT * FROM rank0
)
SELECT 
  id,
  course_id,
  terrain_type,
  risk_tier,
  label,
  is_active,
  created_at,
  ST_AsGeoJSON(shape)::jsonb AS geojson_data,
  ST_AsGeoJSON(raw_shape)::jsonb AS geojson_data_raw
FROM combined_shapes;
