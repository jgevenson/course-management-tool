// AI assisted development
/**
 * Recursively extracts coordinates from GeoJSON geometry types.
 */
function gatherCoordinates(coords, type, list) {
  if (!coords) return

  if (type === 'Point') {
    list.push(coords)
  } else if (type === 'LineString' || type === 'MultiPoint') {
    coords.forEach(c => {
      if (Array.isArray(c) && c.length >= 2) list.push(c)
    })
  } else if (type === 'Polygon' || type === 'MultiLineString') {
    coords.forEach(ring => {
      if (Array.isArray(ring)) {
        ring.forEach(c => {
          if (Array.isArray(c) && c.length >= 2) list.push(c)
        })
      }
    })
  } else if (type === 'MultiPolygon') {
    coords.forEach(poly => {
      if (Array.isArray(poly)) {
        poly.forEach(ring => {
          if (Array.isArray(ring)) {
            ring.forEach(c => {
              if (Array.isArray(c) && c.length >= 2) list.push(c)
            })
          }
        })
      }
    })
  }
}

/**
 * Computes a bounding box [[minLng, minLat], [maxLng, maxLat]] for a hole
 * based on its associated markers and terrain overlays.
 *
 * @param {Object} hole
 * @param {Array} overlays
 * @returns {Array|null} MapLibre bounds or null if no coordinates
 */
export function getHoleBounds(hole, overlays) {
  const coordinates = []

  // Extract from map markers (e.g. green center, tee back)
  if (hole?.mapMarkers) {
    hole.mapMarkers.forEach(m => {
      if (m.lat && m.lng && m.is_active !== false) {
        coordinates.push([Number(m.lng), Number(m.lat)])
      }
    })
  }

  // Extract from planning markers (e.g. landing areas, pins)
  if (hole?.planningMarkers) {
    hole.planningMarkers.forEach(m => {
      if (m.lat && m.lng && m.is_active !== false) {
        coordinates.push([Number(m.lng), Number(m.lat)])
      }
    })
  }

  // Extract from terrain overlays
  if (Array.isArray(overlays)) {
    overlays.forEach(overlay => {
      const gj = overlay.geojson_data
      if (!gj) return
      const geometry = gj.type === 'Feature' ? gj.geometry : gj
      if (geometry && geometry.coordinates) {
        gatherCoordinates(geometry.coordinates, geometry.type, coordinates)
      }
    })
  }

  if (coordinates.length === 0) return null

  let minLng = Infinity, maxLng = -Infinity
  let minLat = Infinity, maxLat = -Infinity

  coordinates.forEach(([lng, lat]) => {
    if (isNaN(lng) || isNaN(lat)) return
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  })

  if (minLng === Infinity || minLat === Infinity) return null

  return [
    [minLng, minLat], // Southwest
    [maxLng, maxLat]  // Northeast
  ]
}
