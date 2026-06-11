// AI assisted development
import { useCallback, useMemo, useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import L from 'leaflet'
import { terrainApi } from '../../../services/api/terrainApi'
import { useMapCourse } from '../../../hooks/useMapCourse'
import { useHoles } from '../../../hooks/useHoles'
import { useMapTools } from '../../../hooks/useMapTools'
import { useMapTerrainOverlays } from '../../../hooks/useMapTerrainOverlays'
import { useMapViewControl } from '../../../hooks/useMapViewControl'
import { useProfile } from '../../../hooks/useProfile'
import { useClubs } from '../../../hooks/useClubs'
import usePlanningAreas from '../../../hooks/usePlanningAreas'
import MapEditorHeader from './MapEditorHeader'
import MapArea from './MapArea'
import HoleWorkspace from './HoleWorkspace'
import PlanningAreaDialog from './PlanningAreaDialog'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'

/**
 * ## Map Canvas Component
 * 
 * The root component for the interactive golf course mapping interface. It orchestrates the entire 
 * workflow by composing the `MapArea` (the main map view) and the `HoleWorkspace` (the side panel 
 * for tools and information), managed through the `useMapTools` hook.
 * 
 * ### Component Responsibilities
 * - **State Orchestration**: Aggregates data and state from multiple specialized hooks: `useMapCourse`, 
 *   `useHoles`, `useMapTerrainOverlays`, `useProfile`, `useClubs`, and `useMapTools`.
 * - **Data Fetching**: Initiates data loading for the map course and its associated holes.
 * - **Permission Control**: Enforces a **planning-only** mode for non-administrative users, 
 *   automatically reverting the workspace mode if a mapping admin is not detected.
 * - **UI Composition**: Renders the main `MapEditorHeader`, the interactive `MapArea`, and the `HoleWorkspace`.
 * - **Event Bridging**: Acts as a central hub for event callbacks, relaying complex interactions between 
 *   the map layers and the workspace tools.
 * 
 * ### Data Flow & Dependencies
 * The `MapCanvas` relies on **callback props** to communicate with its parent components. It receives 
 * its primary map instance from the `MapArea` via the `onMapReady` callback, which is then passed down 
 * to the `useMapTools` hook. The `MapArea` itself is populated with a comprehensive set of props 
 * related to terrain overlays, auto-draw tools, OSM features, and hole markers.
 * 
 * ### Usage Example
 * The component is typically rendered within a layout that manages routing (via `react-router-dom`) and 
 * theme context. It requires a valid `id` parameter from the route for data fetching.
 * 
 * @returns {JSX.Element} A React component representing the full map editing interface.
 */

export default function MapCanvas() {
  const { id } = useParams()
  const [mapInstance, setMapInstance] = useState(null)

  // ── Data hooks ────────────────────────────────────────────
  const { profile } = useProfile()
  const isMappingAdmin = profile?.is_mapping_admin ?? false
  const { clubs } = useClubs(profile?.id)
  const courseState = useMapCourse(id)
  const holesState = useHoles(courseState.course?.id)
  const terrainState = useMapTerrainOverlays(courseState.course?.id)
  const tools = useMapTools(mapInstance)
  const planningAreasState = usePlanningAreas(holesState.selectedHole?.id)
  useMapViewControl(mapInstance, holesState, courseState.course)

  // Dialog state for Planning Areas
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false)
  const [planningDraftFeature, setPlanningDraftFeature] = useState(null)

  // --- Poly-Alignment Mode States ---
  const [isAlignMode, setIsAlignMode] = useState(false)
  const [masterFeatureId, setMasterFeatureId] = useState(null)
  const [adjustFeatureId, setAdjustFeatureId] = useState(null)
  const [alignSaving, setAlignSaving] = useState(false)
  const [alignFeedback, setAlignFeedback] = useState(null)
  const [alignTolerance, setAlignTolerance] = useState(0.1524) // default 6 inches (0.1524m)
  
  // Non-admins are locked to planning mode — enforce it if the mode ever
  // gets set to 'mapping' while the user doesn't have the admin flag.
  useEffect(() => {
    if (!isMappingAdmin && tools.workspaceMode !== 'planning') {
      tools.setWorkspaceMode('planning')
    }
  }, [isMappingAdmin, tools])

  // ── Derived values ────────────────────────────────────────
  const visibleTerrainOverlays = useMemo(() => {
    return terrainState.visibleOverlaysForHole(holesState.selectedHole?.id)
  }, [terrainState, holesState.selectedHole?.id])

  // ── Bridging callbacks ────────────────────────────────────
  // These thin handlers connect hooks that need to coordinate.

  const handleSelectHoleIndex = useCallback((idx) => {
    holesState.selectHoleIndex(idx)
    terrainState.selectOverlay(null)
  }, [holesState, tools, terrainState])

  const handleWorkspaceModeChange = useCallback((mode) => {
    tools.setWorkspaceMode(mode)
    terrainState.selectOverlay(null)
    terrainState.setRegionMessage(null)
  }, [tools, terrainState])

  const handleSaveLocation = useCallback(() => {
    courseState.saveCourseLocation(mapInstance)
  }, [courseState, mapInstance])

  const handleMarkerPick = useCallback(async (tool, lat, lng) => {
    const isClickPlacement = Boolean(tools.activePointTool)
    const data = await holesState.placeMarker(tool, lat, lng)
    if (data) {
      tools.setActivePointTool(null)
      if (isClickPlacement && !holesState.autoRotateHoleView && mapInstance) {
        mapInstance.flyTo([lat, lng], Math.max(mapInstance.getZoom(), 17))
      }
    }
  }, [holesState, tools, mapInstance])

  const handlePolygonDrawn = useCallback((feature) => {
    tools.acceptRegionDraft(feature)
    terrainState.selectOverlay(null)
  }, [tools, terrainState])

  const handlePlanningPolygonDrawn = useCallback((feature) => {
    tools.toggleRegionDraw(false)
    setPlanningDraftFeature(feature)
    setPlanningDialogOpen(true)
  }, [tools])

  const handleSavePlanningArea = useCallback(async (details) => {
    try {
      await planningAreasState.addOrUpdateArea({
        ...details,
        geojsonData: planningDraftFeature
      })
      setPlanningDialogOpen(false)
      setPlanningDraftFeature(null)
    } catch (err) {
      console.error('Failed to save planning area', err)
    }
  }, [planningAreasState, planningDraftFeature])

  const handleSaveRegionDraft = useCallback(async ({ terrainType, label, holeIds }) => {
    const result = await terrainState.saveRegionDraft(tools.regionDraft, { terrainType, label, holeIds })
    if (result?.success) {
      tools.clearRegionDraft()
    }
  }, [terrainState, tools])

  const handleDiscardRegionDraft = useCallback(() => {
    tools.discardRegionDraft()
    terrainState.setRegionMessage(null)
  }, [tools, terrainState])

  const handleOSMFeatureSelect = useCallback(async (feature, isShiftClick) => {
    if (isShiftClick) {
      const currentHole = holesState.selectedHole
      await terrainState.quickImportOSM(feature, currentHole?.id)
    } else {
      tools.acceptOSMFeatureAsDraft(feature)
      terrainState.selectOverlay(null)
      terrainState.setRegionMessage(null)
    }
  }, [holesState, terrainState, tools])

  const handleRegionDrawActiveChange = useCallback((active) => {
    tools.toggleRegionDraw(active)
    if (active) terrainState.selectOverlay(null)
  }, [tools, terrainState])

  const handleOsmToolActiveChange = useCallback((active) => {
    tools.toggleOsmTool(active)
    if (active) terrainState.selectOverlay(null)
  }, [tools, terrainState])

  // --- Poly-Alignment Callbacks ---
  const handleToggleAlignMode = useCallback(() => {
    setIsAlignMode((prev) => {
      const next = !prev
      if (next) {
        tools.cancelAllTools()
        terrainState.selectOverlay(null)
        setMasterFeatureId(null)
        setAdjustFeatureId(null)
        setAlignFeedback(null)
        setAlignTolerance(0.1524) // reset to default 6 inches
      } else {
        setMasterFeatureId(null)
        setAdjustFeatureId(null)
        setAlignFeedback(null)
      }
      return next
    })
  }, [tools, terrainState])

  const handleAlignFeatureClick = useCallback((id) => {
    console.log('[Refine Shapes] Clicked shape ID:', id)
    if (!masterFeatureId) {
      console.log('[Refine Shapes] Selecting Master Anchor ID:', id)
      setMasterFeatureId(id)
    } else if (masterFeatureId === id) {
      console.log('[Refine Shapes] Deselecting Master Anchor')
      setMasterFeatureId(null)
      setAdjustFeatureId(null)
    } else {
      console.log('[Refine Shapes] Selecting/Toggling Adjust Target ID:', id)
      setAdjustFeatureId((prev) => {
        const next = prev === id ? null : id
        console.log('[Refine Shapes] Adjust Target transitioning from', prev, 'to', next)
        return next
      })
    }
  }, [masterFeatureId])

  const handleExecuteAlignment = useCallback(async () => {
    console.log('[Refine Shapes] Executing alignment. Master:', masterFeatureId, 'Adjust:', adjustFeatureId, 'Tolerance:', alignTolerance)
    if (!masterFeatureId || !adjustFeatureId) {
      console.warn('[Refine Shapes] Cannot execute: missing Master or Adjust IDs')
      return
    }
    setAlignSaving(true)
    setAlignFeedback(null)

    try {
      console.log('[Refine Shapes] Calling supabase RPC with tolerance:', alignTolerance)
      const returnedGeometry = await terrainApi.alignSelectedFeatures(
        masterFeatureId,
        adjustFeatureId,
        alignTolerance
      )
      console.log('[Refine Shapes] supabase RPC response returnedGeometry:', returnedGeometry)

      if (returnedGeometry) {
        let geom = returnedGeometry
        if (typeof geom === 'string') {
          try {
            geom = JSON.parse(geom)
            console.log('[Refine Shapes] Parsed geometry string to object:', geom)
          } catch (e) {
            console.error('[Refine Shapes] Failed to parse returned geometry JSON:', e)
          }
        }

        if (geom && geom.coordinates) {
          // Check if coordinates changed
          const originalRegion = terrainState.terrainOverlays.find(o => o.id === adjustFeatureId)
          if (originalRegion && originalRegion.geojson_data) {
            const originalGeom = originalRegion.geojson_data.geometry || originalRegion.geojson_data
            const originalCoordsStr = JSON.stringify(originalGeom.coordinates)
            const returnedCoordsStr = JSON.stringify(geom.coordinates)
            
            console.log('[Refine Shapes] Original geometry coordinates string length:', originalCoordsStr.length)
            console.log('[Refine Shapes] Returned geometry coordinates string length:', returnedCoordsStr.length)
            
            if (originalCoordsStr === returnedCoordsStr) {
              console.warn('[Refine Shapes] Snap completed but geometry is identical. No vertices were within tolerance.')
              setAlignFeedback('No vertices were close enough to snap. Try increasing the snapping tolerance or moving the shapes closer.')
              setAlignSaving(false)
              return
            }
          }

          console.log('[Refine Shapes] Updating Leaflet layer natively. geom type:', geom.type)
          let updatedLayerCount = 0
          if (mapInstance) {
            mapInstance.eachLayer((layer) => {
              const path = layer
              if (path.__region && path.__region.id === adjustFeatureId) {
                console.log('[Refine Shapes] Found matching Leaflet layer:', path)
                if (typeof path.setLatLngs === 'function') {
                  const levelsDeep = geom.type === 'MultiPolygon' ? 2 : 1
                  const latlngs = L.GeoJSON.coordsToLatLngs(geom.coordinates, levelsDeep)
                  console.log('[Refine Shapes] Calculated Leaflet LatLngs:', latlngs)
                  path.setLatLngs(latlngs)
                  if (typeof path.redraw === 'function') {
                    path.redraw()
                    console.log('[Refine Shapes] Leaflet layer redrawn.')
                  }
                  updatedLayerCount++
                } else {
                  console.warn('[Refine Shapes] Found layer but setLatLngs is not a function:', path)
                }
              }
            })
          }
          console.log('[Refine Shapes] Native Leaflet layers updated count:', updatedLayerCount)
        } else {
          console.warn('[Refine Shapes] Geometry has no coordinates:', geom)
        }

        // Replace/update local state cache
        console.log('[Refine Shapes] Triggering state cache overlays reload...')
        await terrainState.loadOverlays()
        console.log('[Refine Shapes] State cache overlays reload completed.')

        // Clear states
        setIsAlignMode(false)
        setMasterFeatureId(null)
        setAdjustFeatureId(null)
        setAlignFeedback(null)
        console.log('[Refine Shapes] Alignment successfully completed and states reset.')
      } else {
        console.warn('[Refine Shapes] RPC returned empty or null geometry.')
        setAlignFeedback('Failed: Snapping returned empty geometry.')
      }
    } catch (err) {
      console.error('[Refine Shapes] Failed to snap features:', err)
      setAlignFeedback(`Snapping failed: ${err.message || err}`)
    } finally {
      setAlignSaving(false)
    }
  }, [masterFeatureId, adjustFeatureId, alignTolerance, mapInstance, terrainState])

  // ── Early returns ─────────────────────────────────────────

  if (!id) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Missing course id.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-all duration-200">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (courseState.loading) {
    return (
      <div className="h-full w-full min-h-0 flex items-center justify-center bg-slate-900 text-slate-400">
        Loading course…
      </div>
    )
  }

  if (courseState.fetchError) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Could not load this course: {courseState.fetchError}</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-all duration-200">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!courseState.course) {
    return (
      <div className="h-full w-full min-h-0 flex flex-col items-center justify-center gap-4 bg-slate-900 text-slate-300 px-6 text-center">
        <p>Course not found or you do not have access.</p>
        <Link to="/" className="text-emerald-400 hover:text-emerald-300 transition-all duration-200">
          Back to Dashboard
        </Link>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────

  const isPlanning = tools.workspaceMode === 'planning'

  return (
    <div className="h-full w-full min-h-0 flex flex-col bg-slate-900 border-t border-slate-800">
      <MapEditorHeader
        courseId={id}
        courseName={courseState.course.name}
        workspaceMode={tools.workspaceMode}
        onWorkspaceModeChange={handleWorkspaceModeChange}
        isMappingAdmin={isMappingAdmin}
        savingLocation={courseState.savingLocation}
        locationFeedback={courseState.locationFeedback}
        usingFallback={courseState.usingFallback}
        onSaveLocation={handleSaveLocation}
        mapReady={Boolean(mapInstance)}
        markerMessage={holesState.markerMessage}
        regionMessage={terrainState.regionMessage}
        regionDraft={tools.regionDraft}
      />

      <HoleWorkspace
        mapArea={
          <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <MapArea
              center={courseState.center}
              zoom={courseState.zoom}
              holesLoading={holesState.holesLoading}
              onMapReady={setMapInstance}
              visibleTerrainOverlays={visibleTerrainOverlays}
              selectedTerrainOverlayId={isPlanning ? null : terrainState.selectedTerrainOverlayId}
              onSelectTerrainOverlayId={terrainState.selectOverlay}
              regionDrawActive={tools.regionDrawActive}
              suppressTerrainInteractions={
                isPlanning ||
                tools.osmToolActive ||
                Boolean(tools.regionDraft) ||
                Boolean(tools.activePointTool) ||
                isAlignMode
              }
              onPolygonDrawn={handlePolygonDrawn}
              onGeometryCommit={terrainState.commitGeometry}
              osmToolActive={tools.osmToolActive && !isPlanning && !tools.regionDraft}
              osmFeaturesData={tools.osmFeaturesData}
              onOSMFeatureSelect={handleOSMFeatureSelect}
              regionDraft={isPlanning ? null : tools.regionDraft}
              onRegionDraftGeometryChange={tools.updateRegionDraftGeometry}
              selectedHole={holesState.selectedHole}
              activePointTool={tools.activePointTool}
              onMarkerPick={handleMarkerPick}
              onMarkerMove={holesState.movePlanningMarker}
              onMapMarkerMove={holesState.moveMapMarker}
              workspaceMode={tools.workspaceMode}
              suppressHoleMapPick={
                tools.regionDrawActive ||
                tools.osmToolActive ||
                Boolean(tools.regionDraft) ||
                isAlignMode ||
                (isPlanning &&
                  tools.activePointTool !== 'tee_shot_location' &&
                  tools.activePointTool !== 'landing_area' &&
                  tools.activePointTool !== 'pin_location')
              }
              profile={profile}
              clubs={clubs}
              planningAreas={planningAreasState.areas}
              planningDrawShape={tools.planningDrawShape}
              onPlanningPolygonDrawn={handlePlanningPolygonDrawn}
              onPlanningGeometryCommit={(id, geojson) => {
                const existing = planningAreasState.areas.find(a => a.id === id)
                if (existing) {
                  planningAreasState.addOrUpdateArea({
                    id,
                    label: existing.label,
                    description: existing.description,
                    style: existing.style,
                    geojsonData: geojson
                  })
                }
              }}
              onPlanningAreaDelete={planningAreasState.removeArea}
              showLidar={tools.showLidar && tools.workspaceMode === 'planning'}
              isAlignMode={isAlignMode}
              masterFeatureId={masterFeatureId}
              adjustFeatureId={adjustFeatureId}
              onAlignFeatureClick={handleAlignFeatureClick}
            />

            {/* Floating Alignment Mode Control Panel */}
            {isAlignMode && (
              <Paper
                elevation={8}
                sx={{
                  position: 'absolute',
                  bottom: 24,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1000,
                  p: 2.5,
                  bgcolor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 2,
                  width: 420,
                  maxWidth: '92%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#38bdf8',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(56, 189, 248, 0.7)' },
                        '70%': { transform: 'scale(1)', boxShadow: '0 0 0 8px rgba(56, 189, 248, 0)' },
                        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(56, 189, 248, 0)' },
                      },
                    }}
                  />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: 1.2 }}>
                    Refine Shapes Mode
                  </Typography>
                </Box>

                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.825rem', lineHeight: 1.4 }}>
                  Snaps the boundary vertices of a target shape to a master anchor shape within the selected tolerance, dissolving redundant coordinates.
                </Typography>

                <FormControl 
                  size="small" 
                  fullWidth
                  sx={{ 
                    '& .MuiInputLabel-root': { color: '#94a3b8', fontSize: '0.8rem' },
                    '& .MuiInputLabel-root.Mui-focused': { color: '#38bdf8' },
                    '& .MuiOutlinedInput-root': {
                      color: '#f8fafc',
                      fontSize: '0.825rem',
                      '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                      '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                      '&.Mui-focused fieldset': { borderColor: '#38bdf8' },
                    },
                    '& .MuiSelect-icon': { color: '#94a3b8' }
                  }}
                >
                  <InputLabel id="align-tolerance-label">Snapping Tolerance</InputLabel>
                  <Select
                    labelId="align-tolerance-label"
                    value={alignTolerance}
                    label="Snapping Tolerance"
                    onChange={(e) => {
                      setAlignTolerance(e.target.value)
                      setAlignFeedback(null)
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          bgcolor: '#1e293b',
                          color: '#f8fafc',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          '& .MuiMenuItem-root': {
                            fontSize: '0.825rem',
                            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.08)' },
                            '&.Mui-selected': { bgcolor: 'rgba(56, 189, 248, 0.2)', '&:hover': { bgcolor: 'rgba(56, 189, 248, 0.3)' } },
                          }
                        }
                      }
                    }}
                  >
                    <MenuItem value={0.0762}>3 Inches (0.076m)</MenuItem>
                    <MenuItem value={0.1524}>6 Inches (0.152m) — Default</MenuItem>
                    <MenuItem value={0.3048}>1 Foot (0.305m)</MenuItem>
                    <MenuItem value={0.6096}>2 Feet (0.610m)</MenuItem>
                    <MenuItem value={1.524}>5 Feet (1.524m)</MenuItem>
                    <MenuItem value={3.048}>10 Feet (3.048m)</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, bgcolor: 'rgba(30, 41, 59, 0.5)', p: 1.5, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.04)' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      1. Master Anchor (Fixed)
                    </Typography>
                    <Typography variant="caption" sx={{ color: masterFeatureId ? '#10b981' : '#94a3b8', fontWeight: 700 }}>
                      {masterFeatureId ? 'Selected ✓' : 'Click shape on map...'}
                    </Typography>
                  </Box>
                  {masterFeatureId && (
                    <Typography variant="body2" sx={{ color: 'text.primary', pl: 1, borderLeft: '2px solid #10b981', fontSize: '0.8rem' }}>
                      {(() => {
                        const region = terrainState.terrainOverlays.find(o => o.id === masterFeatureId)
                        return region ? `${region.terrain_type.toUpperCase()}${region.label ? ` - ${region.label}` : ''}` : 'Loading...'
                      })()}
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      2. Adjust Target (Snaps)
                    </Typography>
                    <Typography variant="caption" sx={{ color: adjustFeatureId ? '#f97316' : '#94a3b8', fontWeight: 700 }}>
                      {adjustFeatureId ? 'Selected ✓' : masterFeatureId ? 'Click second shape...' : 'Select Master first'}
                    </Typography>
                  </Box>
                  {adjustFeatureId && (
                    <Typography variant="body2" sx={{ color: 'text.primary', pl: 1, borderLeft: '2px solid #f97316', fontSize: '0.8rem' }}>
                      {(() => {
                        const region = terrainState.terrainOverlays.find(o => o.id === adjustFeatureId)
                        return region ? `${region.terrain_type.toUpperCase()}${region.label ? ` - ${region.label}` : ''}` : 'Loading...'
                      })()}
                    </Typography>
                  )}
                </Box>

                {alignFeedback && (
                  <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 0.5, bgcolor: 'rgba(239, 68, 68, 0.1)', p: 1, borderRadius: 1 }}>
                    {alignFeedback}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
                  <Button
                    variant="text"
                    color="inherit"
                    disabled={alignSaving}
                    onClick={handleToggleAlignMode}
                    sx={{ color: 'text.secondary', textTransform: 'none', fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    disabled={!masterFeatureId || !adjustFeatureId || alignSaving}
                    onClick={handleExecuteAlignment}
                    startIcon={alignSaving && <CircularProgress size={16} color="inherit" />}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 3,
                      bgcolor: 'primary.main',
                      '&:hover': { bgcolor: 'primary.dark' },
                    }}
                  >
                    {alignSaving ? 'Aligning...' : 'Snap Target to Master'}
                  </Button>
                </Box>
              </Paper>
            )}
          </Box>
        }
        holes={holesState.holes}
        selectedIndex={holesState.selectedHoleIndex}
        onSelectIndex={handleSelectHoleIndex}
        activePointTool={tools.activePointTool}
        onActivePointToolChange={tools.setActivePointTool}
        onSaveHoleStats={holesState.saveHoleStats}
        statsSaving={holesState.statsSaving}
        statsMessage={holesState.statsMessage}
        autoRotateHoleView={holesState.autoRotateHoleView}
        onAutoRotateHoleViewChange={holesState.setAutoRotateHoleView}
        regionDrawActive={tools.regionDrawActive}
        onRegionDrawActiveChange={handleRegionDrawActiveChange}
        planningDrawShape={tools.planningDrawShape}
        onPlanningDrawShapeChange={tools.setPlanningDrawShape}
        osmToolActive={tools.osmToolActive}
        onOsmToolActiveChange={handleOsmToolActiveChange}
        osmFilters={tools.osmFilters}
        onOsmFiltersChange={tools.setOsmFilters}
        osmLoading={tools.osmLoading}
        osmMessage={tools.osmMessage}
        regionDraft={tools.regionDraft}
        regionDraftKey={tools.regionDraftKey}
        showLidar={tools.showLidar}
        onShowLidarChange={tools.setShowLidar}
        onDiscardRegionDraft={handleDiscardRegionDraft}
        onSaveRegionDraft={handleSaveRegionDraft}
        regionSaving={terrainState.regionSaving}
        regionError={tools.regionDraft ? terrainState.regionMessage : null}
        selectedRegionOverlay={terrainState.selectedRegionOverlay}
        onClearRegionSelection={terrainState.clearSelection}
        onUpdateRegionProperties={terrainState.updateRegionProperties}
        onDeleteRegion={terrainState.deleteRegion}
        regionUpdateSaving={terrainState.regionUpdateSaving}
        regionUpdateMessage={terrainState.regionUpdateMessage}
        workspaceMode={tools.workspaceMode}
        onRemovePlanningMarker={holesState.removePlanningMarker}
        removePlanningSaving={holesState.removePlanningSaving}
        removePlanningMessage={holesState.removePlanningMessage}
        onInsertPlanningMarker={holesState.insertPlanningMarkerMidpoint}
        onMarkerMove={holesState.movePlanningMarker}
        onMapMarkerMove={holesState.moveMapMarker}
        clubs={clubs}
        profile={profile}
        isAlignMode={isAlignMode}
        onToggleAlignMode={handleToggleAlignMode}
      />
      <PlanningAreaDialog
        open={planningDialogOpen}
        onClose={() => {
          setPlanningDialogOpen(false)
          setPlanningDraftFeature(null)
        }}
        onSave={handleSavePlanningArea}
      />
    </div>
  )
}
