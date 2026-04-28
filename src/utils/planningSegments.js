// AI assisted development
import { haversineDistanceYards } from './geoDistance'
import { HOLE_MARKER_KIND, activeMarkerLatLng, markerIsSet } from './holeMarkers'

/**
 * @param {{ mapMarkers?: Array<{ marker_kind: string, lat: number, lng: number }> } | null} hole
 * @returns {{ segments: Array<{ id: string, label: string, yards: number }>, markerRemovals: Array<{ kind: string, label: string }> }}
 */
export function buildPlanningView(hole) {
  if (!hole) {
    return { segments: [], markerRemovals: [] }
  }

  const green = activeMarkerLatLng(hole, HOLE_MARKER_KIND.GREEN_CENTER)
  const teeShot = activeMarkerLatLng(hole, HOLE_MARKER_KIND.TEE_SHOT_LOCATION)
  const firstShot = activeMarkerLatLng(hole, HOLE_MARKER_KIND.FIRST_SHOT_LOCATION)
  const secondShot = activeMarkerLatLng(hole, HOLE_MARKER_KIND.SECOND_SHOT_LOCATION)

  /** @type {Array<{ id: string, label: string, yards: number }>} */
  const segments = []

  const yd = (a, b) =>
    a && b
      ? Math.round(
          haversineDistanceYards(
            Number(a.lat),
            Number(a.lng),
            Number(b.lat),
            Number(b.lng),
          ),
        )
      : null

  if (teeShot && firstShot) {
    const y = yd(teeShot, firstShot)
    if (y != null) segments.push({ id: 'tee-first', label: 'Tee shot → 1st landing', yards: y })
  } else if (teeShot && green && !firstShot) {
    const y = yd(teeShot, green)
    if (y != null) segments.push({ id: 'tee-flag', label: 'Tee shot → Flag center', yards: y })
  }

  if (firstShot && secondShot) {
    const y = yd(firstShot, secondShot)
    if (y != null) segments.push({ id: 'first-second', label: '1st landing → 2nd shot', yards: y })
  }

  if (firstShot && green) {
    if (secondShot) {
      const y = yd(secondShot, green)
      if (y != null) segments.push({ id: 'second-flag', label: '2nd shot → Flag center', yards: y })
    } else {
      const y = yd(firstShot, green)
      if (y != null) segments.push({ id: 'first-flag', label: '1st landing → Flag center', yards: y })
    }
  }

  /** @type {Array<{ kind: string, label: string }>} */
  const markerRemovals = []
  if (markerIsSet(hole, HOLE_MARKER_KIND.TEE_SHOT_LOCATION)) {
    markerRemovals.push({
      kind: HOLE_MARKER_KIND.TEE_SHOT_LOCATION,
      label: 'Tee shot location',
    })
  }
  if (markerIsSet(hole, HOLE_MARKER_KIND.FIRST_SHOT_LOCATION)) {
    markerRemovals.push({
      kind: HOLE_MARKER_KIND.FIRST_SHOT_LOCATION,
      label: '1st landing',
    })
  }
  if (markerIsSet(hole, HOLE_MARKER_KIND.SECOND_SHOT_LOCATION)) {
    markerRemovals.push({
      kind: HOLE_MARKER_KIND.SECOND_SHOT_LOCATION,
      label: '2nd shot',
    })
  }

  return { segments, markerRemovals }
}
