import { useEffect, useState, useMemo, useCallback } from 'react'
import { useMap, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import { contours } from 'd3-contour'
import intersect from '@turf/intersect'
import { featureCollection } from '@turf/helpers'
import { supabase } from '../../../supabaseClient'

/**
 * Maps pixel coordinates (x, y) to GeoJSON [longitude, latitude] coordinates.
 */
function mapPixelToLonLat(px, py, width, height, extent) {
  const { minLon, minLat, maxLon, maxLat } = extent
  const lon = minLon + (px / (width - 1)) * (maxLon - minLon)
  const lat = maxLat - (py / (height - 1)) * (maxLat - minLat)
  return [lon, lat]
}

export default function ElevationContourLayer({ holeId, visibleTerrainOverlays }) {
  const map = useMap()
  const [gridData, setGridData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // 1. Fetch elevation grid or trigger Edge Function
  useEffect(() => {
    if (!holeId) {
      console.log('[ElevationContourLayer] No holeId provided, skipping fetch')
      setGridData(null)
      return
    }

    let active = true
    const loadData = async () => {
      console.log(`[ElevationContourLayer] Loading elevation grid for holeId=${holeId}`)
      setLoading(true)
      setError(null)
      try {
        const { data, error: selectErr } = await supabase
          .from('hole_elevation_grids')
          .select('grid_data')
          .eq('hole_id', holeId)
          .eq('resolution_meters', 3)
          .maybeSingle()

        if (selectErr) {
          console.error('[ElevationContourLayer] Database query error:', selectErr)
          throw selectErr
        }

        if (data?.grid_data) {
          console.log('[ElevationContourLayer] Grid data found in database cache:', {
            width: data.grid_data.width,
            height: data.grid_data.height,
            extent: data.grid_data.extent
          })
          if (active) setGridData(data.grid_data)
        } else {
          console.log('[ElevationContourLayer] Cache miss. Invoking generate-elevation-grid Edge Function...')
          // Trigger Edge Function if cache is missing
          const { data: edgeData, error: edgeErr } = await supabase.functions.invoke('generate-elevation-grid', {
            body: { hole_id: holeId, resolution: 3 }
          })
          if (edgeErr) {
            console.error('[ElevationContourLayer] Edge function invocation error:', edgeErr)
            throw edgeErr
          }
          console.log('[ElevationContourLayer] Edge function succeeded, grid data:', {
            width: edgeData?.width,
            height: edgeData?.height,
            extent: edgeData?.extent
          })
          if (active) setGridData(edgeData)
        }
      } catch (err) {
        console.error('[ElevationContourLayer] Failed to load elevation grid:', err)
        if (active) setError(err.message)
      } finally {
        if (active) setLoading(false)
      }
    }

    loadData()
    return () => { active = false }
  }, [holeId])

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
    if (!gridData || !gridData.grid || gridData.grid.length === 0) {
      console.log('[ElevationContourLayer] No gridData or empty grid, skipping raw contours')
      return null
    }
    const { width, height, grid, extent } = gridData
    console.log('[ElevationContourLayer] Generating raw contours for grid:', { width, height, extent })

    // Negating grid values so that the contour bands represent z <= threshold,
    // which stacks the lower elevation bands on top (making lower areas darker).
    const flatValues = new Array(width * height)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        flatValues[y * width + x] = -grid[y][x]
      }
    }

    console.log(`[ElevationContourLayer] Grid Z range: min=${minZ}, max=${maxZ}`)

    const intervalYards = 1.0
    const thresholds = []
    // In negated space, values range from -maxZ to -minZ
    for (let t = Math.ceil(-maxZ); t <= -minZ; t += intervalYards) {
      thresholds.push(t)
    }

    console.log('[ElevationContourLayer] Generated contour thresholds (negated):', thresholds)

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

    console.log(`[ElevationContourLayer] Generated ${features.length} raw contour features`)
    return features
  }, [gridData, minZ, maxZ])

  // 4. Cookie-Cutter Masking using Turf.js
  const clippedContourGeoJson = useMemo(() => {
    console.log('[ElevationContourLayer] Running clippedContourGeoJson useMemo')
    console.log('[ElevationContourLayer] rawContoursGeoJson length:', rawContoursGeoJson?.length)
    console.log('[ElevationContourLayer] visibleTerrainOverlays length:', visibleTerrainOverlays?.length)
    if (!rawContoursGeoJson || !visibleTerrainOverlays || visibleTerrainOverlays.length === 0) return null

    // Isolate only the playable shapes we want lines to appear on
    // rough, fairway, green, tee
    const playableFeatures = visibleTerrainOverlays
      .filter(o => o.terrain_type && ['rough', 'fairway', 'green', 'tee'].includes(o.terrain_type))
      .map(o => {
        const geom = o.geojson_data?.geometry || o.geojson_data
        console.log(`[ElevationContourLayer] Playable shape found: type=${o.terrain_type}, id=${o.id}, geometryType=${geom?.type}`, geom)
        return {
          type: 'Feature',
          geometry: geom,
          properties: { terrain_type: o.terrain_type, id: o.id }
        }
      })

    console.log('[ElevationContourLayer] Total playableFeatures:', playableFeatures.length)
    if (playableFeatures.length === 0) return null

    const clippedFeatures = []
    let intersectionSuccessCount = 0
    let intersectionNullCount = 0
    let intersectionErrorCount = 0

    // Intersect the 20-30 contour lines against the playable shapes
    rawContoursGeoJson.forEach(contour => {
      playableFeatures.forEach(playableShape => {
        try {
          const clipped = intersect(featureCollection([contour, playableShape]))
          if (clipped) {
            clipped.properties = { ...contour.properties } // Preserve elevation data
            clippedFeatures.push(clipped)
            intersectionSuccessCount++
          } else {
            intersectionNullCount++
          }
        } catch (err) {
          intersectionErrorCount++
          // Gracefully swallow occasional intersection errors from Turf due to float errors
          console.warn('[ElevationContourLayer] Contour line intersection failed for elevation:', contour.properties?.elevation, 'playableShape:', playableShape.properties?.id, err)
        }
      })
    })

    console.log('[ElevationContourLayer] Intersection results:', {
      success: intersectionSuccessCount,
      nullResults: intersectionNullCount,
      errors: intersectionErrorCount,
      totalClippedFeatures: clippedFeatures.length
    })

    if (clippedFeatures.length === 0) return null

    return { type: 'FeatureCollection', features: clippedFeatures }
  }, [rawContoursGeoJson, visibleTerrainOverlays])

  // 5. Dynamic styling to shade elevation steps subtly (lower = darker)
  const styleContourFeature = useCallback((feature) => {
    if (minZ === maxZ) {
      return {
        color: '#475569',
        weight: 0.8,
        opacity: 0.45,
        fill: false
      }
    }
    const elev = feature.properties?.elevation ?? minZ
    // Inverse normalized value: 1 means lowest elevation (minZ), 0 means highest elevation (maxZ)
    const normalized = Math.max(0, Math.min(1, (maxZ - elev) / (maxZ - minZ)))

    // Since lower polygons are now nested inside, they will stack more layers.
    // Using a subtle dark slate color with very low opacity per layer to build a smooth gradient.
    const fillOpacity = 0.012 + normalized * 0.012

    return {
      color: '#334155', // Slate contour line
      weight: 0.45,
      opacity: 0.45,
      fillColor: '#0f172a', // Slate/navy shade color
      fillOpacity,
      fill: true
    }
  }, [minZ, maxZ])

  // 6. Render with default SVG renderer to prevent mixed-renderer stacking issues
  if (loading) return null
  if (error || !clippedContourGeoJson) return null

  return (
    <GeoJSON
      key={`contours-${holeId}`}
      data={clippedContourGeoJson}
      style={styleContourFeature}
      interactive={false}
    />
  )
}
