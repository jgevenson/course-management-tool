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

    if (useAutoFrame) {
      // The auto-rotate effect (below) will handle framing if autoRotateHoleView is on
      return
    }

    if (g) {
      mapInstance.flyTo([g.lat, g.lng], 17)
      return
    }
    if (t) {
      mapInstance.flyTo([t.lat, t.lng], 17)
      return
    }
    if (course && course.course_lat !== 0) {
      mapInstance.flyTo([course.course_lat, course.course_lng], 16)
    }
  }, [mapInstance, selectedHoleIndex, holesLoading, course, autoRotateHoleView])

  // Auto-rotate: fit bounds tee-bottom / green-top
  useEffect(() => {
    if (!mapInstance || holesLoading || typeof mapInstance.setBearing !== 'function' || !holes) return

    const sh = holes[selectedHoleIndex]
    if (!sh) return
    
    // We only want to auto-rotate/fit-bounds when we first arrive at the hole
    // or when the toggle is turned ON.
    // We'll use a local ref to track if we've already rotated for THIS hole.
    // Actually, we can check if navChanged happened in a different way or just
    // only trigger this when the hole ID or toggle changes.
    
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

    mapInstance.invalidateSize()
    const bounds = L.latLngBounds(
      L.latLng(tee.lat, tee.lng),
      L.latLng(green.lat, green.lng),
    )
    
    // Use animate: false to avoid jitter while navigating, 
    // and only do it if the hole just changed.
    mapInstance.fitBounds(bounds, {
      padding: [44, 72, 88, 72],
      maxZoom: MAP_MAX_ZOOM,
      animate: false,
    })
    
    const lineBearing = bearingDegrees(tee.lat, tee.lng, green.lat, green.lng)
    mapInstance.setBearing(mapBearingForTeeBottomGreenTop(lineBearing))
  }, [mapInstance, autoRotateHoleView, selectedHoleIndex, holesLoading])

  return {
    autoRotateHoleView: autoRotateHoleView ?? false,
    setAutoRotateHoleView: setAutoRotateHoleView ?? (() => {}),
  }
}
