import { supabase } from '../../supabaseClient'

export const terrainApi = {
  getOverlays: async (courseId) => {
    const { data: overlays, error: oErr } = await supabase
      .from('vw_planar_terrain_overlays')
      .select('id, course_id, terrain_type, risk_tier, label, geojson_data, geojson_data_raw')
      .eq('course_id', courseId)
      .eq('is_active', true)

    if (oErr) throw oErr
    if (!overlays || overlays.length === 0) return []

    const overlayIds = overlays.map(o => o.id)
    const { data: links, error: lErr } = await supabase
      .from('terrain_overlay_holes')
      .select('terrain_overlay_id, hole_id')
      .in('terrain_overlay_id', overlayIds)

    if (lErr) throw lErr

    return overlays.map(o => ({
      ...o,
      terrain_overlay_holes: (links ?? [])
        .filter(l => l.terrain_overlay_id === o.id)
        .map(l => ({ hole_id: l.hole_id }))
    }))
  },

  addOverlay: async (courseId, payload) => {
    const { holeIds, terrainType, label, geojsonData } = payload
    
    const { data: row, error } = await supabase.rpc('upsert_terrain_overlay', {
      p_id: null,
      p_course_id: courseId,
      p_terrain_type: terrainType,
      p_risk_tier: null,
      p_geojson_data: geojsonData,
      p_hole_ids: holeIds || [],
    })

    if (error || !row?.id) throw error || new Error('Could not save region')

    return row
  },

  updateOverlayProperties: async (id, payload) => {
    const { terrainType, label, geojsonData, holeIds } = payload
    
    const { error: uErr } = await supabase.rpc('upsert_terrain_overlay', {
      p_id: id,
      p_course_id: null, // Course ID is usually already set for existing overlays
      p_terrain_type: terrainType,
      p_risk_tier: null,
      p_geojson_data: geojsonData,
      p_hole_ids: holeIds || [],
    })

    if (uErr) throw uErr
  },

  updateOverlayGeometry: async (id, feature) => {
    // Fetch the overlay to get its current properties if needed, or just use the RPC
    // Since upsert_terrain_overlay handles both insert and update, we use it here.
    const { data: overlay } = await supabase
      .from('terrain_overlays_view')
      .select('course_id, terrain_type, risk_tier')
      .eq('id', id)
      .single()

    const { error } = await supabase.rpc('upsert_terrain_overlay', {
      p_id: id,
      p_course_id: overlay?.course_id,
      p_terrain_type: overlay?.terrain_type,
      p_risk_tier: overlay?.risk_tier,
      p_geojson_data: feature,
    })

    if (error) throw error
  },

  removeOverlay: async (id) => {
    const { error: linkErr } = await supabase.from('terrain_overlay_holes').delete().eq('terrain_overlay_id', id)
    if (linkErr) throw linkErr

    const { error: overlayErr } = await supabase.from('terrain_overlays').delete().eq('id', id)
    if (overlayErr) throw overlayErr
  },

  alignSelectedFeatures: async (masterId, adjustId, toleranceMeters) => {
    const { data, error } = await supabase.rpc('align_selected_features', {
      master_id: masterId,
      adjust_id: adjustId,
      tolerance_meters: toleranceMeters,
    })

    if (error) throw error
    return data
  }
}
