import { supabase } from '../../supabaseClient'

export const terrainApi = {
  getOverlays: async (courseId) => {
    const { data, error } = await supabase
      .from('terrain_overlays')
      .select('id, course_id, terrain_type, risk_tier, label, geojson_data, terrain_overlay_holes(hole_id)')
      .eq('course_id', courseId)
      .eq('is_active', true)

    if (error) throw error
    return data
  },

  addOverlay: async (courseId, payload) => {
    const { holeIds, terrainType, label, geojsonData } = payload
    
    const { data: row, error } = await supabase
      .from('terrain_overlays')
      .insert({
        course_id: courseId,
        terrain_type: terrainType,
        label: label ? label : null,
        risk_tier: null,
        geojson_data: geojsonData,
        is_active: true,
      })
      .select('id')
      .maybeSingle()

    if (error || !row?.id) throw error || new Error('Could not save region')

    if (holeIds && holeIds.length > 0) {
      const links = holeIds.map((hole_id) => ({
        terrain_overlay_id: row.id,
        hole_id,
      }))
      const { error: linkErr } = await supabase.from('terrain_overlay_holes').insert(links)
      
      if (linkErr) {
        await supabase.from('terrain_overlays').update({ is_active: false }).eq('id', row.id)
        throw linkErr
      }
    }
    return row
  },

  updateOverlayProperties: async (id, payload) => {
    const { terrainType, label, geojsonData, holeIds } = payload
    
    const { error: uErr } = await supabase
      .from('terrain_overlays')
      .update({
        terrain_type: terrainType,
        label: label ? label : null,
        geojson_data: geojsonData,
      })
      .eq('id', id)
      .eq('is_active', true)

    if (uErr) throw uErr

    const { error: dErr } = await supabase.from('terrain_overlay_holes').delete().eq('terrain_overlay_id', id)
    if (dErr) throw dErr

    if (holeIds && holeIds.length > 0) {
      const links = holeIds.map((hole_id) => ({
        terrain_overlay_id: id,
        hole_id,
      }))
      const { error: iErr } = await supabase.from('terrain_overlay_holes').insert(links)
      if (iErr) throw iErr
    }
  },

  updateOverlayGeometry: async (id, feature) => {
    const { error } = await supabase
      .from('terrain_overlays')
      .update({ geojson_data: feature })
      .eq('id', id)
      .eq('is_active', true)

    if (error) throw error
  },

  removeOverlay: async (id) => {
    const { error: linkErr } = await supabase.from('terrain_overlay_holes').delete().eq('terrain_overlay_id', id)
    if (linkErr) throw linkErr

    const { error: overlayErr } = await supabase.from('terrain_overlays').delete().eq('id', id)
    if (overlayErr) throw overlayErr
  }
}
