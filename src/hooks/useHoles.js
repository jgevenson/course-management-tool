import { useState, useCallback, useEffect } from 'react'
import { mapApi } from '../services/api/mapApi'
import { HOLE_MARKER_KIND } from '../features/map/utils/holeMarkers'

/**
 * Manages holes, markers, and hole stats for the map editor.
 */
export function useHoles(courseId) {
  const [holes, setHoles] = useState([])
  const [holesLoading, setHolesLoading] = useState(false)
  const [selectedHoleIndex, setSelectedHoleIndex] = useState(0)
  const [statsSaving, setStatsSaving] = useState(false)
  const [statsMessage, setStatsMessage] = useState(null)
  const [markerMessage, setMarkerMessage] = useState(null)
  const [removePlanningSaving, setRemovePlanningSaving] = useState(false)
  const [removePlanningMessage, setRemovePlanningMessage] = useState(null)
  const [autoRotateHoleView, setAutoRotateHoleView] = useState(false)

  // Load holes + markers when courseId changes
  useEffect(() => {
    if (!courseId) return

    let cancelled = false

    async function load() {
      setHolesLoading(true)
      try {
        const merged = await mapApi.fetchHolesWithMarkers(courseId)
        if (!cancelled) {
          setHoles(merged)
          setSelectedHoleIndex((i) => Math.min(i, Math.max(0, merged.length - 1)))
        }
      } catch (err) {
        if (!cancelled) {
          setHoles([])
          setMarkerMessage(err.message)
        }
      } finally {
        if (!cancelled) setHolesLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      setHoles([])
    }
  }, [courseId])

  const selectedHole = holes[selectedHoleIndex] ?? null

  const selectHoleIndex = useCallback((idx) => {
    setSelectedHoleIndex(idx)
  }, [])

  /**
   * Place or move a map marker for the currently selected hole.
   * Returns the saved marker data on success, or null on failure.
   */
  const placeMarker = useCallback(
    async (tool, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole) return null
      setMarkerMessage(null)

      let marker_kind
      if (tool === 'green_center') marker_kind = HOLE_MARKER_KIND.GREEN_CENTER
      else if (tool === 'tee_back') marker_kind = HOLE_MARKER_KIND.TEE_BACK
      else if (tool === 'tee_shot_location') marker_kind = HOLE_MARKER_KIND.TEE_SHOT_LOCATION
      else if (tool === 'first_shot_location') marker_kind = HOLE_MARKER_KIND.FIRST_SHOT_LOCATION
      else if (tool === 'second_shot_location') marker_kind = HOLE_MARKER_KIND.SECOND_SHOT_LOCATION
      else return null

      try {
        const data = await mapApi.upsertHoleMarker(hole.id, marker_kind, lat, lng)

        setHoles((prev) =>
          prev.map((h) => {
            if (h.id !== hole.id) return h
            const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== marker_kind)
            return { ...h, mapMarkers: [...rest, data] }
          }),
        )
        return data
      } catch (err) {
        setMarkerMessage(err.message)
        return null
      }
    },
    [holes, selectedHoleIndex],
  )

  /**
   * Remove planning markers (cascading: tee_shot removes first+second too).
   */
  const removePlanningMarker = useCallback(
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

      try {
        await mapApi.deactivateMarkers(hole.id, kindsToClear)

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
      } catch (err) {
        setRemovePlanningMessage(err.message)
      } finally {
        setRemovePlanningSaving(false)
      }
    },
    [holes, selectedHoleIndex],
  )

  /**
   * Save hole stats (par, stroke index, scorecard yardage).
   */
  const saveHoleStats = useCallback(
    async (holeId, payload) => {
      setStatsSaving(true)
      setStatsMessage(null)

      const holeRow = holes.find((h) => h.id === holeId)

      try {
        await mapApi.saveHoleStats(holeId, payload, holeRow?.course_id)

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
        window.setTimeout(() => setStatsMessage(null), 2500)
      } catch (err) {
        setStatsMessage(err.message)
      } finally {
        setStatsSaving(false)
      }
    },
    [holes],
  )

  return {
    holes,
    holesLoading,
    selectedHoleIndex,
    selectedHole,
    selectHoleIndex,
    placeMarker,
    removePlanningMarker,
    saveHoleStats,
    statsSaving,
    statsMessage,
    markerMessage,
    removePlanningSaving,
    removePlanningMessage,
    autoRotateHoleView,
    setAutoRotateHoleView,
  }
}
