// AI assisted development
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { MapPin } from 'lucide-react'
export default function Dashboard() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourses() {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (!error && data) {
        setCourses(data)
      }
      setLoading(false)
    }

    fetchCourses()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Your Courses</h1>
      
      {loading ? (
        <p className="text-slate-400">Loading courses...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/course/${course.id}/details`}
              className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-emerald-500 transition-colors group cursor-pointer block text-left"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                    {course.name}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1 flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {course.course_lat === 0 ? 'Needs geolocation — open course page' : 'Course details & scorecard'}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}