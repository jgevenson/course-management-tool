// AI assisted development
import { useEffect, useMemo } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Crosshair, FlagTriangleLeft, MapPin, Navigation2, Zap } from 'lucide-react'
import L from 'leaflet'
import { Marker, Polyline, useMap, useMapEvents } from 'react-leaflet'
import { haversineDistanceYards } from '../utils/geoDistance'
import { HOLE_MARKER_KIND, activeMarkerLatLng } from '../utils/holeMarkers'

const TEE_ICON_SIZE = [20, 26]
const GREEN_ICON_SIZE = [20, 22]
const TEE_SHOT_ICON_SIZE = [24, 24]
const FIRST_SHOT_ICON_SIZE = [24, 24]
const SECOND_SHOT_ICON_SIZE = [24, 24]

function buildTeeDivIcon() {
  const html = renderToStaticMarkup(
    <MapPin size={18} strokeWidth={2.25} className="text-amber-400" fill="#fbbf24" color="#f59e0b" />,
  )
  return L.divIcon({
    html: `<div class="leaflet-hole-marker-inner" style="display:flex;justify-content:center;width:${TEE_ICON_SIZE[0]}px;height:${TEE_ICON_SIZE[1]}px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: TEE_ICON_SIZE,
    iconAnchor: [TEE_ICON_SIZE[0] / 2, TEE_ICON_SIZE[1]],
  })
}

function buildGreenDivIcon() {
  const html = renderToStaticMarkup(
    <FlagTriangleLeft size={17} strokeWidth={2.25} className="text-emerald-400" fill="#34d399" color="#10b981" />,
  )
  return L.divIcon({
    html: `<div class="leaflet-hole-marker-inner" style="display:flex;justify-content:center;align-items:flex-end;width:${GREEN_ICON_SIZE[0]}px;height:${GREEN_ICON_SIZE[1]}px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: GREEN_ICON_SIZE,
    iconAnchor: [GREEN_ICON_SIZE[0] / 2, GREEN_ICON_SIZE[1]],
  })
}

function buildTeeShotDivIcon() {
  const html = renderToStaticMarkup(
    <Crosshair size={20} strokeWidth={2.5} className="text-sky-400" color="#38bdf8" />,
  )
  return L.divIcon({
    html: `<div class="leaflet-hole-marker-inner" style="display:flex;justify-content:center;align-items:center;width:${TEE_SHOT_ICON_SIZE[0]}px;height:${TEE_SHOT_ICON_SIZE[1]}px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: TEE_SHOT_ICON_SIZE,
    iconAnchor: [TEE_SHOT_ICON_SIZE[0] / 2, TEE_SHOT_ICON_SIZE[1] / 2],
  })
}

function buildFirstShotDivIcon() {
  const html = renderToStaticMarkup(
    <Zap size={19} strokeWidth={2.35} className="text-violet-400" fill="#a78bfa" color="#7c3aed" />,
  )
  return L.divIcon({
    html: `<div class="leaflet-hole-marker-inner" style="display:flex;justify-content:center;align-items:center;width:${FIRST_SHOT_ICON_SIZE[0]}px;height:${FIRST_SHOT_ICON_SIZE[1]}px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: FIRST_SHOT_ICON_SIZE,
    iconAnchor: [FIRST_SHOT_ICON_SIZE[0] / 2, FIRST_SHOT_ICON_SIZE[1] / 2],
  })
}

function buildSecondShotDivIcon() {
  const html = renderToStaticMarkup(
    <Navigation2 size={18} strokeWidth={2.35} className="text-amber-400" color="#fbbf24" />,
  )
  return L.divIcon({
    html: `<div class="leaflet-hole-marker-inner" style="display:flex;justify-content:center;align-items:center;width:${SECOND_SHOT_ICON_SIZE[0]}px;height:${SECOND_SHOT_ICON_SIZE[1]}px">${html}</div>`,
    className: 'leaflet-hole-marker',
    iconSize: SECOND_SHOT_ICON_SIZE,
    iconAnchor: [SECOND_SHOT_ICON_SIZE[0] / 2, SECOND_SHOT_ICON_SIZE[1] / 2],
  })
}

/**
 * @param {number} yards Rounded display yards
 */
function buildYardsLabelDivIcon(yards) {
  const html = `<div style="padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,0.82);border:1px solid rgba(255,255,255,0.35);white-space:nowrap;pointer-events:none">${yards}&nbsp;yd</div>`
  return L.divIcon({
    html,
    className: 'leaflet-hole-marker leaflet-distance-label',
    iconSize: [64, 22],
    iconAnchor: [32, 11],
  })
}

export default function HoleMapPoints({
  selectedHole,
  activePointTool,
  onPick,
  suppressHoleMapPick,
  workspaceMode = 'mapping',
}) {
  const map = useMap()

  const teeIcon = useMemo(() => buildTeeDivIcon(), [])
  const greenIcon = useMemo(() => buildGreenDivIcon(), [])
  const teeShotIcon = useMemo(() => buildTeeShotDivIcon(), [])
  const firstShotIcon = useMemo(() => buildFirstShotDivIcon(), [])
  const secondShotIcon = useMemo(() => buildSecondShotDivIcon(), [])

  useMapEvents({
    click(e) {
      if (suppressHoleMapPick || !activePointTool || !selectedHole) return
      const lat = Math.round(e.latlng.lat * 1e6) / 1e6
      const lng = Math.round(e.latlng.lng * 1e6) / 1e6
      onPick(activePointTool, lat, lng)
    },
  })

  useEffect(() => {
    const el = map.getContainer()
    if (activePointTool && !suppressHoleMapPick) {
      el.style.cursor = 'crosshair'
    } else {
      el.style.cursor = ''
    }
    return () => {
      el.style.cursor = ''
    }
  }, [map, activePointTool, suppressHoleMapPick])

  const green = selectedHole
    ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER)
    : null
  const tee = selectedHole ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.TEE_BACK) : null
  const teeShot = selectedHole
    ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.TEE_SHOT_LOCATION)
    : null
  const firstShot = selectedHole
    ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.FIRST_SHOT_LOCATION)
    : null
  const secondShot = selectedHole
    ? activeMarkerLatLng(selectedHole, HOLE_MARKER_KIND.SECOND_SHOT_LOCATION)
    : null
  const showTeeMarker = workspaceMode !== 'planning'

  /**
   * Tee → explicit first landing, OR tee → green center when first shot is unset
   * (short holes: implied target is the flag / green center).
   */
  const teeToFirstLandingLinePositions =
    teeShot && firstShot
      ? [
          [Number(teeShot.lat), Number(teeShot.lng)],
          [Number(firstShot.lat), Number(firstShot.lng)],
        ]
      : teeShot && green && !firstShot
        ? [
            [Number(teeShot.lat), Number(teeShot.lng)],
            [Number(green.lat), Number(green.lng)],
          ]
        : null

  const yardsTeeToFirstLandingRounded =
    teeShot && firstShot
      ? Math.round(
          haversineDistanceYards(
            Number(teeShot.lat),
            Number(teeShot.lng),
            Number(firstShot.lat),
            Number(firstShot.lng),
          ),
        )
      : teeShot && green && !firstShot
        ? Math.round(
            haversineDistanceYards(
              Number(teeShot.lat),
              Number(teeShot.lng),
              Number(green.lat),
              Number(green.lng),
            ),
          )
        : null

  const midpointTeeToFirstLandingIcon = useMemo(() => {
    if (yardsTeeToFirstLandingRounded == null) return null
    return buildYardsLabelDivIcon(yardsTeeToFirstLandingRounded)
  }, [yardsTeeToFirstLandingRounded])

  const midpointTeeToFirstLandingPosition =
    teeShot && firstShot
      ? [
          (Number(teeShot.lat) + Number(firstShot.lat)) / 2,
          (Number(teeShot.lng) + Number(firstShot.lng)) / 2,
        ]
      : teeShot && green && !firstShot
        ? [
            (Number(teeShot.lat) + Number(green.lat)) / 2,
            (Number(teeShot.lng) + Number(green.lng)) / 2,
          ]
        : null

  /** First shot → second shot (optional) */
  const firstToSecondLinePositions =
    firstShot && secondShot
      ? [
          [Number(firstShot.lat), Number(firstShot.lng)],
          [Number(secondShot.lat), Number(secondShot.lng)],
        ]
      : null

  const yardsFirstToSecondRounded =
    firstShot && secondShot
      ? Math.round(
          haversineDistanceYards(
            Number(firstShot.lat),
            Number(firstShot.lng),
            Number(secondShot.lat),
            Number(secondShot.lng),
          ),
        )
      : null

  const midpointFirstToSecondIcon = useMemo(() => {
    if (yardsFirstToSecondRounded == null) return null
    return buildYardsLabelDivIcon(yardsFirstToSecondRounded)
  }, [yardsFirstToSecondRounded])

  const midpointFirstToSecondPosition =
    firstShot && secondShot
      ? [
          (Number(firstShot.lat) + Number(secondShot.lat)) / 2,
          (Number(firstShot.lng) + Number(secondShot.lng)) / 2,
        ]
      : null

  /**
   * After an explicit first-shot point only: second → green, or first → green.
   * When first shot is omitted (short hole), tee→green above already ends at the flag — no duplicate leg.
   */
  const intoGreenLinePositions =
    !firstShot || !green
      ? null
      : secondShot
        ? [
            [Number(secondShot.lat), Number(secondShot.lng)],
            [Number(green.lat), Number(green.lng)],
          ]
        : [
            [Number(firstShot.lat), Number(firstShot.lng)],
            [Number(green.lat), Number(green.lng)],
          ]

  const yardsIntoGreenRounded =
    !firstShot
      ? null
      : green && secondShot
        ? Math.round(
            haversineDistanceYards(
              Number(secondShot.lat),
              Number(secondShot.lng),
              Number(green.lat),
              Number(green.lng),
            ),
          )
        : green && firstShot && !secondShot
          ? Math.round(
              haversineDistanceYards(
                Number(firstShot.lat),
                Number(firstShot.lng),
                Number(green.lat),
                Number(green.lng),
              ),
            )
          : null

  const midpointIntoGreenIcon = useMemo(() => {
    if (yardsIntoGreenRounded == null) return null
    return buildYardsLabelDivIcon(yardsIntoGreenRounded)
  }, [yardsIntoGreenRounded])

  const midpointIntoGreenPosition =
    !firstShot
      ? null
      : green && secondShot
        ? [
            (Number(secondShot.lat) + Number(green.lat)) / 2,
            (Number(secondShot.lng) + Number(green.lng)) / 2,
          ]
        : green && firstShot && !secondShot
          ? [
              (Number(firstShot.lat) + Number(green.lat)) / 2,
              (Number(firstShot.lng) + Number(green.lng)) / 2,
            ]
          : null

  if (!selectedHole) return null

  return (
    <>
      {teeToFirstLandingLinePositions && (
        <Polyline
          positions={teeToFirstLandingLinePositions}
          pathOptions={{ color: '#000000', weight: 2, opacity: 1 }}
          interactive={false}
        />
      )}
      {midpointTeeToFirstLandingPosition && midpointTeeToFirstLandingIcon && (
        <Marker
          position={midpointTeeToFirstLandingPosition}
          icon={midpointTeeToFirstLandingIcon}
          interactive={false}
        />
      )}
      {firstToSecondLinePositions && (
        <Polyline
          positions={firstToSecondLinePositions}
          pathOptions={{ color: '#000000', weight: 2, opacity: 1 }}
          interactive={false}
        />
      )}
      {midpointFirstToSecondPosition && midpointFirstToSecondIcon && (
        <Marker position={midpointFirstToSecondPosition} icon={midpointFirstToSecondIcon} interactive={false} />
      )}
      {intoGreenLinePositions && (
        <Polyline
          positions={intoGreenLinePositions}
          pathOptions={{ color: '#000000', weight: 2, opacity: 1 }}
          interactive={false}
        />
      )}
      {midpointIntoGreenPosition && midpointIntoGreenIcon && (
        <Marker position={midpointIntoGreenPosition} icon={midpointIntoGreenIcon} interactive={false} />
      )}
      {tee && showTeeMarker && (
        <Marker
          position={[Number(tee.lat), Number(tee.lng)]}
          icon={teeIcon}
          interactive={false}
        />
      )}
      {green && (
        <Marker
          position={[Number(green.lat), Number(green.lng)]}
          icon={greenIcon}
          interactive={false}
        />
      )}
      {teeShot && (
        <Marker
          position={[Number(teeShot.lat), Number(teeShot.lng)]}
          icon={teeShotIcon}
          interactive={false}
        />
      )}
      {firstShot && (
        <Marker
          position={[Number(firstShot.lat), Number(firstShot.lng)]}
          icon={firstShotIcon}
          interactive={false}
        />
      )}
      {secondShot && (
        <Marker
          position={[Number(secondShot.lat), Number(secondShot.lng)]}
          icon={secondShotIcon}
          interactive={false}
        />
      )}
    </>
  )
}
