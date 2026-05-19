import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'

export default function OSMFeaturePanel({
  osmToolActive,
  osmFilters,
  onOsmFiltersChange,
  osmLoading,
  osmMessage,
}) {
  if (!osmToolActive && !osmLoading && !osmMessage) {
    return null
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        bgcolor: 'rgba(30, 41, 59, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      {osmToolActive && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              OSM Feature Types
            </Typography>
            <Button
              size="small"
              onClick={() => {
                const allTrue = Object.values(osmFilters).every(v => v)
                onOsmFiltersChange({
                  tees: !allTrue,
                  greens: !allTrue,
                  fairways: !allTrue,
                  bunkers: !allTrue,
                  water: !allTrue,
                  rough: !allTrue,
                })
              }}
              sx={{ fontSize: '0.625rem', py: 0, px: 0.5, color: 'primary.light', minWidth: 0, textTransform: 'none' }}
            >
              {Object.values(osmFilters).every(v => v) ? 'Clear All' : 'Select All'}
            </Button>
          </Box>
          <Grid container spacing={1}>
            {[
              { key: 'tees', label: 'Tees' },
              { key: 'greens', label: 'Greens' },
              { key: 'fairways', label: 'Fairways' },
              { key: 'bunkers', label: 'Bunkers' },
              { key: 'water', label: 'Water' },
              { key: 'rough', label: 'Rough' },
            ].map(({ key, label }) => (
              <Grid size={{ xs: 6 }} key={key}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={osmFilters[key]}
                      onChange={(e) => onOsmFiltersChange(prev => ({ ...prev, [key]: e.target.checked }))}
                      size="small"
                      sx={{
                        color: 'slate.500',
                        p: 0.5,
                        '&.Mui-checked': {
                          color: 'primary.main',
                        },
                      }}
                    />
                  }
                  label={<Typography variant="caption" sx={{ color: 'text.primary', userSelect: 'none' }}>{label}</Typography>}
                  sx={{ m: 0 }}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
      {osmLoading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'primary.light', mt: 0.5 }}>
          <Box sx={{ display: 'flex' }}>
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            Fetching OSM features...
          </Typography>
        </Box>
      )}
      {osmMessage && !osmLoading && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.5,
            lineHeight: 1.3,
            color: osmMessage.includes('fail') || osmMessage.includes('error') || osmMessage.includes('time') ? 'error.light' : 'text.secondary',
            fontWeight: osmMessage.includes('fail') || osmMessage.includes('error') || osmMessage.includes('time') ? 'bold' : 'normal',
          }}
        >
          {osmMessage}
        </Typography>
      )}
    </Paper>
  )
}
