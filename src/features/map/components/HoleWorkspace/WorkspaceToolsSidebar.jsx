import { Target, MapPin, Pentagon, Square, Circle, DownloadCloud, Zap } from 'lucide-react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'

import ToolButton from './ToolButton'
import OSMFeaturePanel from './OSMFeaturePanel'
import RegionOverlayAssignForm from './RegionOverlayAssignForm'

export default function WorkspaceToolsSidebar({
  isPlanning,
  selectedHole,
  landingCount,
  greenOk,
  teeOk,
  activePointTool,
  onActivePointToolChange,
  regionDrawActive,
  onRegionDrawActiveChange,
  planningDrawShape,
  onPlanningDrawShapeChange,
  osmToolActive,
  onOsmToolActiveChange,
  osmFilters,
  onOsmFiltersChange,
  osmLoading,
  osmMessage,
  regionDraft,
  regionDraftKey,
  holes,
  onDiscardRegionDraft,
  onSaveRegionDraft,
  regionSaving,
  regionError,
  showLidar = false,
  onShowLidarChange,
  autoHealHole,
  isAlignMode = false,
  onToggleAlignMode,
}) {
  return (
    <Box
      sx={{
        flex: 1,
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        borderRight: { xs: 'none', md: '1px solid' },
        borderBottom: { xs: '1px solid', md: 'none' },
        borderColor: 'divider',
        overflowY: 'auto',
        minHeight: 0,
      }}
    >

      {isPlanning && (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <ToolButton
            icon={Pentagon}
            label="Polygon"
            hint="Draw freeform area"
            active={regionDrawActive && planningDrawShape === 'Polygon'}
            disabled={!selectedHole}
            onClick={() => {
              onPlanningDrawShapeChange('Polygon')
              onRegionDrawActiveChange(planningDrawShape === 'Polygon' ? !regionDrawActive : true)
            }}
          />
          <ToolButton
            icon={Square}
            label="Rectangle"
            hint="Draw rectangular area"
            active={regionDrawActive && planningDrawShape === 'Rectangle'}
            disabled={!selectedHole}
            onClick={() => {
              onPlanningDrawShapeChange('Rectangle')
              onRegionDrawActiveChange(planningDrawShape === 'Rectangle' ? !regionDrawActive : true)
            }}
          />
          <ToolButton
            icon={Circle}
            label="Circle"
            hint="Draw circular area"
            active={regionDrawActive && planningDrawShape === 'Circle'}
            disabled={!selectedHole}
            onClick={() => {
              onPlanningDrawShapeChange('Circle')
              onRegionDrawActiveChange(planningDrawShape === 'Circle' ? !regionDrawActive : true)
            }}
          />
        </Box>
      )}

      {isPlanning && (
        <Box sx={{ mt: 1, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showLidar}
                onChange={(e) => onShowLidarChange(e.target.checked)}
                disabled={!selectedHole}
                color="primary"
              />
            }
            label="Show Green Map"
            labelPlacement="start"
            sx={{
              width: '100%',
              justifyContent: 'space-between',
              mx: 0,
              color: 'text.primary',
              '& .MuiTypography-root': {
                fontSize: '0.875rem',
                fontWeight: 600,
              },
            }}
          />
        </Box>
      )}

      {!isPlanning && (
        <ToolButton
          icon={MapPin}
          label="Back tee"
          hint={teeOk ? 'Placed — click to move' : 'Click map for furthest tee'}
          active={activePointTool === 'tee_back'}
          disabled={!selectedHole}
          onClick={() =>
            onActivePointToolChange(activePointTool === 'tee_back' ? null : 'tee_back')
          }
        />
      )}

      {!isPlanning && (
        <ToolButton
          icon={Pentagon}
          label="Draw region"
          hint={
            regionDrawActive
              ? 'Click map to add corners; click first corner to close'
              : 'Polygon over green, bunkers, water…'
          }
          active={regionDrawActive}
          disabled={!selectedHole || Boolean(regionDraft)}
          onClick={() => onRegionDrawActiveChange(!regionDrawActive)}
        />
      )}

      {!isPlanning && (
        <ToolButton
          icon={Zap}
          label="Refine Shapes"
          hint={
            isAlignMode
              ? 'Select master anchor, then adjust target'
              : 'Snap adjacent region borders together (6 in. tolerance)'
          }
          active={isAlignMode}
          disabled={!selectedHole || Boolean(regionDraft)}
          onClick={onToggleAlignMode}
        />
      )}



      {!isPlanning && (
        <ToolButton
          icon={DownloadCloud}
          label="Fetch OSM Features"
          hint={
            osmToolActive
              ? 'Click on highlighted map features'
              : 'Load OpenStreetMap features in this view'
          }
          active={osmToolActive}
          disabled={!selectedHole || Boolean(regionDraft)}
          onClick={() => onOsmToolActiveChange(!osmToolActive)}
        />
      )}

      {!isPlanning && (
        <OSMFeaturePanel
          osmToolActive={osmToolActive}
          osmFilters={osmFilters}
          onOsmFiltersChange={onOsmFiltersChange}
          osmLoading={osmLoading}
          osmMessage={osmMessage}
        />
      )}



      {(activePointTool ||
        (!isPlanning && (regionDrawActive || osmToolActive || isAlignMode))) && (
        <Button
          variant="text"
          color="inherit"
          onClick={() => {
            onActivePointToolChange(null)
            onRegionDrawActiveChange(false)
            onOsmToolActiveChange(false)
            if (isAlignMode) {
              onToggleAlignMode()
            }
          }}
          sx={{
            fontSize: '0.75rem',
            color: 'text.secondary',
            '&:hover': { color: 'text.primary', bgcolor: 'transparent' },
            py: 0.5,
            textTransform: 'none',
          }}
        >
          Cancel tool
        </Button>
      )}

      {!isPlanning && regionDraft && selectedHole && (
        <RegionOverlayAssignForm
          key={regionDraftKey}
          holes={holes}
          selectedHole={selectedHole}
          onDiscardRegionDraft={onDiscardRegionDraft}
          onSaveRegionDraft={onSaveRegionDraft}
          regionSaving={regionSaving}
          regionError={regionError}
        />
      )}
    </Box>
  )
}
