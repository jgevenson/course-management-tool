import { useState, useEffect, useCallback } from 'react'
import { getPlanningAreasForHole, upsertPlanningArea, deletePlanningArea } from '../services/api/planningAreaApi'

/**
 * Hook to manage planning areas for a specific hole.
 * @param {string|null} holeId
 */
export default function usePlanningAreas(holeId) {
  const [areas, setAreas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAreas = useCallback(async () => {
    if (!holeId) {
      setAreas([])
      return
    }
    setLoading(true)
    try {
      const data = await getPlanningAreasForHole(holeId)
      setAreas(data)
      setError(null)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [holeId])

  useEffect(() => {
    fetchAreas()
  }, [fetchAreas])

  const addOrUpdateArea = async (areaParams) => {
    try {
      const saved = await upsertPlanningArea({ ...areaParams, holeId })
      setAreas((prev) => {
        const idx = prev.findIndex(a => a.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved]
      })
      return saved
    } catch (err) {
      setError(err)
      throw err
    }
  }

  const removeArea = async (id) => {
    try {
      await deletePlanningArea(id)
      setAreas((prev) => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return {
    areas,
    loading,
    error,
    addOrUpdateArea,
    removeArea,
    refresh: fetchAreas
  }
}
