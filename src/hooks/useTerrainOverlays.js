import { useState, useCallback, useEffect } from 'react'
import { terrainApi } from '../services/api/terrainApi'

export function useTerrainOverlays(courseId) {
  const [terrainOverlays, setTerrainOverlays] = useState([])
  const [error, setError] = useState(null)

  const loadOverlays = useCallback(async () => {
    if (!courseId) return
    setError(null)
    try {
      const data = await terrainApi.getOverlays(courseId)
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
    } catch (err) {
      setError(err.message)
      setTerrainOverlays([])
    }
  }, [courseId])

  useEffect(() => {
    loadOverlays()
  }, [loadOverlays])

  const addOverlay = useCallback(async (payload) => {
    try {
      await terrainApi.addOverlay(courseId, payload)
      await loadOverlays()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [courseId, loadOverlays])

  const updateOverlayProperties = useCallback(async (id, payload) => {
    try {
      await terrainApi.updateOverlayProperties(id, payload)
      await loadOverlays()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [loadOverlays])

  const updateOverlayGeometry = useCallback(async (id, feature) => {
    try {
      await terrainApi.updateOverlayGeometry(id, feature)
      setTerrainOverlays((prev) =>
        prev.map((o) => (o.id === id ? { ...o, geojson_data: feature } : o)),
      )
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const removeOverlay = useCallback(async (id) => {
    try {
      await terrainApi.removeOverlay(id)
      setTerrainOverlays((prev) => prev.filter((o) => o.id !== id))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  return {
    terrainOverlays,
    error,
    loadOverlays,
    addOverlay,
    updateOverlayProperties,
    updateOverlayGeometry,
    removeOverlay
  }
}
