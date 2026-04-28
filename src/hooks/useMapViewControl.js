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

  const lastNavigatedHoleIndex = useRef(-1)

  // Reset navigation tracking when course changes
  useEffect(() => {
    if (course?.id) {
      lastNavigatedHoleIndex.current = -1
    }
  }, [course?.id])

  // Fly to hole on navigation change
  useEffect(() => {
    if (!mapInstance || !holes || holes.length === 0) return
    const sh = holes[selectedHoleIndex]
    if (!sh) return

    const g = activeMarkerLatLng(sh, HOLE_MARKER_KIND.GREEN_CENTER)
    const t = activeMarkerLatLng(sh, HOLE_MARKER_KIND.TEE_BACK)
    const useAutoFrame = Boolean(autoRotateHoleView && g && t)

    const navChanged = lastNavigatedHoleIndex.current !== selectedHoleIndex
    if (!navChanged) return
    lastNavigatedHoleIndex.current = selectedHoleIndex

    if (useAutoFrame) return // auto-rotate effect handles framing

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
  }, [mapInstance, selectedHoleIndex, holes, course, autoRotateHoleView])

  // Auto-rotate: fit bounds tee-bottom / green-top
  useEffect(() => {
    if (!mapInstance || holesLoading || typeof mapInstance.setBearing !== 'function') return

    const sh = holes?.[selectedHoleIndex]
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

  return {
    autoRotateHoleView: autoRotateHoleView ?? false,
    setAutoRotateHoleView: setAutoRotateHoleView ?? (() => {}),
  }
}
