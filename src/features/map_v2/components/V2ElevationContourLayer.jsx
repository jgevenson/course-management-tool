import { useEffect, useState, useMemo } from 'react'
import { contours } from 'd3-contour'
import intersect from '@turf/intersect'
import { featureCollection } from '@turf/helpers'
import { supabase } from '../../../supabaseClient'

// --- Styling Configuration ---
const CONTOUR_STYLES = {
  fillColor: '#0f172a',
  lineColor: '#334155',
  lineWidth: 0.45,
  lineOpacity: 0.45,
  baseFillOpacity: 0.008,
  maxAdditionalFillOpacity: 0.012,
  resolutionMeters: 1,
  intervalYards: 0.5,
}

const LAYER_ID_FILLS = 'contour-fills'
const LAYER_ID_LINES = 'contour-lines'
const SOURCE_ID = 'contour-source'

/**
 * Maps pixel coordinates (x, y) to GeoJSON [longitude, latitude] coordinates.
 */
function mapPixelToLonLat(px, py, width, height, extent) {
  const { minLon, minLat, maxLon, maxLat } = extent
  const lon = minLon + (px / (width - 1)) * (maxLon - minLon)
  const lat = maxLat - (py / (height - 1)) * (maxLat - minLat)
  return [lon, lat]
}

export default function V2ElevationContourLayer({ mapInstance, holeId, visibleTerrainOverlays, showLidar }) {
  const [gridData, setGridData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 1. Fetch elevation grid or trigger Edge Function
  useEffect(() => {
    if (!showLidar || !holeId) {
      setGridData(null)
      return
    }

    let active = true
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const { data, error: selectErr } = await supabase
          .from('hole_elevation_grids')
          .select('grid_data')
          .eq('hole_id', holeId)
          .eq('resolution_meters', CONTOUR_STYLES.resolutionMeters)
          .maybeSingle()

        if (selectErr) throw selectErr

        if (data?.grid_data) {
          if (active) setGridData(data.grid_data)
        } else {
          // Trigger Edge Function if cache is missing
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('generate-elevation-grid', {
            body: { hole_id: holeId, resolution: CONTOUR_STYLES.resolutionMeters }
          })
          if (edgeErr) throw edgeErr
          if (active) setGridData(edgeData)
        }
      } catch (err) {
        console.error('[V2ElevationContourLayer] Failed to load elevation grid:', err)
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [holeId, showLidar])

  // 2. Find min and max Z from the grid
  const { minZ, maxZ } = useMemo(() => {
    if (!gridData || !gridData.grid || gridData.grid.length === 0) return { minZ: 0, maxZ: 0 }
    let minVal = Infinity
    let maxVal = -Infinity
    const { grid } = gridData
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[y].length; x++) {
        const val = grid[y][x]
        if (val < minVal) minVal = val
        if (val > maxVal) maxVal = val
      }
    }
    return { minZ: minVal, maxZ: maxVal }
  }, [gridData])

  // 3. Generate raw contours for the ENTIRE Bounding Box (negated for lower-is-darker stacking)
  const rawContoursGeoJson = useMemo(() => {
    if (!gridData || !gridData.grid || gridData.grid.length === 0) return null
    
    const { width, height, grid, extent } = gridData

    // Negating grid values so that the contour bands represent z <= threshold,
    // which stacks the lower elevation bands on top (making lower areas darker).
    const flatValues = new Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        flatValues[y * width + x] = -grid[y][x]
      }
    }

    const thresholds = []
    for (let t = Math.ceil(-maxZ); t <= -minZ; t += CONTOUR_STYLES.intervalYards) {
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
          ring.map(([px, py]) => mapPixelToLonLat(px, py, width, height, extent))
        )
      )
      return {
        type: 'Feature',
        geometry: { type: 'MultiPolygon', coordinates: coords },
        properties: { elevation: -c.value } // Negate back to original elevation yards
      }
    })

    return features
  }, [gridData, minZ, maxZ])

  // 4. Cookie-Cutter Masking using Turf.js
  const clippedContourGeoJson = useMemo(() => {
    if (!rawContoursGeoJson || !visibleTerrainOverlays || visibleTerrainOverlays.length === 0) return null

    // Isolate only the playable shapes we want lines to appear on (excluding greens)
    const playableFeatures = visibleTerrainOverlays
      .filter(o => o.terrain_type && ['rough', 'fairway', 'tee'].includes(o.terrain_type))
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

    // Intersect the contour lines against the playable shapes
    rawContoursGeoJson.forEach(contour => {
      playableFeatures.forEach(playableShape => {
        try {
          const clipped = intersect(featureCollection([contour, playableShape]))
          if (clipped) {
            const elev = contour.properties?.elevation ?? minZ
            const normalized = minZ === maxZ ? 0 : Math.max(0, Math.min(1, (maxZ - elev) / (maxZ - minZ)))
            const fillOpacity = CONTOUR_STYLES.baseFillOpacity + (normalized * CONTOUR_STYLES.maxAdditionalFillOpacity)

            clipped.properties = { 
              ...contour.properties,
              fillOpacity
            }
            clippedFeatures.push(clipped)
          }
        } catch (err) {
          // Gracefully swallow occasional intersection errors from Turf due to float errors
        }
      })
    })

    if (clippedFeatures.length === 0) return null

    return { type: 'FeatureCollection', features: clippedFeatures }
  }, [rawContoursGeoJson, visibleTerrainOverlays, minZ, maxZ])

  // 5. Inject/Remove MapLibre layers
  useEffect(() => {
    if (!mapInstance) return

    // Cleanup function to remove source/layers
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
