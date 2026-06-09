import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import useGreenContours from '../../../hooks/useGreenContours'
import { fetchGreenElevationMatrix } from '../../../services/api/greenElevationApi'

export default function GreenLiDARInspector() {
  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [holes, setHoles] = useState([])
  const [selectedHoleId, setSelectedHoleId] = useState('')

  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  
  const { contourData, isolines, minZ, maxZ, points, loading: contoursLoading, refresh } = useGreenContours(selectedHoleId, 2)

  // Fetch courses
  useEffect(() => {
    supabase.from('courses').select('id, name').then(({ data }) => {
      if (data) setCourses(data)
    })
  }, [])

  // Fetch holes when course changes
  useEffect(() => {
    if (!selectedCourseId) {
      setHoles([])
      setSelectedHoleId('')
      return
    }
    supabase.from('holes').select('id, hole_number').eq('course_id', selectedCourseId).order('hole_number').then(({ data }) => {
      if (data) setHoles(data)
    })
  }, [selectedCourseId])

  const handleFetchLiDAR = async () => {
    if (!selectedHoleId) return
    setFetching(true)
    setFetchError(null)
    try {
      await fetchGreenElevationMatrix(selectedHoleId)
      await refresh()
    } catch (err) {
      setFetchError(err.message || 'Error fetching elevation data.')
    } finally {
      setFetching(false)
    }
  }

  // Calculate the viewBox based on the grid matrix if available
  const matrixWidth = contourData?.matrix_data?.width || 100
  const matrixHeight = contourData?.matrix_data?.height || 100

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 p-6">
      <div className="mb-6 flex gap-4 items-end border-b border-slate-700 pb-4">
        <div>
          <label className="block text-sm font-semibold text-slate-400 mb-1">Course</label>
          <select 
            className="bg-slate-800 border border-slate-700 p-2 rounded w-48 text-white"
            value={selectedCourseId}
            onChange={e => setSelectedCourseId(e.target.value)}
          >
            <option value="">-- Select Course --</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-400 mb-1">Hole</label>
          <select 
            className="bg-slate-800 border border-slate-700 p-2 rounded w-32 text-white"
            value={selectedHoleId}
            onChange={e => setSelectedHoleId(e.target.value)}
            disabled={!selectedCourseId}
          >
            <option value="">-- Hole --</option>
            {holes.map(h => <option key={h.id} value={h.id}>Hole {h.hole_number}</option>)}
          </select>
        </div>

        <button
          onClick={handleFetchLiDAR}
          disabled={!selectedHoleId || fetching}
          className={`px-4 py-2 rounded font-semibold ${fetching ? 'bg-emerald-600/50 text-emerald-200 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
        >
          {fetching ? 'Fetching 3DEP...' : 'Fetch Elevation Data'}
        </button>
      </div>

      {fetchError && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded mb-4">
          <strong>Error:</strong> {fetchError}
        </div>
      )}

      {/* Target Aspect Ratio Canvas (4:6.5) */}
      <div className="flex-1 min-h-0 flex justify-center items-center">
        {contoursLoading ? (
          <p className="text-slate-400">Loading contours...</p>
        ) : !isolines || isolines.length === 0 ? (
          <p className="text-slate-500 italic">No contour data. Select a hole and fetch LiDAR.</p>
        ) : (
          <div 
            className="border-2 border-slate-700 bg-white rounded relative overflow-hidden flex items-center justify-center"
            style={{ 
              aspectRatio: '4/6.5', 
              height: '100%', 
              maxHeight: '80vh' 
            }}
          >
            <svg 
              className="w-full h-full" 
              viewBox={`0 0 ${matrixWidth} ${matrixHeight}`}
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <pattern id="gridPattern" width="5" height="5" patternUnits="userSpaceOnUse">
                  <rect width="5" height="5" fill="none" stroke="#000" strokeWidth="0.1" opacity="0.3"/>
                </pattern>
                <marker id="arrowhead" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="3" markerHeight="3" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#000" opacity="0.6"/>
                </marker>
              </defs>
              
              <rect width="100%" height="100%" fill="url(#gridPattern)" />

              {/* Draw contour layers with heat map fill */}
              {isolines.map((isoline, i) => {
                const zRange = maxZ - minZ || 1
                // Interpolate from Blue (240) to Green (120)
                const normalized = (isoline.value - minZ) / zRange
                const hue = 240 - (normalized * 120)
                return (
                  <path 
                    key={`iso-${i}`} 
                    d={isoline.pathData} 
                    fill={`hsl(${hue}, 70%, 50%)`}
                    fillOpacity="0.8"
                    stroke="#000"
                    strokeWidth="0.05"
                    title={`Elevation: ${isoline.value.toFixed(2)} ft`}
                  />
                )
              })}


            </svg>
            <div className="absolute bottom-2 right-2 text-xs text-slate-800 font-mono font-bold bg-white/80 px-1 rounded">
              Grid: {matrixWidth}x{matrixHeight} ft
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
