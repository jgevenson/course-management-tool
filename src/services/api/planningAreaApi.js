import { supabase } from '../../supabaseClient'

/**
 * @typedef {object} PlanningAreaStyle
 * @property {string} color - Hex color (e.g. '#ff0000')
 * @property {number} opacity - Fill opacity (0-1)
 */

/**
 * @typedef {object} PlanningAreaRow
 * @property {string} id
 * @property {string} hole_id
 * @property {string} label
 * @property {string} description
 * @property {PlanningAreaStyle} style
 * @property {object} geojson_data
 */

/**
 * Fetch all planning areas for a given hole.
 * @param {string} holeId
 * @returns {Promise<PlanningAreaRow[]>}
 */
export async function getPlanningAreasForHole(holeId) {
  const { data, error } = await supabase
    .from('hole_planning_areas')
    .select('id, hole_id, label, description, style, geojson_data')
    .eq('hole_id', holeId)
  
  if (error) {
    console.error('getPlanningAreasForHole error:', error)
    throw error
  }
  return data || []
}

/**
 * Create or update a planning area.
 * @param {object} params
 * @param {string|null} params.id
 * @param {string} params.holeId
 * @param {string} params.label
 * @param {string} params.description
 * @param {PlanningAreaStyle} params.style
 * @param {object} params.geojsonData
 * @returns {Promise<PlanningAreaRow>}
 */
export async function upsertPlanningArea({ id, holeId, label, description, style, geojsonData }) {
  const { data, error } = await supabase.rpc('upsert_hole_planning_area', {
    p_id: id || null,
    p_hole_id: holeId,
    p_label: label,
    p_description: description,
    p_style: style,
    p_geojson_data: geojsonData
  })
  
  if (error) {
    console.error('upsertPlanningArea error:', error)
    throw error
  }
  return data
}

/**
 * Delete a planning area.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePlanningArea(id) {
  const { error } = await supabase
    .from('hole_planning_areas')
    .delete()
    .eq('id', id)
    
  if (error) {
    console.error('deletePlanningArea error:', error)
    throw error
  }
}
