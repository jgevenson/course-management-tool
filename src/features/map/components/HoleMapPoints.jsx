// AI assisted development
import React, { useEffect, useMemo, useRef, useCallback } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Crosshair, FlagTriangleLeft, MapPin } from 'lucide-react'
import L from 'leaflet'
import { Marker, Polyline, Polygon, useMap, useMapEvents } from 'react-leaflet'
import { haversineDistanceYards, getBearing } from '../utils/geoDistance'
import { HOLE_MARKER_KIND, activeMarkerLatLng, resolvePlanningMarkers } from '../utils/holeMarkers'
import { getRecommendedClub, getDispersionPolygon } from '../../bag/utils/dispersion'
import { disableAllMapInteractions, enableAllMapInteractions } from '../utils/mapInteractions'

// ─── Icon builders ────────────────────────────────────────────────────────────

function buildTeeDivIcon() {
  const html = renderToStaticMarkup(
    <MapPin size={18} strokeWidth={2.25} fill="#fbbf24" color="#f59e0b" />,
  )
  return L.divIcon({
    html: `<div style="display:flex;justify-content:center;width:20px;height:26px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: [20, 26],
    iconAnchor: [10, 26],
  })
}

function buildGreenDivIcon() {
  const html = renderToStaticMarkup(
    <FlagTriangleLeft size={17} strokeWidth={2.25} fill="#34d399" color="#10b981" />,
  )
  return L.divIcon({
    html: `<div style="display:flex;justify-content:center;align-items:flex-end;width:20px;height:22px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: [20, 22],
    iconAnchor: [10, 22],
  })
}

function buildTeeShotDivIcon() {
  const html = renderToStaticMarkup(
    <Crosshair size={20} strokeWidth={2.5} color="#38bdf8" />,
  )
  return L.divIcon({
    html: `<div style="display:flex;justify-content:center;align-items:center;width:24px;height:24px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

const landingIconCache = {}
function getMemoizedLandingIcon(number) {
  if (!landingIconCache[number]) {
    landingIconCache[number] = buildLandingDivIcon(number)
  }
  return landingIconCache[number]
}

function buildLandingDivIcon(number) {
  return L.divIcon({
    html: `<div style="display:flex;justify-content:center;align-items:center;width:28px;height:28px;background:#7c3aed;border:2px solid #a78bfa;border-radius:50%;color:white;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.4)">${number}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  })
}

function buildPinDivIcon() {
  const html = renderToStaticMarkup(
    <FlagTriangleLeft size={18} strokeWidth={2.5} fill="#34d399" color="#10b981" />,
  )
  return L.divIcon({
    html: `<div style="display:flex;justify-content:center;align-items:center;width:24px;height:24px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function buildYardsLabel(yards) {
  return L.divIcon({
    html: `<div style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,0.82);border:1px solid rgba(255,255,255,0.35);white-space:nowrap;pointer-events:none">${yards}&nbsp;yd</div>`,
    className: 'leaflet-distance-label',
    iconSize: [64, 22],
    iconAnchor: [32, 11],
  })
}

// ─── Imperative polyline updater ──────────────────────────────────────────────

/**
 * Given the current live positions of all markers (as a Map from key -> {lat, lng}),
 * recompute the segments and update the Leaflet polylines and label markers imperatively.
 */
function updateLinesImperative(
  sequence,          // resolved planning sequence (from React state)
  livePositions,     // Map<key, {lat, lng}> of all current positions (overrides)
  polylineRefs,      // array of Leaflet Polyline instances
  labelRefs,         // array of Leaflet Marker instances (distance labels)
  dispersionRefs,    // array of Leaflet Polygon instances
  clubs,             // user's clubs
  profile,           // user's profile (for handedness)
) {
  if (!polylineRefs || !labelRefs) return

  for (let i = 0; i < sequence.length - 1; i++) {
    const start = sequence[i]
    const end = sequence[i + 1]
    const startKey = start.id || `default-${start.marker_type}`
    const endKey = end.id || `default-${end.marker_type}`

    const startLive = livePositions.get(startKey)
    const endLive = livePositions.get(endKey)

    const startLat = startLive ? startLive.lat : Number(start.lat)
    const startLng = startLive ? startLive.lng : Number(start.long ?? start.lng)
    const endLat = endLive ? endLive.lat : Number(end.lat)
    const endLng = endLive ? endLive.lng : Number(end.long ?? end.lng)

    const polyline = polylineRefs[i]
    const label = labelRefs[i]
    const dispersion = dispersionRefs[i]

    if (polyline) {
      polyline.setLatLngs([[startLat, startLng], [endLat, endLng]])
    }

    const yards = Math.round(haversineDistanceYards(startLat, startLng, endLat, endLng))
    if (label) {
      label.setLatLng([(startLat + endLat) / 2, (startLng + endLng) / 2])
      label.setIcon(buildYardsLabel(yards))
    }

    if (dispersion) {
      const club = getRecommendedClub(yards, clubs)
      if (club) {
        const bearing = getBearing(startLat, startLng, endLat, endLng)
        const polyPoints = getDispersionPolygon(
          { lat: endLat, lng: endLng },
          bearing,
          club,
          profile?.handedness || 'Right',
        )
        dispersion.setLatLngs(polyPoints)
        dispersion.setStyle({ color: club.color, fillColor: club.color, opacity: 0.6, fillOpacity: 0.25 })
      } else {
        dispersion.setLatLngs([])
      }
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HoleMapPoints({
  selectedHole,
  activePointTool,
  onPick,
  onMarkerMove,
  onMapMarkerMove,
  suppressHoleMapPick,
  workspaceMode = 'mapping',
  clubs = [],
  profile = null,
}) {
  const map = useMap()

  const teeIcon    = useMemo(() => buildTeeDivIcon(), [])
  const greenIcon  = useMemo(() => buildGreenDivIcon(), [])
  const teeShotIcon = useMemo(() => buildTeeShotDivIcon(), [])
  const pinIcon    = useMemo(() => buildPinDivIcon(), [])

  // Refs to the Leaflet polyline / label instances for imperative updates during drag
  const polylineRefs = useRef([])
  const labelRefs    = useRef([])
  const dispersionRefs = useRef([])

  // Live positions during drag — plain Map (not React state), so no re-renders
  const livePositions = useRef(new Map())

  const planningSequence = useMemo(
    () => resolvePlanningMarkers(selectedHole),
    [selectedHole],
  )

  // Clear live positions when hole changes
  useEffect(() => {
    livePositions.current = new Map()
  }, [selectedHole?.id])

  // Cursor
  useEffect(() => {
    const el = map.getContainer()
    el.style.cursor = (activePointTool && !suppressHoleMapPick) ? 'crosshair' : ''
    return () => { el.style.cursor = '' }
  }, [map, activePointTool, suppressHoleMapPick])

  useMapEvents({
    click(e) {
      if (suppressHoleMapPick || !activePointTool || !selectedHole) return
      const lat = Math.round(e.latlng.lat * 1e6) / 1e6
      const lng = Math.round(e.latlng.lng * 1e6) / 1e6
      onPick(activePointTool, lat, lng)
    },
  })

  // ── Planning marker drag handlers ──────────────────────────────────────────
  // `drag` only updates polylines imperatively (no network). API + DB run on `dragend` only.

  const handlePlanningDrag = useCallback((marker, e) => {
    const key = marker.id || `default-${marker.marker_type}`
    livePositions.current.set(key, e.latlng)
    updateLinesImperative(
      planningSequence,
      livePositions.current,
      polylineRefs.current,
      labelRefs.current,
      dispersionRefs.current,
      clubs,
      profile,
    )
  }, [planningSequence, clubs, profile])

  const handlePlanningDragEnd = useCallback((marker, e) => {
    const latlng = e.target.getLatLng()
    const lat = Math.round(latlng.lat * 1e6) / 1e6
    const lng = Math.round(latlng.lng * 1e6) / 1e6

    if (marker.id) {
      onMarkerMove(marker.id, lat, lng)
    } else {
      // Default marker — save it as a new planning marker (optimistic + background sync in useHoles)
      onPick(marker.marker_type, lat, lng)
    }

    // Clear the live override so React's updated state takes over display
    const key = marker.id || `default-${marker.marker_type}`
    livePositions.current.delete(key)
  }, [onMarkerMove, onPick])

  // ── Map marker drag handlers ───────────────────────────────────────────────

  const handleMapMarkerDragEnd = useCallback((kind, e) => {
    const latlng = e.target.getLatLng()
    const lat = Math.round(latlng.lat * 1e6) / 1e6
    const lng = Math.round(latlng.lng * 1e6) / 1e6
    onMapMarkerMove(kind, lat, lng)
  }, [onMapMarkerMove])

  // ── Compute initial segment data for first render ──────────────────────────

  const initialSegments = useMemo(() => {
    const segs = []
    for (let i = 0; i < planningSequence.length - 1; i++) {
      const start = planningSequence[i]
      const end = planningSequence[i + 1]
      const startLng = Number(start.long ?? start.lng)
      const endLng = Number(end.long ?? end.lng)
      const yards = Math.round(
        haversineDistanceYards(Number(start.lat), startLng, Number(end.lat), endLng),
      )

        const club = getRecommendedClub(yards, clubs)
        let dispersionPoints = []
        if (club) {
          const bearing = getBearing(Number(start.lat), startLng, Number(end.lat), endLng)
          dispersionPoints = getDispersionPolygon(
            { lat: Number(end.lat), lng: endLng },
            bearing,
            club,
            profile?.handedness || 'Right',
          )
        }

        segs.push({
          positions: [[Number(start.lat), startLng], [Number(end.lat), endLng]],
          midpoint: [(Number(start.lat) + Number(end.lat)) / 2, (startLng + endLng) / 2],
          yards,
          dispersionPoints,
          clubColor: club?.color || '#3b82f6',
        })
      }
      return segs
    }, [planningSequence, clubs, profile])

  if (!selectedHole) return null

  // ── Mapping mode ───────────────────────────────────────────────────────────

  if (workspaceMode === 'mapping') {
    const green = activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER)
    const tee   = activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.TEE_BACK)
    return (
      <>
        {tee && (
          <Marker
            position={[Number(tee.lat), Number(tee.lng)]}
            icon={teeIcon}
            draggable={!activePointTool}
            keyboard={false}
            autoPan={false}
            eventHandlers={{
              dragend: (e) => {
                handleMapMarkerDragEnd(HOLE_MARKER_KIND.TEE_BACK, e)
              },
            }}
          />
        )}
        {green && (
          <Marker
            position={[Number(green.lat), Number(green.lng)]}
            icon={greenIcon}
            draggable={!activePointTool}
            keyboard={false}
            autoPan={false}
            eventHandlers={{
              dragend: (e) => {
                handleMapMarkerDragEnd(HOLE_MARKER_KIND.GREEN_CENTER, e)
              },
            }}
          />
        )}
      </>
    )
  }

  // ── Planning / Strategist mode ─────────────────────────────────────────────

  return (
    <>
      {/* Polylines + distance labels — rendered with React but updated imperatively during drag */}
      {initialSegments.map((seg, idx) => (
        <React.Fragment key={`seg-${idx}`}>
          <Polyline
            positions={seg.positions}
            pathOptions={{ color: '#ffffff', weight: 3, opacity: 0.6, dashArray: '5, 8' }}
            interactive={false}
            ref={(el) => {
              // el is the React-Leaflet Polyline component; get the underlying Leaflet layer
              if (el) polylineRefs.current[idx] = el
            }}
          />
          <Marker
            position={seg.midpoint}
            icon={buildYardsLabel(seg.yards)}
            interactive={false}
            keyboard={false}
            ref={(el) => {
              if (el) labelRefs.current[idx] = el
            }}
          />
          <Polygon
            positions={seg.dispersionPoints}
            pathOptions={{
              color: seg.clubColor,
              fillColor: seg.clubColor,
              weight: 1,
              opacity: seg.dispersionPoints.length > 0 ? 0.6 : 0,
              fillOpacity: seg.dispersionPoints.length > 0 ? 0.25 : 0,
            }}
            interactive={false}
            ref={(el) => {
              if (el) dispersionRefs.current[idx] = el
            }}
          />
        </React.Fragment>
      ))}

      {/* Planning markers — draggable, position prop NEVER changes during drag */}
      {planningSequence.map((m, idx) => {
        const lng = Number(m.long ?? m.lng)
        let icon
        if (m.marker_type === 'tee_shot_location') {
          icon = teeShotIcon
        } else if (m.marker_type === 'pin_location') {
          icon = pinIcon
        } else {
          const landingIdx = planningSequence
            .slice(0, idx + 1)
            .filter(x => x.marker_type === 'landing_area').length
          icon = getMemoizedLandingIcon(landingIdx)
        }

        return (
          <Marker
            key={m.id || `default-${m.marker_type}`}
            position={[Number(m.lat), lng]}
            icon={icon}
            draggable={!activePointTool}
            keyboard={false}
            autoPan={false}
            eventHandlers={{
              drag:    (e) => handlePlanningDrag(m, e),
              dragend: (e) => {
                handlePlanningDragEnd(m, e)
              },
            }}
          />
        )
      })}
    </>
  )
}
