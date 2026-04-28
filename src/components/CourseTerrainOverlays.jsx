// AI assisted development
import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import { useMap, useMapEvents } from 'react-leaflet'
import { styleForRegionPhase } from '../utils/regionTerrain'

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
        if (path.pm && !path.pm.enabled()) {
          path.pm.enable({ snappable: true })
        }
      } else if (path.pm?.enabled()) {
        path.pm.disable()
      }
    })
    applyPlanningPointerPassthrough()
  }, [applyPhaseToLayer, applyPlanningPointerPassthrough])

  useEffect(() => {
    const g = L.featureGroup()
    groupRef.current = g
    g.addTo(map)
    return () => {
      if (commitTimerRef.current) {
        clearTimeout(commitTimerRef.current)
        commitTimerRef.current = null
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
          path.on('pm:update', () => {
            if (!path.__overlayId) return
            if (commitTimerRef.current) clearTimeout(commitTimerRef.current)
            commitTimerRef.current = setTimeout(() => {
              const gj = path.toGeoJSON()
              if (gj.type === 'Feature') {
                onGeometryCommitRef.current(path.__overlayId, /** @type {GeoJSON.Feature} */ (gj))
              }
            }, 450)
          })
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
