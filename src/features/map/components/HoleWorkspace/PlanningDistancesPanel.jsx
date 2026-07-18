import { useMemo } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Box, Typography, Paper, IconButton, Stack, Tooltip, Button } from '@mui/material'
import { buildPlanningView } from '../../utils/planningSegments'
import { getRecommendedClub } from '../../../bag/utils/dispersion'
import { computeDestination, getBearing } from '../../utils/geoDistance'

export default function PlanningDistancesPanel({
  hole,
  onRemoveMarker,
  onInsertPlanningMarker,
  onMarkerMove,
  getLocalElevation,
  removing,
  message,
  clubs = []
}) {
  const { segments } = useMemo(() => buildPlanningView(hole), [hole])

  const handleMaxClick = (segment, targetMarker, recommendedClub) => {
    console.log('[handleMaxClick] Triggered.', {
      targetMarker,
      recommendedClub,
      hasOnMarkerMove: typeof onMarkerMove === 'function',
      hasGetLocalElevation: typeof getLocalElevation === 'function',
    })
    
    if (!targetMarker || !recommendedClub?.total_distance || !onMarkerMove) {
      console.warn('[handleMaxClick] Missing required props/state. Aborting.')
      return
    }
    
    const startLat = Number(segment.start.lat)
    const startLng = Number(segment.start.long ?? segment.start.lng)
    const endLat = Number(segment.end.lat)
    const endLng = Number(segment.end.long ?? segment.end.lng)

    let referenceLat, referenceLng, referenceBearing
    const isMovingEnd = segment.end.marker_type === 'landing_area'
    const isMovingStart = segment.start.marker_type === 'landing_area'
    
    if (isMovingEnd) {
      referenceLat = startLat
      referenceLng = startLng
      referenceBearing = getBearing(startLat, startLng, endLat, endLng)
      console.log('[handleMaxClick] Moving end marker.', { referenceLat, referenceLng, referenceBearing })
    } else if (isMovingStart) {
      referenceLat = endLat
      referenceLng = endLng
      referenceBearing = getBearing(endLat, endLng, startLat, startLng)
      console.log('[handleMaxClick] Moving start marker.', { referenceLat, referenceLng, referenceBearing })
    } else {
      console.warn('[handleMaxClick] Neither start nor end is landing_area. Aborting.')
      return
    }

    let finalLat, finalLng

    if (getLocalElevation) {
      const targetDistance = recommendedClub.total_distance
      const startElevationYards = Number(segment.start.elevation || 0)
      const endElevationYards = Number(segment.end.elevation || 0)
      console.log('[handleMaxClick] Starting binary search for target playsLike distance:', targetDistance, {
        startElevationYards,
        endElevationYards,
      })

      let low = 0
      let high = targetDistance * 2
      let bestLat = null
      let bestLng = null
      let iterations = 0
      const maxIterations = 20
      const tolerance = 0.5 // half a yard

      while (iterations < maxIterations && (high - low) > tolerance) {
        iterations++
        const mid = (low + high) / 2
        const candidate = computeDestination(referenceLat, referenceLng, mid, referenceBearing)
        const elev = getLocalElevation(candidate.lat, candidate.lng)

        let playsLike
        if (elev !== null && !isNaN(elev)) {
          const elevationDiffYards = isMovingEnd
            ? elev - startElevationYards
            : endElevationYards - elev
          playsLike = mid + elevationDiffYards
          console.log(`[handleMaxClick] Iteration ${iterations}:`, {
            midPhysicalYards: mid,
            candidateElevationYards: elev,
            elevationDiffYards,
            computedPlaysLikeYards: playsLike,
            low,
            high,
          })
        } else {
          playsLike = mid
          console.log(`[handleMaxClick] Iteration ${iterations} (NO ELEVATION fallback):`, {
            midPhysicalYards: mid,
            computedPlaysLikeYards: playsLike,
            low,
            high,
          })
        }

        if (Math.abs(playsLike - targetDistance) < tolerance) {
          bestLat = candidate.lat
          bestLng = candidate.lng
          console.log('[handleMaxClick] Binary search reached tolerance limit. Break.', { bestLat, bestLng })
          break
        }

        if (playsLike < targetDistance) {
          low = mid
        } else {
          high = mid
        }
      }

      if (bestLat !== null && bestLng !== null) {
        finalLat = bestLat
        finalLng = bestLng
      } else {
        const mid = (low + high) / 2
        const finalCandidate = computeDestination(referenceLat, referenceLng, mid, referenceBearing)
        finalLat = finalCandidate.lat
        finalLng = finalCandidate.lng
        console.log('[handleMaxClick] Binary search finished iterations without exact match. Using final mid-point.', { finalLat, finalLng })
      }
    } else {
      console.log('[handleMaxClick] getLocalElevation not provided. Falling back to flat distance calculation.')
      const flatDest = computeDestination(referenceLat, referenceLng, recommendedClub.total_distance, referenceBearing)
      finalLat = flatDest.lat
      finalLng = flatDest.lng
    }

    console.log('[handleMaxClick] Executing onMarkerMove with:', {
      markerId: targetMarker.id,
      finalLat,
      finalLng,
    })
    onMarkerMove(targetMarker.id, finalLat, finalLng)
  }

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

            let pct = null
            let percentage = null
            if (recommendedClub && recommendedClub.total_distance) {
              pct = Math.round((s.playsLike / recommendedClub.total_distance) * 100)
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
                    {pct !== null && pct !== 100 && markerToRemove && onMarkerMove && (
                      <Tooltip title="Max Club Distance">
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleMaxClick(s, markerToRemove, recommendedClub)}
                          disabled={removing}
                          sx={{
                            minWidth: 0,
                            p: '2px 6px',
                            height: 24,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: 'primary.main',
                            borderColor: 'primary.main',
                            '&:hover': {
                              bgcolor: 'primary.main',
                              color: '#fff'
                            }
                          }}
                        >
                          MAX
                        </Button>
                      </Tooltip>
                    )}
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

                {/* Add a marker btn between segments (only if not last segment) */}
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
