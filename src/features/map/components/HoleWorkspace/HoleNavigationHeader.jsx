import { useCallback } from 'react'
import { ChevronLeft, ChevronRight, Compass } from 'lucide-react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'

export default function HoleNavigationHeader({
  holes,
  selectedIndex,
  selectedHole,
  onSelectIndex,
  autoRotateHoleView,
  onAutoRotateHoleViewChange,
}) {
  const goPrev = useCallback(() => {
    onSelectIndex(Math.max(0, selectedIndex - 1))
  }, [onSelectIndex, selectedIndex])

  const goNext = useCallback(() => {
    onSelectIndex(Math.min(holes.length - 1, selectedIndex + 1))
  }, [holes.length, onSelectIndex, selectedIndex])

  return (
    <Box
      sx={{
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <IconButton
        onClick={goPrev}
        disabled={selectedIndex <= 0 || holes.length === 0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          borderRadius: 2,
          p: 1,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        aria-label="Previous hole"
        size="small"
      >
        <ChevronLeft size={16} />
      </IconButton>

      <Box sx={{ flexGrow: 1, textAlign: 'center', minWidth: 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 'bold',
            color: 'text.primary',
            fontVariantNumeric: 'tabular-nums',
            fontSize: '1.125rem',
            lineHeight: 1.2,
          }}
        >
          {holes.length ? `Hole ${selectedHole?.hole_number ?? '—'}` : '—'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          {holes.length ? `${selectedIndex + 1} / ${holes.length}` : 'No holes'}
        </Typography>
      </Box>

      <IconButton
        onClick={goNext}
        disabled={selectedIndex >= holes.length - 1 || holes.length === 0}
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          color: 'text.primary',
          borderRadius: 2,
          p: 1,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        aria-label="Next hole"
        size="small"
      >
        <ChevronRight size={16} />
      </IconButton>

      <IconButton
        onClick={() => onAutoRotateHoleViewChange(!autoRotateHoleView)}
        sx={{
          border: '1px solid',
          borderColor: autoRotateHoleView ? 'primary.main' : 'divider',
          color: autoRotateHoleView ? 'primary.main' : 'text.primary',
          bgcolor: autoRotateHoleView ? 'primary.main' + '1A' : 'transparent',
          borderRadius: 2,
          p: 1,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: autoRotateHoleView ? 'primary.main' + '33' : 'action.hover',
          },
        }}
        aria-label={autoRotateHoleView ? "Disable auto-rotate" : "Enable auto-rotate"}
        title={autoRotateHoleView ? "Auto-Rotate On" : "Auto-Rotate Off"}
        size="small"
      >
        <Compass size={16} />
      </IconButton>
    </Box>
  )
}
