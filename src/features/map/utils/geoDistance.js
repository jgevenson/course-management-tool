// AI assisted development

/** Mean Earth radius in meters (WGS84 approximation). */
const R_EARTH_M = 6371008.8

/**
 * Great-circle distance between two WGS84 lat/lng points (Haversine).
 * @returns {number} Distance in meters
 */
export function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  return R_EARTH_M * c
}

/**
 * Statute yards (same convention as US golf yardages).
 * @returns {number}
 */
export function haversineDistanceYards(lat1, lng1, lat2, lng2) {
  return haversineDistanceMeters(lat1, lng1, lat2, lng2) * 1.0936132983377
}

/**
 * Calculates initial bearing between two LatLng points.
 * @returns {number} Bearing in degrees (0-360)
 */
export function getBearing(startLat, startLng, endLat, endLng) {
  const startL = (startLat * Math.PI) / 180
  const startLn = (startLng * Math.PI) / 180
  const endL = (endLat * Math.PI) / 180
  const endLn = (endLng * Math.PI) / 180

  const y = Math.sin(endLn - startLn) * Math.cos(endL)
  const x =
    Math.cos(startL) * Math.sin(endL) -
    Math.sin(startL) * Math.cos(endL) * Math.cos(endLn - startLn)
  const bearing = (Math.atan2(y, x) * 180) / Math.PI
  return (bearing + 360) % 360
}

/**
 * Calculates a destination point given a start, distance, and bearing.
 * @param {number} lat
 * @param {number} lng
 * @param {number} distanceYards
 * @param {number} bearingDegrees
 */
export function computeDestination(lat, lng, distanceYards, bearingDegrees) {
  const R = 6371000 // Earth radius in meters
  const d = distanceYards * 0.9144 // Distance in meters
  const brng = (bearingDegrees * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lng * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d / R) +
      Math.cos(lat1) * Math.sin(d / R) * Math.cos(brng),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d / R) * Math.cos(lat1),
      Math.cos(d / R) - Math.sin(lat1) * Math.sin(lat2),
    )

  return {
    lat: (lat2 * 180) / Math.PI,
    lng: (lon2 * 180) / Math.PI,
  }
}
