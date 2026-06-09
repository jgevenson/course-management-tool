// AI assisted development
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import DigitalBagPanel from '../features/bag/components/DigitalBagPanel'
import DispersionPanel from '../features/bag/components/dispersion/DispersionPanel'
import { useClubs } from '../hooks/useClubs'
import { Box, Typography } from '@mui/material'
import Grid from '@mui/material/Grid'

export default function Profile({ session }) {
  const [username, setUsername] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [handicapIndex, setHandicapIndex] = useState('')
  const [dexterity, setDexterity] = useState('Right Handed')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedClubId, setSelectedClubId] = useState(null)

  const { 
    clubs, 
    loading: clubsLoading, 
    error: clubsError,
    addClub, 
    updateClub, 
    removeClub 
  } = useClubs(session.user.id)

  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    async function getProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('username, first_name, last_name, handicap_index, dexterity')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setUsername(data.username || '')
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setHandicapIndex(data.handicap_index != null ? String(data.handicap_index) : '')
        setDexterity(data.dexterity || 'Right Handed')
      }
      setLoading(false)
    }
    getProfile()
  }, [session.user.id])

  useEffect(() => {
    if (clubs.length > 0 && !selectedClubId) {
      const firstNonPutter = clubs.find(c => !c.is_putter);
      if (firstNonPutter) setSelectedClubId(firstNonPutter.id);
    }
  }, [clubs, selectedClubId])

  async function updateProfile() {
    setSaving(true)
    setMessage('')
    const { error } = await supabase
      .from('profiles')
      .update({ 
        username,
        first_name: firstName,
        last_name: lastName,
        handicap_index: handicapIndex === '' ? null : parseFloat(handicapIndex),
        dexterity
      })
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
    <Box sx={{ p: 4, width: '100%' }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary" mb={3}>
        Player Profile
      </Typography>
      {/* Tabs */}
      <div className="flex border-b border-slate-700 mb-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'profile'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Profile Information
        </button>
        <button
          onClick={() => setActiveTab('bag')}
          className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'bag'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          My Bag
        </button>
      </div>

      <div className="space-y-8">
        {activeTab === 'profile' && (
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
                <input 
                  type="text" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Last name"
                />
              </div>
            </div>

            {/* <div className="mb-4">
              <label className="block text-sm font-medium text-slate-300 mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Handicap Index</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={handicapIndex} 
                  onChange={(e) => setHandicapIndex(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. 15.4"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Dexterity</label>
                <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-700 shadow-inner">

                  <button 
                    type="button"
                    onClick={() => setDexterity('Left Handed')} 
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      dexterity === 'Left Handed' 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Left Handed
                  </button>
                                    <button 
                    type="button"
                    onClick={() => setDexterity('Right Handed')} 
                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                      dexterity === 'Right Handed' 
                        ? 'bg-emerald-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    Right Handed
                  </button>
                </div>
              </div>
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
        )}

        {activeTab === 'bag' && (
          <Grid container spacing={4} alignItems="flex-start">
            <Grid size={{ xs: 12, lg: 6 }}>
              <DigitalBagPanel 
                userId={session.user.id} 
                clubs={clubs}
                loading={clubsLoading}
                fetchError={clubsError}
                activeClubId={selectedClubId}
                onSelectClub={setSelectedClubId}
                addClub={addClub}
                updateClub={updateClub}
                removeClub={removeClub}
              />
            </Grid>
            <Grid size={{ xs: 12, lg: 6 }} sx={{ position: 'sticky', top: 32 }}>
              <DispersionPanel 
                clubs={clubs}
                handedness={dexterity}
                handicap={handicapIndex}
                activeClubId={selectedClubId}
              />
            </Grid>
          </Grid>
        )}
      </div>
    </Box>
  )
}