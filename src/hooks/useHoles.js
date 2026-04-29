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

      // Handle map markers
      if (tool === 'green_center' || tool === 'tee_back') {
        const marker_kind = tool === 'green_center' ? HOLE_MARKER_KIND.GREEN_CENTER : HOLE_MARKER_KIND.TEE_BACK
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
      }

      // Handle planning markers
      let markerType
      let sequenceOrder
      if (tool === 'tee_shot_location') {
        markerType = 'tee_shot_location'
        sequenceOrder = 0
      } else if (tool === 'pin_location') {
        markerType = 'pin_location'
        sequenceOrder = 99
      } else if (tool === 'landing_area') {
        markerType = 'landing_area'
        // Find next sequence order for landing areas (1, 2, 3...)
        const landingAreas = (hole.planningMarkers ?? []).filter(m => m.marker_type === 'landing_area')
        sequenceOrder = landingAreas.length + 1
      } else {
        return null
      }

      try {
        const data = await mapApi.upsertPlanningMarker(hole.id, markerType, sequenceOrder, lat, lng)

        setHoles((prev) =>
          prev.map((h) => {
            if (h.id !== hole.id) return h
            let newMarkers
            if (markerType === 'landing_area') {
              newMarkers = [...(h.planningMarkers ?? []), data]
            } else {
              const rest = (h.planningMarkers ?? []).filter((m) => m.marker_type !== markerType)
              newMarkers = [...rest, data]
            }
            return { ...h, planningMarkers: newMarkers.sort((a, b) => a.sequence_order - b.sequence_order) }
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
   * Remove a planning marker by ID (hard delete).
   */
  const removePlanningMarker = useCallback(
    async (markerId) => {
      const hole = holes[selectedHoleIndex]
      if (!hole?.id) return
      setRemovePlanningSaving(true)
      setRemovePlanningMessage(null)

      try {
        await mapApi.deletePlanningMarker(markerId)

        setHoles((prev) =>
          prev.map((h) => {
            if (h.id !== hole.id) return h
            return {
              ...h,
              planningMarkers: (h.planningMarkers ?? []).filter((m) => m.id !== markerId),
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
   * Move an existing planning marker (hard-saved in DB).
   */
  const movePlanningMarker = useCallback(
    async (markerId, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole?.id) return

      try {
        const data = await mapApi.movePlanningMarker(markerId, lat, lng)

        setHoles((prev) =>
          prev.map((h) => {
            if (h.id !== hole.id) return h
            return {
              ...h,
              planningMarkers: (h.planningMarkers ?? []).map((m) =>
                m.id === markerId ? data : m
              ),
            }
          }),
        )
      } catch (err) {
        setMarkerMessage(err.message)
      }
    },
    [holes, selectedHoleIndex],
  )

  /**
   * Move a map marker (reference point).
   */
  const moveMapMarker = useCallback(
    async (markerKind, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole?.id) return

      try {
        const data = await mapApi.upsertHoleMarker(hole.id, markerKind, lat, lng)

        setHoles((prev) =>
          prev.map((h) => {
            if (h.id !== hole.id) return h
            const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== markerKind)
            return { ...h, mapMarkers: [...rest, data] }
          }),
        )
      } catch (err) {
        setMarkerMessage(err.message)
      }
    },
    [holes, selectedHoleIndex],
  )
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
    movePlanningMarker,
    moveMapMarker,
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
