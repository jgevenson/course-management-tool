// AI assisted development
import { useCallback, useState } from 'react'
import PlanningDistancesPanel from './PlanningDistancesPanel'
import {
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flag,
  MapPin,
  Navigation2,
  Pentagon,
  Target,
  Trash2,
  WandSparkles,
  Zap,
  DownloadCloud,
} from 'lucide-react'
import { HOLE_MARKER_KIND, markerIsSet } from '../../utils/holeMarkers'
import { TERRAIN_TYPE_OPTIONS, isValidTerrainType, terrainTypeOptionLabel } from '../../utils/regionTerrain'

/**
 * @typedef {object} Hole
 * @property {string} id
 * @property {number} hole_number
 * @property {number|null} par
 * @property {number|null} stroke_index
 * @property {number|null} scorecard_yardage
 * @property {Array<{ id?: string, marker_kind: string, lat: number, lng: number, is_active?: boolean }>} [mapMarkers]
 */

import ToolButton from './ToolButton'
import HolePropertyForm from './HolePropertyForm'
import RegionOverlayAssignForm from './RegionOverlayAssignForm'
import RegionPropertiesForm from './RegionPropertiesForm'

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
}) {
  /** @type {Hole | null} */
  const selectedHole = holes[selectedIndex] ?? null

  const isPlanning = workspaceMode === 'planning'

  const showRegionPropertiesPanel =
    Boolean(selectedRegionOverlay) && !regionDraft && !isPlanning

  const regionPropsFormKey = selectedRegionOverlay
    ? `${selectedRegionOverlay.id}|${selectedRegionOverlay.terrain_type}|${selectedRegionOverlay.label ?? ''}|${[...selectedRegionOverlay.holeIds].sort().join(',')}`
    : 'none'

  const goPrev = useCallback(() => {
    onSelectIndex(Math.max(0, selectedIndex - 1))
  }, [onSelectIndex, selectedIndex])

  const goNext = useCallback(() => {
    onSelectIndex(Math.min(holes.length - 1, selectedIndex + 1))
  }, [holes.length, onSelectIndex, selectedIndex])

  const greenOk = selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.GREEN_CENTER)
  const teeOk = selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.TEE_BACK)
  const teeShotOk = selectedHole?.planningMarkers?.some(m => m.marker_type === 'tee_shot_location')
  const pinOk = selectedHole?.planningMarkers?.some(m => m.marker_type === 'pin_location')
  const landingCount = selectedHole?.planningMarkers?.filter(m => m.marker_type === 'landing_area').length ?? 0

  return (
    <div className="flex flex-1 min-h-0 w-full min-w-0">
      <aside className="w-[min(100%,280px)] shrink-0 flex flex-col border-r border-slate-700 bg-slate-950/90 backdrop-blur-sm z-500">
        <div className="p-3 border-b border-slate-800">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tools</h2>
          <p className="text-xs text-slate-500 mt-1">
            {isPlanning
              ? 'Terrain overlays are view-only. Tee→flag yardage shows when tee shot and green center exist; optional first/second-shot points for longer holes.'
              : 'Reference points and terrain regions for the active hole (and shared hazards).'}
          </p>
        </div>

        <div className="p-3 border-b border-slate-800 flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            disabled={selectedIndex <= 0 || holes.length === 0}
            className="p-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all duration-200"
            aria-label="Previous hole"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 text-center min-w-0">
            <div className="text-lg font-bold text-white tabular-nums">
              {holes.length ? `Hole ${selectedHole?.hole_number ?? '—'}` : '—'}
            </div>
            <div className="text-xs text-slate-500">
              {holes.length ? `${selectedIndex + 1} / ${holes.length}` : 'No holes'}
            </div>
          </div>
          <button
            type="button"
            onClick={goNext}
            disabled={selectedIndex >= holes.length - 1 || holes.length === 0}
            className="p-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-30 transition-all duration-200"
            aria-label="Next hole"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="px-3 py-2 border-b border-slate-800">
          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoRotateHoleView}
              onChange={(e) => onAutoRotateHoleViewChange(e.target.checked)}
              disabled={!greenOk || !teeOk}
              className="mt-0.5 size-3.5 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500/40"
            />
            <span className="min-w-0">
              <span className="text-sm font-medium text-slate-200 block">Auto rotate hole view</span>
              <span className="text-xs text-slate-500 block mt-0.5 leading-snug">
                {greenOk && teeOk
                  ? 'Tee at bottom, green at top. Off = north up.'
                  : 'Place back tee and green center to enable.'}
              </span>
            </span>
          </label>
        </div>

        <div className="p-3 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
          {isPlanning && (
            <ToolButton
              icon={Crosshair}
              label="Tee shot location"
              hint={
                teeShotOk
                  ? 'Set — click map to move'
                  : 'Defaults to back tee if not set'
              }
              active={activePointTool === 'tee_shot_location'}
              disabled={!selectedHole}
              onClick={() =>
                onActivePointToolChange(
                  activePointTool === 'tee_shot_location' ? null : 'tee_shot_location',
                )
              }
            />
          )}
          {isPlanning && (
            <ToolButton
              icon={Zap}
              label="Add landing zone"
              hint={
                landingCount > 0
                  ? `${landingCount} placed — click map to add another`
                  : 'Click map to place sequential landing points'
              }
              active={activePointTool === 'landing_area'}
              disabled={!selectedHole}
              onClick={() =>
                onActivePointToolChange(
                  activePointTool === 'landing_area' ? null : 'landing_area',
                )
              }
            />
          )}
          {isPlanning && (
            <ToolButton
              icon={Navigation2}
              label="Pin location"
              hint={
                pinOk
                  ? 'Set — click map to move'
                  : 'Defaults to green center if not set'
              }
              active={activePointTool === 'pin_location'}
              disabled={!selectedHole}
              onClick={() =>
                onActivePointToolChange(
                  activePointTool === 'pin_location' ? null : 'pin_location',
                )
              }
            />
          )}
          {!isPlanning && (
          <ToolButton
            icon={Target}
            label="Green center"
            hint={greenOk ? 'Placed — click to move' : 'Click map to place'}
            active={activePointTool === 'green_center'}
            disabled={!selectedHole}
            onClick={() =>
              onActivePointToolChange(activePointTool === 'green_center' ? null : 'green_center')
            }
          />
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
          {!isPlanning && autoDrawActive && (
            <div className="rounded-lg border border-emerald-500/30 bg-slate-900/80 p-3 text-xs text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="auto-draw-tolerance" className="font-medium text-slate-200">
                  Tolerance
                </label>
                <input
                  id="auto-draw-tolerance-value"
                  type="number"
                  min={8}
                  max={140}
                  value={autoDrawTolerance}
                  onChange={(e) => onAutoDrawToleranceChange(Number(e.target.value))}
                  className="w-16 rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-right text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
              <input
                id="auto-draw-tolerance"
                type="range"
                min={8}
                max={140}
                value={autoDrawTolerance}
                onChange={(e) => onAutoDrawToleranceChange(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-500"
              />

              <div className="mt-3 flex items-center justify-between gap-3">
                <label htmlFor="auto-draw-radius" className="font-medium text-slate-200">
                  Max radius
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="auto-draw-radius-value"
                    type="number"
                  min={5}
                  max={60}
                    value={autoDrawMaxRadiusYards}
                    onChange={(e) => onAutoDrawMaxRadiusYardsChange(Number(e.target.value))}
                    className="w-16 rounded-md border border-slate-600 bg-slate-950 px-2 py-1 text-right text-slate-100 focus:border-emerald-500/50 focus:outline-none"
                  />
                  <span className="text-slate-500">yd</span>
                </div>
              </div>
              <input
                id="auto-draw-radius"
                type="range"
                min={5}
                max={60}
                value={autoDrawMaxRadiusYards}
                onChange={(e) => onAutoDrawMaxRadiusYardsChange(Number(e.target.value))}
                className="mt-2 w-full accent-emerald-500"
              />
              {autoDrawMessage && (
                <p
                  className={`mt-3 leading-snug ${
                    autoDrawMessage.includes('could not') || autoDrawMessage.includes('too little')
                      ? 'text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  {autoDrawMessage}
                </p>
              )}
            </div>
          )}
          {(activePointTool ||
            (!isPlanning && (regionDrawActive || autoDrawActive))) && (
            <button
              type="button"
              onClick={() => {
                onActivePointToolChange(null)
                onRegionDrawActiveChange(false)
                onAutoDrawActiveChange(false)
                onOsmToolActiveChange(false)
              }}
              className="text-xs text-slate-400 hover:text-white py-2 transition-all duration-200"
            >
              Cancel tool
            </button>
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
        </div>
      </aside>

      <div className="flex-1 min-h-0 min-w-0 relative flex flex-col">{mapArea}</div>

      <aside className="w-[min(100%,300px)] shrink-0 flex flex-col border-l border-slate-700 bg-slate-950/90 backdrop-blur-sm z-500">
        <div className="p-3 border-b border-slate-800">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {showRegionPropertiesPanel
              ? 'Region properties'
              : isPlanning
                ? 'Planning'
                : 'Hole properties'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {showRegionPropertiesPanel
              ? 'Type, label, and holes linked to the selected map region.'
              : isPlanning
                ? 'Shot distances and removable planning pins.'
                : 'Scorecard data for this hole.'}
          </p>
        </div>

        {!selectedHole ? (
          <div className="p-4 text-sm text-slate-500">Select a course with holes to edit.</div>
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
            removing={removePlanningSaving}
            message={removePlanningMessage}
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
      </aside>
    </div>
  )
}
