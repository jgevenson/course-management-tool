// AI assisted development
import { coordSet } from './holeCoords'

export const HOLE_MARKER_KIND = {
  GREEN_CENTER: 'green_center',
  TEE_BACK: 'tee_back',
  /** Expected tee-shot origin for planning (distinct from back-of-tee mapping marker). */
  TEE_SHOT_LOCATION: 'tee_shot_location',
  /** Planned landing / aim point for the first shot (planning). */
  FIRST_SHOT_LOCATION: 'first_shot_location',
  /** Optional planned second shot (longer holes; planning). */
  SECOND_SHOT_LOCATION: 'second_shot_location',
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
