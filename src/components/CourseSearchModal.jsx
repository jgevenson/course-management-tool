import { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  Box,
  Alert
} from '@mui/material'
import { Search, Map as MapIcon, Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { searchCourses, getCourseDetails } from '../services/golfCourseApiService'
import { importApiCourseToSupabase } from '../services/courseImportService'

export default function CourseSearchModal({ onClose, onImportComplete }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResults([])
    setSelectedCourse(null)

    try {
      const results = await searchCourses(searchQuery)
      setSearchResults(results)
    } catch (err) {
      setError(err.message || 'Failed to search for courses. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async () => {
    if (!selectedCourse) return

    setIsImporting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to import a course.')

      const courseDetails = await getCourseDetails(selectedCourse.id)
      
      const newCourseId = await importApiCourseToSupabase(courseDetails, user.id)
      
      onImportComplete(newCourseId)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to import course.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <MapIcon size={24} />
        Add a New Course
      </DialogTitle>
      
      <DialogContent dividers>
        <Box component="form" onSubmit={handleSearch} sx={{ mb: 3, display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            label="Course Name (e.g., Pinehurst)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isSearching || isImporting}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={!searchQuery.trim() || isSearching || isImporting}
            startIcon={isSearching ? <CircularProgress size={16} color="inherit" /> : <Search size={16} />}
          >
            Search
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {searchResults.length > 0 && !selectedCourse && (
          <List sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {searchResults.map((course) => (
              <ListItem key={course.id} disablePadding>
                <ListItemButton onClick={() => setSelectedCourse(course)}>
                  <ListItemText
                    primary={course.course_name || course.club_name}
                    secondary={`${course.location?.city || ''}, ${course.location?.state || ''}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}

        {selectedCourse && (
          <Box sx={{ p: 2, border: 1, borderColor: 'primary.main', borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="h6" gutterBottom>
              {selectedCourse.course_name || selectedCourse.club_name}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {selectedCourse.location?.address}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {selectedCourse.location?.city}, {selectedCourse.location?.state}
            </Typography>

            <Alert severity="info" sx={{ mt: 2 }}>
              This will download the course information including male tees, yardages, and handicaps, and add it to your courses.
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {selectedCourse ? (
          <>
            <Button onClick={() => setSelectedCourse(null)} disabled={isImporting}>
              Back to Results
            </Button>
            <Button
              onClick={handleImport}
              variant="contained"
              color="primary"
              disabled={isImporting}
              startIcon={isImporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} />}
            >
              {isImporting ? 'Importing...' : 'Import Course'}
            </Button>
          </>
        ) : (
          <Button onClick={onClose}>
            Cancel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  )
}
