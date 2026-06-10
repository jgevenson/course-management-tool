import React, { useCallback, useState } from 'react'
import GeomanRegionManager from './GeomanRegionManager'

export default function HolePlanningAreas({
  areas,
  regionDrawActive,
  planningDrawShape,
  onPolygonDrawn,
  onGeometryCommit,
  onDeleteArea,
  selectedHoleId
}) {
  const [selectedAreaId, setSelectedAreaId] = useState(null)

  const getStyle = useCallback((area, isSelected, isHovered) => {
    const fillColor = area.style?.color || '#22c55e'
    const opacity = area.style?.opacity ?? 0.3
    
    return {
      color: isSelected ? '#3b82f6' : fillColor,
      weight: isSelected ? 4 : 2,
      opacity: 1,
      fillColor: fillColor,
      fillOpacity: opacity
    }
  }, [])

  const getTooltip = useCallback((area) => {
    return `<b>${area.label}</b><br/>${area.description || ''}`
  }, [])

  return (
    <GeomanRegionManager
      regions={areas}
      selectedId={selectedAreaId}
      onSelectId={setSelectedAreaId}
      isDrawingEnabled={regionDrawActive}
      drawShape={planningDrawShape || 'Polygon'}
      drawOptions={{
        pathOptions: { color: '#38bdf8', weight: 2, fillOpacity: 0.35 },
        templineStyle: { color: '#38bdf8', weight: 2 },
        hintlineStyle: { color: '#38bdf8', dashArray: '6 6', weight: 1 },
      }}
      onPolygonDrawn={onPolygonDrawn}
      onGeometryCommit={onGeometryCommit}
      onDeleteArea={onDeleteArea}
      getStyle={getStyle}
      getTooltip={getTooltip}
      suppressInteractions={false}
    />
  )
}
