import { supabase } from '../../supabaseClient'

export const mapApi = {
  /**
   * Fetch a course with only the fields the map editor needs.
   */
  fetchCourseForMap: async (id) => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, name, course_lat, course_lng')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return data
  },

  /**
   * Save map-center lat/lng as the course's location.
   */
  saveCourseLocation: async (courseId, lat, lng) => {
    const course_lat = Math.round(lat * 1e6) / 1e6
    const course_lng = Math.round(lng * 1e6) / 1e6

    const { error } = await supabase
      .from('courses')
      .update({ course_lat, course_lng })
      .eq('id', courseId)
      .eq('is_active', true)

    if (error) throw error
    return { course_lat, course_lng }
  },

  /**
   * Load all active holes for a course, each with its active map markers attached.
   */
  fetchHolesWithMarkers: async (courseId) => {
    const { data: holeRows, error: holesErr } = await supabase
      .from('holes')
      .select('id, hole_number, par, stroke_index, scorecard_yardage, course_id, path_sequence')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('hole_number')

    if (holesErr) throw holesErr

    const list = holeRows ?? []
    const holeIds = list.map((h) => h.id)

    let markers = []
    if (holeIds.length > 0) {
      const { data: markerRows, error: mErr } = await supabase
        .from('hole_map_markers')
        .select('id, hole_id, marker_kind, lat, lng, is_active')
        .in('hole_id', holeIds)
        .eq('is_active', true)

      if (!mErr && markerRows) {
        markers = markerRows
      }
    }

    return list.map((h) => ({
      ...h,
      mapMarkers: markers.filter((m) => m.hole_id === h.id),
    }))
  },

  /**
   * Upsert a map marker (green center, tee back, planning points).
   */
  upsertHoleMarker: async (holeId, markerKind, lat, lng) => {
    const { data, error } = await supabase
      .from('hole_map_markers')
      .upsert(
        { hole_id: holeId, marker_kind: markerKind, lat, lng, is_active: true },
        { onConflict: 'hole_id,marker_kind' },
      )
      .select('id, hole_id, marker_kind, lat, lng, is_active')
      .single()

    if (error) throw error
    return data
  },

  /**
   * Soft-delete planning markers by setting is_active = false.
   */
  deactivateMarkers: async (holeId, kinds) => {
    for (const k of kinds) {
      const { error } = await supabase
        .from('hole_map_markers')
        .update({ is_active: false })
        .eq('hole_id', holeId)
        .eq('marker_kind', k)

      if (error) throw error
    }
  },

  /**
   * Save hole stats (par, stroke_index, scorecard_yardage) and sync
   * the default tee yardage when scorecard_yardage changes.
   */
  saveHoleStats: async (holeId, payload, courseId) => {
    const { error } = await supabase
      .from('holes')
      .update({
        par: payload.par,
        stroke_index: payload.stroke_index,
        scorecard_yardage: payload.scorecard_yardage,
      })
      .eq('id', holeId)
      .eq('is_active', true)

    if (error) throw error

    // Sync default-tee yardage
    if (courseId && payload.scorecard_yardage !== undefined) {
      const { data: defTee } = await supabase
        .from('course_tees')
        .select('id')
        .eq('course_id', courseId)
        .eq('is_default', true)
        .eq('is_active', true)
        .maybeSingle()

      if (defTee?.id) {
        const y = payload.scorecard_yardage
        const { data: yRow } = await supabase
          .from('hole_tee_yardages')
          .select('id')
          .eq('hole_id', holeId)
          .eq('tee_id', defTee.id)
          .eq('is_active', true)
          .maybeSingle()

        if (yRow?.id) {
          await supabase.from('hole_tee_yardages').update({ yardage: y }).eq('id', yRow.id)
        } else if (y !== null && y !== undefined) {
          await supabase.from('hole_tee_yardages').insert({
            hole_id: holeId,
            tee_id: defTee.id,
            yardage: y,
            is_active: true,
          })
        }
      }
    }
  },

  /**
   * Quick-import an OSM feature as a terrain overlay linked to the current hole.
   */
  quickImportOSMFeature: async (courseId, holeId, feature, terrainType) => {
    const { data: newOverlay, error: overlayErr } = await supabase
      .from('terrain_overlays')
      .insert({
        course_id: courseId,
        terrain_type: terrainType,
        geojson_data: feature,
        label: feature.properties?.name || null,
      })
      .select()
      .single()

    if (overlayErr) throw overlayErr

    if (holeId && newOverlay?.id) {
      const { error: linkErr } = await supabase
        .from('terrain_overlay_holes')
        .insert({
          terrain_overlay_id: newOverlay.id,
          hole_id: holeId,
        })

      if (linkErr) throw linkErr
    }

    return newOverlay
  },
}
