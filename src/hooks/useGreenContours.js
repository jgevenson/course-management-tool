import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { contours } from 'd3-contour'

/**
 * Hook to fetch and process green elevation data into isolines.
 */
export default function useGreenContours(holeId, intervalInches = 2) {
  const [contourData, setContourData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchContours = useCallback(async () => {
    if (!holeId) {
      setContourData(null)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('green_contours')
        .select('*')
        .eq('hole_id', holeId)
        .maybeSingle()

      if (fetchError) throw fetchError
      setContourData(data)
    } catch (err) {
      console.error('Failed to fetch green contours:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [holeId])

  useEffect(() => {
    let mounted = true
    fetchContours().then(() => {})
    return () => { mounted = false }
  }, [fetchContours])

  const isolines = useMemo(() => {
    if (!contourData || !contourData.matrix_data) return []

    const matrix = contourData.matrix_data
    const width = matrix.width
    const height = matrix.height
    const points = matrix.points

    if (width <= 0 || height <= 0 || points.length === 0) return []

    // 1. Find min and max Z for the threshold calculation
    let minZ = Infinity
    let maxZ = -Infinity
    points.forEach(p => {
      if (p.z < minZ) minZ = p.z
      if (p.z > maxZ) maxZ = p.z
    })

    if (minZ === Infinity) return []

    // 2. Create a 1D grid for d3-contour (width x height)
    // We fill missing values with a dummy low elevation so contours terminate cleanly at edges
    const dummyZ = minZ - 100 
    const values = new Array(width * height).fill(dummyZ)
    
    points.forEach(p => {
      values[p.y * width + p.x] = p.z
    })

    // 3. Generate contour thresholds (e.g., every 2 inches -> 0.1666 feet)
    const intervalFeet = intervalInches / 12.0
    // Start cleanly on a multiple of the interval
    const startThresh = Math.floor(minZ / intervalFeet) * intervalFeet
    const thresholds = []
    for (let t = startThresh; t <= maxZ; t += intervalFeet) {
      thresholds.push(t)
    }

    // 4. Generate the geometries
    const contourGenerator = contours()
      .size([width, height])
      .thresholds(thresholds)

    const geojsonData = contourGenerator(values)

    // Normalize paths and attach slope data if we want coloring
    // We map the GeoJSON Coordinates directly to generic SVG paths based on the 0-width, 0-height space
    const paths = geojsonData.map(multipolygon => {
      // Calculate a path string 'd' 
      let d = ''
      multipolygon.coordinates.forEach(polygon => {
        polygon.forEach((ring) => {
          d += ring.map((point, j) => {
            const cmd = j === 0 ? 'M' : 'L'
            // Point is [x, y], meaning pixel coords
            return `${cmd}${point[0].toFixed(2)},${point[1].toFixed(2)}`
          }).join(' ') + ' Z '
        })
      })
      return {
        value: multipolygon.value, // The elevation threshold
        pathData: d,
        width,
        height
      }
    })

    // Filter out empty paths
    return {
      paths: paths.filter(p => p.pathData.length > 0),
      minZ,
      maxZ,
      points
    }
  }, [contourData, intervalInches])

  return {
    contourData,
    isolines: isolines.paths || [],
    minZ: isolines.minZ,
    maxZ: isolines.maxZ,
    points: isolines.points || [],
    loading,
    error,
    refresh: fetchContours
  }
}
