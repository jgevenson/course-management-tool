import React, { useCallback, useMemo } from 'react'
import GeomanRegionManager from './GeomanRegionManager'
import { styleForRegionPhase, terrainFillColor } from '../utils/regionTerrain'

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
 * @param {boolean} [props.isAlignMode=false]
 * @param {string | null} [props.masterFeatureId=null]
 * @param {string | null} [props.adjustFeatureId=null]
 * @param {(id: string) => void} [props.onAlignFeatureClick]
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
  isAlignMode = false,
  masterFeatureId = null,
  adjustFeatureId = null,
  onAlignFeatureClick,
}) {
  const getStyle = useCallback((region, isSelected, isHovered) => {
    if (isAlignMode) {
      if (region.id === masterFeatureId) {
        return {
          color: '#10b981', // Emerald green for Master
          weight: 4,
          opacity: 1,
          dashArray: '',
          fillColor: region.terrain_type ? terrainFillColor(region.terrain_type) : '#10b981',
          fillOpacity: 0.45,
        }
      }
      if (region.id === adjustFeatureId) {
        return {
          color: '#f97316', // Orange for Adjust
          weight: 4,
          opacity: 1,
          dashArray: '5, 5', // Dashed border
          fillColor: region.terrain_type ? terrainFillColor(region.terrain_type) : '#f97316',
          fillOpacity: 0.45,
        }
      }
      
      // Other regions in alignment mode are dimmed
      return {
        color: '#94a3b8',
        weight: 1,
        opacity: 0.3,
        fillColor: region.terrain_type ? terrainFillColor(region.terrain_type) : '#64748b',
        fillOpacity: 0.15,
      }
    }

    let phase = 'idle'
    if (isSelected) phase = 'selected'
    else if (isHovered) phase = 'hover'
    return styleForRegionPhase({ terrainType: region.terrain_type, phase })
  }, [isAlignMode, masterFeatureId, adjustFeatureId])

  const drawOptions = useMemo(() => ({
    pathOptions: styleForRegionPhase({ terrainType: 'fairway', phase: 'drawing' }),
    templineStyle: { color: '#38bdf8', weight: 2 },
    hintlineStyle: { color: '#38bdf8', dashArray: '6 6', weight: 1 },
  }), [])

  return (
    <GeomanRegionManager
      regions={overlays}
      selectedId={selectedId}
      onSelectId={onSelectId}
      isDrawingEnabled={regionDrawActive}
      drawShape="Polygon"
      drawOptions={drawOptions}
      onPolygonDrawn={onPolygonDrawn}
      onGeometryCommit={onGeometryCommit}
      onDeleteArea={onDeleteOverlay}
      getStyle={getStyle}
      suppressInteractions={suppressMapInteractions}
      isAlignMode={isAlignMode}
      masterFeatureId={masterFeatureId}
      adjustFeatureId={adjustFeatureId}
      onAlignFeatureClick={onAlignFeatureClick}
    />
  )
}
