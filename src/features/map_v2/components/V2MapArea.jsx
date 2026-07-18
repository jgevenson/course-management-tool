// AI assisted development
import { useRef, useEffect, useCallback, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Crosshair, FlagTriangleLeft, MapPin, Compass } from 'lucide-react'
import maplibregl from 'maplibre-gl'
import { getHoleBounds } from '../utils/bbox'
import { HOLE_MARKER_KIND, activeMarkerLatLng, resolvePlanningMarkers } from '../../map/utils/holeMarkers'
import { haversineDistanceYards, getBearing } from '../../map/utils/geoDistance'
import { getRecommendedClub, getDispersionPolygon } from '../../bag/utils/dispersion'
import V2OSMFeaturesLayer from './V2OSMFeaturesLayer'

const TERRAIN_COLORS = {
  green:     '#14b8a6',
  tee:       '#a3e635',
  fairway:   '#22c55e',
  rough:     '#166534',
  bunker:    '#fde68a',
  water:     '#38bdf8',
  trees_ob:  '#57534e',
  cart_path: '#94a3b8',
  unknown:   '#9ca3af',
}
const DEFAULT_FILL = '#64748b'

const TERRAIN_LABELS = {
  green: 'Green',
  tee: 'Tee Box',
  fairway: 'Fairway',
  rough: 'Rough',
  bunker: 'Bunker',
  water: 'Water',
  trees_ob: 'Trees / OB',
  cart_path: 'Cart Path',
}

const noop = () => {}

function buildTerrainColorExpression() {
  const expr = ['match', ['get', 'terrain_type']]
  for (const [type, color] of Object.entries(TERRAIN_COLORS)) {
    expr.push(type, color)
  }
  expr.push(DEFAULT_FILL)
  return expr
}

function overlaysToFeatureCollection(overlays) {
  const features = (overlays ?? [])
    .filter((o) => o.geojson_data)
    .map((o) => {
      const gj = o.geojson_data
      const geometry = gj.type === 'Feature' ? gj.geometry : gj

      if (!geometry || !geometry.coordinates) return null

      return {
        type: 'Feature',
        geometry,
        properties: {
          ...((gj.type === 'Feature' && gj.properties) || {}),
          id: o.id,
          terrain_type: o.terrain_type,
          label: o.label,
        },
      }
    })
    .filter(Boolean)

  return { type: 'FeatureCollection', features }
}

function makeCirclePolygon(center, radiusInMeters, points = 64) {
  const coords = []
  const latRad = (center.lat * Math.PI) / 180
  const metersPerDegLat = 111132.92 - 559.82 * Math.cos(2 * latRad) + 1.175 * Math.cos(4 * latRad)
  const metersPerDegLng = 111412.84 * Math.cos(latRad) - 93.5 * Math.cos(3 * latRad)

  const rLat = radiusInMeters / metersPerDegLat
  const rLng = radiusInMeters / metersPerDegLng

  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points
    const lat = center.lat + rLat * Math.sin(angle)
    const lng = center.lng + rLng * Math.cos(angle)
    coords.push([lng, lat])
  }
  coords.push(coords[0])
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords],
    },
    properties: {},
  }
}

/**
 * ## V2MapArea
 *
 * Manages the MapLibre GL JS WebGL map instance.
 * Handles styling, layers, overlay rendering, and smooth fly-to animations.
 */
export default function V2MapArea({
  course,
  selectedHole,
  filteredOverlays = [],
  courseCenter = [-98.5795, 39.8283],
  courseZoom = 4,
  workspaceMode = 'planning',
  clubs = [],
  profile = null,
  selectedTerrainOverlayId = null,
  selectedTerrainOverlayIds = [],
  onSelectTerrainOverlayId = noop,
  activePointTool = null,
  onPick = noop,
  onMarkerMove = noop,
  onMapMarkerMove = noop,
  onMapReady = noop,
  drawMode = null,
  drawCoordinates = [],
  onDrawCoordinatesChange = noop,
  regionDraft = null,
  onRegionDraftChange = noop,
  onCommitGeometry = noop,
  osmFeaturesData = null,
  onOsmFeatureSelect = noop,
  autoRotateHoleView = false,
  setAutoRotateHoleView = noop,
  showGreenCircle = false,
  greenCircleRadius = 20,
  showDistanceCircle = false,
  distanceCircleRadius = 100,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const [showPitchHint, setShowPitchHint] = useState(true)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [hoveredId, setHoveredId] = useState(null)

  // References to active HTML markers
  const markersRef = useRef([])
  const labelMarkersRef = useRef([])
  const livePositionsRef = useRef(new Map())
  const editMarkersRef = useRef([])

  // Keep references to selection callbacks stable for map listeners
  const selectOverlayRef = useRef(onSelectTerrainOverlayId)
  const modeRef = useRef(workspaceMode)
  const activePointToolRef = useRef(activePointTool)
  const onPickRef = useRef(onPick)
  const onMarkerMoveRef = useRef(onMarkerMove)
  const onMapMarkerMoveRef = useRef(onMapMarkerMove)
  const drawModeRef = useRef(drawMode)
  const drawCoordinatesRef = useRef(drawCoordinates)
  const regionDraftRef = useRef(regionDraft)
  const onRegionDraftChangeRef = useRef(onRegionDraftChange)
  const onDrawCoordinatesChangeRef = useRef(onDrawCoordinatesChange)
  const onCommitGeometryRef = useRef(onCommitGeometry)
  const filteredOverlaysRef = useRef(filteredOverlays)

  useEffect(() => {
    selectOverlayRef.current = onSelectTerrainOverlayId
    modeRef.current = workspaceMode
    activePointToolRef.current = activePointTool
    onPickRef.current = onPick
    onMarkerMoveRef.current = onMarkerMove
    onMapMarkerMoveRef.current = onMapMarkerMove
    drawModeRef.current = drawMode
    drawCoordinatesRef.current = drawCoordinates
    regionDraftRef.current = regionDraft
    onRegionDraftChangeRef.current = onRegionDraftChange
    onDrawCoordinatesChangeRef.current = onDrawCoordinatesChange
    onCommitGeometryRef.current = onCommitGeometry
    filteredOverlaysRef.current = filteredOverlays
  }, [
    onSelectTerrainOverlayId,
    workspaceMode,
    activePointTool,
    onPick,
    onMarkerMove,
    onMapMarkerMove,
    drawMode,
    drawCoordinates,
    regionDraft,
    onRegionDraftChange,
    onDrawCoordinatesChange,
    onCommitGeometry,
    filteredOverlays,
  ])

  const selectedTerrainOverlayIdRef = useRef(selectedTerrainOverlayId)
  useEffect(() => {
    selectedTerrainOverlayIdRef.current = selectedTerrainOverlayId
  }, [selectedTerrainOverlayId])

  const selectedTerrainOverlayIdsRef = useRef(selectedTerrainOverlayIds)
  useEffect(() => {
    selectedTerrainOverlayIdsRef.current = selectedTerrainOverlayIds
  }, [selectedTerrainOverlayIds])

  // Helper for Poly-Alignment Snap
  const getSnapPointPixel = useCallback((ePoint, ignoreId) => {
    const map = mapRef.current
    if (!map) return null
    const SNAP_PIXELS = 15
    let closestDist = Infinity
    let snapCoord = null

    filteredOverlaysRef.current.forEach((overlay) => {
      if (overlay.id === ignoreId) return
      const gj = overlay.geojson_data
      const geom = gj.type === 'Feature' ? gj.geometry : gj
      if (geom && geom.type === 'Polygon' && geom.coordinates) {
        geom.coordinates.forEach((ring) => {
          ring.forEach((coord) => {
            const p = map.project(coord)
            const d = Math.hypot(p.x - ePoint.x, p.y - ePoint.y)
            if (d < SNAP_PIXELS && d < closestDist) {
              closestDist = d
              snapCoord = coord
            }
          })
        })
      }
    })

    return snapCoord
  }, [])

  // ── Handle Escape key deselect ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && modeRef.current === 'mapping') {
        selectOverlayRef.current(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Sync Selected Overlay Highlight ───────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const selectedIds = selectedTerrainOverlayIds.length > 0 ? selectedTerrainOverlayIds : (selectedTerrainOverlayId ? [selectedTerrainOverlayId] : [])
    if (map.getLayer('terrain-fills-selected')) {
      map.setFilter('terrain-fills-selected', ['in', ['get', 'id'], ['literal', selectedIds]])
    }
    if (map.getLayer('terrain-outlines-selected')) {
      map.setFilter('terrain-outlines-selected', ['in', ['get', 'id'], ['literal', selectedIds]])
    }
  }, [selectedTerrainOverlayId, selectedTerrainOverlayIds, mapLoaded])

  // ── Sync Hovered Overlay Highlight ────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const hovered = hoveredId || ''

    if (map.getLayer('terrain-fills-hovered')) {
      map.setFilter('terrain-fills-hovered', ['==', ['get', 'id'], hovered])
    }
  }, [hoveredId, mapLoaded])

  // ── Sync map cursor based on activePointTool & drawMode ───
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const canvas = map.getCanvas()
    if (activePointTool || drawMode === 'polygon') {
      canvas.style.cursor = 'crosshair'
    } else {
      canvas.style.cursor = ''
    }
  }, [activePointTool, drawMode, mapLoaded])

  // ── Sync Drawing GeoJSON Source ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const source = map.getSource('draft-draw')
    if (!source) return

    if (regionDraft) {
      source.setData({
        type: 'FeatureCollection',
        features: [regionDraft]
      })
      return
    }

    if (drawMode !== 'polygon' || drawCoordinates.length === 0) {
      source.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    const features = []
    drawCoordinates.forEach((c) => {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: c
        }
      })
    })

    if (drawCoordinates.length > 1) {
      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: drawCoordinates
        }
      })
    }

    source.setData({
      type: 'FeatureCollection',
      features
    })
  }, [drawCoordinates, drawMode, regionDraft, mapLoaded])

  // ── Sync Polygon Edit Handles ────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    // Teardown
    editMarkersRef.current.forEach((m) => m.remove())
    editMarkersRef.current = []

    // console.log('--- Edit Handles useEffect ---')
    // console.log('workspaceMode:', workspaceMode, 'selectedId:', selectedTerrainOverlayId)

    if (workspaceMode !== 'mapping' || !selectedTerrainOverlayId) return

    const overlay = filteredOverlays.find((o) => o.id === selectedTerrainOverlayId)
    if (!overlay) {
      return
    }

    const gj = overlay.geojson_data
    const geometry = gj.type === 'Feature' ? gj.geometry : gj

    if (!['Polygon', 'MultiPolygon'].includes(geometry?.type) || !geometry.coordinates) {
      return
    }

    const rings = []
    if (geometry.type === 'Polygon') {
      geometry.coordinates.forEach((ring, ringIndex) => {
        const v = [...ring]
        if (v.length > 0 && v[0][0] === v[v.length - 1][0] && v[0][1] === v[v.length - 1][1]) {
          v.pop()
        }
        rings.push({ path: [ringIndex], vertices: v })
      })
    } else if (geometry.type === 'MultiPolygon') {
      geometry.coordinates.forEach((poly, polyIndex) => {
        poly.forEach((ring, ringIndex) => {
          const v = [...ring]
          if (v.length > 0 && v[0][0] === v[v.length - 1][0] && v[0][1] === v[v.length - 1][1]) {
            v.pop()
          }
          rings.push({ path: [polyIndex, ringIndex], vertices: v })
        })
      })
    }



    // Helper to update visual layout during drag
    const updateGeometryCoordinates = (ringPath, nextCoords) => {
      const newCoordinates = JSON.parse(JSON.stringify(geometry.coordinates))
      if (geometry.type === 'Polygon') {
        newCoordinates[ringPath[0]] = nextCoords
      } else if (geometry.type === 'MultiPolygon') {
        newCoordinates[ringPath[0]][ringPath[1]] = nextCoords
      }

      const updatedFeature = gj.type === 'Feature'
        ? {
            ...gj,
            geometry: {
              ...geometry,
              coordinates: newCoordinates
            }
          }
        : {
            ...gj,
            coordinates: newCoordinates
          }
      const terrainSource = map.getSource('course-terrain')
      if (terrainSource) {
        const updatedOverlays = filteredOverlays.map(o => 
          o.id === selectedTerrainOverlayId 
            ? { ...o, geojson_data: updatedFeature }
            : o
        )
        terrainSource.setData(overlaysToFeatureCollection(updatedOverlays))
      }
      return updatedFeature
    }

    const rebuildHandles = () => {
      editMarkersRef.current.forEach((m) => m.remove())
      editMarkersRef.current = []

      rings.forEach(({ path, vertices }) => {
        const ringMidpoints = []

        // First pass: create midpoints (so corner markers can reference them during drag)
        for (let i = 0; i < vertices.length; i++) {
          const v1 = vertices[i]
          const v2 = vertices[(i + 1) % vertices.length]
          const midLng = (v1[0] + v2[0]) / 2
          const midLat = (v1[1] + v2[1]) / 2

          const el = document.createElement('div')
          el.className = 'v2-edit-handle v2-edit-handle--midpoint'

          const marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat([midLng, midLat])
            .addTo(map)

          marker.on('drag', () => {
            const lngLat = marker.getLngLat()
            let lng = lngLat.lng
            let lat = lngLat.lat

            const snap = getSnapPointPixel(map.project(lngLat), selectedTerrainOverlayId)
            if (snap) {
              lng = snap[0]
              lat = snap[1]
              marker.setLngLat([lng, lat])
            }

            const tempVertices = [...vertices]
            tempVertices.splice(i + 1, 0, [lng, lat])
            updateGeometryCoordinates(path, [...tempVertices, tempVertices[0]])
          })

          marker.on('dragend', async () => {
            const lngLat = marker.getLngLat()
            let lng = lngLat.lng
            let lat = lngLat.lat
            
            const snap = getSnapPointPixel(map.project(lngLat), selectedTerrainOverlayId)
            let didSnap = false
            if (snap) {
              lng = snap[0]
              lat = snap[1]
            } else {
              lng = Math.round(lng * 1e7) / 1e7
              lat = Math.round(lat * 1e7) / 1e7
            }
            
            vertices.splice(i + 1, 0, [lng, lat])

            const nextCoords = [...vertices, vertices[0]]
            const nextFeature = updateGeometryCoordinates(path, nextCoords)
            await onCommitGeometryRef.current(selectedTerrainOverlayId, nextFeature)
            rebuildHandles()
          })

          ringMidpoints.push(marker)
          editMarkersRef.current.push(marker)
        }

        // Second pass: create corner handles
        vertices.forEach((vertex, index) => {
          const el = document.createElement('div')
          el.className = 'v2-edit-handle'

          const marker = new maplibregl.Marker({ element: el, draggable: true })
            .setLngLat(vertex)
            .addTo(map)

          marker.on('drag', () => {
            const lngLat = marker.getLngLat()
            let lng = lngLat.lng
            let lat = lngLat.lat

            const snap = getSnapPointPixel(map.project(lngLat), selectedTerrainOverlayId)
            if (snap) {
              lng = snap[0]
              lat = snap[1]
              marker.setLngLat([lng, lat])
            }

            vertices[index] = [lng, lat]
            updateGeometryCoordinates(path, [...vertices, vertices[0]])

            // Dynamically update the adjacent midpoint handles during the drag
            const prevIndex = (index - 1 + vertices.length) % vertices.length
            const nextIndex = index

            const prevMidpointMarker = ringMidpoints[prevIndex]
            if (prevMidpointMarker) {
              const vPrev = vertices[prevIndex]
              prevMidpointMarker.setLngLat([
                (vPrev[0] + lng) / 2,
                (vPrev[1] + lat) / 2
              ])
            }

            const nextMidpointMarker = ringMidpoints[nextIndex]
            if (nextMidpointMarker) {
              const vNext = vertices[(index + 1) % vertices.length]
              nextMidpointMarker.setLngLat([
                (lng + vNext[0]) / 2,
                (lat + vNext[1]) / 2
              ])
            }
          })

          marker.on('dragend', async () => {
            const lngLat = marker.getLngLat()
            let lng = lngLat.lng
            let lat = lngLat.lat
            
            // Re-apply snap on release to guarantee perfect coordinate matching
            const snap = getSnapPointPixel(map.project(lngLat), selectedTerrainOverlayId)
            let didSnap = false
            if (snap) {
              lng = snap[0]
              lat = snap[1]
              didSnap = true
            } else {
              // Maintain clean numbers but increase precision to 7 places (centimeter accuracy)
              lng = Math.round(lng * 1e7) / 1e7
              lat = Math.round(lat * 1e7) / 1e7
            }
            
            vertices[index] = [lng, lat]
            
            const nextCoords = [...vertices, vertices[0]]
            const nextFeature = updateGeometryCoordinates(path, nextCoords)
            await onCommitGeometryRef.current(selectedTerrainOverlayId, nextFeature)
            rebuildHandles()
          })

          el.addEventListener('contextmenu', async (e) => {
            e.preventDefault()
            if (vertices.length <= 3) {
              alert('A polygon must have at least 3 vertices.')
              return
            }
            vertices.splice(index, 1)
            const nextCoords = [...vertices, vertices[0]]
            const nextFeature = updateGeometryCoordinates(path, nextCoords)
            await onCommitGeometryRef.current(selectedTerrainOverlayId, nextFeature)
            rebuildHandles()
          })

          editMarkersRef.current.push(marker)
        })
      })
    }

    rebuildHandles()

    // --- Region Drag Logic ---
    let isDragging = false
    let startLngLat = null
    let initialCoordinates = null

    const onMouseDown = (e) => {
      // Don't drag if right click
      if (e.originalEvent.button !== 0) return

      // Make sure we only drag the region if clicking directly on the canvas, 
      // NOT if clicking on an HTML marker overlay (like a vertex).
      if (e.originalEvent.target !== map.getCanvas()) return
      
      const features = map.queryRenderedFeatures(e.point, { layers: ['terrain-fills-selected'] })
      if (!features.length) return

      e.preventDefault() // Prevents default map interactions
      map.dragPan.disable()
      isDragging = true
      startLngLat = e.lngLat

      const selectedIds = selectedTerrainOverlayIdsRef.current.length > 0 
        ? selectedTerrainOverlayIdsRef.current 
        : (selectedTerrainOverlayIdRef.current ? [selectedTerrainOverlayIdRef.current] : [])

      initialCoordinates = selectedIds.map(id => {
        const overlay = filteredOverlays.find(o => o.id === id)
        if (!overlay) return null
        const activeGeojson = overlay.id === selectedTerrainOverlayIdRef.current ? overlay.geojson_data_raw : overlay.geojson_data
        const gj = activeGeojson || overlay.geojson_data
        if (!gj) return null
        const geometry = gj.geometry || gj
        return {
          id,
          gj,
          geometry,
          coordinates: JSON.parse(JSON.stringify(geometry?.coordinates || []))
        }
      }).filter(Boolean)

      // Hide handles during drag
      editMarkersRef.current.forEach((m) => m.remove())
      editMarkersRef.current = []
      map.getCanvas().style.cursor = 'grabbing'
    }

    const onMouseMove = (e) => {
      if (!isDragging || !initialCoordinates) return
      
      const currentLngLat = e.lngLat
      const dLng = currentLngLat.lng - startLngLat.lng
      const dLat = currentLngLat.lat - startLngLat.lat

      const updatedOverlays = filteredOverlays.map(o => {
        const init = initialCoordinates.find(item => item.id === o.id)
        if (!init) return o

        const newCoordinates = JSON.parse(JSON.stringify(init.coordinates))
        const applyDelta = (coords) => {
          if (typeof coords[0] === 'number') {
            coords[0] += dLng
            coords[1] += dLat
          } else {
            coords.forEach(applyDelta)
          }
        }
        applyDelta(newCoordinates)

        const geom = init.geometry
        const updatedFeature = init.gj.type === 'Feature'
          ? { ...init.gj, geometry: { ...geom, coordinates: newCoordinates } }
          : { ...init.gj, coordinates: newCoordinates }

        return { ...o, geojson_data: updatedFeature }
      })
        
      const terrainSource = map.getSource('course-terrain')
      if (terrainSource) {
        terrainSource.setData(overlaysToFeatureCollection(updatedOverlays))
      }
    }

    const onMouseUp = async (e) => {
      if (!isDragging || !initialCoordinates) return
      isDragging = false
      map.dragPan.enable()
      map.getCanvas().style.cursor = ''

      const currentLngLat = e.lngLat
      const dLng = currentLngLat.lng - startLngLat.lng
      const dLat = currentLngLat.lat - startLngLat.lat
      
      // If no actual movement, just rebuild handles and return
      if (Math.abs(dLng) < 1e-8 && Math.abs(dLat) < 1e-8) {
        rebuildHandles()
        return
      }

      await Promise.all(initialCoordinates.map(async (init) => {
        const newCoordinates = JSON.parse(JSON.stringify(init.coordinates))
        const applyDelta = (coords) => {
          if (typeof coords[0] === 'number') {
            coords[0] = Math.round((coords[0] + dLng) * 1e7) / 1e7
            coords[1] = Math.round((coords[1] + dLat) * 1e7) / 1e7
          } else {
            coords.forEach(applyDelta)
          }
        }
        applyDelta(newCoordinates)

        const geom = init.geometry
        const updatedFeature = init.gj.type === 'Feature'
          ? { ...init.gj, geometry: { ...geom, coordinates: newCoordinates } }
          : { ...init.gj, coordinates: newCoordinates }

        await onCommitGeometryRef.current(init.id, updatedFeature)
      }))
    }

    map.on('mousedown', 'terrain-fills-selected', onMouseDown)
    map.on('mousemove', onMouseMove)
    map.on('mouseup', onMouseUp)

    return () => {
      editMarkersRef.current.forEach((m) => m.remove())
      editMarkersRef.current = []
      
      map.off('mousedown', 'terrain-fills-selected', onMouseDown)
      map.off('mousemove', onMouseMove)
      map.off('mouseup', onMouseUp)
      
      if (isDragging) {
        map.dragPan.enable()
        map.getCanvas().style.cursor = ''
      }
    }
  }, [selectedTerrainOverlayId, selectedTerrainOverlayIds, workspaceMode, mapLoaded, filteredOverlays])

  // ── Initialize MapLibre ──────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !course || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution:
              'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          },
        },
        layers: [
          {
            id: 'satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            paint: {},
          },
        ],
      },
      center: courseCenter,
      zoom: courseZoom,
      pitchWithRotate: false,
      dragRotate: false,
      boxZoom: false,
      maxZoom: 22,
      minZoom: 2,
    })

    // Navigation controls (zoom, compass, pitch)
    map.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    )

    // Scale bar
    map.addControl(
      new maplibregl.ScaleControl({
        maxWidth: 150,
        unit: 'imperial',
      }),
      'bottom-right'
    )

    mapRef.current = map
    onMapReady(map)

    if (map.loaded()) {
      setMapLoaded(true)
    } else {
      map.on('load', () => setMapLoaded(true))
    }

    // Dismiss pitch hint after first interaction
    const dismissHint = () => {
      setShowPitchHint(false)
      map.off('pitchstart', dismissHint)
      map.off('rotate', dismissHint)
    }
    map.on('pitchstart', dismissHint)
    map.on('rotate', dismissHint)

    return () => {
      onMapReady(null)
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, [course, onMapReady])

  // ── Inject/Sync terrain GeoJSON when ready ───────────────
  const injectTerrain = useCallback(() => {
    const map = mapRef.current
    if (!map) return

    const fc = overlaysToFeatureCollection(filteredOverlaysRef.current)

    if (map.getSource('course-terrain')) {
      map.getSource('course-terrain').setData(fc)
      return
    }

    // Add GeoJSON source
    map.addSource('course-terrain', {
      type: 'geojson',
      data: fc,
    })

    // Fill layer
    map.addLayer({
      id: 'terrain-fills',
      type: 'fill',
      source: 'course-terrain',
      paint: {
        'fill-color': buildTerrainColorExpression(),
        'fill-opacity': 0.35,
      },
    })

    // Hover fill overlay
    map.addLayer({
      id: 'terrain-fills-hovered',
      type: 'fill',
      source: 'course-terrain',
      paint: {
        'fill-color': '#ffffff',
        'fill-opacity': 0.15,
      },
      filter: ['==', ['get', 'id'], ''],
    })

    // Selected fill overlay
    map.addLayer({
      id: 'terrain-fills-selected',
      type: 'fill',
      source: 'course-terrain',
      paint: {
        'fill-color': buildTerrainColorExpression(),
        'fill-opacity': 0.65,
      },
      filter: ['==', ['get', 'id'], ''],
    })

    // Outline layer
    map.addLayer({
      id: 'terrain-outlines',
      type: 'line',
      source: 'course-terrain',
      paint: {
        'line-color': '#ffffff',
        'line-width': 1.5,
        'line-opacity': 0.6,
      },
    })

    // Selected outline layer
    map.addLayer({
      id: 'terrain-outlines-selected',
      type: 'line',
      source: 'course-terrain',
      paint: {
        'line-color': '#ffffff',
        'line-width': 3.5,
        'line-opacity': 1.0,
      },
      filter: ['==', ['get', 'id'], ''],
    })

    // ── Phase 5: Draft Draw Source & Layers ───────────────
    if (!map.getSource('draft-draw')) {
      map.addSource('draft-draw', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
      map.addLayer({
        id: 'draft-draw-fill',
        type: 'fill',
        source: 'draft-draw',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.15
        },
        filter: ['==', ['geometry-type'], 'Polygon']
      })
      map.addLayer({
        id: 'draft-draw-line',
        type: 'line',
        source: 'draft-draw',
        paint: {
          'line-color': '#10b981',
          'line-width': 2,
          'line-dasharray': [2, 2]
        },
        filter: ['==', ['geometry-type'], 'LineString']
      })
      map.addLayer({
        id: 'draft-draw-circle',
        type: 'circle',
        source: 'draft-draw',
        paint: {
          'circle-radius': 5,
          'circle-color': '#0f172a',
          'circle-stroke-color': '#10b981',
          'circle-stroke-width': 2
        },
        filter: ['==', ['geometry-type'], 'Point']
      })
    }

    // Select / Deselect Click Handler, Point Placement, and Polygon Drawing
    map.on('click', (e) => {
      if (activePointToolRef.current) {
        const lat = Math.round(e.lngLat.lat * 1e6) / 1e6
        const lng = Math.round(e.lngLat.lng * 1e6) / 1e6
        onPickRef.current(activePointToolRef.current, lat, lng)
        return
      }

      if (drawModeRef.current === 'polygon') {
        const lngLat = e.lngLat
        let lng = lngLat.lng
        let lat = lngLat.lat

        const snap = getSnapPointPixel(e.point, null)
        if (snap) {
          lng = snap[0]
          lat = snap[1]
        } else {
          lng = Math.round(lng * 1e7) / 1e7
          lat = Math.round(lat * 1e7) / 1e7
        }

        const coords = drawCoordinatesRef.current
        if (coords.length >= 3) {
          const firstPoint = coords[0]
          // Simple distance approximation in meters
          const R = 6371000
          const dLat = (lat - firstPoint[1]) * Math.PI / 180
          const dLng = (lng - firstPoint[0]) * Math.PI / 180
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(firstPoint[1] * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2)
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
          const distance = R * c

          if (distance < 15) { // 15 meters proximity
            const closedCoords = [...coords, coords[0]]
            const feature = {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [closedCoords]
              },
              properties: {}
            }
            onRegionDraftChangeRef.current(feature)
            onDrawCoordinatesChangeRef.current([])
            return
          }
        }

        onDrawCoordinatesChangeRef.current([...coords, [lng, lat]])
        return
      }

      if (modeRef.current === 'mapping') {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['terrain-fills'],
        })

        if (features.length > 0) {
          const currentSelectedId = selectedTerrainOverlayIdRef.current
          let nextIndex = 0

          if (currentSelectedId) {
            const currentIndex = features.findIndex((f) => f.properties.id === currentSelectedId)
            if (currentIndex !== -1) {
              nextIndex = (currentIndex + 1) % features.length
            }
          }

          const id = features[nextIndex].properties.id
          const isMultiSelect = Boolean(e.originalEvent?.ctrlKey || e.originalEvent?.shiftKey || e.originalEvent?.metaKey)
          selectOverlayRef.current(id, isMultiSelect)
        } else {
          selectOverlayRef.current(null)
        }
      }
    })

    // Hover effect and cursor tracking
    map.on('mousemove', 'terrain-fills', (e) => {
      if (modeRef.current !== 'mapping') return
      if (activePointToolRef.current || drawModeRef.current === 'polygon') return

      if (e.features && e.features.length > 0) {
        const id = e.features[0].properties.id
        setHoveredId(id)
        map.getCanvas().style.cursor = 'pointer'
      }
    })

    // Live drawing guidance line and polygon preview
    map.on('mousemove', (e) => {
      if (drawModeRef.current !== 'polygon') return

      const coords = drawCoordinatesRef.current
      if (coords.length === 0) return

      const lngLat = e.lngLat
      let lng = lngLat.lng
      let lat = lngLat.lat

      const snap = getSnapPointPixel(e.point, null)
      if (snap) {
        lng = snap[0]
        lat = snap[1]
      } else {
        lng = Math.round(lng * 1e7) / 1e7
        lat = Math.round(lat * 1e7) / 1e7
      }

      const features = []
      coords.forEach((c) => {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: c
          }
        })
      })

      features.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [...coords, [lng, lat]]
        }
      })

      if (coords.length >= 2) {
        features.push({
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[...coords, [lng, lat], coords[0]]]
          }
        })
      }

      if (map.getSource('draft-draw')) {
        map.getSource('draft-draw').setData({
          type: 'FeatureCollection',
          features
        })
      }
    })

    map.on('mouseleave', 'terrain-fills', () => {
      if (activePointToolRef.current || drawModeRef.current === 'polygon') {
        map.getCanvas().style.cursor = 'crosshair'
      } else {
        map.getCanvas().style.cursor = ''
      }
      setHoveredId(null)
    })

    // ── Phase 2: Add Planning Sources and Layers ───────────
    if (!map.getSource('planning-lines')) {
      map.addSource('planning-lines', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'planning-lines-layer',
        type: 'line',
        source: 'planning-lines',
        paint: {
          'line-color': '#ffffff',
          'line-width': 3,
          'line-opacity': 0.6,
          'line-dasharray': [2, 2],
        },
      })
    }

    if (!map.getSource('planning-dispersions')) {
      map.addSource('planning-dispersions', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'planning-dispersions-fill',
        type: 'fill',
        source: 'planning-dispersions',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.25,
        },
      })
      map.addLayer({
        id: 'planning-dispersions-outline',
        type: 'line',
        source: 'planning-dispersions',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1,
          'line-opacity': 0.6,
        },
      })
    }

    if (!map.getSource('planning-green-circle')) {
      map.addSource('planning-green-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'planning-green-circle-fill',
        type: 'fill',
        source: 'planning-green-circle',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.15,
        },
      })
      map.addLayer({
        id: 'planning-green-circle-outline',
        type: 'line',
        source: 'planning-green-circle',
        paint: {
          'line-color': '#10b981',
          'line-width': 2,
          'line-opacity': 0.8,
        },
      })
    }

    if (!map.getSource('planning-distance-circle')) {
      map.addSource('planning-distance-circle', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'planning-distance-circle-fill',
        type: 'fill',
        source: 'planning-distance-circle',
        paint: {
          'fill-color': '#6366f1',
          'fill-opacity': 0.08,
        },
      })
      map.addLayer({
        id: 'planning-distance-circle-outline',
        type: 'line',
        source: 'planning-distance-circle',
        paint: {
          'line-color': '#6366f1',
          'line-width': 2,
          'line-opacity': 0.8,
          'line-dasharray': [2, 3],
        },
      })
    }
  }, [])

  // Wire up terrain injection to map load event
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (mapLoaded) {
      injectTerrain()
    } else {
      map.on('load', injectTerrain)
      return () => map.off('load', injectTerrain)
    }
  }, [injectTerrain, mapLoaded])

  // React to overlays update
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const source = map.getSource('course-terrain')
    if (source) {
      source.setData(overlaysToFeatureCollection(filteredOverlays))
    }
  }, [filteredOverlays, mapLoaded])

  // ── Sync Map Markers & Lines (Phase 2 & 4) ────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    // 1. Clear old HTML markers & override refs
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    labelMarkersRef.current = []
    livePositionsRef.current.clear()

    // 2. Setup helper to update geojson layers
    const updateGeoJsonLayers = (linesFc, dispersionsFc, greenCircleFc, distanceCircleFc) => {
      if (!mapLoaded) return
      const emptyCollection = { type: 'FeatureCollection', features: [] }

      if (map.getSource('planning-lines')) {
        map.getSource('planning-lines').setData(linesFc || emptyCollection)
      }
      if (map.getSource('planning-dispersions')) {
        map.getSource('planning-dispersions').setData(dispersionsFc || emptyCollection)
      }
      if (map.getSource('planning-green-circle')) {
        map.getSource('planning-green-circle').setData(greenCircleFc || emptyCollection)
      }
      if (map.getSource('planning-distance-circle')) {
        map.getSource('planning-distance-circle').setData(distanceCircleFc || emptyCollection)
      }
    }

    if (!selectedHole) {
      updateGeoJsonLayers()
      return
    }

    const sequence = resolvePlanningMarkers(selectedHole)

    // A reusable layout updater to run imperatively during dragging
    const updateLinesAndDispersionsImperatively = () => {
      if (!mapLoaded || !map.getSource('planning-lines') || !map.getSource('planning-dispersions')) return

      const liveLinesFeatures = []
      const liveDispersionFeatures = []

      for (let i = 0; i < sequence.length - 1; i++) {
        const start = sequence[i]
        const end = sequence[i + 1]

        const startKey = start.id || `default-${start.marker_type}`
        const endKey = end.id || `default-${end.marker_type}`

        const startLive = livePositionsRef.current.get(startKey)
        const endLive = livePositionsRef.current.get(endKey)

        const startLat = startLive ? startLive.lat : Number(start.lat)
        const startLng = startLive ? startLive.lng : Number(start.long ?? start.lng)
        const endLat = endLive ? endLive.lat : Number(end.lat)
        const endLng = endLive ? endLive.lng : Number(end.long ?? end.lng)

        // Line segment
        liveLinesFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [startLng, startLat],
              [endLng, endLat],
            ],
          },
        })

        // Recompute distance
        const yards = Math.round(haversineDistanceYards(startLat, startLng, endLat, endLng))
        const elevationDiffYards = (end.elevation || 0) - (start.elevation || 0)
        const playsLike = Math.max(1, yards + Math.round(elevationDiffYards))

        // Reposition label marker
        const labelMarker = labelMarkersRef.current[i]
        if (labelMarker) {
          labelMarker.setLngLat([(startLng + endLng) / 2, (startLat + endLat) / 2])
          const labelEl = labelMarker.getElement()
          if (labelEl) {
            const innerDiv = labelEl.querySelector('.v2-distance-label div') || labelEl
            innerDiv.innerHTML = `${yards}&nbsp;yd`
          }
        }

        // Dispersion Polygon
        const club = getRecommendedClub(playsLike, clubs)
        if (club) {
          const bearing = getBearing(startLat, startLng, endLat, endLng)
          const polyPoints = getDispersionPolygon(
            { lat: endLat, lng: endLng },
            bearing,
            club,
            profile?.handedness || 'Right'
          )

          if (polyPoints.length > 0) {
            const coords = polyPoints.map((p) => [p[1], p[0]])
            coords.push(coords[0])

            liveDispersionFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coords],
              },
              properties: {
                color: club.color || '#3b82f6',
              },
            })
          }
        }
      }

      map.getSource('planning-lines').setData({
        type: 'FeatureCollection',
        features: liveLinesFeatures,
      })
      map.getSource('planning-dispersions').setData({
        type: 'FeatureCollection',
        features: liveDispersionFeatures,
      })

      // Update Green and Distance Circles imperatively during drag
      let liveGreenCircleFc = { type: 'FeatureCollection', features: [] }
      let liveDistanceCircleFc = { type: 'FeatureCollection', features: [] }

      const lastMarker = sequence[sequence.length - 1]
      if (lastMarker) {
        const lastKey = lastMarker.id || `default-${lastMarker.marker_type}`
        const lastLive = livePositionsRef.current.get(lastKey)

        const lat = lastLive ? lastLive.lat : Number(lastMarker.lat)
        const lng = lastLive ? lastLive.lng : Number(lastMarker.long ?? lastMarker.lng)

        if (!isNaN(lat) && !isNaN(lng)) {
          if (showGreenCircle) {
            const greenRadiusMeters = greenCircleRadius * 0.3048
            const feat = makeCirclePolygon({ lat, lng }, greenRadiusMeters)
            liveGreenCircleFc = { type: 'FeatureCollection', features: [feat] }
          }

          if (showDistanceCircle) {
            const distanceRadiusMeters = distanceCircleRadius * 0.9144
            const feat = makeCirclePolygon({ lat, lng }, distanceRadiusMeters)
            liveDistanceCircleFc = { type: 'FeatureCollection', features: [feat] }
          }
        }
      }

      if (map.getSource('planning-green-circle')) {
        map.getSource('planning-green-circle').setData(liveGreenCircleFc)
      }
      if (map.getSource('planning-distance-circle')) {
        map.getSource('planning-distance-circle').setData(liveDistanceCircleFc)
      }
    }

    // 3. Render Mapping Mode Markers
    if (workspaceMode === 'mapping') {
      updateGeoJsonLayers() // Clear planning layers

      const green = activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER)
      const tee = activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.TEE_BACK)

      if (tee) {
        const el = document.createElement('div')
        el.className = 'v2-hole-marker v2-hole-marker--tee'
        el.innerHTML = renderToStaticMarkup(
          <MapPin size={18} strokeWidth={2.25} fill="#fbbf24" color="#f59e0b" />
        )
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: !activePointTool })
          .setLngLat([Number(tee.lng), Number(tee.lat)])
          .addTo(map)

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          const lat = Math.round(lngLat.lat * 1e6) / 1e6
          const lng = Math.round(lngLat.lng * 1e6) / 1e6
          onMapMarkerMoveRef.current(HOLE_MARKER_KIND.TEE_BACK, lat, lng)
        })

        markersRef.current.push(marker)
      }

      if (green) {
        const el = document.createElement('div')
        el.className = 'v2-hole-marker v2-hole-marker--green'
        el.innerHTML = renderToStaticMarkup(
          <FlagTriangleLeft size={17} strokeWidth={2.25} fill="#34d399" color="#10b981" />
        )
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: !activePointTool })
          .setLngLat([Number(green.lng), Number(green.lat)])
          .addTo(map)

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          const lat = Math.round(lngLat.lat * 1e6) / 1e6
          const lng = Math.round(lngLat.lng * 1e6) / 1e6
          onMapMarkerMoveRef.current(HOLE_MARKER_KIND.GREEN_CENTER, lat, lng)
        })

        markersRef.current.push(marker)
      }
    }

    // 4. Render Planning Mode Markers, Lines, Labels & Dispersions
    if (workspaceMode === 'planning') {
      const linesFeatures = []
      const dispersionFeatures = []

      // A. Draw planning markers
      sequence.forEach((m, idx) => {
        const lng = Number(m.long ?? m.lng)
        const lat = Number(m.lat)
        if (isNaN(lng) || isNaN(lat)) return

        const el = document.createElement('div')
        el.className = `v2-hole-marker v2-hole-marker--${m.marker_type}`

        if (m.marker_type === 'tee_shot_location') {
          el.innerHTML = renderToStaticMarkup(
            <Crosshair size={20} strokeWidth={2.5} color="#38bdf8" />
          )
        } else if (m.marker_type === 'pin_location') {
          el.innerHTML = renderToStaticMarkup(
            <FlagTriangleLeft size={18} strokeWidth={2.5} fill="#34d399" color="#10b981" />
          )
        } else {
          // Landing area numbered circle
          const landingIdx = sequence
            .slice(0, idx + 1)
            .filter((x) => x.marker_type === 'landing_area').length
          el.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;width:28px;height:28px;background:#7c3aed;border:2px solid #a78bfa;border-radius:50%;color:white;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${landingIdx}</div>`
        }

        const marker = new maplibregl.Marker({ element: el, anchor: 'center', draggable: !activePointTool })
          .setLngLat([lng, lat])
          .addTo(map)

        marker.on('drag', () => {
          const lngLat = marker.getLngLat()
          const key = m.id || `default-${m.marker_type}`
          livePositionsRef.current.set(key, { lat: lngLat.lat, lng: lngLat.lng })
          updateLinesAndDispersionsImperatively()
        })

        marker.on('dragend', () => {
          const lngLat = marker.getLngLat()
          const finalLat = Math.round(lngLat.lat * 1e6) / 1e6
          const finalLng = Math.round(lngLat.lng * 1e6) / 1e6

          const key = m.id || `default-${m.marker_type}`
          livePositionsRef.current.delete(key)

          if (m.id) {
            onMarkerMoveRef.current(m.id, finalLat, finalLng)
          } else {
            onPickRef.current(m.marker_type, finalLat, finalLng)
          }
        })

        markersRef.current.push(marker)
      })

      // B. Draw lines, labels, and dispersion ellipses
      for (let i = 0; i < sequence.length - 1; i++) {
        const start = sequence[i]
        const end = sequence[i + 1]
        const startLng = Number(start.long ?? start.lng)
        const startLat = Number(start.lat)
        const endLng = Number(end.long ?? end.lng)
        const endLat = Number(end.lat)

        if (isNaN(startLng) || isNaN(startLat) || isNaN(endLng) || isNaN(endLat)) continue

        // i. Line segment
        linesFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [startLng, startLat],
              [endLng, endLat],
            ],
          },
        })

        // ii. Distance label marker
        const yards = Math.round(
          haversineDistanceYards(startLat, startLng, endLat, endLng)
        )
        const elevationDiffYards = (end.elevation || 0) - (start.elevation || 0)
        const playsLike = Math.max(1, yards + Math.round(elevationDiffYards))

        const labelEl = document.createElement('div')
        labelEl.className = 'v2-distance-label'
        labelEl.innerHTML = `<div style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,0.82);border:1px solid rgba(255,255,255,0.35);white-space:nowrap;pointer-events:none">${yards}&nbsp;yd</div>`

        const labelMarker = new maplibregl.Marker({ element: labelEl, anchor: 'center' })
          .setLngLat([(startLng + endLng) / 2, (startLat + endLat) / 2])
          .addTo(map)
        markersRef.current.push(labelMarker)
        labelMarkersRef.current.push(labelMarker)

        // iii. Dispersion Polygon
        const club = getRecommendedClub(playsLike, clubs)
        if (club) {
          const bearing = getBearing(startLat, startLng, endLat, endLng)
          const polyPoints = getDispersionPolygon(
            { lat: endLat, lng: endLng },
            bearing,
            club,
            profile?.handedness || 'Right'
          )

          if (polyPoints.length > 0) {
            const coords = polyPoints.map((p) => [p[1], p[0]])
            coords.push(coords[0])

            dispersionFeatures.push({
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [coords],
              },
              properties: {
                color: club.color || '#3b82f6',
              },
            })
          }
        }
      }

      // C. Draw green and distance circles
      let greenCircleFc = { type: 'FeatureCollection', features: [] }
      let distanceCircleFc = { type: 'FeatureCollection', features: [] }

      const lastMarker = sequence[sequence.length - 1]
      if (lastMarker) {
        const lastLng = Number(lastMarker.long ?? lastMarker.lng)
        const lastLat = Number(lastMarker.lat)

        if (!isNaN(lastLng) && !isNaN(lastLat)) {
          if (showGreenCircle) {
            const greenRadiusMeters = greenCircleRadius * 0.3048
            const feat = makeCirclePolygon({ lat: lastLat, lng: lastLng }, greenRadiusMeters)
            greenCircleFc = { type: 'FeatureCollection', features: [feat] }
          }

          if (showDistanceCircle) {
            const distanceRadiusMeters = distanceCircleRadius * 0.9144
            const feat = makeCirclePolygon({ lat: lastLat, lng: lastLng }, distanceRadiusMeters)
            distanceCircleFc = { type: 'FeatureCollection', features: [feat] }
          }
        }
      }

      updateGeoJsonLayers(
        { type: 'FeatureCollection', features: linesFeatures },
        { type: 'FeatureCollection', features: dispersionFeatures },
        greenCircleFc,
        distanceCircleFc
      )
    }

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      labelMarkersRef.current = []
    }
  }, [selectedHole, workspaceMode, clubs, profile, mapLoaded, activePointTool, showGreenCircle, greenCircleRadius, showDistanceCircle, distanceCircleRadius])

  // ── Fly-To-Hole camera control ───────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedHole) return

    const bounds = getHoleBounds(selectedHole, filteredOverlays)
    const green = activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER)
    const tee = activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.TEE_BACK)

    if (autoRotateHoleView && green && tee) {
      const bearing = getBearing(Number(tee.lat), Number(tee.lng), Number(green.lat), Number(green.lng))
      const minLng = Math.min(Number(tee.lng), Number(green.lng))
      const maxLng = Math.max(Number(tee.lng), Number(green.lng))
      const minLat = Math.min(Number(tee.lat), Number(green.lat))
      const maxLat = Math.max(Number(tee.lat), Number(green.lat))

      const markerBounds = [
        [minLng, minLat],
        [maxLng, maxLat]
      ]
      
      const camera = map.cameraForBounds(markerBounds, {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        bearing: bearing,
      })

      if (camera && typeof camera.zoom === 'number' && camera.zoom >= 10 && camera.center) {
        map.flyTo({
          center: camera.center,
          zoom: Math.min(camera.zoom, 20),
          bearing: bearing,
          duration: 1200,
        })
      } else {
        map.setBearing(0)
        map.fitBounds(markerBounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          duration: 1200,
          maxZoom: 20,
        })
        map.setBearing(bearing)
      }
    } else {
      map.setBearing(0)
      if (bounds) {
        map.fitBounds(bounds, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          duration: 1200,
          maxZoom: 20,
        })
      } else {
        // Fallback: green center marker or tee back marker
        const greenMarker = selectedHole.mapMarkers?.find(
          (m) => m.marker_kind === 'green_center' && m.is_active !== false
        )
        const teeMarker = selectedHole.mapMarkers?.find(
          (m) => m.marker_kind === 'tee_back' && m.is_active !== false
        )
        const targetMarker = greenMarker || teeMarker

        if (targetMarker && targetMarker.lat && targetMarker.lng) {
          map.flyTo({
            center: [Number(targetMarker.lng), Number(targetMarker.lat)],
            zoom: 17,
            duration: 1200,
          })
        } else if (courseCenter && courseCenter[0] !== -98.5795) {
          // Only fly to course center if it is a real course center location
          map.flyTo({
            center: courseCenter,
            zoom: 16,
            duration: 1200,
          })
        }
      }
    }
  }, [selectedHole?.id, courseCenter, autoRotateHoleView])

  const green = selectedHole ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER) : null
  const tee = selectedHole ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.TEE_BACK) : null
  const hasMarkers = Boolean(green && tee)

  // ── Compute Legend active items ──────────────────────────
  const activeTerrainTypes = [
    ...new Set(filteredOverlays.map((o) => o.terrain_type)),
  ].sort()

  return (
    <div className="v2-map-wrap">
      <div ref={mapContainerRef} className="v2-map-container" />

      {/* Floating Orient Map Control */}
      {selectedHole && (
        <div className="absolute top-[120px] right-[10px] z-10">
          <button
            type="button"
            onClick={() => setAutoRotateHoleView(!autoRotateHoleView)}
            disabled={!hasMarkers}
            className={`w-[29px] h-[29px] rounded-lg border flex items-center justify-center transition-all duration-200 shadow-md ${
              autoRotateHoleView
                ? 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500'
                : 'bg-slate-900 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={
              !hasMarkers
                ? "Place Tee and Green markers to orient"
                : autoRotateHoleView
                ? "Auto-Orient Active (Green at Top)"
                : "Orient Map (Green at Top)"
            }
          >
            <Compass size={14} />
          </button>
        </div>
      )}

      <V2OSMFeaturesLayer
        mapInstance={mapRef.current}
        osmFeaturesData={osmFeaturesData}
        onFeatureSelect={onOsmFeatureSelect}
      />

      {/* Dynamic Terrain Legend */}
      {activeTerrainTypes.length > 0 && (
        <div className="v2-legend">
          <div className="v2-legend__title">Terrain</div>
          {activeTerrainTypes.map((type) => (
            <div key={type} className="v2-legend__item">
              <div
                className="v2-legend__swatch"
                style={{
                  backgroundColor: TERRAIN_COLORS[type] || DEFAULT_FILL,
                }}
              />
              <span className="v2-legend__label">
                {TERRAIN_LABELS[type] || type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
