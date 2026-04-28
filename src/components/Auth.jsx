// src/components/Auth.jsx
import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState({ text: '', type: '' })

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    } else {
      setMessage({ text: 'Success! You are now signed up and logged in.', type: 'success' })
    }
    setLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ text: '', type: '' })

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage({ text: error.message, type: 'error' })
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 px-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl p-8 border border-slate-700">
        <h2 className="text-2xl font-bold text-white text-center mb-6">
          Open-Yardage <span className="text-emerald-500">Architect</span>
        </h2>
        
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input
              type="email"
              placeholder="golfer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {message.text && (
            <div className={`p-3 rounded text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-emerald-900/50 text-emerald-200'}`}>
              {message.text}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Log In'}
            </button>
            <button
              onClick={handleSignUp}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}