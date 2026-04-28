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
import { HOLE_MARKER_KIND, markerIsSet } from '../utils/holeMarkers'
import { TERRAIN_TYPE_OPTIONS, isValidTerrainType, terrainTypeOptionLabel } from '../utils/regionTerrain'

/**
 * @typedef {object} Hole
 * @property {string} id
 * @property {number} hole_number
 * @property {number|null} par
 * @property {number|null} stroke_index
 * @property {number|null} scorecard_yardage
 * @property {Array<{ id?: string, marker_kind: string, lat: number, lng: number, is_active?: boolean }>} [mapMarkers]
 */

function ToolButton({ active, disabled, onClick, icon: Icon, label, hint }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={hint}
      aria-pressed={active}
      className={`w-full flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-all duration-200 ${
        active
          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
          : 'border-slate-600 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-800'
      } ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
    >
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${active ? 'text-emerald-400' : 'text-slate-400'}`} aria-hidden />
      <span>
        <span className="font-medium block">{label}</span>
        {hint && <span className="text-xs text-slate-500 block mt-0.5">{hint}</span>}
      </span>
    </button>
  )
}

function HolePropertyForm({ hole, onSaveHoleStats, statsSaving, statsMessage }) {
  const [par, setPar] = useState(() => (hole.par ?? '').toString())
  const [strokeIndex, setStrokeIndex] = useState(() => (hole.stroke_index ?? '').toString())
  const [yardage, setYardage] = useState(() => (hole.scorecard_yardage ?? '').toString())

  const handleSaveStats = useCallback(async () => {
    await onSaveHoleStats(hole.id, {
      par: par === '' ? null : Number(par),
      stroke_index: strokeIndex === '' ? null : Number(strokeIndex),
      scorecard_yardage: yardage === '' ? null : Number(yardage),
    })
  }, [onSaveHoleStats, par, strokeIndex, yardage, hole.id])

  return (
    <div className="p-3 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
      <div>
        <label className="text-xs text-slate-500 uppercase tracking-wide">Hole #</label>
        <div className="mt-1 flex items-center gap-2 text-white font-semibold">
          <Flag className="w-4 h-4 text-emerald-500" aria-hidden />
          {hole.hole_number}
        </div>
      </div>

      <div>
        <label htmlFor={`hole-par-${hole.id}`} className="text-xs text-slate-500 uppercase tracking-wide">
          Par
        </label>
        <input
          id={`hole-par-${hole.id}`}
          type="number"
          min={3}
          max={6}
          value={par}
          onChange={(e) => setPar(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <div>
        <label htmlFor={`hole-si-${hole.id}`} className="text-xs text-slate-500 uppercase tracking-wide">
          Stroke index
        </label>
        <input
          id={`hole-si-${hole.id}`}
          type="number"
          min={1}
          max={18}
          value={strokeIndex}
          onChange={(e) => setStrokeIndex(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <div>
        <label htmlFor={`hole-yards-${hole.id}`} className="text-xs text-slate-500 uppercase tracking-wide">
          Scorecard yardage
        </label>
        <input
          id={`hole-yards-${hole.id}`}
          type="number"
          min={0}
          max={900}
          value={yardage}
          onChange={(e) => setYardage(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <button
        type="button"
        onClick={handleSaveStats}
        disabled={statsSaving}
        className="mt-auto w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-all duration-200"
      >
        {statsSaving ? 'Saving…' : 'Save properties'}
      </button>
      {statsMessage && (
        <p
          className={`text-xs ${statsMessage.startsWith('Saved') ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {statsMessage}
        </p>
      )}
    </div>
  )
}

/**
 * @param {object} props
 * @param {Hole[]} props.holes
 * @param {Hole | null} props.selectedHole
 * @param {() => void} props.onDiscardRegionDraft
 * @param {(payload: { terrainType: string, label: string, holeIds: string[] }) => Promise<void>} props.onSaveRegionDraft
 * @param {boolean} props.regionSaving
 * @param {string | null} props.regionError
 */
function RegionOverlayAssignForm({
  holes,
  selectedHole,
  onDiscardRegionDraft,
  onSaveRegionDraft,
  regionSaving,
  regionError,
}) {
  const [terrainType, setTerrainType] = useState(TERRAIN_TYPE_OPTIONS[0].id)
  const [label, setLabel] = useState('')
  const [holeIds, setHoleIds] = useState(() =>
    selectedHole?.id ? [selectedHole.id] : [],
  )

  const toggleHole = useCallback((holeId) => {
    setHoleIds((prev) => {
      const set = new Set(prev)
      if (set.has(holeId)) {
        if (set.size <= 1) return prev
        set.delete(holeId)
      } else {
        set.add(holeId)
      }
      return Array.from(set)
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!isValidTerrainType(terrainType) || holeIds.length === 0) return
    await onSaveRegionDraft({
      terrainType,
      label: label.trim(),
      holeIds,
    })
  }, [terrainType, label, holeIds, onSaveRegionDraft])

  return (
    <div className="mt-3 rounded-lg border border-emerald-500/40 bg-slate-900/90 p-3 flex flex-col gap-3">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-emerald-400/90">New region</h3>
        <p className="text-xs text-slate-500 mt-1">Choose type, optional label, and which holes use this area.</p>
      </div>
      <div>
        <label htmlFor="region-terrain-type" className="text-xs text-slate-500 uppercase tracking-wide">
          Terrain type
        </label>
        <select
          id="region-terrain-type"
          value={terrainType}
          onChange={(e) => setTerrainType(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-2 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        >
          {TERRAIN_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="region-label" className="text-xs text-slate-500 uppercase tracking-wide">
          Optional label
        </label>
        <input
          id="region-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Front bunker"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>
      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Holes in play</span>
        <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
          {holes.map((h) => (
            <li key={h.id}>
              <label className="flex items-center gap-2 px-2 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={holeIds.includes(h.id)}
                  onChange={() => toggleHole(h.id)}
                  className="size-3.5 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500/40"
                />
                <span className="tabular-nums">Hole {h.hole_number}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
      {regionError && <p className="text-xs text-red-400">{regionError}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onDiscardRegionDraft}
          disabled={regionSaving}
          className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition-all duration-200"
        >
          Discard
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={regionSaving || holeIds.length === 0}
          className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-all duration-200"
        >
          {regionSaving ? 'Saving…' : 'Save region'}
        </button>
      </div>
    </div>
  )
}

/**
 * @typedef {object} RegionOverlayRow
 * @property {string} id
 * @property {string} terrain_type
 * @property {string|null} [label]
 * @property {string[]} holeIds
 */

/**
 * @param {object} props
 * @param {RegionOverlayRow} props.overlay
 * @param {Hole[]} props.holes
 * @param {(payload: { terrainType: string, label: string, holeIds: string[] }) => Promise<void>} props.onSave
 * @param {() => Promise<void>} props.onDelete
 * @param {() => void} props.onDone
 * @param {boolean} props.saving
 * @param {string | null} props.message
 */
function RegionPropertiesForm({ overlay, holes, onSave, onDelete, onDone, saving, message }) {
  const [terrainType, setTerrainType] = useState(overlay.terrain_type)
  const [label, setLabel] = useState(overlay.label ?? '')
  const [holeIds, setHoleIds] = useState(() => [...overlay.holeIds])

  const toggleHole = useCallback((holeId) => {
    setHoleIds((prev) => {
      const set = new Set(prev)
      if (set.has(holeId)) {
        if (set.size <= 1) return prev
        set.delete(holeId)
      } else {
        set.add(holeId)
      }
      return Array.from(set)
    })
  }, [])

  const handleSave = useCallback(async () => {
    if (!isValidTerrainType(terrainType) || holeIds.length === 0) return
    await onSave({
      terrainType,
      label: label.trim(),
      holeIds,
    })
  }, [terrainType, label, holeIds, onSave])

  return (
    <div className="p-3 flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Pentagon className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden />
            <span className="truncate">{terrainTypeOptionLabel(terrainType)}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-mono truncate" title={overlay.id}>
            {label.trim() ? `"${label.trim()}"` : 'No label'} · id {overlay.id.slice(0, 8)}…
          </p>
        </div>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="shrink-0 text-xs font-medium px-2 py-1 rounded-md border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-50 transition-all duration-200"
        >
          Done
        </button>
      </div>

      <div>
        <label htmlFor="edit-region-terrain-type" className="text-xs text-slate-500 uppercase tracking-wide">
          Terrain type
        </label>
        <select
          id="edit-region-terrain-type"
          value={terrainType}
          onChange={(e) => setTerrainType(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        >
          {TERRAIN_TYPE_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="edit-region-label" className="text-xs text-slate-500 uppercase tracking-wide">
          Optional label
        </label>
        <input
          id="edit-region-label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Front bunker"
          className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
      </div>

      <div>
        <span className="text-xs text-slate-500 uppercase tracking-wide">Holes in play</span>
        <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-700 divide-y divide-slate-800">
          {holes.map((h) => (
            <li key={h.id}>
              <label className="flex items-center gap-2 px-2 py-2 text-sm text-slate-200 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={holeIds.includes(h.id)}
                  onChange={() => toggleHole(h.id)}
                  className="size-3.5 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500/40"
                />
                <span className="tabular-nums">Hole {h.hole_number}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || holeIds.length === 0}
        className="mt-auto w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 transition-all duration-200"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <button
        type="button"
        onClick={() => void onDelete()}
        disabled={saving}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/50 px-3 py-2.5 text-sm font-medium text-red-200 hover:bg-red-950/40 hover:border-red-400 disabled:opacity-50 transition-all duration-200"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
        Delete region
      </button>
      {message && (
        <p
          className={`text-xs ${message === 'Saved' || message.startsWith('Saved') ? 'text-emerald-400' : 'text-red-400'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}

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
  const teeShotOk =
    selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.TEE_SHOT_LOCATION)
  const firstShotOk =
    selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.FIRST_SHOT_LOCATION)
  const secondShotOk =
    selectedHole && markerIsSet(selectedHole, HOLE_MARKER_KIND.SECOND_SHOT_LOCATION)

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
                  ? 'Placed — click map to move'
                  : 'Click map where you expect to hit the tee shot from'
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
              label="Planned first shot"
              hint={
                firstShotOk
                  ? 'Placed — click map to move'
                  : teeShotOk && greenOk
                    ? 'Optional — short holes skip this (yardage tee→green uses flag center)'
                    : teeShotOk
                      ? 'Place green center in Mapping mode for tee-to-flag yardage; add this point for longer holes'
                      : 'Place tee shot location first'
              }
              active={activePointTool === 'first_shot_location'}
              disabled={!selectedHole || !teeShotOk}
              onClick={() =>
                onActivePointToolChange(
                  activePointTool === 'first_shot_location' ? null : 'first_shot_location',
                )
              }
            />
          )}
          {isPlanning && (
            <ToolButton
              icon={Navigation2}
              label="Planned second shot"
              hint={
                secondShotOk
                  ? 'Placed — click map to move'
                  : firstShotOk
                    ? 'Optional: for long holes, where the second shot should be played from or to'
                    : 'Place the first shot first'
              }
              active={activePointTool === 'second_shot_location'}
              disabled={!selectedHole || !firstShotOk}
              onClick={() =>
                onActivePointToolChange(
                  activePointTool === 'second_shot_location' ? null : 'second_shot_location',
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
              Cancel placement / draw
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
