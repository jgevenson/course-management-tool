// AI assisted development
import { useCallback, useEffect, useRef } from 'react'
import L from 'leaflet'
import { HOLE_MARKER_KIND, activeMarkerLatLng } from '../features/map/utils/holeMarkers'
import { bearingDegrees, mapBearingForTeeBottomGreenTop } from '../features/map/utils/holeViewBearing'

const MAP_MAX_ZOOM = 22

/**
 * Controls map view: fly-to on hole change, auto-rotate bearing.
 *
 * @param {L.Map | null} mapInstance
 * @param {object} holesState - from useHoles
 * @param {object | null} course - from useMapCourse
 */
export function useMapViewControl(mapInstance, holesState, course) {
  const { holes, selectedHoleIndex, holesLoading, autoRotateHoleView, setAutoRotateHoleView } =
    holesState ?? {}

  const lastNavigatedHoleId = useRef(null)
  const lastAutoFittedHoleId = useRef(null)
  const lastAutoRotateValue = useRef(false)

  // Fly to hole on navigation change
  useEffect(() => {
    if (!mapInstance || !holes || holes.length === 0 || holesLoading) return
    const sh = holes[selectedHoleIndex]
    if (!sh) return

    const navChanged = lastNavigatedHoleId.current !== sh.id
    if (!navChanged) return
    lastNavigatedHoleId.current = sh.id

    const g = activeMarkerLatLng(sh, HOLE_MARKER_KIND.GREEN_CENTER)
    const t = activeMarkerLatLng(sh, HOLE_MARKER_KIND.TEE_BACK)
    const useAutoFrame = Boolean(autoRotateHoleView && g && t)

    if (useAutoFrame) return

    if (g) {
      mapInstance.flyTo([g.lat, g.lng], 17)
    } else if (t) {
      mapInstance.flyTo([t.lat, t.lng], 17)
    } else if (course && course.course_lat !== 0) {
      mapInstance.flyTo([course.course_lat, course.course_lng], 16)
    }
  }, [mapInstance, selectedHoleIndex, holesLoading, course, autoRotateHoleView, holes])

  // Auto-rotate: fit bounds tee-bottom / green-top
  useEffect(() => {
    if (!mapInstance || holesLoading || !holes || holes.length === 0) return
    if (typeof mapInstance.setBearing !== 'function') return

    const sh = holes[selectedHoleIndex]
    if (!sh) return

    // Guard: only re-fit if the hole changed or the mode was toggled
    const holeChanged = lastAutoFittedHoleId.current !== sh.id
    const toggleChanged = lastAutoRotateValue.current !== autoRotateHoleView
    if (!holeChanged && !toggleChanged) return

    lastAutoFittedHoleId.current = sh.id
    lastAutoRotateValue.current = autoRotateHoleView

    if (!autoRotateHoleView) {
      mapInstance.setBearing(0)
      return
    }

    const tee = activeMarkerLatLng(sh, HOLE_MARKER_KIND.TEE_BACK)
    const green = activeMarkerLatLng(sh, HOLE_MARKER_KIND.GREEN_CENTER)
    
    if (!tee || !green) {
      mapInstance.setBearing(0)
      return
    }

    // Immediate update sequence
    mapInstance.invalidateSize()
    mapInstance.setBearing(0, { animate: false })

    const bounds = L.latLngBounds(
      L.latLng(tee.lat, tee.lng),
      L.latLng(green.lat, green.lng),
    )
    
    mapInstance.fitBounds(bounds, {
      padding: [60, 60, 100, 60], // Ample padding
      maxZoom: MAP_MAX_ZOOM,
      animate: false,
    })
    
    const lineBearing = bearingDegrees(tee.lat, tee.lng, green.lat, green.lng)
    const targetBearing = mapBearingForTeeBottomGreenTop(lineBearing)
    mapInstance.setBearing(targetBearing, { animate: false })
  }, [mapInstance, autoRotateHoleView, selectedHoleIndex, holesLoading, holes])

  return {
    autoRotateHoleView: autoRotateHoleView ?? false,
    setAutoRotateHoleView: setAutoRotateHoleView ?? (() => {}),
  }
}
