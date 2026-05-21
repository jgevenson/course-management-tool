import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Box, Typography, Paper, IconButton, Stack, Tooltip } from '@mui/material'
import { buildPlanningView } from '../../utils/planningSegments'
import { getRecommendedClub } from '../../../bag/utils/dispersion'

export default function PlanningDistancesPanel({ hole, onRemoveMarker, onInsertPlanningMarker, removing, message, clubs = [] }) {
  const { segments } = useMemo(() => buildPlanningView(hole), [hole])

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minHeight: 0, overflowY: 'auto' }}>
      {segments.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.2 }}>
          Add a <Typography component="span" variant="inherit" color="text.primary">landing zone</Typography> or ensure mapping markers are set to see distances.
        </Typography>
      ) : (
        <Stack spacing={0}>
          {segments.map((s, idx) => {
            const recommendedClub = getRecommendedClub(s.playsLike, clubs)
            const clubLabel = recommendedClub ? recommendedClub.short_name : '--'

            let percentage = null
            if (recommendedClub && recommendedClub.total_distance) {
              const pct = Math.round((s.playsLike / recommendedClub.total_distance) * 100)
              percentage = `${pct}%`
            }

            const markerToRemove = s.end.marker_type === 'landing_area' 
              ? s.end 
              : (s.start.marker_type === 'landing_area' ? s.start : null)

            return (
              <Box key={s.id} sx={{ display: 'flex', flexDirection: 'column' }}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    bgcolor: 'rgba(15, 23, 42, 0.8)', // matching slate-900/80
                    borderColor: 'divider',
                    borderWidth: 2,
                    borderRadius: 1.5
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h4" fontWeight="medium" color="text.primary">
                      {clubLabel}
                    </Typography>
                    {percentage && (
                      <Typography variant="body2" fontWeight="medium" color="text.secondary">
                        {percentage}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="h4" fontWeight="medium" color="text.primary" sx={{ fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                          {s.yards}y
                        </Typography>
                        {s.elevationDiffFeet !== 0 && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', lineHeight: 1, color: 'text.secondary', ml: 0.5 }}>
                            <Typography variant="caption" sx={{ fontSize: '10px', lineHeight: 1 }}>
                              {s.elevationDiffFeet > 0 ? '^' : 'v'}
                            </Typography>
                            <Typography variant="caption" fontWeight="bold" sx={{ fontSize: '10px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                              {Math.abs(s.elevationDiffFeet)}ft
                            </Typography>
                          </Box>
                        )}
                      </Box>
                      {s.playsLike !== s.yards && (
                        <Typography variant="body2" fontWeight="medium" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.5 }}>
                          {s.playsLike}y
                        </Typography>
                      )}
                    </Box>
                    {markerToRemove && (
                      <IconButton
                        onClick={() => onRemoveMarker && onRemoveMarker(markerToRemove.id)}
                        disabled={removing}
                        size="small"
                        sx={{
                          color: 'text.secondary',
                          '&:hover': { color: 'error.main' },
                        }}
                      >
                        <Trash2 size={18} />
                      </IconButton>
                    )}
                  </Box>
                </Paper>

                {/* + button to split this segment */}
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: -1.5, mb: -1.5, zIndex: 10, position: 'relative', py: 1.5 }}>
                  <Tooltip title="Split this shot" placement="right">
                    <IconButton
                      onClick={() => onInsertPlanningMarker && onInsertPlanningMarker(s.start, s.end)}
                      size="small"
                      sx={{
                        bgcolor: '#020617', // slate-950
                        border: '2px solid',
                        borderColor: '#475569', // slate-600
                        color: '#cbd5e1', // slate-300
                        width: 24,
                        height: 24,
                        boxShadow: 1,
                        '&:hover': {
                          bgcolor: '#1e293b', // slate-800
                          borderColor: 'primary.main',
                          color: 'primary.light',
                        },
                      }}
                    >
                      <Plus size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            )
          })}
        </Stack>
      )}
    </Box>
  )
}
