// AI assisted development
import { haversineDistanceYards } from './geoDistance'
import { resolvePlanningMarkers } from './holeMarkers'

/**
 * @param {object | null} hole
 * @returns {{ segments: Array<{ id: string, label: string, yards: number }>, markers: Array<any> }}
 */
export function buildPlanningView(hole) {
  if (!hole) {
    return { segments: [], markers: [] }
  }

  const sequence = resolvePlanningMarkers(hole)
  const segments = []

  for (let i = 0; i < sequence.length - 1; i++) {
    const start = sequence[i]
    const end = sequence[i + 1]
    const startLng = start.long ?? start.lng
    const endLng = end.long ?? end.lng

    const yards = Math.round(
      haversineDistanceYards(
        Number(start.lat),
        Number(startLng),
        Number(end.lat),
        Number(endLng),
      ),
    )

    let label = ''
    if (start.marker_type === 'tee_shot_location' && end.marker_type === 'pin_location') {
      label = 'Tee shot → Pin'
    } else if (start.marker_type === 'tee_shot_location' && end.marker_type === 'landing_area') {
      label = 'Tee shot → L1'
    } else if (start.marker_type === 'landing_area' && end.marker_type === 'landing_area') {
      const startIdx = sequence.filter((x, idx) => idx <= i && x.marker_type === 'landing_area').length
      label = `L${startIdx} → L${startIdx + 1}`
    } else if (start.marker_type === 'landing_area' && end.marker_type === 'pin_location') {
      const startIdx = sequence.filter((x, idx) => idx <= i && x.marker_type === 'landing_area').length
      label = `L${startIdx} → Pin`
    }

    segments.push({
      id: `seg-${i}`,
      label,
      yards,
    })
  }

  return { segments, markers: sequence }
}
