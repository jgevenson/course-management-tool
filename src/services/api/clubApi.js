import { supabase } from '../../supabaseClient'

export const clubApi = {
  getClubs: async (userId) => {
    const { data, error } = await supabase
      .from('clubs')
      .select('id, name, short_name, club_type, is_putter, sort_order, carry_distance, total_distance, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  addClub: async (clubData) => {
    const { data, error } = await supabase.from('clubs').insert(clubData)
    if (error) throw error
    return data
  },

  updateClub: async (id, userId, clubData) => {
    const { data, error } = await supabase
      .from('clubs')
      .update(clubData)
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return data
  },

  removeClub: async (id, userId) => {
    const { data, error } = await supabase
      .from('clubs')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return data
  }
}
