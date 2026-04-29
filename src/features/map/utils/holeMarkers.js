// AI assisted development
import { coordSet } from './holeCoords'

export const HOLE_MARKER_KIND = {
  GREEN_CENTER: 'green_center',
  TEE_BACK: 'tee_back',
}

export const PLANNING_MARKER_TYPE = {
  TEE_SHOT_LOCATION: 'tee_shot_location',
  LANDING_AREA: 'landing_area',
  PIN_LOCATION: 'pin_location',
}

/**
 * @param {{ mapMarkers?: Array<{ marker_kind: string, lat: number, lng: number, is_active?: boolean }> } | null} hole
 * @param {string} kind
 */
export function activeMarkerLatLng(hole, kind) {
  const row = hole?.mapMarkers?.find(
    (m) => m.marker_kind === kind && m.is_active !== false,
  )
  if (!row) return null
  return { lat: row.lat, lng: row.lng, id: row.id }
}

export function markerIsSet(hole, kind) {
  const c = activeMarkerLatLng(hole, kind)
  return c != null && coordSet(c.lat, c.lng)
}

/**
 * Resolves the full sequence of planning markers for a hole.
 * 1. Tee Shot (order 0): from planning_markers OR tee_back mapping marker.
 * 2. Landing Areas (order 1..N): from planning_markers.
 * 3. Pin (order 99): from planning_markers OR green_center mapping marker.
 */
export function resolvePlanningMarkers(hole) {
  if (!hole) return []

  const planning = hole.planningMarkers ?? []
  
  // 1. Tee Shot
  let teeShot = planning.find(m => m.marker_type === 'tee_shot_location')
  if (!teeShot) {
    const teeBack = activeMarkerLatLng(hole, HOLE_MARKER_KIND.TEE_BACK)
    if (teeBack) {
      teeShot = { ...teeBack, id: null, marker_type: 'tee_shot_location', sequence_order: 0, is_default: true }
    }
  }

  // 2. Landing Areas
  const landingAreas = planning
    .filter(m => m.marker_type === 'landing_area')
    .sort((a, b) => a.sequence_order - b.sequence_order)

  // 3. Pin
  let pin = planning.find(m => m.marker_type === 'pin_location')
  if (!pin) {
    const greenCenter = activeMarkerLatLng(hole, HOLE_MARKER_KIND.GREEN_CENTER)
    if (greenCenter) {
      pin = { ...greenCenter, id: null, marker_type: 'pin_location', sequence_order: 99, is_default: true }
    }
  }

  const sequence = []
  if (teeShot) sequence.push(teeShot)
  sequence.push(...landingAreas)
  if (pin) sequence.push(pin)

  return sequence
}
