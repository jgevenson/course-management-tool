// AI assisted development
import { supabase } from '../../supabaseClient'

/** PostgREST 400 when `elevation` is not on the view/table yet (migration not applied). */
function isElevationColumnUnavailable(error) {
  if (!error) return false
  const text = `${error.message ?? ''}${error.details ?? ''}${error.hint ?? ''}`.toLowerCase()
  return text.includes('elevation')
}

/** RPC overload missing `p_elevation` until migration is applied. */
function isLikelyMissingElevationRpcArg(error) {
  if (!error) return false
  const m = String(error.message ?? '').toLowerCase()
  return m.includes('p_elevation') || m.includes('could not find the function')
}

export const mapApi = {
  /**
   * Fetch a course with only the fields the map editor needs.
   */
  fetchCourseForMap: async (id) => {
    const { data, error } = await supabase
      .from('courses_view')
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

    const { error } = await supabase.rpc('update_course_location', {
      p_course_id: courseId,
      p_lat: course_lat,
      p_lng: course_lng,
    })

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
    let planningMarkers = []

    if (holeIds.length > 0) {
      // Map markers (reference points)
      let { data: markerRows, error: mErr } = await supabase
        .from('hole_map_markers_view')
        .select('id, hole_id, marker_kind, lat, lng, elevation, is_active')
        .in('hole_id', holeIds)
        .eq('is_active', true)

      if (mErr && isElevationColumnUnavailable(mErr)) {
        const retry = await supabase
          .from('hole_map_markers_view')
          .select('id, hole_id, marker_kind, lat, lng, is_active')
          .in('hole_id', holeIds)
          .eq('is_active', true)
        markerRows = retry.data
        mErr = retry.error
      }

      if (!mErr && markerRows) {
        markers = markerRows
      }

      // Planning markers (strategy points)
      let { data: pRows, error: pErr } = await supabase
        .from('hole_planning_markers_view')
        .select('id, hole_id, marker_type, sequence_order, lat, lng, elevation')
        .in('hole_id', holeIds)
        .order('sequence_order')

      if (pErr && isElevationColumnUnavailable(pErr)) {
        const retry = await supabase
          .from('hole_planning_markers_view')
          .select('id, hole_id, marker_type, sequence_order, lat, lng')
          .in('hole_id', holeIds)
          .order('sequence_order')
        pRows = retry.data
        pErr = retry.error
      }

      if (!pErr && pRows) {
        planningMarkers = pRows
      }
    }

    return list.map((h) => ({
      ...h,
      mapMarkers: markers.filter((m) => m.hole_id === h.id),
      planningMarkers: planningMarkers.filter((m) => m.hole_id === h.id),
    }))
  },

  /**
   * Upsert a map marker (green center, tee back, planning points).
   */
  upsertHoleMarker: async (holeId, markerKind, lat, lng, elevation = null) => {
    let { data, error } = await supabase.rpc('add_map_marker', {
      p_hole_id: holeId,
      p_marker_kind: markerKind,
      p_lat: lat,
      p_lng: lng,
      p_elevation: elevation,
    })

    if (error && isLikelyMissingElevationRpcArg(error)) {
      ;({ data, error } = await supabase.rpc('add_map_marker', {
        p_hole_id: holeId,
        p_marker_kind: markerKind,
        p_lat: lat,
        p_lng: lng,
      }))
    }

    if (error) throw error
    return data
  },

  deleteMapMarkers: async (holeId, kinds) => {
    for (const k of kinds) {
      const { error } = await supabase
        .from('hole_map_markers')
        .delete()
        .eq('hole_id', holeId)
        .eq('marker_kind', k)

      if (error) throw error
    }
  },

  /**
   * Upsert a planning marker (tee shot, landing area, pin).
   */
  upsertPlanningMarker: async (holeId, markerType, sequenceOrder, lat, long, elevation = null) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // For landing areas, we don't have a unique constraint on hole_id + marker_type + sequence_order
    // in the same way, but we should handle it.
    // If it's a tee_shot or pin_location, we can treat it as unique for the hole.
    // Landing areas are multiple.

    // Use upsert for all planning markers. 
    // The unique index covers hole_id, user_id, marker_type, and sequence_order.
    let { data, error } = await supabase.rpc('add_planning_marker', {
      p_hole_id: holeId,
      p_user_id: user.id,
      p_marker_type: markerType,
      p_sequence_order: sequenceOrder,
      p_lat: lat,
      p_lng: long, // Note: param is long in this function, but RPC expects p_lng
      p_elevation: elevation,
    })

    if (error && isLikelyMissingElevationRpcArg(error)) {
      ;({ data, error } = await supabase.rpc('add_planning_marker', {
        p_hole_id: holeId,
        p_user_id: user.id,
        p_marker_type: markerType,
        p_sequence_order: sequenceOrder,
        p_lat: lat,
        p_lng: long,
      }))
    }

    if (error) throw error
    return data
  },

  /**
   * Insert a new planning marker and shift subsequent markers.
   */
  insertPlanningMarker: async (holeId, markerType, sequenceOrder, lat, long, elevation = null) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    let { data, error } = await supabase.rpc('insert_planning_marker', {
      p_hole_id: holeId,
      p_user_id: user.id,
      p_marker_type: markerType,
      p_sequence_order: sequenceOrder,
      p_lat: lat,
      p_lng: long,
      p_elevation: elevation,
    })

    if (error && isLikelyMissingElevationRpcArg(error)) {
      ;({ data, error } = await supabase.rpc('insert_planning_marker', {
        p_hole_id: holeId,
        p_user_id: user.id,
        p_marker_type: markerType,
        p_sequence_order: sequenceOrder,
        p_lat: lat,
        p_lng: long,
      }))
    }

    if (error) throw error
    return data
  },

  /**
   * Move an existing planning marker by ID.
   */
  movePlanningMarker: async (markerId, lat, long, elevation = null) => {
    // Fetch the marker details from the view first to get the necessary params for the RPC
    const { data: marker, error: fetchError } = await supabase
      .from('hole_planning_markers_view')
      .select('hole_id, user_id, marker_type, sequence_order')
      .eq('id', markerId)
      .single()

    if (fetchError) throw fetchError

    let { data, error } = await supabase.rpc('add_planning_marker', {
      p_hole_id: marker.hole_id,
      p_user_id: marker.user_id,
      p_marker_type: marker.marker_type,
      p_sequence_order: marker.sequence_order,
      p_lat: lat,
      p_lng: long,
      p_elevation: elevation,
    })

    if (error && isLikelyMissingElevationRpcArg(error)) {
      ;({ data, error } = await supabase.rpc('add_planning_marker', {
        p_hole_id: marker.hole_id,
        p_user_id: marker.user_id,
        p_marker_type: marker.marker_type,
        p_sequence_order: marker.sequence_order,
        p_lat: lat,
        p_lng: long,
      }))
    }

    if (error) throw error
    return data
  },

  deletePlanningMarker: async (markerId) => {
    const { error } = await supabase.rpc('delete_planning_marker', {
      p_marker_id: markerId
    })

    if (error) throw error
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
    const { data: newOverlay, error: overlayErr } = await supabase.rpc('upsert_terrain_overlay', {
      p_id: null,
      p_course_id: courseId,
      p_terrain_type: terrainType,
      p_risk_tier: null,
      p_geojson_data: feature,
      p_hole_ids: holeId ? [holeId] : [],
    })

    if (overlayErr) throw overlayErr
    return newOverlay
  },
}
