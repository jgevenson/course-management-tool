import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

import RegionPropertiesForm from './RegionPropertiesForm'
import PlanningDistancesPanel from './PlanningDistancesPanel'
import HolePropertyForm from './HolePropertyForm'

export default function WorkspacePropertiesSidebar({
  showRegionPropertiesPanel,
  isPlanning,
  selectedHole,
  selectedRegionOverlay,
  regionPropsFormKey,
  holes,
  onUpdateRegionProperties,
  onDeleteRegion,
  onClearRegionSelection,
  regionUpdateSaving,
  regionUpdateMessage,
  onRemovePlanningMarker,
  removePlanningSaving,
  removePlanningMessage,
  onInsertPlanningMarker,
  clubs,
  onSaveHoleStats,
  statsSaving,
  statsMessage,
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflowY: 'auto',
        minHeight: 0,
      }}
    >
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            color: 'text.secondary',
            display: 'block',
          }}
        >
          {showRegionPropertiesPanel
            ? 'Region properties'
            : isPlanning
              ? 'Planning'
              : 'Hole properties'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, lineHeight: 1.2 }}>
          {showRegionPropertiesPanel
            ? 'Type, label, and holes linked to the selected map region.'
            : isPlanning
              ? 'Shot distances and removable planning pins.'
              : 'Scorecard data for this hole.'}
        </Typography>
      </Box>

      <Box sx={{ p: 1, flexGrow: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {!selectedHole ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Select a course with holes to edit.
            </Typography>
          </Box>
        ) : showRegionPropertiesPanel && selectedRegionOverlay ? (
          <RegionPropertiesForm
            key={regionPropsFormKey}
            overlay={selectedRegionOverlay}
            holes={holes}
            onSave={onUpdateRegionProperties}
            onDelete={onDeleteRegion}
            onDone={onClearRegionSelection}
            saving={regionUpdateSaving}
            message={regionUpdateMessage}
          />
        ) : isPlanning ? (
          <PlanningDistancesPanel
            hole={selectedHole}
            onRemoveMarker={onRemovePlanningMarker ?? (async () => {})}
            onInsertPlanningMarker={onInsertPlanningMarker}
            removing={removePlanningSaving}
            message={removePlanningMessage}
            clubs={clubs}
          />
        ) : (
          <HolePropertyForm
            key={`${selectedHole.id}-${selectedHole.par}-${selectedHole.stroke_index}-${selectedHole.scorecard_yardage}`}
            hole={selectedHole}
            onSaveHoleStats={onSaveHoleStats}
            statsSaving={statsSaving}
            statsMessage={statsMessage}
          />
        )}
      </Box>
    </Box>
  )
}
