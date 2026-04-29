// AI assisted development
import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MapPin, Plus, Download } from 'lucide-react'
import OSMImportModal from '../components/OSMImportModal'
import { useProfile } from '../hooks/useProfile'

export default function Dashboard() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const navigate = useNavigate()
  const { profile } = useProfile()
  const isMappingAdmin = profile?.is_mapping_admin ?? false

  useEffect(() => {
    fetchCourses()
  }, [])

  async function fetchCourses() {
    setLoading(true)
    const { data, error } = await supabase
      .from('courses_view')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (!error && data) {
      setCourses(data)
    }
    setLoading(false)
  }

  const handleImportComplete = (newCourseId) => {
    setShowImportModal(false)
    // Navigate to the newly imported course details
    navigate(`/course/${newCourseId}/details`)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Your Courses</h1>
        {isMappingAdmin && (
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Import from OpenStreetMap
          </button>
        )}
      </div>
      
      {loading ? (
        <p className="text-slate-400">Loading courses...</p>
      ) : courses.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/50 border border-slate-700 border-dashed rounded-2xl">
          <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-medium text-white mb-2">No Courses Found</h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            {isMappingAdmin
              ? "You haven't mapped any courses yet. Get a massive head start by importing a course layout directly from OpenStreetMap."
              : 'No courses are available yet. Check back soon.'}
          </p>
          {isMappingAdmin && (
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              <Download className="w-5 h-5" />
              Import Your First Course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}/details`}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-emerald-500 transition-colors group cursor-pointer block text-left flex flex-col"
            >
              <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                {course.name}
              </h2>
              <p className="text-slate-400 text-sm mt-2 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" />
                {course.course_lat === 0 ? 'Needs geolocation' : 'Course details & scorecard'}
              </p>
            </Link>
          ))}
        </div>
      )}

      {showImportModal && (
        <OSMImportModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={handleImportComplete} 
        />
      )}
    </div>
  )
}