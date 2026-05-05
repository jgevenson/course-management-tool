import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

/**
 * ## CourseTeeSets Component
 * 
 * A React component for managing and displaying tee sets for a golf course. It allows 
 * users to add, update, remove, and set default tee sets, as well as input course rating and slope values.
 *
 * ### Component Responsibilities
 * - **Tee Management**: Provides a UI for managing multiple tee sets, including adding new ones, 
 *   editing existing ones, and removing them.
 * - **Default Tee Selection**: Allows the user to designate one tee set as the default, which is 
 *   typically used for displaying scorecard yardage.
 * - **Data Input**: Facilitates the input of various properties for each tee set, such as `name`, 
 *   `color_label` (color/label), `rating`, and `slope`.
 * - **User Feedback**: Displays status messages for operations like adding, updating, removing, 
 *   or setting a default tee, indicating success or failure.
 * - **Optimistic Updates**: The component updates the UI optimistically and uses a timeout to 
 *   clear messages after a short duration.
 *
 * ### Usage Pattern
 * This component is designed to be used as a child component within a larger course management interface. 
 * It consumes props for data and callback functions to interact with the parent component for data persistence and state management.
 * 
 * @param {Object} props - The properties for the CourseTeeSets component.
 * @param {Array<Object>} props.tees - An array of tee set objects, each representing a tee set for the course.
 * @param {function(Object): Promise<Object>} props.onAddTee - Callback function to add a new tee set. 
 *   It should accept a tee set payload and return a promise.
 * @param {function(number, Object): Promise<Object>} props.onUpdateTee - Callback function to update an existing 
 *   tee set. It should accept the tee ID and the update payload.
 * @param {function(number): Promise<Object>} props.onRemoveTee - Callback function to remove a tee set. It should 
 *   accept the tee ID.
 * @param {function(number): Promise<Object>} props.onSetDefaultTee - Callback function to set a specific tee set 
 *   as the default. It should accept the tee ID.
 * @returns {React.Component} The `CourseTeeSets` component, rendering the interface for managing tee sets.
 */
export default function CourseTeeSets({ tees, onAddTee, onUpdateTee, onRemoveTee, onSetDefaultTee }) {
  const [newTee, setNewTee] = useState({ name: '', color_label: '', rating: '', slope: '' })
  const [teeBusy, setTeeBusy] = useState(false)
  const [teeMessage, setTeeMessage] = useState(null)

  const handleAdd = async () => {
    const name = newTee.name.trim()
    if (!name) {
      setTeeMessage('Enter a tee name (e.g. Championship, White).')
      return
    }

    setTeeBusy(true)
    setTeeMessage(null)

    const ratingVal = newTee.rating.trim()
    const slopeVal = newTee.slope.trim()

    const payload = {
      name,
      color_label: newTee.color_label.trim() || null,
      rating: ratingVal === '' ? null : Number(ratingVal),
      slope: slopeVal === '' ? null : Number(slopeVal),
    }

    const res = await onAddTee(payload)
    if (res.success) {
      setNewTee({ name: '', color_label: '', rating: '', slope: '' })
    } else {
      setTeeMessage(res.error)
    }
    setTeeBusy(false)
  }

  const handleUpdateField = async (teeId, patch) => {
    setTeeBusy(true)
    setTeeMessage(null)
    const res = await onUpdateTee(teeId, patch)
    if (!res.success) setTeeMessage(res.error)
    setTeeBusy(false)
  }

  const handleRemove = async (teeId) => {
    if (!window.confirm('Remove this tee set? Yardages for this tee will be hidden.')) return
    setTeeBusy(true)
    setTeeMessage(null)
    const res = await onRemoveTee(teeId)
    if (!res.success) setTeeMessage(res.error)
    setTeeBusy(false)
  }

  const handleSetDefault = async (teeId) => {
    setTeeBusy(true)
    setTeeMessage(null)
    const res = await onSetDefaultTee(teeId)
    if (!res.success) setTeeMessage(res.error)
    setTeeBusy(false)
  }

  return (
    <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-2">Tee sets</h2>
      <p className="text-sm text-slate-500 mb-4">
        Add tee colors or names, USGA-style course rating and slope. Mark one tee as default; its yardages sync to the
        map &ldquo;scorecard yardage&rdquo; field.
      </p>

      {tees.length > 0 && (
        <ul className="space-y-4 mb-6">
          {tees.map((tee) => (
            <li
              key={tee.id}
              className="rounded-lg border border-slate-600 bg-slate-900/50 p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
            >
              <div className="lg:col-span-3">
                <label htmlFor={`tee-name-${tee.id}`} className="block text-xs font-medium text-slate-500 mb-1">Name</label>
                <input
                  id={`tee-name-${tee.id}`}
                  type="text"
                  defaultValue={tee.name}
                  key={`name-${tee.id}-${tee.name}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    if (v && v !== tee.name) handleUpdateField(tee.id, { name: v })
                  }}
                  disabled={teeBusy}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor={`tee-color-${tee.id}`} className="block text-xs font-medium text-slate-500 mb-1">Color / label</label>
                <input
                  id={`tee-color-${tee.id}`}
                  type="color"
                  defaultValue={tee.color_label?.startsWith('#') ? tee.color_label : '#ffffff'}
                  onBlur={(e) => {
                    const v = e.target.value
                    if (v !== (tee.color_label ?? null)) handleUpdateField(tee.id, { color_label: v })
                  }}
                  disabled={teeBusy}
                  className="w-full h-[38px] p-0.5 bg-slate-900 border border-slate-600 rounded cursor-pointer"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor={`tee-rating-${tee.id}`} className="block text-xs font-medium text-slate-500 mb-1">Rating</label>
                <input
                  id={`tee-rating-${tee.id}`}
                  type="number"
                  step="0.1"
                  defaultValue={tee.rating ?? ''}
                  key={`rating-${tee.id}-${tee.rating ?? ''}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    const n = v === '' ? null : Number(v)
                    if (n !== tee.rating) handleUpdateField(tee.id, { rating: n })
                  }}
                  disabled={teeBusy}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor={`tee-slope-${tee.id}`} className="block text-xs font-medium text-slate-500 mb-1">Slope</label>
                <input
                  id={`tee-slope-${tee.id}`}
                  type="number"
                  step="1"
                  defaultValue={tee.slope ?? ''}
                  key={`slope-${tee.id}-${tee.slope ?? ''}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    const n = v === '' ? null : Number(v)
                    if (n !== tee.slope) handleUpdateField(tee.id, { slope: n })
                  }}
                  disabled={teeBusy}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                />
              </div>
              <div className="lg:col-span-2 flex items-center gap-3 pb-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="default-tee"
                    checked={tee.is_default}
                    onChange={() => {
                      if (!tee.is_default) handleSetDefault(tee.id)
                    }}
                    disabled={teeBusy}
                    className="rounded-full border-slate-500 text-emerald-500 focus:ring-emerald-500"
                  />
                  Default
                </label>
              </div>
              <div className="lg:col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleRemove(tee.id)}
                  disabled={teeBusy}
                  className="p-2 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/40 disabled:opacity-45"
                  title="Remove tee"
                >
                  <Trash2 className="w-4 h-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-lg border border-emerald-500/30 bg-slate-900/80 p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
        <div className="md:col-span-4">
          <label htmlFor="new-tee-name" className="block text-xs font-medium text-slate-500 mb-1">
            New tee name
          </label>
          <input
            id="new-tee-name"
            type="text"
            placeholder="e.g. White, Blue, Tips"
            value={newTee.name}
            onChange={(e) => setNewTee((t) => ({ ...t, name: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
        <div className="md:col-span-3">
          <label htmlFor="new-tee-color" className="block text-xs font-medium text-slate-500 mb-1">
            Color label
          </label>
          <input
            id="new-tee-color"
            type="color"
            value={newTee.color_label?.startsWith('#') ? newTee.color_label : '#ffffff'}
            onChange={(e) => setNewTee((t) => ({ ...t, color_label: e.target.value }))}
            className="w-full h-[38px] p-0.5 bg-slate-900 border border-slate-600 rounded cursor-pointer"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="new-tee-rating" className="block text-xs font-medium text-slate-500 mb-1">
            Rating
          </label>
          <input
            id="new-tee-rating"
            type="number"
            step="0.1"
            value={newTee.rating}
            onChange={(e) => setNewTee((t) => ({ ...t, rating: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="new-tee-slope" className="block text-xs font-medium text-slate-500 mb-1">
            Slope
          </label>
          <input
            id="new-tee-slope"
            type="number"
            step="1"
            value={newTee.slope}
            onChange={(e) => setNewTee((t) => ({ ...t, slope: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
          />
        </div>
        <div className="md:col-span-1 flex justify-end">
          <button
            type="button"
            onClick={handleAdd}
            disabled={teeBusy}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" aria-hidden />
            Add
          </button>
        </div>
      </div>
      {teeMessage && <p className="mt-3 text-sm text-red-400">{teeMessage}</p>}
    </section>
  )
}
