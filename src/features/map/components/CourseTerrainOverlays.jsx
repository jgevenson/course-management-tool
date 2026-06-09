// AI assisted development
import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap, useMapEvents } from 'react-leaflet'
import { styleForRegionPhase } from '../utils/regionTerrain'
import { disableAllMapInteractions, enableAllMapInteractions, stripGeomanMarkerTabIndex } from '../utils/mapInteractions'

const dragHandleIcon = L.divIcon({
  html: `<div style="background: white; border: 2px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: move;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg></div>`,
  className: 'custom-drag-handle',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

/**
 * @typedef {object} TerrainOverlayRow
 * @property {string} id
 * @property {string} terrain_type
 * @property {string|null} [label]
 * @property {object} geojson_data
 */

/**
 * @param {unknown} raw
 * @returns {GeoJSON.Feature | null}
 */
function normalizeToFeature(raw) {
  if (!raw || typeof raw !== 'object') return null
  const o = /** @type {GeoJSON.GeoJSON} */ (raw)
  if (o.type === 'Feature') return /** @type {GeoJSON.Feature} */ (o)
  if (o.type === 'Polygon' || o.type === 'MultiPolygon') {
    return { type: 'Feature', properties: {}, geometry: /** @type {GeoJSON.Polygon | GeoJSON.MultiPolygon} */ (o) }
  }
  if (o.type === 'FeatureCollection' && Array.isArray(o.features) && o.features[0]) {
    return o.features[0]
  }
  return null
}

/**
 * @param {object} props
 * @param {TerrainOverlayRow[]} props.overlays
 * @param {string | null} props.selectedId
 * @param {(id: string | null) => void} props.onSelectId
 * @param {boolean} props.regionDrawActive
 * @param {boolean} props.suppressMapInteractions
 * @param {(feature: GeoJSON.Feature) => void} props.onPolygonDrawn
 * @param {(id: string, feature: GeoJSON.Feature) => void} props.onGeometryCommit
 */
export default function CourseTerrainOverlays({
  overlays,
  selectedId,
  onSelectId,
  regionDrawActive,
  suppressMapInteractions,
  onPolygonDrawn,
  onGeometryCommit,
}) {
  const map = useMap()
  const groupRef = useRef(/** @type {L.FeatureGroup | null} */ (null))
  const overlaysSigRef = useRef('')
  const selectedRef = useRef(selectedId)
  const suppressRef = useRef(suppressMapInteractions)
  const hoverRef = useRef(/** @type {string | null} */ (null))
  const commitTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const dragHandleRef = useRef(/** @type {L.Marker | null} */ (null))
  const dragStateRef = useRef(null)

  const onGeometryCommitRef = useRef(onGeometryCommit)
  const onSelectIdRef = useRef(onSelectId)
  const onPolygonDrawnRef = useRef(onPolygonDrawn)

  useEffect(() => {
    selectedRef.current = selectedId
    suppressRef.current = suppressMapInteractions
    onGeometryCommitRef.current = onGeometryCommit
    onSelectIdRef.current = onSelectId
    onPolygonDrawnRef.current = onPolygonDrawn
  }, [selectedId, suppressMapInteractions, onGeometryCommit, onSelectId, onPolygonDrawn])

  const applyPhaseToLayer = useCallback((layer, terrainType, phase) => {
    if (!(layer instanceof L.Path)) return
    layer.setStyle(styleForRegionPhase({ terrainType, phase }))
  }, [])

  /** Pass-through clicks when regions are view-only (planning); keeps DOM cursor from showing pointer on polygons. */
  const applyPlanningPointerPassthrough = useCallback(() => {
    const g = groupRef.current
    if (!g) return
    const passthrough = suppressRef.current
    g.eachLayer((ly) => {
      const path = /** @type {L.Path} */ (ly)
      if (!(path instanceof L.Path)) return
      const el = typeof path.getElement === 'function' ? path.getElement() : null
      if (el && /** @type {HTMLElement} */ (el).style) {
        /** @type {HTMLElement} */ (el).style.pointerEvents = passthrough ? 'none' : ''
      }
    })
  }, [])

  const refreshSelectionStyles = useCallback(() => {
    const g = groupRef.current
    if (!g) return
    const sel = selectedRef.current
    const sup = suppressRef.current
    
    let selectedPath = null

    g.eachLayer((ly) => {
      const path = /** @type {L.Path & { __overlayId?: string, __terrainType?: string }} */ (ly)
      const id = path.__overlayId
      const tt = path.__terrainType ?? 'fairway'
      if (!id) return
      path.options.interactive = !sup
      path.options.pmIgnore = Boolean(sup)
      if (sup) {
        applyPhaseToLayer(path, tt, 'idle')
        if (path.pm?.enabled()) path.pm.disable()
        return
      }
      applyPhaseToLayer(path, tt, id === sel ? 'selected' : 'idle')
      if (id === sel) {
        selectedPath = path
        if (path.pm && !path.pm.enabled()) {
          path.pm.enable({ snappable: true })
          stripGeomanMarkerTabIndex(path)
        }
      } else if (path.pm?.enabled()) {
        path.pm.disable()
      }
    })
    
    // Manage drag handle
    if (selectedPath && !sup) {
      const center = selectedPath.getBounds().getCenter()
      
      const setupDragEvents = (marker, path) => {
        marker.off('dragstart')
        marker.off('drag')
        marker.off('dragend')
        
        marker.on('mouseover', () => disableAllMapInteractions(map))
        marker.on('mouseout', () => enableAllMapInteractions(map))
        marker.on('mousedown', (e) => {
          disableAllMapInteractions(map)
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent)
          }
        })
        marker.on('touchstart', (e) => {
          disableAllMapInteractions(map)
          if (e.originalEvent) {
            L.DomEvent.stopPropagation(e.originalEvent)
          }
        })
        marker.on('mouseup', () => enableAllMapInteractions(map))
        marker.on('touchend', () => enableAllMapInteractions(map))
        
        marker.on('dragstart', (e) => {
          disableAllMapInteractions(map)
          if (path.pm && path.pm.enabled()) {
            path.pm.disable()
          }
          dragStateRef.current = {
            startMarkerLatLng: e.target.getLatLng(),
            startPathLatLngs: path.getLatLngs()
          }
        })
        
        marker.on('drag', (e) => {
          if (!dragStateRef.current) return
          const currentLatLng = e.target.getLatLng()
          const dLat = currentLatLng.lat - dragStateRef.current.startMarkerLatLng.lat
          const dLng = currentLatLng.lng - dragStateRef.current.startMarkerLatLng.lng
          
          function applyDelta(latlngs) {
            if (Array.isArray(latlngs)) {
              return latlngs.map(applyDelta)
            }
            return L.latLng(latlngs.lat + dLat, latlngs.lng + dLng)
          }
          
          path.setLatLngs(applyDelta(dragStateRef.current.startPathLatLngs))
        })
        
        marker.on('dragend', () => {
          enableAllMapInteractions(map)
          if (path.pm) {
            path.pm.enable({ snappable: true })
            stripGeomanMarkerTabIndex(path)
          }
          dragStateRef.current = null
          path.fire('pm:update') // trigger save
        })
      }

      if (!dragHandleRef.current) {
        const marker = L.marker(center, {
          icon: dragHandleIcon,
          draggable: true,
          keyboard: false,
          autoPan: false,
          zIndexOffset: 1000
        })
        setupDragEvents(marker, selectedPath)
        marker.addTo(map)
        dragHandleRef.current = marker
      } else {
        if (!dragStateRef.current) {
          dragHandleRef.current.setLatLng(center)
        }
        setupDragEvents(dragHandleRef.current, selectedPath)
      }
    } else {
      if (dragHandleRef.current) {
        map.removeLayer(dragHandleRef.current)
        dragHandleRef.current = null
      }
    }

    applyPlanningPointerPassthrough()
  }, [applyPhaseToLayer, applyPlanningPointerPassthrough, map])

  useEffect(() => {
    const g = L.featureGroup()
    groupRef.current = g
    g.addTo(map)
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current)
        commitTimerRef.current = null
      }
      if (dragHandleRef.current) {
        map.removeLayer(dragHandleRef.current)
        dragHandleRef.current = null
      }
      map.removeLayer(g)
      groupRef.current = null
    }
  }, [map])

  useEffect(() => {
    const sig = overlays
      .map((o) => `${o.id}\t${o.terrain_type}\t${JSON.stringify(o.geojson_data)}`)
      .join('\n')
    if (sig === overlaysSigRef.current && groupRef.current) {
      return
    }
    overlaysSigRef.current = sig

    const g = groupRef.current
    if (!g) return
    g.clearLayers()
    hoverRef.current = null

    for (const row of overlays) {
      const feature = normalizeToFeature(row.geojson_data)
      if (!feature?.geometry) continue

      const gjLayer = L.geoJSON(feature, {
        style: () => styleForRegionPhase({ terrainType: row.terrain_type, phase: 'idle' }),
        interactive: !suppressRef.current,
        pmIgnore: Boolean(suppressRef.current),
        onEachFeature(_feat, layer) {
          const path = /** @type {L.Path & { __overlayId?: string, __terrainType?: string }} */ (layer)
          path.__overlayId = row.id
          path.__terrainType = row.terrain_type
          if (path.options) {
            path.options.pmIgnore = Boolean(suppressRef.current)
          }
          path.on('click', (ev) => {
            if (suppressRef.current) return
            L.DomEvent.stopPropagation(ev)
            onSelectIdRef.current(row.id)
          })
          path.on('mouseover', () => {
            if (suppressRef.current) return
            hoverRef.current = row.id
            if (selectedRef.current === row.id) return
            applyPhaseToLayer(path, row.terrain_type, 'hover')
          })
          path.on('mouseout', () => {
            if (suppressRef.current) return
            if (hoverRef.current === row.id) hoverRef.current = null
            if (selectedRef.current === row.id) return
            applyPhaseToLayer(path, row.terrain_type, 'idle')
          })
          const handleGeomUpdate = () => {
            if (!path.__overlayId) return
            if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
            commitTimerRef.current = setTimeout(() => {
              const gj = path.toGeoJSON()
              if (gj.type === 'Feature') {
                onGeometryCommitRef.current(path.__overlayId, /** @type {GeoJSON.Feature} */ (gj))
              }
            }, 450)
          }
          path.on('pm:update', handleGeomUpdate)
          path.on('pm:dragend', handleGeomUpdate)
        },
      })
      gjLayer.eachLayer((ly) => g.addLayer(ly))
    }

    refreshSelectionStyles()
    applyPlanningPointerPassthrough()
  }, [overlays, map, applyPhaseToLayer, refreshSelectionStyles, applyPlanningPointerPassthrough])

  useEffect(() => {
    refreshSelectionStyles()
  }, [selectedId, suppressMapInteractions, refreshSelectionStyles])

  useEffect(() => {
    if (!regionDrawActive) {
      map.pm.disableDraw('Polygon')
      return
    }
    map.pm.enableDraw('Polygon', {
      snappable: true,
      pathOptions: styleForRegionPhase({ terrainType: 'fairway', phase: 'drawing' }),
      templineStyle: { color: '#38bdf8', weight: 2 },
      hintlineStyle: { color: '#38bdf8', dashArray: '6 6', weight: 1 },
    })
    return () => {
      map.pm.disableDraw('Polygon')
    }
  }, [regionDrawActive, map])

  useEffect(() => {
    const onCreate = (e) => {
      const layer = e.layer
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
      const gj = layer?.toGeoJSON?.()
      if (gj && gj.type === 'Feature') {
        onPolygonDrawnRef.current(/** @type {GeoJSON.Feature} */ (gj))
      }
    }
    map.on('pm:create', onCreate)
    return () => {
      map.off('pm:create', onCreate)
    }
  }, [map])

  useMapEvents({
    click() {
      if (suppressRef.current) return
      if (typeof map.pm?.globalDrawModeEnabled === 'function' && map.pm.globalDrawModeEnabled()) {
        return
      }
      onSelectIdRef.current(null)
    },
  })

  return null
}
