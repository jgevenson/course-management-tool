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
