import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import { Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useProfile } from '../hooks/useProfile'
import CourseSearchModal from '../components/CourseSearchModal'
import CourseList from '../features/course/components/CourseList'
import CourseEmptyState from '../features/course/components/CourseEmptyState'

export default function Courses() {
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
    navigate(`/course/${newCourseId}/details`)
  }

  return (
    <Box sx={{ p: 4, width: '100%', maxWidth: '1400px', mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary">
          Your Courses
        </Typography>
        {isMappingAdmin && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<Download size={16} />}
            onClick={() => setShowImportModal(true)}
            sx={{ fontWeight: 'medium' }}
          >
            Add a New Course
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
          <CircularProgress />
        </Box>
      ) : courses.length === 0 ? (
        <CourseEmptyState 
          isMappingAdmin={isMappingAdmin} 
          onImportClick={() => setShowImportModal(true)} 
        />
      ) : (
        <CourseList courses={courses} />
      )}

      {showImportModal && (
        <CourseSearchModal 
          onClose={() => setShowImportModal(false)} 
          onImportComplete={handleImportComplete} 
        />
      )}
    </Box>
  )
}
