import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Map, MapPin } from 'lucide-react'
import { useCourse } from '../../../hooks/useCourse'
import CourseDetailsForm from './CourseDetailsForm'
import CourseTeeSets from './CourseTeeSets'
import CourseYardageMatrix from './CourseYardageMatrix'

export default function CourseDetails() {
  const { id: courseId } = useParams()
  const {
    course,
    tees,
    holes,
    yardages,
    loading,
    error: loadError,
    updateCourse,
    addTee,
    updateTee,
    removeTee,
    setDefaultTee,
    saveYardages
  } = useCourse(courseId)

  const formattedAddress = useMemo(() => {
    if (!course) return ''
    const parts = [
      course.address_line,
      [course.city, course.region].filter(Boolean).join(', '),
      course.postal_code,
      course.country,
    ].filter(Boolean)
    return parts.join(' · ')
  }, [course])

  if (!courseId) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        <p>Missing course id.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        <p>Loading course…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <p className="text-red-400">{loadError}</p>
        <p className="text-slate-500 text-sm mt-2">
          If this mentions a missing column or table, apply the Supabase migration in{' '}
          <code className="text-slate-300">supabase/migrations/</code>.
        </p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-slate-400">
        <p>Course not found or you do not have access.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{course.name}</h1>
          {formattedAddress && (
            <p className="text-slate-400 text-sm mt-2 flex items-start gap-2">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500/80" aria-hidden />
              <span>{formattedAddress}</span>
            </p>
          )}
        </div>
        <Link
          to={`/course/${course.id}`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all duration-200 shadow-lg shadow-emerald-900/20"
        >
          <Map className="w-5 h-5" aria-hidden />
          Start Planning
        </Link>
      </div>

      <div className="space-y-8">
        <CourseDetailsForm course={course} onSave={updateCourse} />
        <CourseTeeSets 
          tees={tees} 
          onAddTee={addTee} 
          onUpdateTee={updateTee} 
          onRemoveTee={removeTee} 
          onSetDefaultTee={setDefaultTee} 
        />
        <CourseYardageMatrix 
          holes={holes} 
          tees={tees} 
          yardages={yardages} 
          onSaveYardages={saveYardages} 
        />
      </div>
    </div>
  )
}
