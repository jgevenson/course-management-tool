import { Target, MapPin, Pentagon, Square, Circle, WandSparkles, DownloadCloud, Zap, Layers } from 'lucide-react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'

import ToolButton from './ToolButton'
import OSMFeaturePanel from './OSMFeaturePanel'
import AutoDrawPanel from './AutoDrawPanel'
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
  autoDrawActive,
  onAutoDrawActiveChange,
  autoDrawTolerance,
  onAutoDrawToleranceChange,
  autoDrawMaxRadiusYards,
  onAutoDrawMaxRadiusYardsChange,
  autoDrawMessage,
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
  showLidar,
  onShowLidarChange,
  autoHealHole,
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
          <ToolButton
            icon={Layers}
            label="Show LiDAR"
            hint="Overlay 3DEP contours"
            active={showLidar}
            disabled={!selectedHole}
            onClick={() => onShowLidarChange(!showLidar)}
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
          icon={WandSparkles}
          label="Auto draw"
          hint={
            autoDrawActive
              ? 'Click a seed color inside the area'
              : 'Experimental color trace from one seed point'
          }
          active={autoDrawActive}
          disabled={!selectedHole || Boolean(regionDraft)}
          onClick={() => onAutoDrawActiveChange(!autoDrawActive)}
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

      {!isPlanning && (
        <AutoDrawPanel
          autoDrawActive={autoDrawActive}
          autoDrawTolerance={autoDrawTolerance}
          onAutoDrawToleranceChange={onAutoDrawToleranceChange}
          autoDrawMaxRadiusYards={autoDrawMaxRadiusYards}
          onAutoDrawMaxRadiusYardsChange={onAutoDrawMaxRadiusYardsChange}
          autoDrawMessage={autoDrawMessage}
        />
      )}

      {(activePointTool ||
        (!isPlanning && (regionDrawActive || autoDrawActive || osmToolActive))) && (
        <Button
          variant="text"
          color="inherit"
          onClick={() => {
            onActivePointToolChange(null)
            onRegionDrawActiveChange(false)
            onAutoDrawActiveChange(false)
            onOsmToolActiveChange(false)
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
