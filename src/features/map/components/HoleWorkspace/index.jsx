// AI assisted development
import { HOLE_MARKER_KIND, markerIsSet } from '../../utils/holeMarkers'

import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'

import HoleNavigationHeader from './HoleNavigationHeader'
import WorkspaceToolsSidebar from './WorkspaceToolsSidebar'
import WorkspacePropertiesSidebar from './WorkspacePropertiesSidebar'

/**
 * @typedef {object} Hole
 * @property {string} id
 * @property {number} hole_number
 * @property {number|null} par
 * @property {number|null} stroke_index
 * @property {number|null} scorecard_yardage
 * @property {Array<{ id?: string, marker_kind: string, lat: number, lng: number, is_active?: boolean }>} [mapMarkers]
 */

export default function HoleWorkspace({
  mapArea,
  holes,
  selectedIndex,
  onSelectIndex,
  activePointTool,
  onActivePointToolChange,
  onSaveHoleStats,
  statsSaving,
  statsMessage,
  autoRotateHoleView,
  onAutoRotateHoleViewChange,
  regionDrawActive,
  onRegionDrawActiveChange,
  autoDrawActive,
  onAutoDrawActiveChange,
  autoDrawTolerance,
  onAutoDrawToleranceChange,
  autoDrawMaxRadiusYards,
  onAutoDrawMaxRadiusYardsChange,
  autoDrawMessage,
  osmToolActive,
  onOsmToolActiveChange,
  osmFilters = {
    tees: true,
    greens: true,
    fairways: true,
    bunkers: true,
    water: true,
    rough: true,
  },
  onOsmFiltersChange,
  osmLoading = false,
  osmMessage = null,
  regionDraft,
  regionDraftKey,
  onDiscardRegionDraft,
  onSaveRegionDraft,
  regionSaving,
  regionError,
  selectedRegionOverlay,
  onClearRegionSelection,
  onUpdateRegionProperties,
  onDeleteRegion,
  regionUpdateSaving,
  regionUpdateMessage,
  workspaceMode = 'mapping',
  onRemovePlanningMarker,
  removePlanningSaving = false,
  removePlanningMessage = null,
  onInsertPlanningMarker,
  clubs = [],
  profile = null,
}) {
  /** @type {Hole | null} */
  const selectedHole = holes[selectedIndex] ?? null

  const isPlanning = workspaceMode === 'planning'

  const showRegionPropertiesPanel =
    Boolean(selectedRegionOverlay) && !regionDraft && !isPlanning

  const regionPropsFormKey = selectedRegionOverlay
    ? `${selectedRegionOverlay.id}|${selectedRegionOverlay.terrain_type}|${selectedRegionOverlay.label ?? ''}|${[...selectedRegionOverlay.holeIds].sort().join(',')}`
    : 'none'

  const greenOk = selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER)
  const teeOk = selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.TEE_BACK)
  const landingCount = selectedHole?.planningMarkers?.filter(m => m.marker_type === 'landing_area').length ?? 0

  return (
    <Grid
      container
      spacing={0}
      sx={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        height: { xs: 'auto', md: '100%' },
        flexDirection: { xs: 'column', md: 'row' },
        flexWrap: 'nowrap',
      }}
    >
      {/* Left Sidebar (Tools & Properties) - 50% width on md screens */}
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderRight: { xs: 'none', md: '1px solid' },
          borderBottom: { xs: '1px solid', md: 'none' },
          borderColor: 'divider',
          bgcolor: 'rgba(15, 23, 42, 0.9)', // slate-950/90 equivalent
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          height: { xs: 'auto', md: '100%' },
          minHeight: 0,
        }}
      >
        <HoleNavigationHeader
          holes={holes}
          selectedIndex={selectedIndex}
          selectedHole={selectedHole}
          onSelectIndex={onSelectIndex}
          autoRotateHoleView={autoRotateHoleView}
          onAutoRotateHoleViewChange={onAutoRotateHoleViewChange}
        />

        {/* Content split container - side-by-side on desktop, stacked on mobile */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, flex: 1, minHeight: 0 }}>
          {!isPlanning && (
            <WorkspaceToolsSidebar
              isPlanning={isPlanning}
              selectedHole={selectedHole}
              landingCount={landingCount}
              greenOk={greenOk}
              teeOk={teeOk}
              activePointTool={activePointTool}
              onActivePointToolChange={onActivePointToolChange}
              regionDrawActive={regionDrawActive}
              onRegionDrawActiveChange={onRegionDrawActiveChange}
              autoDrawActive={autoDrawActive}
              onAutoDrawActiveChange={onAutoDrawActiveChange}
              autoDrawTolerance={autoDrawTolerance}
              onAutoDrawToleranceChange={onAutoDrawToleranceChange}
              autoDrawMaxRadiusYards={autoDrawMaxRadiusYards}
              onAutoDrawMaxRadiusYardsChange={onAutoDrawMaxRadiusYardsChange}
              autoDrawMessage={autoDrawMessage}
              osmToolActive={osmToolActive}
              onOsmToolActiveChange={onOsmToolActiveChange}
              osmFilters={osmFilters}
              onOsmFiltersChange={onOsmFiltersChange}
              osmLoading={osmLoading}
              osmMessage={osmMessage}
              regionDraft={regionDraft}
              regionDraftKey={regionDraftKey}
              holes={holes}
              onDiscardRegionDraft={onDiscardRegionDraft}
              onSaveRegionDraft={onSaveRegionDraft}
              regionSaving={regionSaving}
              regionError={regionError}
            />
          )}

          {/* Sub-column 2: Properties & Details */}
          <WorkspacePropertiesSidebar
            showRegionPropertiesPanel={showRegionPropertiesPanel}
            isPlanning={isPlanning}
            selectedHole={selectedHole}
            selectedRegionOverlay={selectedRegionOverlay}
            regionPropsFormKey={regionPropsFormKey}
            holes={holes}
            onUpdateRegionProperties={onUpdateRegionProperties}
            onDeleteRegion={onDeleteRegion}
            onClearRegionSelection={onClearRegionSelection}
            regionUpdateSaving={regionUpdateSaving}
            regionUpdateMessage={regionUpdateMessage}
            onRemovePlanningMarker={onRemovePlanningMarker}
            removePlanningSaving={removePlanningSaving}
            removePlanningMessage={removePlanningMessage}
            onInsertPlanningMarker={onInsertPlanningMarker}
            clubs={clubs}
            onSaveHoleStats={onSaveHoleStats}
            statsSaving={statsSaving}
            statsMessage={statsMessage}
          />
        </Box>
      </Grid>

      {/* Right Column: Map Area - 50% width on md screens */}
      <Grid
        size={{ xs: 12, md: 6 }}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: { xs: '50vh', md: '100%' },
          position: 'relative',
          minHeight: 0,
          flexGrow: 1,
        }}
      >
        {mapArea}
      </Grid>
    </Grid>
  )
}
