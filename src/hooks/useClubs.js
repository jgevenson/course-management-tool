import { useState, useCallback, useEffect } from 'react'
import { clubApi } from '../services/api/clubApi'

/**
 * ## useClubs Hook
 * 
 * A custom React hook for managing club data, providing an abstraction layer over 
 * the `clubApi` for fetching, adding, updating, and removing club entities.
 *
 * ### Responsibilities
 * - **State Management**: Manages the list of clubs, loading state, and any errors that occur during operations.
 * - **Data Fetching**: Loads clubs for a specific user on mount or when the user ID changes.
 * - **CRUD Operations**: Exposes functions to perform Create (`addClub`), Update (`updateClub`), 
 *   and Delete (`removeClub`) operations.
 * - **Side Effects**: Automatically refetches the list of clubs after successful mutations to ensure 
 *   the local state remains synchronized with the server.
 * - **Memoization**: Uses `useCallback` to memoize the CRUD functions, preventing unnecessary 
 *   re-renders in components that consume this hook.
 *
 * ### Usage Pattern
 * This hook is designed to be used within React components that require access to club data, 
 * typically within a user-specific context.
 * 
 * @param {string|null|undefined} userId - The ID of the user whose clubs are to be managed. 
 *        If falsy, club loading is skipped.
 * @returns {Object} An object containing the `clubs` array, `loading` status, `error` message, 
 *          and CRUD functions (`loadClubs`, `addClub`, `updateClub`, `removeClub`).
 */
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
