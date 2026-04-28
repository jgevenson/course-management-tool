import { useState, useCallback, useEffect } from 'react'
import { clubApi } from '../services/api/clubApi'

export function useClubs(userId) {
  const [clubs, setClubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadClubs = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return []
    }
    setError(null)
    try {
      const data = await clubApi.getClubs(userId)
      setClubs(data ?? [])
      return data ?? []
    } catch (err) {
      setError(err.message)
      setClubs([])
      return []
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    loadClubs().then(() => {
      if (cancelled) return
    })
    return () => {
      cancelled = true
    }
  }, [loadClubs])

  const addClub = useCallback(async (clubData) => {
    try {
      await clubApi.addClub({ ...clubData, user_id: userId })
      await loadClubs()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [userId, loadClubs])

  const updateClub = useCallback(async (id, clubData) => {
    try {
      await clubApi.updateClub(id, userId, clubData)
      await loadClubs()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [userId, loadClubs])

  const removeClub = useCallback(async (id) => {
    try {
      await clubApi.removeClub(id, userId)
      await loadClubs()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [userId, loadClubs])

  return {
    clubs,
    loading,
    error,
    loadClubs,
    addClub,
    updateClub,
    removeClub
  }
}
