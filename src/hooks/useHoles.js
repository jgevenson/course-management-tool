// AI assisted development
import { useState, useCallback, useEffect } from 'react'
import { mapApi } from '../services/api/mapApi'
import { HOLE_MARKER_KIND } from '../features/map/utils/holeMarkers'
import { fetchElevation } from '../features/map/utils/fetchElevation'

/**
 * ## useHoles Hook
 * 
 * A custom React hook for managing hole data for a specific course, providing an abstraction layer over 
 * the `mapApi` for fetching, updating, and removing holes and their associated markers.
 *
 * ### Responsibilities
 * - **State Management**: Manages the array of `holes`, `selectedHoleIndex`, loading status (`holesLoading`), 
 *   and various status states for different operations (`statsSaving`, `statsMessage`, `markerMessage`, 
 *   `removePlanningSaving`, `removePlanningMessage`).
 * - **Data Fetching**: Loads holes and their markers when the `courseId` changes, automatically selecting 
 *   the first hole or the last valid index.
 * - **Marker Operations**: Provides functions to place and remove both `mapMarkers` (like tee backs and green centers) 
 *   and `planningMarkers` (like tee shots, pins, and landing areas), handling optimistic UI updates and 
 *   background synchronization with the backend.
 * - **Elevation Handling**: Integrates with `fetchElevation` to automatically fetch elevation data for new 
 *   marker placements.
 * - **Side Effects**: Automatically refetches or updates hole data after successful mutations to ensure 
 *   the local state remains synchronized with the server.
 * - **Memoization**: Uses `useCallback` to memoize the CRUD and state-modifying functions, preventing unnecessary 
 *   re-renders in components that consume this hook.
 *
 * ### Usage Pattern
 * This hook is designed to be used within React components that require access to hole data, typically 
 * as a central data provider for a specific course's holes.
 * 
 * @param {string|null|undefined} courseId - The ID of the course whose holes are to be managed. 
 *        If falsy, the loading process is skipped.
 * @returns {Object} An object containing the `holes` array, `loading` status, `selectedHole`, 
 *          `selectHoleIndex` function, marker-related state and functions, statistics state and functions,
 *          and the `autoRotateHoleView` flag.
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
  const [autoRotateHoleView, setAutoRotateHoleView] = useState(true)

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
   * ## placeMarker Function
   * 
   * A callback function that handles the placement or updating of a map marker for the currently 
   * selected hole. It provides optimistic UI updates and schedules a background synchronization 
   * with the backend.
   *
   * ### Responsibilities
   * - **Marker Placement**: Supports two main categories of markers: `mapMarkers` (green center and tee back) 
   *   and `planningMarkers` (tee shot locations, pin locations, and landing areas).
   * - **Optimistic UI**: Updates the local state immediately to reflect the marker placement before 
   *   the backend operation completes.
   * - **Background Sync**: Initiates an asynchronous operation to persist the marker data to the backend 
   *   via `mapApi.upsertHoleMarker` or `mapApi.upsertPlanningMarker`.
   * - **Error Handling**: Catches errors during the backend operation and updates the `markerMessage` state.
   * - **Elevation Fetching**: Automatically fetches elevation data for the marker's coordinates using `fetchElevation`.
   * - **Sequence Management**: For landing area markers, it dynamically calculates the `sequence_order` 
   *   based on the number of existing landing area markers.
   *
   * ### Arguments
   * @param {string} tool - The type of tool used, determining the type of marker to place.
   * @param {number} lat - The latitude coordinate for the marker.
   * @param {number} lng - The longitude coordinate for the marker.
   *
   * @returns {Object|null} An object with an `ok: true` property if the operation was successful, `null` otherwise.
   */
  const placeMarker = useCallback(
    (tool, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole) return null
      setMarkerMessage(null)

      // Handle map markers
      if (tool === 'green_center' || tool === 'tee_back') {
        const marker_kind =
          tool === 'green_center' ? HOLE_MARKER_KIND.GREEN_CENTER : HOLE_MARKER_KIND.TEE_BACK

        setHoles((prev) =>
          prev.map((h) => {
            if (h.id !== hole.id) return h
            const existing = (h.mapMarkers ?? []).find((m) => m.marker_kind === marker_kind)
            const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== marker_kind)
            const optimistic = {
              ...existing,
              marker_kind,
              lat,
              lng,
              is_active: true,
              elevation: existing?.elevation ?? null,
            }
            return { ...h, mapMarkers: [...rest, optimistic] }
          }),
        )

        void (async () => {
          try {
            const data = await mapApi.upsertHoleMarker(hole.id, marker_kind, lat, lng, null)
            setHoles((prev) =>
              prev.map((h) => {
                if (h.id !== hole.id) return h
                const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== marker_kind)
                return { ...h, mapMarkers: [...rest, data] }
              }),
            )

            const elevation = await fetchElevation(lat, lng)
            if (elevation !== null) {
              setHoles((prev) => {
                const currentHole = prev.find((h) => h.id === hole.id)
                const currentMarker = currentHole?.mapMarkers?.find((m) => m.marker_kind === marker_kind)

                if (currentMarker && Number(currentMarker.lat) === lat && Number(currentMarker.lng) === lng) {
                  void mapApi.upsertHoleMarker(hole.id, marker_kind, lat, lng, elevation)
                  return prev.map((h) => {
                    if (h.id !== hole.id) return h
                    const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== marker_kind)
                    return { ...h, mapMarkers: [...rest, { ...currentMarker, elevation }] }
                  })
                }
                return prev
              })
            }
          } catch (err) {
            setMarkerMessage(err.message)
          }
        })()

        return { ok: true }
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
        const landingAreas = (hole.planningMarkers ?? []).filter(
          (m) => m.marker_type === 'landing_area',
        )
        sequenceOrder = landingAreas.length + 1
      } else {
        return null
      }

      const tempId = `pending-${crypto.randomUUID()}`
      const optimistic = {
        id: tempId,
        hole_id: hole.id,
        marker_type: markerType,
        sequence_order: sequenceOrder,
        lat,
        lng,
        long: lng,
        elevation: null,
        created_at: new Date().toISOString(),
      }

      setHoles((prev) =>
        prev.map((h) => {
          if (h.id !== hole.id) return h
          let newMarkers
          if (markerType === 'landing_area') {
            newMarkers = [...(h.planningMarkers ?? []), optimistic]
          } else {
            const rest = (h.planningMarkers ?? []).filter((m) => m.marker_type !== markerType)
            newMarkers = [...rest, optimistic]
          }
          return {
            ...h,
            planningMarkers: newMarkers.sort((a, b) => a.sequence_order - b.sequence_order),
          }
        }),
      )

      void (async () => {
        try {
          const data = await mapApi.upsertPlanningMarker(
            hole.id,
            markerType,
            sequenceOrder,
            lat,
            lng,
            null,
          )
          setHoles((prev) =>
            prev.map((h) => {
              if (h.id !== hole.id) return h
              const pm = (h.planningMarkers ?? []).map((m) => 
                m.id === tempId ? { ...data, clientKey: tempId } : m
              )
              return {
                ...h,
                planningMarkers: pm.sort((a, b) => a.sequence_order - b.sequence_order),
              }
            }),
          )

          const elevation = await fetchElevation(lat, lng)
          if (elevation !== null) {
            const dbId = data.id
            setHoles((prev) => {
              const currentHole = prev.find((h) => h.id === hole.id)
              const currentMarker = currentHole?.planningMarkers?.find((m) => m.id === dbId)

              if (currentMarker && Number(currentMarker.lat) === lat && Number(currentMarker.lng || currentMarker.long) === lng) {
                void mapApi.upsertPlanningMarker(
                  hole.id,
                  markerType,
                  sequenceOrder,
                  lat,
                  lng,
                  elevation,
                )
                return prev.map((h) => {
                  if (h.id !== hole.id) return h
                  return {
                    ...h,
                    planningMarkers: (h.planningMarkers ?? []).map((m) =>
                      m.id === dbId ? { ...m, elevation } : m
                    ),
                  }
                })
              }
              return prev
            })
          }
        } catch (err) {
          setMarkerMessage(err.message)
          setHoles((prev) =>
            prev.map((h) => {
              if (h.id !== hole.id) return h
              return {
                ...h,
                planningMarkers: (h.planningMarkers ?? []).filter((m) => m.id !== tempId && m.clientKey !== tempId),
              }
            }),
          )
        }
      })()

      return { ok: true }
    },
    [holes, selectedHoleIndex],
  )

  /**
   * Insert a landing area exactly between two markers.
   */
  const insertPlanningMarkerMidpoint = useCallback(
    (startMarker, endMarker) => {
      const hole = holes[selectedHoleIndex]
      if (!hole) return null

      setMarkerMessage(null)

      const startLat = Number(startMarker.lat)
      const startLng = Number(startMarker.long ?? startMarker.lng)
      const endLat = Number(endMarker.lat)
      const endLng = Number(endMarker.long ?? endMarker.lng)

      const lat = (startLat + endLat) / 2
      const lng = (startLng + endLng) / 2

      let sequenceOrder
      if (startMarker.marker_type === 'tee_shot_location') {
        sequenceOrder = 1
      } else {
        sequenceOrder = (startMarker.sequence_order || 0) + 1
      }

      const tempId = `pending-${crypto.randomUUID()}`
      const optimistic = {
        id: tempId,
        hole_id: hole.id,
        marker_type: 'landing_area',
        sequence_order: sequenceOrder,
        lat,
        lng,
        long: lng,
        elevation: null,
        created_at: new Date().toISOString(),
      }

      setHoles((prev) =>
        prev.map((h) => {
          if (h.id !== hole.id) return h
          let newMarkers = (h.planningMarkers ?? []).map(m => {
            if (m.marker_type === 'landing_area' && m.sequence_order >= sequenceOrder) {
              return { ...m, sequence_order: m.sequence_order + 1 }
            }
            return m
          })
          newMarkers.push(optimistic)
          return {
            ...h,
            planningMarkers: newMarkers.sort((a, b) => a.sequence_order - b.sequence_order),
          }
        }),
      )

      void (async () => {
        try {
          const data = await mapApi.insertPlanningMarker(
            hole.id,
            'landing_area',
            sequenceOrder,
            lat,
            lng,
            null,
          )
          setHoles((prev) =>
            prev.map((h) => {
              if (h.id !== hole.id) return h
              const pm = (h.planningMarkers ?? []).map((m) => 
                m.id === tempId ? { ...data, clientKey: tempId } : m
              )
              return {
                ...h,
                planningMarkers: pm.sort((a, b) => a.sequence_order - b.sequence_order),
              }
            }),
          )

          const elevation = await fetchElevation(lat, lng)
          if (elevation !== null) {
            const dbId = data.id
            setHoles((prev) => {
              const currentHole = prev.find((h) => h.id === hole.id)
              const currentMarker = currentHole?.planningMarkers?.find((m) => m.id === dbId)

              if (currentMarker && Number(currentMarker.lat) === lat && Number(currentMarker.lng || currentMarker.long) === lng) {
                void mapApi.movePlanningMarker(dbId, lat, lng, elevation)
                return prev.map((h) => {
                  if (h.id !== hole.id) return h
                  return {
                    ...h,
                    planningMarkers: (h.planningMarkers ?? []).map((m) =>
                      m.id === dbId ? { ...m, elevation } : m
                    ),
                  }
                })
              }
              return prev
            })
          }
        } catch (err) {
          setMarkerMessage(err.message)
          setHoles((prev) =>
            prev.map((h) => {
              if (h.id !== hole.id) return h
              return {
                ...h,
                planningMarkers: (h.planningMarkers ?? []).filter((m) => m.id !== tempId && m.clientKey !== tempId),
              }
            }),
          )
        }
      })()
    },
    [holes, selectedHoleIndex]
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
   * Optimistic lat/lng immediately; elevation + Supabase in background.
   */
  const movePlanningMarker = useCallback(
    (markerId, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole?.id) return

      setHoles((prev) =>
        prev.map((h) => {
          if (h.id !== hole.id) return h
          return {
            ...h,
            planningMarkers: (h.planningMarkers ?? []).map((m) =>
              m.id === markerId ? { ...m, lat, lng, long: lng } : m,
            ),
          }
        }),
      )

      void (async () => {
        try {
          const data = await mapApi.movePlanningMarker(markerId, lat, lng, null)
          setHoles((prev) =>
            prev.map((h) => {
              if (h.id !== hole.id) return h
              return {
                ...h,
                planningMarkers: (h.planningMarkers ?? []).map((m) =>
                  m.id === markerId ? { ...data, clientKey: m.clientKey } : m,
                ),
              }
            }),
          )

          const elevation = await fetchElevation(lat, lng)
          if (elevation !== null) {
            setHoles((prev) => {
              const currentHole = prev.find((h) => h.id === hole.id)
              const currentMarker = currentHole?.planningMarkers?.find((m) => m.id === markerId)

              if (currentMarker && Number(currentMarker.lat) === lat && Number(currentMarker.lng || currentMarker.long) === lng) {
                void mapApi.movePlanningMarker(markerId, lat, lng, elevation)
                return prev.map((h) => {
                  if (h.id !== hole.id) return h
                  return {
                    ...h,
                    planningMarkers: (h.planningMarkers ?? []).map((m) =>
                      m.id === markerId ? { ...m, elevation } : m
                    ),
                  }
                })
              }
              return prev
            })
          }
        } catch (err) {
          setMarkerMessage(err.message)
        }
      })()
    },
    [holes, selectedHoleIndex],
  )

  /**
   * Move a map marker (reference point). Optimistic UI; sync in background.
   */
  const moveMapMarker = useCallback(
    (markerKind, lat, lng) => {
      const hole = holes[selectedHoleIndex]
      if (!hole?.id) return

      setHoles((prev) =>
        prev.map((h) => {
          if (h.id !== hole.id) return h
          return {
            ...h,
            mapMarkers: (h.mapMarkers ?? []).map((m) =>
              m.marker_kind === markerKind ? { ...m, lat, lng } : m,
            ),
          }
        }),
      )

      void (async () => {
        try {
          const data = await mapApi.upsertHoleMarker(hole.id, markerKind, lat, lng, null)
          setHoles((prev) =>
            prev.map((h) => {
              if (h.id !== hole.id) return h
              const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== markerKind)
              return { ...h, mapMarkers: [...rest, data] }
            }),
          )

          const elevation = await fetchElevation(lat, lng)
          if (elevation !== null) {
            setHoles((prev) => {
              const currentHole = prev.find((h) => h.id === hole.id)
              const currentMarker = currentHole?.mapMarkers?.find((m) => m.marker_kind === markerKind)

              if (currentMarker && Number(currentMarker.lat) === lat && Number(currentMarker.lng) === lng) {
                void mapApi.upsertHoleMarker(hole.id, markerKind, lat, lng, elevation)
                return prev.map((h) => {
                  if (h.id !== hole.id) return h
                  const rest = (h.mapMarkers ?? []).filter((m) => m.marker_kind !== markerKind)
                  return { ...h, mapMarkers: [...rest, { ...currentMarker, elevation }] }
                })
              }
              return prev
            })
          }
        } catch (err) {
          setMarkerMessage(err.message)
        }
      })()
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
    insertPlanningMarkerMidpoint,
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
