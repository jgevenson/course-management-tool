import React, { useCallback } from 'react'
import GeomanRegionManager from './GeomanRegionManager'
import { styleForRegionPhase } from '../utils/regionTerrain'

/**
 * @typedef {object} TerrainOverlayRow
 * @property {string} id
 * @property {string} terrain_type
 * @property {string|null} [label]
 * @property {object} geojson_data
 */

/**
 * @param {object} props
 * @param {TerrainOverlayRow[]} props.overlays
 * @param {string | null} props.selectedId
 * @param {(id: string | null) => void} props.onSelectId
 * @param {boolean} props.regionDrawActive
 * @param {boolean} props.suppressMapInteractions
 * @param {(feature: GeoJSON.Feature) => void} props.onPolygonDrawn
 * @param {(id: string, feature: GeoJSON.Feature) => void} props.onGeometryCommit
 * @param {(id: string) => void} [props.onDeleteOverlay]
 */
export default function CourseTerrainOverlays({
  overlays,
  selectedId,
  onSelectId,
  regionDrawActive,
  suppressMapInteractions,
  onPolygonDrawn,
  onGeometryCommit,
  onDeleteOverlay,
}) {
  const getStyle = useCallback((region, isSelected, isHovered) => {
    let phase = 'idle'
    if (isSelected) phase = 'selected'
    else if (isHovered) phase = 'hover'
    return styleForRegionPhase({ terrainType: region.terrain_type, phase })
  }, [])

  return (
    <GeomanRegionManager
      regions={overlays}
      selectedId={selectedId}
      onSelectId={onSelectId}
      isDrawingEnabled={regionDrawActive}
      drawShape="Polygon"
      drawOptions={{
        pathOptions: styleForRegionPhase({ terrainType: 'fairway', phase: 'drawing' }),
        templineStyle: { color: '#38bdf8', weight: 2 },
        hintlineStyle: { color: '#38bdf8', dashArray: '6 6', weight: 1 },
      }}
      onPolygonDrawn={onPolygonDrawn}
      onGeometryCommit={onGeometryCommit}
      onDeleteArea={onDeleteOverlay}
      getStyle={getStyle}
      suppressInteractions={suppressMapInteractions}
    />
  )
}
