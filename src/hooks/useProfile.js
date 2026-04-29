import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Fetches the profiles row for the currently authenticated user.
 * Returns { profile, loading, error }.
 *
 * profile.is_mapping_admin determines whether the user can access
 * Mapping mode in the map editor. Non-admins are locked to Planning mode.
 */
export function useProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      setLoading(true)
      setError(null)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        if (!cancelled) {
          setError(userError?.message ?? 'Not authenticated')
          setLoading(false)
        }
        return
      }

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('id, username, is_active, is_mapping_admin')
        .eq('id', user.id)
        .single()

      if (!cancelled) {
        if (profileError) {
          setError(profileError.message)
        } else {
          setProfile(data)
        }
        setLoading(false)
      }
    }

    fetchProfile()

    // Re-fetch when the auth session changes (e.g. login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  return { profile, loading, error }
}
