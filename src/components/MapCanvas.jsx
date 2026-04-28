// AI assisted development
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import L from 'leaflet'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import { ArrowLeft, Crosshair } from 'lucide-react'
import { supabase } from '../supabaseClient'
import HoleWorkspace from './HoleWorkspace'
import HoleMapPoints from './HoleMapPoints'
import CourseTerrainOverlays from './CourseTerrainOverlays'
import AutoDrawRegionTool from './AutoDrawRegionTool'
import RegionDraftPreview from './RegionDraftPreview'
import { HOLE_MARKER_KIND, activeMarkerLatLng } from '../utils/holeMarkers'
import { bearingDegrees, mapBearingForTeeBottomGreenTop } from '../utils/holeViewBearing'
import { isValidTerrainType, terrainTypeOptionLabel } from '../utils/regionTerrain'
import { fetchOSMFeaturesInBbox } from '../utils/osmImport'
import OSMMapFeaturesLayer from './OSMMapFeaturesLayer'
import 'leaflet/dist/leaflet.css'
import 'leaflet-rotate/dist/leaflet-rotate.js'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import '@geoman-io/leaflet-geoman-free'

const US_CENTER = [39.8283, -98.5795]
const US_ZOOM = 4
const COURSE_ZOOM = 16
/** Leaflet map max zoom; Esri imagery is native ~19, higher values upscale tiles for extra detail. */
const MAP_MAX_ZOOM = 22
const TILE_MAX_NATIVE_ZOOM = 19
const AUTO_DRAW_DEFAULT_TOLERANCE = 42
const AUTO_DRAW_MIN_RADIUS_YARDS = 5
const AUTO_DRAW_MAX_RADIUS_YARDS = 60
const AUTO_DRAW_DEFAULT_RADIUS_YARDS = 25
const ESRI_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const ESRI_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'

function MapInstanceBridge({ onMapReady }) {
  const map = useMap()
  useEffect(() => {
    onMapReady(map)
    return () => onMapReady(null)
  }, [map, onMapReady])
  return null
}

export default function MapCanvas() {
  const { id } = useParams()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(id))
  const [fetchError, setFetchError] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationFeedback, setLocationFeedback] = useState(null)

  const [holes, setHoles] = useState([])
  const [holesLoading, setHolesLoading] = useState(false)
  const [selectedHoleIndex, setSelectedHoleIndex] = useState(0)
  const [activePointTool, setActivePointTool] = useState(null)
  const [statsSaving, setStatsSaving] = useState(false)
  const [statsMessage, setStatsMessage] = useState(null)
  const [markerMessage, setMarkerMessage] = useState(null)
  const [removePlanningSaving, setRemovePlanningSaving] = useState(false)
  const [removePlanningMessage, setRemovePlanningMessage] = useState(null)
  const [autoRotateHoleView, setAutoRotateHoleView] = useState(false)
  const lastNavigatedHoleIndex = useRef(-1)

  const [terrainOverlays, setTerrainOverlays] = useState([])
  const [regionDrawActive, setRegionDrawActive] = useState(false)
  const [regionDraft, setRegionDraft] = useState(null)
  const [regionDraftKey, setRegionDraftKey] = useState(0)
  const [regionSaving, setRegionSaving] = useState(false)
  const [regionMessage, setRegionMessage] = useState(null)
  const [regionUpdateSaving, setRegionUpdateSaving] = useState(false)
  const [regionUpdateMessage, setRegionUpdateMessage] = useState(null)
  const [selectedTerrainOverlayId, setSelectedTerrainOverlayId] = useState(null)
  const [autoDrawActive, setAutoDrawActive] = useState(false)
  const [autoDrawTolerance, setAutoDrawTolerance] = useState(AUTO_DRAW_DEFAULT_TOLERANCE)
  const [autoDrawMaxRadiusYards, setAutoDrawMaxRadiusYards] = useState(AUTO_DRAW_DEFAULT_RADIUS_YARDS)
  const [autoDrawMessage, setAutoDrawMessage] = useState(null)
  
  const [osmToolActive, setOsmToolActive] = useState(false)
  const [osmFeaturesData, setOsmFeaturesData] = useState(null)

  const [workspaceMode, setWorkspaceMode] = useState(
    /** @returns {'mapping' | 'planning'} */ () => 'mapping',
  )

  const handleWorkspaceModeChange = useCallback((mode) => {
    setWorkspaceMode(mode)
    if (mode === 'planning') {
      setActivePointTool(null)
      setRegionDrawActive(false)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
      setOsmToolActive(false)
      setRegionDraft(null)
      setRegionMessage(null)
      setSelectedTerrainOverlayId(null)
    } else {
      setActivePointTool((prev) =>
        prev === 'tee_shot_location' ||
        prev === 'first_shot_location' ||
        prev === 'second_shot_location'
          ? null
          : prev,
      )
    }
  }, [])

  const handleMapReady = useCallback((map) => {
    setMapInstance(map)
  }, [])

  const handleSelectHoleIndex = useCallback((idx) => {
    setAutoRotateHoleView(false)
    setAutoDrawActive(false)
    setAutoDrawMessage(null)
    setSelectedHoleIndex(idx)
    setSelectedTerrainOverlayId(null)
  }, [])

  const loadTerrainOverlays = useCallback(async () => {
    const cid = course?.id
    if (!cid) return
    setRegionMessage(null)
    const { data, error } = await supabase
      .from('terrain_overlays')
      .select('id, course_id, terrain_type, risk_tier, label, geojson_data, terrain_overlay_holes(hole_id)')
      .eq('course_id', cid)
      .eq('is_active', true)

    if (error) {
      setRegionMessage(error.message)
      setTerrainOverlays([])
      return
    }

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      course_id: r.course_id,
      terrain_type: r.terrain_type,
      risk_tier: r.risk_tier,
      label: r.label,
      geojson_data: r.geojson_data,
      holeIds: (r.terrain_overlay_holes ?? []).map((h) => h.hole_id),
    }))
    setTerrainOverlays(rows)
  }, [course])

  useEffect(() => {
    startTransition(() => {
      void loadTerrainOverlays()
    })
  }, [loadTerrainOverlays])

  const handleActivePointToolChange = useCallback((tool) => {
    if (tool) {
      setRegionDrawActive(false)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
      setOsmToolActive(false)
    }
    setActivePointTool(tool)
  }, [])

  const handleRegionDrawActiveChange = useCallback((active) => {
    if (active) {
      setActivePointTool(null)
      setSelectedTerrainOverlayId(null)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
      setOsmToolActive(false)
    }
    setRegionDrawActive(active)
  }, [])

  const handleAutoDrawActiveChange = useCallback((active) => {
    if (active) {
      setActivePointTool(null)
      setRegionDrawActive(false)
      setSelectedTerrainOverlayId(null)
      setAutoDrawMessage('Click a clean seed point inside the area to trace.')
      setOsmToolActive(false)
    } else {
      setAutoDrawMessage(null)
    }
    setAutoDrawActive(active)
  }, [])

  const handleOsmToolActiveChange = useCallback((active) => {
    if (active) {
      setActivePointTool(null)
      setRegionDrawActive(false)
      setSelectedTerrainOverlayId(null)
      setAutoDrawActive(false)
      setAutoDrawMessage(null)
    } else {
      setOsmFeaturesData(null)
    }
    setOsmToolActive(active)
  }, [])

  useEffect(() => {
    if (osmToolActive && mapInstance) {
      const bounds = mapInstance.getBounds()
      const minLat = bounds.getSouth()
      const minLon = bounds.getWest()
      const maxLat = bounds.getNorth()
      const maxLon = bounds.getEast()

      setOsmFeaturesData(null)
      fetchOSMFeaturesInBbox(minLat, minLon, maxLat, maxLon)
        .then((data) => {
          if (data && data.features.length > 0) {
            setOsmFeaturesData(data)
          } else {
            console.log('No OSM features found in this area.')
          }
        })
        .catch((err) => {
          console.error('Failed to fetch OSM features:', err)
        })
    }
  }, [osmToolActive, mapInstance])

  const handleOSMFeatureSelect = useCallback(async (feature, isShiftClick) => {
    // When an OSM feature is selected...
    if (isShiftClick) {
      if (!course?.id) return;
      
      let terrainType = feature.properties?.golf || feature.properties?.natural || 'fairway';
      if (terrainType === 'water_hazard') terrainType = 'water';
      if (terrainType === 'sand') terrainType = 'bunker';
      if (!isValidTerrainType(terrainType)) terrainType = 'unknown';

      try {
        const { data: newOverlay, error: overlayErr } = await supabase.from('terrain_overlays').insert({
          course_id: course.id,
          terrain_type: terrainType,
          geojson_data: feature,
          label: feature.properties?.name || null
        }).select().single();

        if (overlayErr) throw overlayErr;

        const currentHole = holes[selectedHoleIndex];
        if (currentHole?.id && newOverlay?.id) {
          const { error: linkErr } = await supabase.from('terrain_overlay_holes').insert({
            terrain_overlay_id: newOverlay.id,
            hole_id: currentHole.id
          });
          if (linkErr) throw linkErr;
        }

        loadTerrainOverlays();
        // Do not close the OSM tool so they can continue shift-clicking!
        setRegionMessage('Imported feature as ' + terrainTypeOptionLabel(terrainType));
      } catch (err) {
        console.error('Error auto-importing OSM feature:', err);
        setRegionMessage('Failed to import feature.');
      }
    } else {
      setOsmToolActive(false)
      setOsmFeaturesData(null)
      setRegionDrawActive(false)
      setAutoDrawActive(false)
      setSelectedTerrainOverlayId(null)
      setRegionDraft(feature)
      setRegionDraftKey((k) => k + 1)
      setRegionMessage(null)
    }
  }, [course?.id, loadTerrainOverlays, holes, selectedHoleIndex])

  const handleAutoDrawToleranceChange = useCallback((value) => {
    setAutoDrawTolerance(Number.isFinite(value) ? Math.min(140, Math.max(8, value)) : AUTO_DRAW_DEFAULT_TOLERANCE)
  }, [])

  const handleAutoDrawMaxRadiusYardsChange = useCallback((value) => {
    setAutoDrawMaxRadiusYards(
      Number.isFinite(value)
        ? Math.min(AUTO_DRAW_MAX_RADIUS_YARDS, Math.max(AUTO_DRAW_MIN_RADIUS_YARDS, value))
        : AUTO_DRAW_DEFAULT_RADIUS_YARDS,
    )
  }, [])

  const handlePolygonDrawn = useCallback((feature) => {
    setRegionDrawActive(false)
    setAutoDrawActive(false)
    setSelectedTerrainOverlayId(null)
    setRegionDraft(feature)
    setRegionDraftKey((k) => k + 1)
    setRegionMessage(null)
  }, [])

  const handleDiscardRegionDraft = useCallback(() => {
    setRegionDraft(null)
    setRegionMessage(null)
    setAutoDrawMessage(null)
  }, [])

  const handleRegionDraftGeometryChange = useCallback((feature) => {
    setRegionDraft(feature)
  }, [])

  const handleSaveRegionDraft = useCallback(
    async ({ terrainType, label, holeIds }) => {
      const cid = course?.id
      if (!regionDraft || !cid) return
      setRegionSaving(true)
      setRegionMessage(null)
      const featureToStore = {
        ...regionDraft,
        properties: {
          ...(typeof regionDraft.properties === 'object' && regionDraft.properties !== null
            ? regionDraft.properties
            : {}),
          terrain_type: terrainType,
          label: label || null,
        },
      }

      const { data: row, error } = await supabase
        .from('terrain_overlays')
        .insert({
          course_id: cid,
          terrain_type: terrainType,
          label: label ? label : null,
          risk_tier: null,
          geojson_data: featureToStore,
          is_active: true,
        })
        .select('id')
        .maybeSingle()

      if (error || !row?.id) {
        setRegionMessage(error?.message ?? 'Could not save region')
        setRegionSaving(false)
        return
      }

      const links = holeIds.map((hole_id) => ({
        terrain_overlay_id: row.id,
        hole_id,
      }))
      const { error: linkErr } = await supabase.from('terrain_overlay_holes').insert(links)

      if (linkErr) {
        await supabase.from('terrain_overlays').update({ is_active: false }).eq('id', row.id)
        setRegionMessage(linkErr.message)
        setRegionSaving(false)
        return
      }

      setRegionDraft(null)
      setSelectedTerrainOverlayId(null)
      await loadTerrainOverlays()
      setRegionSaving(false)
    },
    [regionDraft, course, loadTerrainOverlays],
  )

  const handleTerrainGeometryCommit = useCallback(async (overlayId, feature) => {
    setRegionMessage(null)
    const { error } = await supabase
      .from('terrain_overlays')
      .update({ geojson_data: feature })
      .eq('id', overlayId)
      .eq('is_active', true)

    if (error) {
      setRegionMessage(error.message)
      return
    }
    setTerrainOverlays((prev) =>
      prev.map((o) => (o.id === overlayId ? { ...o, geojson_data: feature } : o)),
    )
  }, [])

  const selectedRegionOverlay = useMemo(() => {
    if (!selectedTerrainOverlayId) return null
    return terrainOverlays.find((o) => o.id === selectedTerrainOverlayId) ?? null
  }, [terrainOverlays, selectedTerrainOverlayId])

  const handleClearRegionSelection = useCallback(() => {
    setSelectedTerrainOverlayId(null)
    setRegionUpdateMessage(null)
  }, [])

  const handleUpdateRegionProperties = useCallback(
    async ({ terrainType, label, holeIds }) => {
      const id = selectedTerrainOverlayId
      const overlay = terrainOverlays.find((o) => o.id === id)
      if (!id || !overlay) return
      if (!isValidTerrainType(terrainType) || holeIds.length === 0) {
        setRegionUpdateMessage('Choose a valid terrain type and at least one hole.')
        return
      }

      setRegionUpdateSaving(true)
      setRegionUpdateMessage(null)

      const prevGj = overlay.geojson_data
      let nextGeojson = prevGj
      if (prevGj && typeof prevGj === 'object' && prevGj.type === 'Feature') {
        nextGeojson = {
          ...prevGj,
          properties: {
            ...(typeof prevGj.properties === 'object' && prevGj.properties !== null
              ? prevGj.properties
              : {}),
            terrain_type: terrainType,
            label: label || null,
          },
        }
      }

      const { error: uErr } = await supabase
        .from('terrain_overlays')
        .update({
          terrain_type: terrainType,
          label: label ? label : null,
          geojson_data: nextGeojson,
        })
        .eq('id', id)
        .eq('is_active', true)

      if (uErr) {
        setRegionUpdateMessage(uErr.message)
        setRegionUpdateSaving(false)
        return
      }

      const { error: dErr } = await supabase.from('terrain_overlay_holes').delete().eq('terrain_overlay_id', id)

      if (dErr) {
        setRegionUpdateMessage(dErr.message)
        setRegionUpdateSaving(false)
        await loadTerrainOverlays()
        return
      }

      const links = holeIds.map((hole_id) => ({
        terrain_overlay_id: id,
        hole_id,
      }))
      const { error: iErr } = await supabase.from('terrain_overlay_holes').insert(links)

      if (iErr) {
        setRegionUpdateMessage(iErr.message)
        setRegionUpdateSaving(false)
        await loadTerrainOverlays()
        return
      }

      await loadTerrainOverlays()
      setRegionUpdateSaving(false)
      setRegionUpdateMessage('Saved')
      window.setTimeout(() => setRegionUpdateMessage(null), 2500)
    },
    [selectedTerrainOverlayId, terrainOverlays, loadTerrainOverlays],
  )

  const handleDeleteRegion = useCallback(async () => {
    const id = selectedTerrainOverlayId
    if (!id) return
    const confirmed = window.confirm('Hard delete this region? This cannot be undone.')
    if (!confirmed) return

    setRegionUpdateSaving(true)
    setRegionUpdateMessage(null)

    const { error: linkErr } = await supabase.from('terrain_overlay_holes').delete().eq('terrain_overlay_id', id)
    if (linkErr) {
      setRegionUpdateMessage(linkErr.message)
      setRegionUpdateSaving(false)
      return
    }

    const { error: overlayErr } = await supabase.from('terrain_overlays').delete().eq('id', id)
    if (overlayErr) {
      setRegionUpdateMessage(overlayErr.message)
      setRegionUpdateSaving(false)
      await loadTerrainOverlays()
      return
    }

    setTerrainOverlays((prev) => prev.filter((o) => o.id !== id))
    setSelectedTerrainOverlayId(null)
    setRegionUpdateSaving(false)
    setRegionUpdateMessage(null)
  }, [selectedTerrainOverlayId, loadTerrainOverlays])

  useEffect(() => {
    if (!selectedTerrainOverlayId) return
    if (!terrainOverlays.some((o) => o.id === selectedTerrainOverlayId)) {
      startTransition(() => {
        setSelectedTerrainOverlayId(null)
        setRegionUpdateMessage(null)
      })
    }
  }, [terrainOverlays, selectedTerrainOverlayId])

  const saveCourseLocationFromMapCenter = useCallback(async () => {
    if (!mapInstance || !course?.id) return
    setSavingLocation(true)
    setLocationFeedback(null)
    const { lat, lng } = mapInstance.getCenter()
    const course_lat = Math.round(lat * 1e6) / 1e6
    const course_lng = Math.round(lng * 1e6) / 1e6

    const { error } = await supabase
      .from('courses')
      .update({ course_lat, course_lng })
      .eq('id', course.id)
      .eq('is_active', true)

    if (error) {
      setLocationFeedback(error.message)
    } else {
      setCourse((c) => (c ? { ...c, course_lat, course_lng } : c))
      mapInstance.setView([course_lat, course_lng], COURSE_ZOOM)
      if (typeof mapInstance.setBearing === 'function') {
        mapInstance.setBearing(0)
      }
      setLocationFeedback('Location saved')
      window.setTimeout(() => setLocationFeedback(null), 2500)
    }
    setSavingLocation(false)
  }, [mapInstance, course])

  useEffect(() => {
    if (!id) return

    let cancelled = false

    async function loadCourse() {
      setLoading(true)
      setFetchError(null)
      setCourse(null)

      const { data, error } = await supabase
        .from('courses')
        .select('id, name, course_lat, course_lng')
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        setFetchError(error.message)
        setCourse(null)
      } else {
        setCourse(data)
      }
      setLoading(false)
    }

    loadCourse()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (!course?.id) return

    lastNavigatedHoleIndex.current = -1

    let cancelled = false

    async function loadHolesAndMarkers() {
      setHolesLoading(true)
      const { data: holeRows, error: holesErr } = await supabase
        .from('holes')
        .select('id, hole_number, par, stroke_index, scorecard_yardage, course_id, path_sequence')
        .eq('course_id', course.id)
        .eq('is_active', true)
        .order('hole_number')

      if (cancelled) return

      if (holesErr) {
        setHoles([])
        setMarkerMessage(holesErr.message)
        setHolesLoading(false)
        return
      }

      const list = holeRows ?? []
      const holeIds = list.map((h) => h.id)

      let markers = []
      if (holeIds.length > 0) {
        const { data: markerRows, error: mErr } = await supabase
          .from('hole_map_markers')
          .select('id, hole_id, marker_kind, lat, lng, is_active')
          .in('hole_id', holeIds)
          .eq('is_active', true)

        if (!cancelled && !mErr && markerRows) {
          markers = markerRows
        }
      }

      if (cancelled) return

      const merged = list.map((h) => ({
        ...h,
        mapMarkers: markers.filter((m) => m.hole_id === h.id),
      }))
      setHoles(merged)
      setSelectedHoleIndex((i) => Math.min(i, Math.max(0, merged.length - 1)))
      setHolesLoading(false)
    }

    loadHolesAndMarkers()

    return () => {
      cancelled = true
      setHoles([])
    }
  }, [course?.id])

  const selectedHole = holes[selectedHoleIndex] ?? null

  const visibleTerrainOverlays = useMemo(() => {
    if (!selectedHole) return []
    return terrainOverlays.filter(
      (o) => Array.isArray(o.holeIds) && o.holeIds.includes(selectedHole.id),
    )
  }, [terrainOverlays, selectedHole])

  useEffect(() => {
    if (!mapInstance || holes.length === 0) return
    const sh = holes[selectedHoleIndex]
    if (!sh) return
    const g = activeMarkerLatLng(sh, HOLE_MARKER_KIND.GREEN_CENTER)
    const t = activeMarkerLatLng(sh, HOLE_MARKER_KIND.TEE_BACK)
    const useAutoFrame = Boolean(autoRotateHoleView && g && t)

    const navChanged = lastNavigatedHoleIndex.current !== selectedHoleIndex
    if (!navChanged) return
    lastNavigatedHoleIndex.current = selectedHoleIndex

    if (useAutoFrame) return

    if (g) {
      mapInstance.flyTo([g.lat, g.lng], 17)
      return
    }
    if (t) {
      mapInstance.flyTo([t.lat, t.lng], 17)
      return
    }
    if (course && course.course_lat !== 0) {
      mapInstance.flyTo([course.course_lat, course.course_lng], COURSE_ZOOM)
    }
  }, [mapInstance, selectedHoleIndex, holes, course, autoRotateHoleView])

  useEffect(() => {
    if (!mapInstance || holesLoading || typeof mapInstance.setBearing !== 'function') return

    const sh = holes[selectedHoleIndex]
    if (!autoRotateHoleView || !sh) {
      mapInstance.setBearing(0)
      return
    }

    const tee = activeMarkerLatLng(sh, HOLE_MARKER_KIND.TEE_BACK)
    const green = activeMarkerLatLng(sh, HOLE_MARKER_KIND.GREEN_CENTER)
    if (!tee || !green) {
      mapInstance.setBearing(0)
      return
    }

    mapInstance.invalidateSize()
    const bounds = L.latLngBounds(
      L.latLng(tee.lat, tee.lng),
      L.latLng(green.lat, green.lng),
    )
    mapInstance.fitBounds(bounds, {
      padding: [44, 72, 88, 72],
      maxZoom: MAP_MAX_ZOOM,
      animate: false,
    })
    const lineBearing = bearingDegrees(tee.lat, tee.lng, green.lat, green.lng)
    mapInstance.setBearing(mapBearingForTeeBottomGreenTop(lineBearing))
  }, [mapInstance, autoRotateHoleView, selectedHoleIndex, holes, holesLoading])

  const handleMarkerPick = useCallback(
    async (tool, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole) return
      setMarkerMessage(null)
      let marker_kind
      if (tool === 'green_center') marker_kind = HOLE_MARKER_KIND.GREEN_CENTER
      else if (tool === 'tee_back') marker_kind = HOLE_MARKER_KIND.TEE_BACK
      else if (tool === 'tee_shot_location') marker_kind = HOLE_MARKER_KIND.TEE_SHOT_LOCATION
      else if (tool === 'first_shot_location') marker_kind = HOLE_MARKER_KIND.FIRST_SHOT_LOCATION
      else if (tool === 'second_shot_location') marker_kind = HOLE_MARKER_KIND.SECOND_SHOT_LOCATION
      else return

      const { data, error } = await supabase
        .from('hole_map_markers')
        .upsert(
          { hole_id: hole.id, marker_kind, lat, lng, is_active: true },
          { onConflict: 'hole_id,marker_kind' },
        )
        .select('id, hole_id, marker_kind, lat, lng, is_active')
        .single()

      if (error) {
        setMarkerMessage(error.message)
        return
      }

      handleActivePointToolChange(null)
      setHoles((prev) =>
        prev.map((h) => {
          if (h.id !== hole.id) return h
          const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== marker_kind)
          return { ...h, mapMarkers: [...rest, data] }
        }),
      )
      if (!autoRotateHoleView) {
        mapInstance?.flyTo([lat, lng], Math.max(mapInstance.getZoom(), 17))
      }
    },
    [holes, selectedHoleIndex, mapInstance, autoRotateHoleView, handleActivePointToolChange],
  )

  const handleRemovePlanningMarker = useCallback(
    async (markerKind) => {
      const hole = holes[selectedHoleIndex]
      if (!hole?.id) return
      setRemovePlanningSaving(true)
      setRemovePlanningMessage(null)

      const kindsToClear =
        markerKind === HOLE_MARKER_KIND.TEE_SHOT_LOCATION
          ? [
              HOLE_MARKER_KIND.TEE_SHOT_LOCATION,
              HOLE_MARKER_KIND.FIRST_SHOT_LOCATION,
              HOLE_MARKER_KIND.SECOND_SHOT_LOCATION,
            ]
          : markerKind === HOLE_MARKER_KIND.FIRST_SHOT_LOCATION
            ? [HOLE_MARKER_KIND.FIRST_SHOT_LOCATION, HOLE_MARKER_KIND.SECOND_SHOT_LOCATION]
            : [HOLE_MARKER_KIND.SECOND_SHOT_LOCATION]

      const kindSet = new Set(kindsToClear)

      for (const k of kindsToClear) {
        const { error } = await supabase
          .from('hole_map_markers')
          .update({ is_active: false })
          .eq('hole_id', hole.id)
          .eq('marker_kind', k)

        if (error) {
          setRemovePlanningMessage(error.message)
          setRemovePlanningSaving(false)
          return
        }
      }

      setHoles((prev) =>
        prev.map((h) => {
          if (h.id !== hole.id) return h
          return {
            ...h,
            mapMarkers: (h.mapMarkers ?? []).filter((m) => !kindSet.has(m.marker_kind)),
          }
        }),
      )
      setRemovePlanningMessage('Removed.')
      window.setTimeout(() => setRemovePlanningMessage(null), 2200)
      setRemovePlanningSaving(false)
    },
    [holes, selectedHoleIndex],
  )

  const handleSaveHoleStats = useCallback(async (holeId, payload) => {
    setStatsSaving(true)
    setStatsMessage(null)
    const { error } = await supabase
      .from('holes')
      .update({
        par: payload.par,
        stroke_index: payload.stroke_index,
        scorecard_yardage: payload.scorecard_yardage,
      })
      .eq('id', holeId)
      .eq('is_active', true)

    if (error) {
      setStatsMessage(error.message)
    } else {
      setStatsMessage('Saved')
      setHoles((prev) =>
        prev.map((h) =>
          h.id === holeId
            ? {
                ...h,
                par: payload.par,
                stroke_index: payload.stroke_index,
                scorecard_yardage: payload.scorecard_yardage,
              }
            : h,
        ),
      )

      const holeRow = holes.find((h) => h.id === holeId)
      if (holeRow?.course_id !== undefined && payload.scorecard_yardage !== undefined) {
        const { data: defTee } = await supabase
          .from('course_tees')
          .select('id')
          .eq('course_id', holeRow.course_id)
          .eq('is_default', true)
          .eq('is_active', true)
          .maybeSingle()
        if (defTee?.id) {
          const y = payload.scorecard_yardage
          const { data: yRow } = await supabase
            .from('hole_tee_yardages')
            .select('id')
            .eq('hole_id', holeId)
            .eq('tee_id', defTee.id)
            .eq('is_active', true)
            .maybeSingle()
          if (yRow?.id) {
            await supabase.from('hole_tee_yardages').update({ yardage: y }).eq('id', yRow.id)
          } else if (y !== null && y !== undefined) {
            await supabase.from('hole_tee_yardages').insert({
              hole_id: holeId,
              tee_id: defTee.id,
              yardage: y,
              is_active: true,
            })
          }
        }
      }

      window.setTimeout(() => setStatsMessage(null), 2500)
    }
    setStatsSaving(false)
  }, [holes])

  const { center, zoom, usingFallback } = useMemo(() => {
    if (!course) return { center: US_CENTER, zoom: US_ZOOM, usingFallback: true }
    if (course.course_lat === 0) {
      return { center: US_CENTER, zoom: US_ZOOM, usingFallback: true }
    }
    return {
      center: [course.course_lat, course.course_lng],
      zoom: COURSE_ZOOM,
      usingFallback: false,
    }
  }, [course])

  if (!id) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Missing course id.</p>
        <Link
          to="/"
          className="text-emerald-400 hover:text-emerald-300 transition-all duration-200"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="h-full w-full min-h-0 flex items-center justify-center bg-slate-900 text-slate-400">
        Loading course…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Could not load this course: {fetchError}</p>
        <Link
          to="/"
          className="text-emerald-400 hover:text-emerald-300 transition-all duration-200"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Course not found or you do not have access.</p>
        <Link
          to="/"
          className="text-emerald-400 hover:text-emerald-300 transition-all duration-200"
        >
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-slate-900 border-t border-slate-800">
      <div className="shrink-0 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to={`/course/${id}/details`}
            className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Course page
          </Link>
          <span className="text-slate-600 hidden sm:inline" aria-hidden>
            |
          </span>
          <h1 className="text-lg font-semibold text-white truncate min-w-0">{course.name}</h1>
        </div>

        <div
          className="flex rounded-lg border border-slate-600 bg-slate-900/80 p-0.5 shrink-0"
          role="group"
          aria-label="Workspace mode"
        >
          <button
            type="button"
            onClick={() => handleWorkspaceModeChange('mapping')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              workspaceMode === 'mapping'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mapping
          </button>
          <button
            type="button"
            onClick={() => handleWorkspaceModeChange('planning')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              workspaceMode === 'planning'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Planning
          </button>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            {usingFallback && (
              <p className="text-xs text-slate-500 hidden sm:block max-w-[220px] text-right">
                No coordinates — pan map, then save
              </p>
            )}
            <button
              type="button"
              disabled={!mapInstance || savingLocation}
              onClick={saveCourseLocationFromMapCenter}
              title="Saves the geographic center of the current map view as this course’s location"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 hover:border-emerald-500/40 disabled:opacity-45 disabled:pointer-events-none transition-all duration-200"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" aria-hidden />
              {savingLocation ? 'Saving…' : 'Save map center'}
            </button>
          </div>
          {locationFeedback && (
            <p
              className={`text-xs text-right max-w-[280px] ${locationFeedback === 'Location saved' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {locationFeedback}
            </p>
          )}
        </div>
      </div>

      {markerMessage && (
        <div className="shrink-0 px-4 py-1.5 bg-red-950/40 border-b border-red-900/50 text-xs text-red-300">
          {markerMessage}
        </div>
      )}

      {regionMessage && !regionDraft && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-950/30 border-b border-amber-900/40 text-xs text-amber-200/90">
          {regionMessage}
        </div>
      )}

      <HoleWorkspace
        mapArea={
          <div className="h-full w-full min-h-0 relative flex flex-col">
            {holesLoading && (
              <div className="absolute inset-0 z-600 flex items-center justify-center bg-slate-900/60 text-slate-400 text-sm">
                Loading holes…
              </div>
            )}
            <MapContainer
              center={center}
              zoom={zoom}
              className="h-full w-full z-0 flex-1 min-h-0"
              minZoom={2}
              maxZoom={MAP_MAX_ZOOM}
              scrollWheelZoom
              zoomControl
              rotate
            >
              <TileLayer
                url={ESRI_TILE_URL}
                attribution={ESRI_ATTRIBUTION}
                maxZoom={MAP_MAX_ZOOM}
                maxNativeZoom={TILE_MAX_NATIVE_ZOOM}
              />
              <MapInstanceBridge onMapReady={handleMapReady} />
              <CourseTerrainOverlays
                overlays={visibleTerrainOverlays}
                selectedId={workspaceMode === 'planning' ? null : selectedTerrainOverlayId}
                onSelectId={setSelectedTerrainOverlayId}
                regionDrawActive={regionDrawActive && workspaceMode === 'mapping'}
                suppressMapInteractions={
                  workspaceMode === 'planning' || autoDrawActive || osmToolActive || Boolean(regionDraft) || Boolean(activePointTool)
                }
                onPolygonDrawn={handlePolygonDrawn}
                onGeometryCommit={handleTerrainGeometryCommit}
              />
              <AutoDrawRegionTool
                active={autoDrawActive && workspaceMode === 'mapping'}
                disabled={!selectedHole || Boolean(regionDraft) || workspaceMode === 'planning'}
                tolerance={autoDrawTolerance}
                maxRadiusYards={autoDrawMaxRadiusYards}
                tileUrlTemplate={ESRI_TILE_URL}
                maxNativeZoom={TILE_MAX_NATIVE_ZOOM}
                onFeatureCreated={handlePolygonDrawn}
                onStatusChange={setAutoDrawMessage}
              />
              <OSMMapFeaturesLayer
                isActive={osmToolActive && workspaceMode === 'mapping' && !regionDraft}
                geojsonData={osmFeaturesData}
                onFeatureSelect={handleOSMFeatureSelect}
              />
              <RegionDraftPreview
                feature={workspaceMode === 'mapping' ? regionDraft : null}
                onFeatureChange={handleRegionDraftGeometryChange}
              />
              <HoleMapPoints
                selectedHole={selectedHole}
                activePointTool={activePointTool}
                onPick={handleMarkerPick}
                workspaceMode={workspaceMode}
                suppressHoleMapPick={
                  regionDrawActive ||
                  autoDrawActive ||
                  osmToolActive ||
                  Boolean(regionDraft) ||
                  (workspaceMode === 'planning' &&
                    activePointTool !== 'tee_shot_location' &&
                    activePointTool !== 'first_shot_location' &&
                    activePointTool !== 'second_shot_location')
                }
              />
            </MapContainer>
          </div>
        }
        holes={holes}
        selectedIndex={selectedHoleIndex}
        onSelectIndex={handleSelectHoleIndex}
        activePointTool={activePointTool}
        onActivePointToolChange={handleActivePointToolChange}
        onSaveHoleStats={handleSaveHoleStats}
        statsSaving={statsSaving}
        statsMessage={statsMessage}
        autoRotateHoleView={autoRotateHoleView}
        onAutoRotateHoleViewChange={setAutoRotateHoleView}
        regionDrawActive={regionDrawActive}
        onRegionDrawActiveChange={handleRegionDrawActiveChange}
        autoDrawActive={autoDrawActive}
        onAutoDrawActiveChange={handleAutoDrawActiveChange}
        autoDrawTolerance={autoDrawTolerance}
        onAutoDrawToleranceChange={handleAutoDrawToleranceChange}
        autoDrawMaxRadiusYards={autoDrawMaxRadiusYards}
        onAutoDrawMaxRadiusYardsChange={handleAutoDrawMaxRadiusYardsChange}
        autoDrawMessage={autoDrawMessage}
        osmToolActive={osmToolActive}
        onOsmToolActiveChange={handleOsmToolActiveChange}
        regionDraft={regionDraft}
        regionDraftKey={regionDraftKey}
        onDiscardRegionDraft={handleDiscardRegionDraft}
        onSaveRegionDraft={handleSaveRegionDraft}
        regionSaving={regionSaving}
        regionError={regionDraft ? regionMessage : null}
        selectedRegionOverlay={selectedRegionOverlay}
        onClearRegionSelection={handleClearRegionSelection}
        onUpdateRegionProperties={handleUpdateRegionProperties}
        onDeleteRegion={handleDeleteRegion}
        regionUpdateSaving={regionUpdateSaving}
        regionUpdateMessage={regionUpdateMessage}
        workspaceMode={workspaceMode}
        onRemovePlanningMarker={handleRemovePlanningMarker}
        removePlanningSaving={removePlanningSaving}
        removePlanningMessage={removePlanningMessage}
      />
    </div>
  )
}
