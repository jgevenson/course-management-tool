import { useState, useCallback, useEffect } from 'react'
import { courseApi } from '../services/api/courseApi'
import { supabase } from '../supabaseClient'

export function useCourse(courseId) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const [course, setCourse] = useState(null)
  const [tees, setTees] = useState([])
  const [holes, setHoles] = useState([])
  const [yardages, setYardages] = useState([]) // Raw yardage rows

  const loadData = useCallback(async () => {
    if (!courseId) return
    setLoading(true)
    setError(null)
    try {
      const courseData = await courseApi.getCourse(courseId)
      if (!courseData) {
        setCourse(null)
        setLoading(false)
        return
      }
      setCourse(courseData)

      const teesData = await courseApi.getTees(courseId)
      setTees(teesData)

      const holesData = await courseApi.getHoles(courseId)
      setHoles(holesData)

      const teeIds = teesData.map(t => t.id)
      const yardagesData = await courseApi.getYardages(teeIds)
      setYardages(yardagesData)

    } catch (err) {
      setError(err.message)
      setCourse(null)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateCourse = useCallback(async (payload) => {
    try {
      await courseApi.updateCourse(courseId, payload)
      setCourse(prev => prev ? { ...prev, ...payload } : prev)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [courseId])

  const addTee = useCallback(async (payload) => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData?.user?.id) throw new Error('Not signed in.')

      const sortOrder = tees.length === 0 ? 0 : Math.max(...tees.map(t => t.sort_order ?? 0), 0) + 1
      const isFirst = tees.length === 0

      await courseApi.addTee({
        ...payload,
        course_id: courseId,
        user_id: userData.user.id,
        sort_order: sortOrder,
        is_default: isFirst,
        is_active: true
      })
      await loadData()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [courseId, tees, loadData])

  const updateTee = useCallback(async (teeId, payload) => {
    try {
      await courseApi.updateTee(teeId, payload)
      await loadData()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [loadData])

  const removeTee = useCallback(async (teeId) => {
    try {
      await courseApi.removeTee(teeId, courseId)
      await loadData()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [courseId, loadData])

  const setDefaultTee = useCallback(async (teeId) => {
    try {
      await courseApi.setDefaultTee(courseId, teeId)
      await loadData()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [courseId, loadData])

  const saveYardages = useCallback(async (draftMap) => {
    try {
      const updates = []
      const inserts = []
      
      for (const h of holes) {
        for (const t of tees) {
          const k = `${h.id}:${t.id}`
          const raw = draftMap[k]
          const yardage = (raw === '' || raw === undefined) ? null : Number(raw)
          
          if (yardage !== null && (Number.isNaN(yardage) || yardage < 0)) {
            throw new Error(`Invalid yardage for hole ${h.hole_number} (${t.name}).`)
          }

          const existing = yardages.find(y => y.hole_id === h.id && y.tee_id === t.id)
          if (existing) {
            if (existing.yardage !== yardage) {
              updates.push({ id: existing.id, yardage })
            }
          } else if (yardage !== null) {
            inserts.push({
              hole_id: h.id,
              tee_id: t.id,
              yardage,
              is_active: true
            })
          }
        }
      }

      const defaultTee = tees.find(t => t.is_default)
      const defaultTeeUpdates = []
      if (defaultTee) {
        for (const h of holes) {
          const k = `${h.id}:${defaultTee.id}`
          const raw = draftMap[k]
          const y = (raw === '' || raw === undefined) ? null : Number(raw)
          defaultTeeUpdates.push({ id: h.id, yardage: y })
        }
      }

      await courseApi.saveYardages(updates, inserts, defaultTeeUpdates)
      await loadData()
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [holes, tees, yardages, loadData])

  return {
    course,
    tees,
    holes,
    yardages,
    loading,
    error,
    updateCourse,
    addTee,
    updateTee,
    removeTee,
    setDefaultTee,
    saveYardages
  }
}
