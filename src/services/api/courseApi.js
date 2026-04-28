import { supabase } from '../../supabaseClient'

export const courseApi = {
  getCourse: async (id) => {
    const { data, error } = await supabase
      .from('courses')
      .select('id, user_id, name, address_line, city, region, postal_code, country, phone, website, notes, course_lat, course_lng, is_active')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle()
    if (error) throw error
    return data
  },

  updateCourse: async (id, payload) => {
    const { data, error } = await supabase
      .from('courses')
      .update(payload)
      .eq('id', id)
      .eq('is_active', true)
    if (error) throw error
    return data
  },

  getTees: async (courseId) => {
    const { data, error } = await supabase
      .from('course_tees')
      .select('id, course_id, name, color_label, sort_order, rating, slope, is_default, is_active')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) throw error
    return data || []
  },

  addTee: async (payload) => {
    const { data, error } = await supabase.from('course_tees').insert(payload)
    if (error) throw error
    return data
  },

  updateTee: async (id, payload) => {
    const { data, error } = await supabase.from('course_tees').update(payload).eq('id', id).eq('is_active', true)
    if (error) throw error
    return data
  },

  removeTee: async (teeId, courseId) => {
    // Soft delete yardages for this tee
    await supabase.from('hole_tee_yardages').update({ is_active: false }).eq('tee_id', teeId)
    
    // Soft delete the tee
    const { error } = await supabase.from('course_tees').update({ is_default: false, is_active: false }).eq('id', teeId)
    if (error) throw error

    // Reassign default tee if needed
    const { data: remaining } = await supabase
      .from('course_tees')
      .select('id, is_default')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (remaining?.length && !remaining.some((r) => r.is_default)) {
      await supabase.from('course_tees').update({ is_default: true }).eq('id', remaining[0].id)
    }
  },

  setDefaultTee: async (courseId, teeId) => {
    await supabase.from('course_tees').update({ is_default: false }).eq('course_id', courseId).eq('is_active', true)
    const { error } = await supabase.from('course_tees').update({ is_default: true }).eq('id', teeId)
    if (error) throw error
  },

  getHoles: async (courseId) => {
    const { data, error } = await supabase
      .from('holes')
      .select('id, hole_number, course_id')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('hole_number', { ascending: true })
    if (error) throw error
    return data || []
  },

  getYardages: async (teeIds) => {
    if (!teeIds || teeIds.length === 0) return []
    const { data, error } = await supabase
      .from('hole_tee_yardages')
      .select('id, hole_id, tee_id, yardage, is_active')
      .in('tee_id', teeIds)
      .eq('is_active', true)
    if (error) throw error
    return data || []
  },

  saveYardages: async (updates, inserts, defaultTeeUpdates) => {
    if (updates.length > 0) {
      for (const u of updates) {
        const { error } = await supabase.from('hole_tee_yardages').update({ yardage: u.yardage }).eq('id', u.id)
        if (error) throw error
      }
    }
    if (inserts.length > 0) {
      for (const i of inserts) {
        const { error } = await supabase.from('hole_tee_yardages').insert(i)
        if (error) throw error
      }
    }
    if (defaultTeeUpdates.length > 0) {
      for (const u of defaultTeeUpdates) {
        const { error } = await supabase.from('holes').update({ scorecard_yardage: u.yardage }).eq('id', u.id).eq('is_active', true)
        if (error) throw error
      }
    }
  }
}
