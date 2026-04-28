// AI assisted development
import L from 'leaflet'

/**
 * Initial forward bearing from point A to B (degrees clockwise from north), 0–360.
 */
export function bearingDegrees(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const θ = Math.atan2(y, x)
  return ((θ * 180) / Math.PI + 360) % 360
}

/**
 * Map bearing for leaflet-rotate so tee→green aligns with screen up (green above tee).
 */
export function mapBearingForTeeBottomGreenTop(teeToGreenBearingDeg) {
  return L.Util.wrapNum(-teeToGreenBearingDeg, [0, 360])
}
