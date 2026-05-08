import { Box, Typography, Button, Paper } from '@mui/material'
import { MapPin, Download } from 'lucide-react'

export default function CourseEmptyState({ isMappingAdmin, onImportClick }) {
  return (
    <Paper 
      variant="outlined" 
      sx={{ 
        p: 6, 
        py: 10,
        textAlign: 'center', 
        bgcolor: 'background.default',
        borderStyle: 'dashed',
        borderColor: 'divider',
        borderRadius: 3
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
        <MapPin size={48} style={{ color: '#64748b' }} />
      </Box>
      <Typography variant="h5" fontWeight="medium" color="text.primary" gutterBottom>
        No Courses Found
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 450, mx: 'auto' }}>
        {isMappingAdmin
          ? "You haven't mapped any courses yet. Get a massive head start by importing a course layout directly from OpenStreetMap."
          : 'No courses are available yet. Check back soon.'}
      </Typography>
      {isMappingAdmin && (
        <Button
          variant="contained"
          color="primary"
          startIcon={<Download size={20} />}
          onClick={onImportClick}
          size="large"
          sx={{ fontWeight: 'medium' }}
        >
          Import Your First Course
        </Button>
      )}
    </Paper>
  )
}
