import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Card, CardActionArea, CardContent, Typography, Box } from '@mui/material'

export default function CourseCard({ course }) {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        backgroundColor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        transition: 'border-color 0.2s',
        '&:hover': {
          borderColor: 'primary.main',
        }
      }}
    >
      <CardActionArea 
        component={Link} 
        to={`/course/${course.id}/details`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start' }}
      >
        <CardContent sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="h2" fontWeight="bold" color="text.primary" sx={{ 
            transition: 'color 0.2s',
            '.MuiCardActionArea-root:hover &': {
              color: 'primary.main'
            }
          }}>
            {course.name}
          </Typography>
          
          <Box sx={{ mt: 'auto', pt: 4, display: 'flex', alignItems: 'center', gap: 1 }}>
            <MapPin size={16} style={{ color: '#10b981' }} />
            <Typography variant="body2" color="text.secondary">
              {course.course_lat === 0 ? 'Needs geolocation' : 'Course details & scorecard'}
            </Typography>
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

