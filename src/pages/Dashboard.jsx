import { Box, Typography, Paper, Button } from '@mui/material'
import { Link } from 'react-router-dom'
import { Map, Flag } from 'lucide-react'

export default function Dashboard() {
  return (
    <Box sx={{ p: 4, width: '100%', maxWidth: '1200px', mx: 'auto' }}>
      <Typography variant="h4" component="h1" fontWeight="bold" color="text.primary" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
        Welcome to Open-Yardage Architect. Use the tools below to manage your golf courses and profile.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
        <Paper sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', borderRadius: '50%', mb: 3 }}>
            <Map size={32} color="#fff" />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Manage Courses
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, flexGrow: 1 }}>
            View, edit, or import your golf courses. Plan your strategy and map your yardages directly on satellite imagery.
          </Typography>
          <Button component={Link} to="/courses" variant="contained" color="primary">
            View Courses
          </Button>
        </Paper>

        <Paper sx={{ p: 4, bgcolor: 'background.paper', borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', borderRadius: '50%', mb: 3 }}>
            <Flag size={32} color="#fff" />
          </Box>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Your Profile & Bag
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4, flexGrow: 1 }}>
            Manage your personal profile, handicap, and digital bag to calculate accurate dispersion patterns.
          </Typography>
          <Button component={Link} to="/profile" variant="outlined" color="primary">
            Edit Profile
          </Button>
        </Paper>
      </Box>
    </Box>
  )
}