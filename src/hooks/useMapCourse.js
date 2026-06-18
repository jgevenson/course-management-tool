import { useState, useCallback, useEffect, useMemo } from 'react'
import { mapApi } from '../services/api/mapApi'

const US_CENTER = [39.8283, -98.5795]
const US_ZOOM = 4
const COURSE_ZOOM = 16

/**
 * Manages course data for the map editor.
 * Handles loading the course by route param and saving map-center location.
 */
export function useMapCourse(courseId) {
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(courseId))
  const [fetchError, setFetchError] = useState(null)
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationFeedback, setLocationFeedback] = useState(null)

  // Load course on mount / id change
  useEffect(() => {
    if (!courseId) return

    let cancelled = false

    async function load() {
      setLoading(true)
      setFetchError(null)
      setCourse(null)

      try {
        const data = await mapApi.fetchCourseForMap(courseId)
        if (!cancelled) setCourse(data)
      } catch (err) {
        if (!cancelled) {
          setFetchError(err.message)
          setCourse(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [courseId])

  // Save current map center as the course location
  const saveCourseLocation = useCallback(async (mapInstance) => {
    if (!mapInstance || !course?.id) return
    setSavingLocation(true)
    setLocationFeedback(null)

    try {
      const { lat, lng } = mapInstance.getCenter()
      const coords = await mapApi.saveCourseLocation(course.id, lat, lng)

      setCourse((c) => (c ? { ...c, ...coords } : c))
      if (typeof mapInstance.setView === 'function') {
        mapInstance.setView([coords.course_lat, coords.course_lng], COURSE_ZOOM)
      } else if (typeof mapInstance.jumpTo === 'function') {
        mapInstance.jumpTo({ center: [coords.course_lng, coords.course_lat], zoom: COURSE_ZOOM })
      }
      if (typeof mapInstance.setBearing === 'function') {
        mapInstance.setBearing(0)
      }
      setLocationFeedback('Location saved')
      window.setTimeout(() => setLocationFeedback(null), 2500)
    } catch (err) {
      setLocationFeedback(err.message)
    } finally {
      setSavingLocation(false)
    }
  }, [course])

  // Derived map center / zoom
  const mapPosition = useMemo(() => {
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

  return {
    course,
    loading,
    fetchError,
    savingLocation,
    locationFeedback,
    saveCourseLocation,
    ...mapPosition,
  }
}
