import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Slider from '@mui/material/Slider'

export default function AutoDrawPanel({
  autoDrawActive,
  autoDrawTolerance,
  onAutoDrawToleranceChange,
  autoDrawMaxRadiusYards,
  onAutoDrawMaxRadiusYardsChange,
  autoDrawMessage,
}) {
  if (!autoDrawActive) {
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Tolerance
        </Typography>
        <TextField
          type="number"
          size="small"
          slotProps={{
            htmlInput: { min: 8, max: 140 }
          }}
          value={autoDrawTolerance}
          onChange={(e) => onAutoDrawToleranceChange(Number(e.target.value))}
          sx={{
            width: 70,
            '& .MuiInputBase-input': {
              textAlign: 'right',
              py: 0.5,
              px: 1,
              fontSize: '0.875rem',
              color: 'text.primary',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'text.secondary',
              },
            },
          }}
        />
      </Box>
      <Slider
        value={autoDrawTolerance}
        min={8}
        max={140}
        onChange={(e, val) => onAutoDrawToleranceChange(Number(val))}
        color="primary"
        size="small"
      />

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Max radius
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <TextField
            type="number"
            size="small"
            slotProps={{
              htmlInput: { min: 5, max: 60 }
            }}
            value={autoDrawMaxRadiusYards}
            onChange={(e) => onAutoDrawMaxRadiusYardsChange(Number(e.target.value))}
            sx={{
              width: 70,
              '& .MuiInputBase-input': {
                textAlign: 'right',
                py: 0.5,
                px: 1,
                fontSize: '0.875rem',
                color: 'text.primary',
              },
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'divider',
                },
                '&:hover fieldset': {
                  borderColor: 'text.secondary',
                },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            yd
          </Typography>
        </Box>
      </Box>
      <Slider
        value={autoDrawMaxRadiusYards}
        min={5}
        max={60}
        onChange={(e, val) => onAutoDrawMaxRadiusYardsChange(Number(val))}
        color="primary"
        size="small"
      />

      {autoDrawMessage && (
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            lineHeight: 1.3,
            color: autoDrawMessage.includes('could not') || autoDrawMessage.includes('too little') ? 'warning.light' : 'text.secondary',
            fontWeight: autoDrawMessage.includes('could not') || autoDrawMessage.includes('too little') ? 'bold' : 'normal',
          }}
        >
          {autoDrawMessage}
        </Typography>
      )}
    </Paper>
  )
}
