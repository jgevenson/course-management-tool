import React, { useMemo, useEffect, useState } from 'react'
import { SVGOverlay } from 'react-leaflet'
import useGreenContours from '../../../hooks/useGreenContours'
import { fetchGreenElevationMatrix } from '../../../services/api/greenElevationApi'

export default function GreenLidarMapOverlay({ holeId }) {
  const { contourData, isolines, minZ, maxZ, loading, refresh } = useGreenContours(holeId, 2)
  const [fetching, setFetching] = useState(false)

  useEffect(() => {
    if (!loading && !contourData && !fetching) {
      setFetching(true)
      fetchGreenElevationMatrix(holeId)
        .then(() => refresh())
        .catch(err => console.error('Auto-fetch LiDAR failed:', err))
        .finally(() => setFetching(false))
    }
  }, [loading, contourData, fetching, holeId, refresh])

  const bounds = useMemo(() => {
    if (!contourData?.matrix_data) return null
    let bbox = contourData.matrix_data.bbox

    // Fallback if bbox isn't saved in the DB from an old fetch
    if (!bbox && contourData.matrix_data.points?.length > 0) {
      let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90
      for (const p of contourData.matrix_data.points) {
        if (p.lon < minLon) minLon = p.lon
        if (p.lon > maxLon) maxLon = p.lon
        if (p.lat < minLat) minLat = p.lat
        if (p.lat > maxLat) maxLat = p.lat
      }
      bbox = { minLon, minLat, maxLon, maxLat }
    }

    if (!bbox) return null
    return [
      [bbox.minLat, bbox.minLon],
      [bbox.maxLat, bbox.maxLon]
    ]
  }, [contourData])

  if (!bounds || !isolines || isolines.length === 0) return null

  const matrixWidth = contourData.matrix_data.width || 100
  const matrixHeight = contourData.matrix_data.height || 100

  return (
    <SVGOverlay 
      bounds={bounds} 
      attributes={{ 
        viewBox: `0 0 ${matrixWidth} ${matrixHeight}`,
        preserveAspectRatio: "none",
        style: "pointer-events: none;"
      }}
    >
      {isolines.map((isoline, i) => {
        const zRange = maxZ - minZ || 1
        const normalized = (isoline.value - minZ) / zRange
        const hue = 240 - (normalized * 120)
        return (
          <path 
            key={`iso-${i}`} 
            d={isoline.pathData} 
            fill={`hsl(${hue}, 70%, 50%)`}
            fillOpacity="0.8"
            stroke="#000"
            strokeWidth="0.05"
          />
        )
      })}
    </SVGOverlay>
  )
}
