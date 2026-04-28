import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

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
                  type="text"
                  defaultValue={tee.color_label ?? ''}
                  key={`color-${tee.id}-${tee.color_label ?? ''}`}
                  onBlur={(e) => {
                    const v = e.target.value.trim()
                    const next = v || null
                    if (next !== (tee.color_label ?? null)) handleUpdateField(tee.id, { color_label: next })
                  }}
                  disabled={teeBusy}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
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
            type="text"
            placeholder="Optional"
            value={newTee.color_label}
            onChange={(e) => setNewTee((t) => ({ ...t, color_label: e.target.value }))}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
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
