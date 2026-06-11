import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap, useMapEvents } from 'react-leaflet'
import { disableAllMapInteractions, enableAllMapInteractions, stripGeomanMarkerTabIndex, setupGeomanEditMarkers } from '../utils/mapInteractions'

export const dragHandleIcon = L.divIcon({
  html: `<div style="background: white; border: 2px solid #3b82f6; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2); cursor: move;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="19 9 22 12 19 15"></polyline><polyline points="9 19 12 22 15 19"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg></div>`,
  className: 'custom-drag-handle',
  iconSize: [24, 24],
  iconAnchor: [12, 12]
})

/**
 * @param {unknown} raw
 * @returns {GeoJSON.Feature | null}
 */
export function normalizeToFeature(raw) {
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
 * @param {Array<{ id: string, geojson_data: object, [key: string]: any }>} props.regions
 * @param {string | null} props.selectedId
 * @param {(id: string | null) => void} props.onSelectId
 * @param {boolean} [props.isDrawingEnabled=false]
 * @param {string} [props.drawShape='Polygon']
 * @param {object} [props.drawOptions]
 * @param {(feature: GeoJSON.Feature) => void} props.onPolygonDrawn
 * @param {(id: string, feature: GeoJSON.Feature) => void} props.onGeometryCommit
 * @param {(id: string) => void} [props.onDeleteArea]
 * @param {(region: object, isSelected: boolean, isHovered: boolean) => L.PathOptions} props.getStyle
 * @param {(region: object) => string | HTMLElement | null} [props.getTooltip]
 * @param {boolean} [props.suppressInteractions=false]
 */
export default function GeomanRegionManager({
  regions,
  selectedId,
  onSelectId,
  isDrawingEnabled = false,
  drawShape = 'Polygon',
  drawOptions = {},
  onPolygonDrawn,
  onGeometryCommit,
  onDeleteArea,
  getStyle,
  getTooltip,
  suppressInteractions = false,
  isAlignMode = false,
  masterFeatureId = null,
  adjustFeatureId = null,
  onAlignFeatureClick = null,
}) {
  const map = useMap()
  const groupRef = useRef(/** @type {L.FeatureGroup | null} */ (null))
  const regionsSigRef = useRef('')
  const selectedRef = useRef(selectedId)
  const suppressRef = useRef(suppressInteractions)
  const hoverRef = useRef(/** @type {string | null} */ (null))
  const commitTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const dragHandleRef = useRef(/** @type {L.Marker | null} */ (null))
  const dragStateRef = useRef(null)

  const onGeometryCommitRef = useRef(onGeometryCommit)
  const onSelectIdRef = useRef(onSelectId)
  const onPolygonDrawnRef = useRef(onPolygonDrawn)
  const onDeleteAreaRef = useRef(onDeleteArea)

  const isAlignModeRef = useRef(isAlignMode)
  const masterFeatureIdRef = useRef(masterFeatureId)
  const adjustFeatureIdRef = useRef(adjustFeatureId)
  const onAlignFeatureClickRef = useRef(onAlignFeatureClick)
  const drawOptionsRef = useRef(drawOptions)

  useEffect(() => {
    selectedRef.current = selectedId
    suppressRef.current = suppressInteractions
    onGeometryCommitRef.current = onGeometryCommit
    onSelectIdRef.current = onSelectId
    onPolygonDrawnRef.current = onPolygonDrawn
    onDeleteAreaRef.current = onDeleteArea
    isAlignModeRef.current = isAlignMode
    masterFeatureIdRef.current = masterFeatureId
    adjustFeatureIdRef.current = adjustFeatureId
    onAlignFeatureClickRef.current = onAlignFeatureClick
    drawOptionsRef.current = drawOptions
  }, [
    selectedId,
    suppressInteractions,
    onGeometryCommit,
    onSelectId,
    onPolygonDrawn,
    onDeleteArea,
    isAlignMode,
    masterFeatureId,
    adjustFeatureId,
    onAlignFeatureClick,
    drawOptions,
  ])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRef.current) {
        if (onDeleteAreaRef.current) {
          onDeleteAreaRef.current(selectedRef.current)
          if (onSelectIdRef.current) {
            onSelectIdRef.current(null)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const applyStyleToLayer = useCallback((layer, region, isHovered) => {
    if (!(layer instanceof L.Path)) return
    const isSelected = selectedRef.current === region.id
    layer.setStyle(getStyle(region, isSelected, isHovered))
  }, [getStyle])

  const applyPlanningPointerPassthrough = useCallback(() => {
    const g = groupRef.current
    if (!g) return
    const passthrough = suppressRef.current && !isAlignModeRef.current
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
    let selectedRegion = null

    g.eachLayer((ly) => {
      const path = /** @type {L.Path & { __region?: object }} */ (ly)
      const region = path.__region
      if (!region) return
      
      const id = region.id
      path.options.interactive = isAlignMode ? true : !sup
      path.options.pmIgnore = isAlignMode ? true : Boolean(sup)
      
      if (sup || isAlignMode) {
        applyStyleToLayer(path, region, false)
        if (path.pm?.enabled()) path.pm.disable()
        return
      }
      
      applyStyleToLayer(path, region, false)
      
      if (id === sel) {
        selectedPath = path
        selectedRegion = region
        if (path.pm && !path.pm.enabled()) {
          path.pm.enable({ snappable: true, removeVertexOn: 'dblclick' })
          setupGeomanEditMarkers(path)
        }
      } else if (path.pm?.enabled()) {
        path.pm.disable()
      }
    })
    
    // Manage drag handle
    if (selectedPath && selectedRegion && !sup) {
      let center
      if (typeof selectedPath.getBounds === 'function') {
        center = selectedPath.getBounds().getCenter()
      } else if (typeof selectedPath.getLatLng === 'function') {
        center = selectedPath.getLatLng()
      }
      
      if (center) {
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
              startPathLatLngs: path.getLatLngs ? path.getLatLngs() : path.getLatLng()
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
            
            if (path.setLatLngs) {
               path.setLatLngs(applyDelta(dragStateRef.current.startPathLatLngs))
            } else if (path.setLatLng) {
               path.setLatLng(applyDelta(dragStateRef.current.startPathLatLngs))
            }
          })
          
          marker.on('dragend', () => {
            enableAllMapInteractions(map)
            if (path.pm) {
              path.pm.enable({ snappable: true, removeVertexOn: 'dblclick' })
              setupGeomanEditMarkers(path)
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
      }
    } else {
      if (dragHandleRef.current) {
        map.removeLayer(dragHandleRef.current)
        dragHandleRef.current = null
      }
    }

    applyPlanningPointerPassthrough()
  }, [applyStyleToLayer, applyPlanningPointerPassthrough, map])

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
    // Generate a simple signature to avoid recreating layers needlessly
    const sig = regions
      .map((r) => `${r.id}\t${JSON.stringify(r.id === selectedId ? r.geojson_data_raw : r.geojson_data)}`)
      .join('\n')
      
    if (sig === regionsSigRef.current && groupRef.current) {
      return
    }
    regionsSigRef.current = sig

    const g = groupRef.current
    if (!g) return
    g.clearLayers()
    hoverRef.current = null

    for (const region of regions) {
      const isSelected = selectedRef.current === region.id
      const activeGeojson = isSelected ? region.geojson_data_raw : region.geojson_data
      const feature = normalizeToFeature(activeGeojson || region.geojson_data)
      if (!feature?.geometry) continue

      const gjLayer = L.geoJSON(feature, {
        style: () => getStyle(region, selectedRef.current === region.id, false),
        interactive: !suppressRef.current || isAlignMode,
        pmIgnore: Boolean(suppressRef.current) || isAlignMode,
        onEachFeature(_feat, layer) {
          const path = /** @type {L.Path & { __region?: object }} */ (layer)
          path.__region = region
          if (path.options) {
            path.options.pmIgnore = Boolean(suppressRef.current) || isAlignMode
          }
          
          if (getTooltip) {
            const ttContent = getTooltip(region)
            if (ttContent) {
              layer.bindTooltip(ttContent, {
                direction: 'auto',
                sticky: true,
                opacity: 0.9
              })
            }
          }

          path.on('click', (ev) => {
            console.log('[GeomanRegionManager] Layer clicked. Region ID:', region.id, 'isAlignMode:', isAlignModeRef.current)
            if (isAlignModeRef.current) {
              L.DomEvent.stopPropagation(ev)
              if (onAlignFeatureClickRef.current) {
                console.log('[GeomanRegionManager] Triggering onAlignFeatureClick for ID:', region.id)
                onAlignFeatureClickRef.current(region.id)
              } else {
                console.warn('[GeomanRegionManager] onAlignFeatureClickRef is null!')
              }
              return
            }
            if (suppressRef.current) return
            L.DomEvent.stopPropagation(ev)
            onSelectIdRef.current(region.id)
          })
          
          path.on('mouseover', () => {
            if (isAlignModeRef.current) {
              if (region.id !== masterFeatureIdRef.current && region.id !== adjustFeatureIdRef.current) {
                applyStyleToLayer(path, region, true)
              }
              return
            }
            if (suppressRef.current) return
            hoverRef.current = region.id
            if (selectedRef.current === region.id) return
            applyStyleToLayer(path, region, true)
          })
          
          path.on('mouseout', () => {
            if (isAlignModeRef.current) {
              if (region.id !== masterFeatureIdRef.current && region.id !== adjustFeatureIdRef.current) {
                applyStyleToLayer(path, region, false)
              }
              return
            }
            if (suppressRef.current) return
            if (hoverRef.current === region.id) hoverRef.current = null
            if (selectedRef.current === region.id) return
            applyStyleToLayer(path, region, false)
          })
          
          const handleGeomUpdate = () => {
            if (!path.__region) return
            if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
            commitTimerRef.current = setTimeout(() => {
              const gj = path.toGeoJSON()
              if (gj.type === 'Feature') {
                onGeometryCommitRef.current(path.__region.id, /** @type {GeoJSON.Feature} */ (gj))
              }
            }, 450)
          }
          path.on('pm:update', handleGeomUpdate)
          path.on('pm:dragstart', () => {
            map.dragging.disable()
          })
          path.on('pm:dragend', () => {
            map.dragging.enable()
            handleGeomUpdate()
          })
          path.on('pm:markerdragstart', () => {
            map.dragging.disable()
          })
          path.on('pm:markerdragend', () => {
            map.dragging.enable()
          })
        },
      })
      gjLayer.eachLayer((ly) => g.addLayer(ly))
    }

    refreshSelectionStyles()
    applyPlanningPointerPassthrough()
  }, [regions, selectedId, map, applyStyleToLayer, refreshSelectionStyles, applyPlanningPointerPassthrough, getStyle, getTooltip, isAlignMode])

  useEffect(() => {
    refreshSelectionStyles()
  }, [selectedId, suppressInteractions, isAlignMode, masterFeatureId, adjustFeatureId, refreshSelectionStyles])

  useEffect(() => {
    // Geoman drawing modes
    if (!isDrawingEnabled) {
      map.pm.disableDraw('Polygon')
      map.pm.disableDraw('Rectangle')
      map.pm.disableDraw('Circle')
      return
    }
    
    map.pm.enableDraw(drawShape, {
      snappable: true,
      ...drawOptionsRef.current
    })
    
    return () => {
      map.pm.disableDraw(drawShape)
    }
  }, [isDrawingEnabled, drawShape, map])

  useEffect(() => {
    const onCreate = (e) => {
      const layer = e.layer
      if (layer && map.hasLayer(layer)) {
        map.removeLayer(layer)
      }
      const gj = layer?.toGeoJSON?.()
      if (gj && gj.type === 'Feature' && onPolygonDrawnRef.current) {
        onPolygonDrawnRef.current(/** @type {GeoJSON.Feature} */ (gj))
      }
    }

    const onCut = (e) => {
      const { layer, originalLayer } = e
      const region = originalLayer?.__region
      if (region && onGeometryCommitRef.current) {
        layer.__region = region
        const gj = layer.toGeoJSON()
        if (gj.type === 'Feature') {
          onGeometryCommitRef.current(region.id, gj)
        }
      }
    }

    map.on('pm:create', onCreate)
    map.on('pm:cut', onCut)
    return () => {
      map.off('pm:create', onCreate)
      map.off('pm:cut', onCut)
    }
  }, [map])

  useMapEvents({
    click() {
      if (suppressRef.current) return
      if (typeof map.pm?.globalDrawModeEnabled === 'function' && map.pm.globalDrawModeEnabled()) {
        return
      }
      if (onSelectIdRef.current) {
        onSelectIdRef.current(null)
      }
    },
  })

  return null
}
