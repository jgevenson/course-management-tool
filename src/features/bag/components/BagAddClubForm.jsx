import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

const YARD_MIN = 0
const YARD_MAX = 400

const CLUB_TYPE_OPTIONS = [
  { value: 'wood', label: 'Wood' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'iron', label: 'Iron' },
  { value: 'wedge', label: 'Wedge' },
  { value: 'putter', label: 'Putter' },
]

export default function BagAddClubForm({ onAdd, clubs, setError, setMessage }) {
  const [addName, setAddName] = useState('')
  const [addShortName, setAddShortName] = useState('')
  const [addClubType, setAddClubType] = useState('iron')
  const [addIsPutter, setAddIsPutter] = useState(false)
  const [addSortOrder, setAddSortOrder] = useState('')
  const [addCarry, setAddCarry] = useState('')
  const [addTotal, setAddTotal] = useState('')
  const [addSaving, setAddSaving] = useState(false)

  const sortOrderNum = (row) => {
    const v = row?.sort_order
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

  const nextSortAfterRows = (rows) => {
    if (!rows?.length) return 1
    return Math.max(0, ...rows.map(sortOrderNum)) + 1
  }

  useEffect(() => {
    setAddSortOrder(String(nextSortAfterRows(clubs)))
  }, [clubs])

  const parseYard = (raw) => {
    const t = String(raw).trim()
    if (t === '') return { ok: false, error: 'Distance is required.' }
    const n = Number(t)
    if (!Number.isFinite(n) || !Number.isInteger(n)) {
      return { ok: false, error: 'Use a whole number of yards.' }
    }
    if (n < YARD_MIN || n > YARD_MAX) {
      return { ok: false, error: `Yardage must be between ${YARD_MIN} and ${YARD_MAX}.` }
    }
    return { ok: true, value: n }
  }

  const parseSortOrder = (raw) => {
    const t = String(raw).trim()
    if (t === '') return { ok: false, error: 'Order is required.' }
    const n = Number(t)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0 || n > 99) {
      return { ok: false, error: 'Order must be a whole number from 0 to 99.' }
    }
    return { ok: true, value: n }
  }

  const validatePair = (carry, total) => {
    if (carry > total) {
      return 'Carry cannot be greater than total distance.'
    }
    return null
  }

  const resolveTypeForSave = (isPutter, clubType) => {
    if (isPutter) return 'putter'
    return clubType
  }

  const handleAddIsPutter = (v) => {
    setAddIsPutter(v)
    if (v) setAddClubType('putter')
  }

  const handleAddClubType = (v) => {
    setAddClubType(v)
    if (v === 'putter') setAddIsPutter(true)
    else setAddIsPutter(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)
    const name = addName.trim()
    const shortName = addShortName.trim()
    if (!name) {
      setError('Club name is required.')
      return
    }
    if (!shortName) {
      setError('Short name (abbreviation) is required.')
      return
    }
    const so = parseSortOrder(addSortOrder)
    if (!so.ok) {
      setError(so.error)
      return
    }
    const c = parseYard(addCarry)
    const t = parseYard(addTotal)
    if (!c.ok) {
      setError(c.error)
      return
    }
    if (!t.ok) {
      setError(t.error)
      return
    }
    const pairErr = validatePair(c.value, t.value)
    if (pairErr) {
      setError(pairErr)
      return
    }

    const effectiveType = resolveTypeForSave(addIsPutter, addClubType)

    setAddSaving(true)
    setError(null)

    const res = await onAdd({
      name,
      short_name: shortName,
      club_type: effectiveType,
      is_putter: addIsPutter || effectiveType === 'putter',
      sort_order: so.value,
      carry_distance: c.value,
      total_distance: t.value,
    })

    setAddSaving(false)
    if (!res.success) {
      setError(res.error)
      return
    }

    setAddName('')
    setAddShortName('')
    setAddClubType('iron')
    setAddIsPutter(false)
    setAddCarry('')
    setAddTotal('')
    setMessage('Club added.')
    window.setTimeout(() => setMessage(null), 2500)
  }

  const inputClass =
    'w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
  const selectClass = inputClass + ' cursor-pointer'

  return (
    <form onSubmit={handleSubmit} className="mb-6 rounded-lg border border-slate-600/80 bg-slate-900/50 p-4">
      <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
        <Plus className="w-4 h-4 text-emerald-500" aria-hidden />
        Add a club
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <div className="lg:col-span-1">
          <label htmlFor="bag-add-sort" className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
            Sort order
          </label>
          <input
            id="bag-add-sort"
            type="number"
            min={0}
            max={99}
            step={1}
            value={addSortOrder}
            onChange={(e) => setAddSortOrder(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bag-add-short" className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
            Short name
          </label>
          <input
            id="bag-add-short"
            type="text"
            value={addShortName}
            onChange={(e) => setAddShortName(e.target.value)}
            placeholder="Dr, 7i, PW"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="bag-add-name" className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
            Name
          </label>
          <input
            id="bag-add-name"
            type="text"
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            placeholder="e.g. 7 Iron"
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="bag-add-type" className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
            Club type
          </label>
          <select
            id="bag-add-type"
            value={addClubType}
            onChange={(e) => handleAddClubType(e.target.value)}
            className={selectClass}
          >
            {CLUB_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 select-none">
            <input
              type="checkbox"
              checked={addIsPutter}
              onChange={(e) => handleAddIsPutter(e.target.checked)}
              className="size-4 rounded border-slate-600 bg-slate-900 text-emerald-600 focus:ring-emerald-500/40"
            />
            Putter
          </label>
        </div>
        <div>
          <label htmlFor="bag-add-carry" className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
            Carry (yd)
          </label>
          <input
            id="bag-add-carry"
            type="number"
            min={YARD_MIN}
            max={YARD_MAX}
            step={1}
            value={addCarry}
            onChange={(e) => setAddCarry(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="bag-add-total" className="block text-xs text-slate-500 uppercase tracking-wide mb-1">
            Total (yd)
          </label>
          <input
            id="bag-add-total"
            type="number"
            min={YARD_MIN}
            max={YARD_MAX}
            step={1}
            value={addTotal}
            onChange={(e) => setAddTotal(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={addSaving}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
      >
        {addSaving ? 'Adding…' : 'Add to bag'}
      </button>
    </form>
  )
}
