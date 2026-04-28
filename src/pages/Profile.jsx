// AI assisted development
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import DigitalBagPanel from '../components/DigitalBagPanel'

export default function Profile({ session }) {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function getProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', session.user.id)
        .single()

      if (data) setUsername(data.username || '')
      setLoading(false)
    }
    getProfile()
  }, [session.user.id])

  async function updateProfile() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', session.user.id)

    if (error) {
      setMessage('Error updating profile.')
    } else {
      setMessage('Profile updated successfully!')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-slate-400">Loading profile...</div>

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Player Profile</h1>
      
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Account Details</h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
          <input 
            type="text" 
            disabled 
            value={session.user.email} 
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        
        <button 
          onClick={updateProfile}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Profile'}
        </button>

        {message && <p className="mt-4 text-emerald-400 text-sm">{message}</p>}
      </div>

      <DigitalBagPanel userId={session.user.id} />
    </div>
  )
}