-- Migration: open_courses_tees_to_authenticated
-- Make all course data readable by any authenticated user.
-- Write operations (INSERT/UPDATE/DELETE) remain restricted to the course owner.
-- hole_planning_markers remain fully private per user (unchanged).

-- ============================================================
-- COURSES
-- ============================================================
DROP POLICY IF EXISTS "Full access to own courses" ON public.courses;

CREATE POLICY "courses_select_authenticated"
  ON public.courses FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "courses_insert_own"
  ON public.courses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses_update_own"
  ON public.courses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courses_delete_own"
  ON public.courses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- HOLES
-- ============================================================
DROP POLICY IF EXISTS "Full access to own holes" ON public.holes;

CREATE POLICY "holes_select_authenticated"
  ON public.holes FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = holes.course_id AND c.is_active = true
    )
  );

CREATE POLICY "holes_insert_own"
  ON public.holes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = holes.course_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "holes_update_own"
  ON public.holes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = holes.course_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = holes.course_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "holes_delete_own"
  ON public.holes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = holes.course_id AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- COURSE_TEES
-- ============================================================
DROP POLICY IF EXISTS "course_tees_select_own" ON public.course_tees;
DROP POLICY IF EXISTS "course_tees_insert_own" ON public.course_tees;
DROP POLICY IF EXISTS "course_tees_update_own" ON public.course_tees;

CREATE POLICY "course_tees_select_authenticated"
  ON public.course_tees FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_tees.course_id AND c.is_active = true
    )
  );

CREATE POLICY "course_tees_insert_own"
  ON public.course_tees FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_tees.course_id AND c.user_id = auth.uid() AND c.is_active = true
    )
  );

CREATE POLICY "course_tees_update_own"
  ON public.course_tees FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_tees.course_id AND c.user_id = auth.uid() AND c.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_tees.course_id AND c.user_id = auth.uid() AND c.is_active = true
    )
  );

CREATE POLICY "course_tees_delete_own"
  ON public.course_tees FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_tees.course_id AND c.user_id = auth.uid() AND c.is_active = true
    )
  );

-- ============================================================
-- HOLE_TEE_YARDAGES
-- ============================================================
DROP POLICY IF EXISTS "hole_tee_yardages_select_own" ON public.hole_tee_yardages;
DROP POLICY IF EXISTS "hole_tee_yardages_insert_own" ON public.hole_tee_yardages;
DROP POLICY IF EXISTS "hole_tee_yardages_update_own" ON public.hole_tee_yardages;

CREATE POLICY "hole_tee_yardages_select_authenticated"
  ON public.hole_tee_yardages FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_tee_yardages.hole_id
        AND h.is_active = true
        AND c.is_active = true
    )
  );

CREATE POLICY "hole_tee_yardages_insert_own"
  ON public.hole_tee_yardages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_tees ct
      JOIN public.courses c ON c.id = ct.course_id
      WHERE ct.id = hole_tee_yardages.tee_id
        AND c.user_id = auth.uid()
        AND ct.is_active = true
        AND c.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_tee_yardages.hole_id
        AND c.user_id = auth.uid()
        AND h.is_active = true
        AND c.is_active = true
    )
  );

CREATE POLICY "hole_tee_yardages_update_own"
  ON public.hole_tee_yardages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_tee_yardages.hole_id
        AND c.user_id = auth.uid()
        AND h.is_active = true
        AND c.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_tee_yardages.hole_id
        AND c.user_id = auth.uid()
        AND h.is_active = true
        AND c.is_active = true
    )
  );

CREATE POLICY "hole_tee_yardages_delete_own"
  ON public.hole_tee_yardages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_tee_yardages.hole_id
        AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- HOLE_MAP_MARKERS
-- ============================================================
DROP POLICY IF EXISTS "hole_map_markers_select_own" ON public.hole_map_markers;
DROP POLICY IF EXISTS "hole_map_markers_insert_own" ON public.hole_map_markers;
DROP POLICY IF EXISTS "hole_map_markers_update_own" ON public.hole_map_markers;

CREATE POLICY "hole_map_markers_select_authenticated"
  ON public.hole_map_markers FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_map_markers.hole_id
        AND h.is_active = true
        AND c.is_active = true
    )
  );

CREATE POLICY "hole_map_markers_insert_own"
  ON public.hole_map_markers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_map_markers.hole_id
        AND h.is_active = true
        AND c.is_active = true
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "hole_map_markers_update_own"
  ON public.hole_map_markers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_map_markers.hole_id
        AND h.is_active = true
        AND c.is_active = true
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_map_markers.hole_id
        AND h.is_active = true
        AND c.is_active = true
        AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "hole_map_markers_delete_own"
  ON public.hole_map_markers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.holes h
      JOIN public.courses c ON c.id = h.course_id
      WHERE h.id = hole_map_markers.hole_id
        AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- TERRAIN_OVERLAYS
-- ============================================================
DROP POLICY IF EXISTS "terrain_overlays_select" ON public.terrain_overlays;
DROP POLICY IF EXISTS "terrain_overlays_insert" ON public.terrain_overlays;
DROP POLICY IF EXISTS "terrain_overlays_update" ON public.terrain_overlays;

CREATE POLICY "terrain_overlays_select_authenticated"
  ON public.terrain_overlays FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = terrain_overlays.course_id AND c.is_active = true
    )
  );

CREATE POLICY "terrain_overlays_insert_own"
  ON public.terrain_overlays FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = terrain_overlays.course_id
        AND c.user_id = auth.uid()
        AND c.is_active = true
    )
  );

CREATE POLICY "terrain_overlays_update_own"
  ON public.terrain_overlays FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = terrain_overlays.course_id
        AND c.user_id = auth.uid()
        AND c.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = terrain_overlays.course_id
        AND c.user_id = auth.uid()
        AND c.is_active = true
    )
  );

CREATE POLICY "terrain_overlays_delete_own"
  ON public.terrain_overlays FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = terrain_overlays.course_id AND c.user_id = auth.uid()
    )
  );

-- ============================================================
-- TERRAIN_OVERLAY_HOLES
-- ============================================================
DROP POLICY IF EXISTS "terrain_overlay_holes_select" ON public.terrain_overlay_holes;
DROP POLICY IF EXISTS "terrain_overlay_holes_insert" ON public.terrain_overlay_holes;
DROP POLICY IF EXISTS "terrain_overlay_holes_delete" ON public.terrain_overlay_holes;

CREATE POLICY "terrain_overlay_holes_select_authenticated"
  ON public.terrain_overlay_holes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.terrain_overlays o
      JOIN public.courses c ON c.id = o.course_id
      WHERE o.id = terrain_overlay_holes.terrain_overlay_id
        AND c.is_active = true
        AND o.is_active = true
    )
  );

CREATE POLICY "terrain_overlay_holes_insert_own"
  ON public.terrain_overlay_holes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.terrain_overlays o
      JOIN public.courses c ON c.id = o.course_id
      WHERE o.id = terrain_overlay_holes.terrain_overlay_id
        AND c.user_id = auth.uid()
        AND c.is_active = true
        AND o.is_active = true
    )
  );

CREATE POLICY "terrain_overlay_holes_delete_own"
  ON public.terrain_overlay_holes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.terrain_overlays o
      JOIN public.courses c ON c.id = o.course_id
      WHERE o.id = terrain_overlay_holes.terrain_overlay_id
        AND c.user_id = auth.uid()
        AND c.is_active = true
    )
  );
