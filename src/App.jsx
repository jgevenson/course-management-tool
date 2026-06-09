// AI assisted development
import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { ThemeProvider, CssBaseline } from '@mui/material'
import theme from './theme'// Components & Pages
import Auth from './components/Auth'
import Header from './components/Header'
import MapCanvas from './features/map/components/MapCanvas'
import Dashboard from './pages/Dashboard'
import CourseDetails from './features/course/components/CourseDetails'
import Profile from './pages/Profile'
import Courses from './pages/Courses'
import GreenLiDARInspector from './features/map/components/GreenLiDARInspector'

export default function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (!session) return <Auth />

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
      <div className="h-screen w-screen flex flex-col bg-slate-900 text-white overflow-hidden">
        <Header />

        <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
          <Routes>
            <Route
              path="/"
              element={
                <div className="h-full min-h-0 overflow-y-auto">
                  <Dashboard />
                </div>
              }
            />
            <Route
              path="/profile"
              element={
                <div className="h-full min-h-0 flex flex-col overflow-y-auto">
                  <Profile session={session} />
                </div>
              }
            />
            <Route
              path="/course/:id/details"
              element={
                <div className="h-full min-h-0 overflow-y-auto">
                  <CourseDetails />
                </div>
              }
            />
            <Route
              path="/course/:id"
              element={
                <div className="h-full min-h-0 flex flex-col">
                  <MapCanvas />
                </div>
              }
            />

            <Route
              path="/courses"
              element={
                <div className="h-full min-h-0 overflow-y-auto">
                  <Courses />
                </div>
              }
            />
            <Route
              path="/inspector/green-lidar"
              element={
                <div className="h-full min-h-0 overflow-y-auto">
                  <GreenLiDARInspector />
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
    </ThemeProvider>
  )
}
