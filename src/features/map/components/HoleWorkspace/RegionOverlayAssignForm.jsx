import { useState, useCallback } from 'react'
import { TERRAIN_TYPE_OPTIONS, isValidTerrainType } from '../../utils/regionTerrain'

/**
 * ## Region Overlay Assign Form
 * 
 * A specialized UI form for managing the assignment of generated region overlays to specific golf holes.
 * This component facilitates the critical link between the geospatial "What" (the region geometry)
 * and the course data model "Where" (the hole assignment).
 *
 * ### State Management
 * The component manages two primary pieces of local state:
 * - `terrainType`: A controlled string state tied directly to the `TERRAIN_TYPE_OPTIONS` enum.
 *   It defaults to the first available option (typically 'Unknown') and is updated via a standard
 *   HTML `<select>` element.
 * - `label`: A controlled string state for a user-provided label.
 *   This allows for semantic annotation of the region (e.g., "Front-right bunker") to provide
 *   context beyond the technical terrain type.
 * - `holeIds`: A controlled array of strings (UUIDs) representing the IDs of the holes that
 *   this region overlay affects. It is initialized lazily based on the `selectedHole` prop,
 *   ensuring that if a hole is already selected when the form opens, it is pre-checked.
*
 * ### Data Flow & Persistence
 * The form operates as a "Controlled Component" within the broader `HoleWorkspace` parent component.
 * - **Initialization**: Upon mount, `holeIds` is seeded with `selectedHole.id` if available.
 * - **Updates**: The `toggleHole` callback uses a `Set` internally for efficient O(1) add/remove
 *   operations, ensuring that the `holeIds` array remains a unique list of selected holes.
 * - **Submission**: The `handleSave` callback validates the selection and invokes the parent's
 *   `onSaveRegionDraft`. It passes a payload containing the `terrainType`, the optional `label`,
 *   and the array of `holeIds`. This payload is then used by the parent to update the geospatial
 *   database via a Supabase RPC call.
 *
 * ### Validation & Constraints
 * The component enforces data integrity through native HTML5 validation and explicit checks:
 * - **Terrain Type**: The `isValidTerrainType` utility (imported from `utils/regionTerrain`) 
 *   validates the `terrainType` state against the defined schema, preventing invalid terrain types
 *   from being saved.
 * - **Hole Selection**: The `handleSave` function explicitly checks if `holeIds.length === 0`. 
 *   If no holes are selected, the save operation is aborted, enforcing the business rule that a region
 *   must be associated with at least one hole.
*
 * ### UI/UX Patterns
 * The form is designed for a compact sidebar environment, prioritizing clarity and ease of interaction.
 * - **Hierarchical Information**: It begins with a clear header (`New region`) and a brief instruction
 *   (`Choose type, optional label...`) to orient the user.
 * - **Control Grouping**: The input fields are grouped by function: `Terrain type`, `Optional label`,
 *   and `Holes in play`.
 * - **Visual Feedback**: Errors are displayed in a distinct `text-red-400` color, and the save button
 *   provides immediate loading state feedback via the `regionSaving` prop.
 * - **Dense Selection List**: The list of holes uses a compact layout with a checkbox for selection.
 *   The `toggleHole` logic ensures that a single hole cannot be deselected if it is the last one
 *   in the list, preventing accidental disassociation.
 *
 * ### Event Handling
 * - **Callbacks**: The component relies on three callback props: `onDiscardRegionDraft` (for cleanup),
 *   `onSaveRegionDraft` (for persistence), and `regionSaving` (for loading state).
 * - **Optimization**: `toggleHole` and `handleSave` are wrapped in `useCallback` to ensure stable
 *   function references, which is crucial for performance in React environments where this component
 *   might be frequently re-rendered.
 *
 * @param {Object} props - The properties for the RegionOverlayAssignForm component.
 * @param {Array<Object>} props.holes - An array of hole objects available for selection. Expected format: `{ id: string, hole_number: number, ... }`.
 * @param {Object|null} props.selectedHole - The currently selected hole object. Used to pre-populate the `holeIds` state.
 * @param {function} props.onDiscardRegionDraft - A callback function to execute when the user wishes to discard the current region draft. Typically sets the drawing layer to null.
 * @param {function(Object): void} props.onSaveRegionDraft - A callback function that persists the new region. It receives a payload object: `{ terrainType: string, label?: string, holeIds: string[] }`.
 * @param {boolean} props.regionSaving - A boolean flag indicating if a region save operation is currently in progress. Used to disable buttons and show loading states.
 * @param {string|null} props.regionError - An error message string to display if the last save operation failed.
 * @returns {JSX.Element}
 */

export default function RegionOverlayAssignForm({ 
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
