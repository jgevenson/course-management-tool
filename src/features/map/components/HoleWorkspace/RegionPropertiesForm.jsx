import { useState, useCallback } from 'react'
import { Pentagon, Trash2 } from 'lucide-react'
import { TERRAIN_TYPE_OPTIONS, isValidTerrainType, terrainTypeOptionLabel } from '../../utils/regionTerrain'
  
/**
 * ## Region Properties Form
 *
 * A comprehensive form for editing the properties of an existing geospatial region overlay on the golf course.
 * This component acts as the primary interface for refining region definitions after initial creation.
 *
 * ### State Management
 * The component manages the following mutable properties:
 * - `terrainType`: The classification of the terrain (e.g., "Water", "Fairway"). It is initialized from `overlay.terrain_type` and validated against `TERRAIN_TYPE_OPTIONS`.
 * - `label`: An optional user-defined name for the region (e.g., "North bunker"), initialized from `overlay.label`.
 * - `holeIds`: A managed array of hole identifiers to which this region applies. It uses a `Set` internally to efficiently track additions and removals, ensuring uniqueness while maintaining a stable array representation for the parent component.
 *
 * ### Data Flow & Persistence
 * The form operates as a controlled component, relying on callback props to interact with the parent `HoleWorkspace`.
 * - **Initialization**: `holeIds` is seeded with the `overlay.holeIds` prop if available.
 * - **Updates**: The `toggleHole` callback handles the addition or removal of hole associations.
 * - **Submission**: The `handleSave` callback triggers the `onSave` prop, passing a payload containing the updated `terrainType`, `label`, and `holeIds`. It performs validation to ensure `terrainType` is valid and at least one hole is selected.
 * - **Deletion**: A dedicated `onDelete` callback is invoked when the user chooses to delete the region.
 *
 * ### Validation & Constraints
 * The component enforces data integrity through multiple mechanisms:
 * - **Terrain Type**: The `isValidTerrainType` utility ensures the selected terrain type is part of the defined schema.
 * - **Hole Selection**: The `holeIds.length === 0` check prevents the removal of the last remaining hole from a region.
 * - **Label Validation**: The `label.trim()` call ensures that only non-empty strings are persisted.
 *
 * ### UI/UX Patterns
 * The form is optimized for a sidebar environment, prioritizing density and clarity:
 * - **Identity Header**: The top section prominently displays the region's terrain type and its current label (or "No label" if absent), providing immediate context.
 * - **Action Buttons**: It features a primary "Save changes" button (disabled during save operations) and a destructive "Delete region" button, both using distinct visual styling (green for save, red for delete).
 * - **Dense List**: The list of holes uses a compact layout with checkboxes, allowing users to quickly associate or disassociate the region with multiple holes.
 * - **Feedback Area**: A dedicated area below the controls displays messages (e.g., "Saved" or error strings) passed via the `message` prop.
 *
 * ### Event Handling
 * All state-mutating callbacks (`toggleHole`, `handleSave`) are wrapped in `useCallback` to maintain referential stability, which is crucial for performance in React.
 * The `onDone` callback is provided for the parent to handle the completion of the editing session.
 *
 * @param {Object} props
 * @param {Object} props.overlay - The region overlay data object.
 * @param {string} props.overlay.id - The unique identifier of the region.
 * @param {string} props.overlay.terrain_type - The terrain type of the region.
 * @param {string} [props.overlay.label] - The optional label for the region.
 * @param {Array<string>} [props.overlay.holeIds] - An array of hole IDs associated with the region.
 * @param {Array<Object>} props.holes - An array of available hole objects for association.
 * @param {function} props.onSave - Callback to save the region changes.
 * @param {function} props.onDelete - Callback to delete the region.
 * @param {function} props.onDone - Callback to complete the editing session.
 * @param {boolean} props.saving - Flag indicating if a save operation is in progress.
 * @param {string|null} props.message - A message to display regarding the last operation.
 * @returns {JSX.Element}
 */

export default function RegionPropertiesForm({ overlay, holes, onSave, onDelete, onDone, saving, message }) {
  const [terrainType, setTerrainType] = useState(overlay.terrain_type)
  const [label, setLabel] = useState(overlay.label ?? '')
  const [holeIds, setHoleIds] = useState(() => [...(overlay.holeIds || [])])

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
