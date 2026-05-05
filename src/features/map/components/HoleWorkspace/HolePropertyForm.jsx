import { useState, useCallback } from 'react'
import { Flag } from 'lucide-react'

/**
 * ## Property Form Component
 *
 * A specialized UI form for managing golf hole statistics within a geospatial editing environment.
 * This component is optimized for density and clarity, prioritizing data entry efficiency over decoration.
 *
 * ### State Management
 * The component uses `useState` hooks to manage the three core metrics independently:
 * - `par`: The standard number of strokes expected for the hole.
 * - `strokeIndex`: The hole's difficulty ranking relative to other holes on the course.
 * - `yardage`: The total length of the hole in yards.
 *
 * State is initialized lazily (`useState(() => ...)`) to avoid recalculation on every render, aligning with React best practices for derived state.
 *
 * ### Data Flow & Persistence
 * The form connects to a parent controller (likely `HoleWorkspace`) via the `onSaveHoleStats` callback. This pattern facilitates a "controlled component" architecture, ensuring the UI remains the single source of truth for input values while delegating complex persistence logic to the parent.
 *
 * The `handleSaveStats` function wraps the persistence logic, ensuring that empty strings (representing unset values) are cleanly converted to `null` before being passed to the persistence layer. This prevents type mismatches and allows the backend to treat unset properties as "unset" rather than "zero".
 *
 * ### Validation & Constraints
 * The input fields are configured with native HTML5 validation attributes to enforce data integrity:
 * - `type="number"`: Restricts input to numeric values.
 * - `min` and `max`: Enforce reasonable boundaries for each metric (e.g., Par between 3 and 6, Stroke Index between 1 and 18).
 *
 * ### UI/UX Patterns
 * The layout follows a strict vertical stack, optimizing for single-column display typically found in sidebars or mobile views.
 * - **Labeling**: Uses uppercase, semantically distinct labels (`text-slate-500 uppercase tracking-wide`) to ensure schema-level clarity.
 * - **Visual Affordance**: The Hole Number is visually highlighted with a prominent icon (`Flag`) to reinforce the primary identifier of the entity being edited.
 * - **Feedback Loop**: A dedicated `statsMessage` area is included below the action button. This space is reserved for transient system feedback—such as success confirmations (e.g., "Saved!") or error messages—enabling immediate user feedback without cluttering the input area.
 *
 * ### Event Handling
 * All state updates are wrapped in `useCallback` to maintain stable function references. This is critical for performance when the component is rendered within a list or frequently updated parent container, preventing unnecessary re-renders of child components.
 *
 * @param {Object} props
 * @param {Object} props.hole - The golf hole data object.
 * @param {number} props.hole.hole_number - The identifier for the hole.
 * @param {number} [props.hole.par] - The standard par value for the hole.
 * @param {number} [props.hole.stroke_index] - The stroke index value for the hole.
 * @param {number} [props.hole.scorecard_yardage] - The yardage value for the hole.
 * @param {function} props.onSaveHoleStats - Callback function to persist the updated hole data.
 * @param {boolean} props.statsSaving - Loading state flag for the persistence operation.
 * @param {string|null} props.statsMessage - A message to display to the user regarding the last operation.
 *
 * @returns {JSX.Element}
 */

export default function HolePropertyForm({ hole, onSaveHoleStats, statsSaving, statsMessage }) {
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
