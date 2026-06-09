import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { useMap, useMapEvents } from 'react-leaflet'

export default function HolePlanningAreas({
  areas,
  regionDrawActive,
  planningDrawShape,
  onPolygonDrawn,
  onGeometryCommit,
  onDeleteArea,
  selectedHoleId
}) {
  const map = useMap()
  const groupRef = useRef(null)
  const [selectedAreaId, setSelectedAreaId] = useState(null)

  useMapEvents({
    click() {
      setSelectedAreaId(null)
    }
  })

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAreaId) {
        if (onDeleteArea) {
          onDeleteArea(selectedAreaId)
          setSelectedAreaId(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAreaId, onDeleteArea])

  useEffect(() => {
    const g = L.featureGroup()
    groupRef.current = g
    g.addTo(map)
    return () => {
      map.removeLayer(g)
      groupRef.current = null
    }
  }, [map])

  useEffect(() => {
    if (!regionDrawActive) {
      map.pm.disableDraw('Polygon')
      map.pm.disableDraw('Rectangle')
      map.pm.disableDraw('Circle')
      return
    }

    const shape = planningDrawShape || 'Polygon'
    map.pm.enableDraw(shape, {
      snappable: true,
      pathOptions: { color: '#38bdf8', weight: 2, fillOpacity: 0.35 },
      templineStyle: { color: '#38bdf8', weight: 2 },
      hintlineStyle: { color: '#38bdf8', dashArray: '6 6', weight: 1 },
    })

    return () => {
      map.pm.disableDraw(shape)
    }
  }, [regionDrawActive, planningDrawShape, map])

  useEffect(() => {
    const onCreate = (e) => {
      const layer = e.layer
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
      const gj = layer?.toGeoJSON?.()
      if (gj && gj.type === 'Feature') {
        // We pass the new geojson to our handler
        onPolygonDrawn(gj)
      }
    }
    map.on('pm:create', onCreate)
    return () => {
      map.off('pm:create', onCreate)
    }
  }, [map, onPolygonDrawn])

  // Render existing areas
  useEffect(() => {
    const g = groupRef.current
    if (!g) return
    g.clearLayers()

    for (const area of areas) {
      if (!area.geojson_data) continue

      let feature = area.geojson_data
      if (feature.type !== 'Feature') {
        feature = { type: 'Feature', geometry: feature, properties: {} }
      }

      const fillColor = area.style?.color || '#22c55e'
      const opacity = area.style?.opacity ?? 0.3
      const isSelected = area.id === selectedAreaId

      const gjLayer = L.geoJSON(feature, {
        style: {
          color: isSelected ? '#3b82f6' : fillColor,
          weight: isSelected ? 4 : 2,
          opacity: 1,
          fillColor: fillColor,
          fillOpacity: opacity
        },
        interactive: true,
        onEachFeature(_feat, layer) {
          layer.bindTooltip(`<b>${area.label}</b><br/>${area.description || ''}`, {
            direction: 'auto',
            sticky: true,
            opacity: 0.9
          })

          const handleGeomUpdate = () => {
            const gj = layer.toGeoJSON()
            if (gj.type === 'Feature') {
              onGeometryCommit(area.id, gj)
            }
          }
          layer.on('pm:update', handleGeomUpdate)
          layer.on('pm:dragend', handleGeomUpdate)
          
          layer.on('click', (e) => {
            L.DomEvent.stopPropagation(e)
            setSelectedAreaId(area.id)
          })
        }
      })
      
      gjLayer.eachLayer((ly) => {
        g.addLayer(ly)
      })
    }
  }, [areas, map, onGeometryCommit, selectedAreaId])

  return null
}
