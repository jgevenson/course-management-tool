import { useState, useEffect } from 'react'

/**
 * ## CourseYardageMatrix Component
 * 
 * A React component for displaying and editing a matrix of hole yardages across different tee sets. 
 * It provides a grid-based interface for users to input and save yardage values for each hole and tee combination.
 * The component supports both displaying existing yardage data and collecting new yardage data.
 *
 * ### Component Responsibilities
 * - **State Management**: Manages the state of the yardage matrix using `yardageDraft`, an object that maps 
 *   tee-hole combinations to their respective yardage values. It also tracks `matrixSaving` status and 
 *   `matrixMessage` for user feedback.
 * - **Data Initialization**: Initializes the `yardageDraft` from the `yardages` prop, populating it with 
 *   existing yardage data. It also ensures that every combination of holes and tees has an entry, even if empty,
 *   by iterating over `holes` and `tees`.
 * - **User Interaction Handling**: Provides a mechanism to update individual yardage cells via the `setYardCell` 
 *   function, which updates the local state in response to user input.
 * - **Form Submission**: Handles the saving of the yardage matrix through the `handleSave` function. This function 
 *   iterates over the `yardageDraft`, formats the data, and invokes the `onSaveYardages` callback provided by the parent component.
 * - **User Feedback**: Displays status messages after save operations, indicating success or failure. It uses a timeout 
 *   to clear these messages after a specified duration.
 * - **Conditional Rendering**: Renders the yardage matrix UI only when both `holes` and `tees` arrays are non-empty. 
 *   Otherwise, it displays informative messages guiding the user on how to proceed.
 *
 * ### Usage Pattern
 * This component is intended to be used as a child component within a larger course management interface. 
 * It expects to receive `holes`, `tees`, and `yardages` data from its parent component. The parent is also 
 * responsible for providing the `onSaveYardages` callback function to handle the actual persistence of the 
 * yardage data.
 * 
 * @param {Object} props - The properties for the CourseYardageMatrix component.
 * @param {Array<Object>} props.holes - An array of hole objects, each containing at least an `id` and `hole_number`.
 * @param {Array<Object>} props.tees - An array of tee set objects, each containing at least an `id`, `name`, `color_label`, `rating`, and `slope`.
 * @param {Array<Object>} props.yardages - An array of yardage objects, each containing `hole_id`, `tee_id`, and `yardage`.
 * @param {function(Object): Promise<Object>} props.onSaveYardages - Callback function invoked when the yardage 
 *   matrix is to be saved. It should accept the `yardageDraft` object and return a promise that resolves to a result object.
 * @returns {React.Component} The `CourseYardageMatrix` component, rendering the yardage input interface.
 */
export default function CourseYardageMatrix({ holes, tees, yardages, onSaveYardages }) {
  const [yardageDraft, setYardageDraft] = useState({})
  const [matrixSaving, setMatrixSaving] = useState(false)
  const [matrixMessage, setMatrixMessage] = useState(null)

  useEffect(() => {
    let yardMap = {}
    
    // Fill from db
    for (const y of yardages ?? []) {
      const k = `${y.hole_id}:${y.tee_id}`
      yardMap[k] = y.yardage == null ? '' : String(y.yardage)
    }

    // Fill missing
    for (const h of holes) {
      for (const t of tees) {
        const k = `${h.id}:${t.id}`
        if (yardMap[k] === undefined) yardMap[k] = ''
      }
    }

    setYardageDraft(yardMap)
  }, [holes, tees, yardages])

  const setYardCell = (holeId, teeId, value) => {
    const k = `${holeId}:${teeId}`
    setYardageDraft((prev) => ({ ...prev, [k]: value }))
  }

  const handleSave = async () => {
    setMatrixSaving(true)
    setMatrixMessage(null)

    const res = await onSaveYardages(yardageDraft)
    
    if (res.success) {
      setMatrixMessage('Scorecard distances saved.')
      window.setTimeout(() => setMatrixMessage(null), 2800)
    } else {
      setMatrixMessage(res.error)
    }
    
    setMatrixSaving(false)
  }

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Scorecard distances (yards)</h2>
          <p className="text-sm text-slate-500 mt-1">Per hole, for each tee. Save when finished editing.</p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={matrixSaving || tees.length === 0 || holes.length === 0}
          className="shrink-0 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-45"
        >
          {matrixSaving ? 'Saving…' : 'Save scorecard distances'}
        </button>
      </div>

      {tees.length === 0 || holes.length === 0 ? (
        <p className="text-slate-500 text-sm">
          {holes.length === 0
            ? 'This course has no holes yet. Add holes in your database or legacy import, then enter yardages here.'
            : 'Add at least one tee set above to fill in yardages.'}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="min-w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-600">
                <th className="sticky left-0 z-10 bg-slate-800 text-left py-3 pr-4 pl-2 text-slate-400 font-medium">Hole</th>
                {tees.map((t) => (
                  <th key={t.id} className="py-3 px-2 text-slate-300 font-semibold whitespace-nowrap min-w-[88px]">
                    <span>{t.name}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holes.map((h) => (
                <tr key={h.id} className="border-b border-slate-700/80">
                  <td className="sticky left-0 z-10 bg-slate-800 py-2 pr-4 pl-2 text-white font-medium">
                    {h.hole_number}
                  </td>
                  {tees.map((t) => {
                    const k = `${h.id}:${t.id}`
                    return (
                      <td key={k} className="py-2 px-2 align-middle">
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={yardageDraft[k] ?? ''}
                          onChange={(e) => setYardCell(h.id, t.id, e.target.value)}
                          aria-label={`Hole ${h.hole_number} ${t.name} yardage`}
                          className="w-full min-w-[72px] px-2 py-1.5 bg-slate-900 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {matrixMessage && (
        <p className={`mt-3 text-sm ${matrixMessage.startsWith('Scorecard') ? 'text-emerald-400' : 'text-red-400'}`}>
          {matrixMessage}
        </p>
      )}
    </section>
  )
}
