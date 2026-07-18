import { useEffect, useState, useMemo } from 'react'
import { contours } from 'd3-contour'
import intersect from '@turf/intersect'
import { featureCollection } from '@turf/helpers'
import { supabase } from '../../../supabaseClient'
import { fetchGreenElevationMatrix } from '../../../services/api/greenElevationApi'

// --- Styling Configuration ---
const CONTOUR_STYLES = {
  fillColor: '#0f172a',
  lineColor: '#262d3a70', // Slightly darker/tighter for green to pop more
  lineWidth: 0.4,
  lineOpacity: 0.29,
  baseFillOpacity: 0.003,
  maxAdditionalFillOpacity: 0.08,
  intervalInches: 1, // 2 inches per contour line for high-density
}

const LAYER_ID_FILLS = 'green-contour-fills'
const LAYER_ID_LINES = 'green-contour-lines'
const SOURCE_ID = 'green-contour-source'

/**
 * Maps pixel coordinates (x, y) to GeoJSON [longitude, latitude] coordinates.
 */
function mapPixelToLonLat(px, py, width, height, bbox) {
  const { minLon, minLat, maxLon, maxLat } = bbox
  const lon = minLon + (px / (width - 1)) * (maxLon - minLon)
  const lat = maxLat - (py / (height - 1)) * (maxLat - minLat)
  return [lon, lat]
}

export default function V2GreenContourLayer({ mapInstance, holeId, visibleTerrainOverlays, showLidar }) {
  const [contourData, setContourData] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 1. Fetch green contours or trigger API
  useEffect(() => {
    if (!showLidar || !holeId) {
      setContourData(null)
      return
    }

    let active = true
    const loadData = async () => {
      setLoading(true)
      try {
        let { data } = await supabase
          .from('green_contours')
          .select('*')
          .eq('hole_id', holeId)
          .maybeSingle()

        if (!data) {
          // If not in DB, generate it
          data = await fetchGreenElevationMatrix(holeId)
        }
        
        if (active && data) {
          setContourData(data)
        }
      } catch (err) {
        console.error('[V2GreenContourLayer] Failed to load green elevation matrix:', err)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [holeId, showLidar])

  // 2. Generate raw contours using d3-contour
  const rawContoursGeoJson = useMemo(() => {
    if (!contourData || !contourData.matrix_data) return null

    const matrix = contourData.matrix_data
    const width = matrix.width
    const height = matrix.height
    const points = matrix.points
    const bbox = matrix.bbox || {}

    // Fallback logic if bbox is missing but points exist (from old migrations)
    if (!bbox.minLon && points.length > 0) {
      let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
      for (const p of points) {
        if (p.lon < minLon) minLon = p.lon
        if (p.lon > maxLon) maxLon = p.lon
        if (p.lat < minLat) minLat = p.lat
        if (p.lat > maxLat) maxLat = p.lat
      }
      bbox.minLon = minLon; bbox.maxLon = maxLon; bbox.minLat = minLat; bbox.maxLat = maxLat;
    }

    if (width <= 0 || height <= 0 || points.length === 0) return null

    // Find min and max Z
    let minZ = Infinity
    let maxZ = -Infinity
    points.forEach(p => {
      if (p.z < minZ) minZ = p.z
      if (p.z > maxZ) maxZ = p.z
    })

    if (minZ === Infinity) return null

    // 1D grid for d3-contour (width x height)
    // Negate values to stack properly (lower elevation = rendered "on top")
    const dummyZ = -(maxZ + 100)
    const flatValues = new Array(width * height).fill(dummyZ)
    
    points.forEach(p => {
      flatValues[p.y * width + p.x] = -p.z
    })

    const intervalFeet = CONTOUR_STYLES.intervalInches / 12.0
    const thresholds = []
    
    // In negated space, we iterate from Math.ceil(-maxZ) to -minZ
    for (let t = Math.ceil(-maxZ); t <= -minZ; t += intervalFeet) {
      thresholds.push(t)
    }

    if (thresholds.length === 0) return null

    const contourGenerator = contours()
      .size([width, height])
      .thresholds(thresholds)

    const d3Contours = contourGenerator(flatValues)

    const features = d3Contours.map(c => {
      const coords = c.coordinates.map(polygon =>
        polygon.map(ring =>
          ring.map(([px, py]) => mapPixelToLonLat(px, py, width, height, bbox))
        )
      )
      return {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: coords },
        properties: { elevation: -c.value, minZ, maxZ } 
      }
    })

    return features
  }, [contourData])

  // 3. Turf.js intersection with green polygons
  const clippedContourGeoJson = useMemo(() => {
    if (!rawContoursGeoJson || !visibleTerrainOverlays || visibleTerrainOverlays.length === 0) return null

    // Isolate only the greens
    const playableFeatures = visibleTerrainOverlays
      .filter(o => o.terrain_type === 'green')
      .map(o => {
        const geom = o.geojson_data?.geometry || o.geojson_data
        return {
          type: 'Feature',
          geometry: geom,
          properties: { terrain_type: o.terrain_type, id: o.id }
        }
      })

    if (playableFeatures.length === 0) return null

    const clippedFeatures = []

    rawContoursGeoJson.forEach(contour => {
      playableFeatures.forEach(playableShape => {
        try {
          const clipped = intersect(featureCollection([contour, playableShape]))
          if (clipped) {
            const { elevation, minZ, maxZ } = contour.properties
            const elev = elevation ?? minZ
            const normalized = minZ === maxZ ? 0 : Math.max(0, Math.min(1, (maxZ - elev) / (maxZ - minZ)))
            const fillOpacity = CONTOUR_STYLES.baseFillOpacity + (normalized * CONTOUR_STYLES.maxAdditionalFillOpacity)

            clipped.properties = { 
              ...contour.properties,
              fillOpacity
            }
            clippedFeatures.push(clipped)
          }
        } catch (err) {
          // Gracefully swallow occasional intersection errors from Turf
        }
      })
    })

    if (clippedFeatures.length === 0) return null

    return { type: 'FeatureCollection', features: clippedFeatures }
  }, [rawContoursGeoJson, visibleTerrainOverlays])

  // 4. Inject/Remove MapLibre layers
  useEffect(() => {
    if (!mapInstance) return

    const removeLayers = () => {
      if (mapInstance.getLayer(LAYER_ID_FILLS)) mapInstance.removeLayer(LAYER_ID_FILLS)
      if (mapInstance.getLayer(LAYER_ID_LINES)) mapInstance.removeLayer(LAYER_ID_LINES)
      if (mapInstance.getSource(SOURCE_ID)) mapInstance.removeSource(SOURCE_ID)
    }

    if (!showLidar || !clippedContourGeoJson) {
      removeLayers()
      return
    }

    if (!mapInstance.getSource(SOURCE_ID)) {
      mapInstance.addSource(SOURCE_ID, {
        type: 'geojson',
        data: clippedContourGeoJson
      })
    } else {
      mapInstance.getSource(SOURCE_ID).setData(clippedContourGeoJson)
    }

    if (!mapInstance.getLayer(LAYER_ID_FILLS)) {
      mapInstance.addLayer({
        id: LAYER_ID_FILLS,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': CONTOUR_STYLES.fillColor,
          'fill-opacity': ['get', 'fillOpacity']
        }
      })
    }

    if (!mapInstance.getLayer(LAYER_ID_LINES)) {
      mapInstance.addLayer({
        id: LAYER_ID_LINES,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': CONTOUR_STYLES.lineColor,
          'line-width': CONTOUR_STYLES.lineWidth,
          'line-opacity': CONTOUR_STYLES.lineOpacity
        }
      })
    }

    return () => {
      removeLayers()
    }
  }, [mapInstance, clippedContourGeoJson, showLidar])

  return null
}
