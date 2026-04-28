import { useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'

const YARD_MIN = 0
const YARD_MAX = 400

const CLUB_TYPE_OPTIONS = [
  { value: 'wood', label: 'Wood' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'iron', label: 'Iron' },
  { value: 'wedge', label: 'Wedge' },
  { value: 'putter', label: 'Putter' },
]

function clubTypeBadgeClasses(type) {
  const t = String(type ?? '').toLowerCase()
  const base =
    'inline-flex rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap'
  const map = {
    wood: 'border-amber-700/50 bg-amber-950/50 text-amber-300',
    hybrid: 'border-sky-700/50 bg-sky-950/50 text-sky-300',
    iron: 'border-slate-600 bg-slate-800/80 text-slate-300',
    wedge: 'border-violet-700/50 bg-violet-950/50 text-violet-300',
    putter: 'border-emerald-700/50 bg-emerald-950/50 text-emerald-300',
  }
  return `${base} ${map[t] ?? 'border-slate-600 bg-slate-800/80 text-slate-400'}`
}

export default function BagClubList({ clubs, onUpdate, onRemove, setError, setMessage }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editShortName, setEditShortName] = useState('')
  const [editClubType, setEditClubType] = useState('iron')
  const [editIsPutter, setEditIsPutter] = useState(false)
  const [editSortOrder, setEditSortOrder] = useState('')
  const [editCarry, setEditCarry] = useState('')
  const [editTotal, setEditTotal] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  const [removingId, setRemovingId] = useState(null)

  const sortOrderNum = (row) => {
    const v = row?.sort_order
    if (typeof v === 'number' && Number.isFinite(v)) return v
    const n = Number(v)
    return Number.isFinite(n) ? n : 0
  }

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

  const startEdit = (row) => {
    setEditingId(row.id)
    setEditName(row.name)
    setEditShortName(row.short_name ?? '')
    setEditClubType(row.club_type ?? 'iron')
    setEditIsPutter(Boolean(row.is_putter))
    setEditSortOrder(String(row.sort_order ?? ''))
    setEditCarry(String(row.carry_distance))
    setEditTotal(String(row.total_distance))
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditShortName('')
    setEditClubType('iron')
    setEditIsPutter(false)
    setEditSortOrder('')
    setEditCarry('')
    setEditTotal('')
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    setMessage(null)
    const name = editName.trim()
    const shortName = editShortName.trim()
    if (!name) {
      setError('Club name is required.')
      return
    }
    if (!shortName) {
      setError('Short name is required.')
      return
    }
    const so = parseSortOrder(editSortOrder)
    if (!so.ok) {
      setError(so.error)
      return
    }
    const c = parseYard(editCarry)
    const t = parseYard(editTotal)
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

    const effectiveType = resolveTypeForSave(editIsPutter, editClubType)

    setEditSaving(true)
    setError(null)

    const res = await onUpdate(editingId, {
      name,
      short_name: shortName,
      club_type: effectiveType,
      is_putter: editIsPutter || effectiveType === 'putter',
      sort_order: so.value,
      carry_distance: c.value,
      total_distance: t.value,
    })

    setEditSaving(false)
    if (!res.success) {
      setError(res.error)
      return
    }
    cancelEdit()
    setMessage('Club updated.')
    window.setTimeout(() => setMessage(null), 2500)
  }

  const handleRemove = async (id) => {
    setMessage(null)
    setRemovingId(id)
    setError(null)
    
    const res = await onRemove(id)
    
    setRemovingId(null)
    if (!res.success) {
      setError(res.error)
      return
    }
    setMessage('Club removed from bag.')
    window.setTimeout(() => setMessage(null), 2500)
    if (editingId === id) cancelEdit()
  }

  const inputClass =
    'w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
  const inputTight = inputClass + ' py-1.5 text-xs'

  if (clubs.length === 0) {
    return <p className="text-slate-500 text-sm">No clubs yet. Use the form above to build your bag.</p>
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="w-full min-w-[800px] text-sm text-left">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-2 py-2 font-medium w-10">#</th>
            <th className="px-2 py-2 font-medium w-[72px]">Abbr</th>
            <th className="px-3 py-2 font-medium min-w-[120px]">Name</th>
            <th className="px-2 py-2 font-medium w-[88px]">Type</th>
            <th className="px-2 py-2 font-medium w-[72px] text-center">Putter</th>
            <th className="px-2 py-2 font-medium tabular-nums w-[72px]">Carry</th>
            <th className="px-2 py-2 font-medium tabular-nums w-[72px]">Total</th>
            <th className="px-3 py-2 font-medium w-[100px] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {clubs.map((row) => (
            <tr key={row.id} className="border-b border-slate-700/80 last:border-0 hover:bg-slate-900/30">
              {editingId === row.id ? (
                <>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(e.target.value)}
                      className={inputTight}
                      aria-label="Sort order"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="text"
                      value={editShortName}
                      onChange={(e) => setEditShortName(e.target.value)}
                      className={inputTight}
                      aria-label="Short name"
                    />
                  </td>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputTight}
                      aria-label="Club name"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <select
                      value={editClubType}
                      onChange={(e) => {
                        const v = e.target.value
                        setEditClubType(v)
                        if (v === 'putter') setEditIsPutter(true)
                      }}
                      className={inputTight + ' cursor-pointer'}
                      aria-label="Club type"
                    >
                      {CLUB_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 align-middle text-center">
                    <input
                      type="checkbox"
                      checked={editIsPutter}
                      onChange={(e) => {
                        const v = e.target.checked
                        setEditIsPutter(v)
                        if (v) setEditClubType('putter')
                      }}
                      className="size-4 rounded border-slate-600 bg-slate-900 text-emerald-600"
                      aria-label="Is putter"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={YARD_MIN}
                      max={YARD_MAX}
                      step={1}
                      value={editCarry}
                      onChange={(e) => setEditCarry(e.target.value)}
                      className={inputTight}
                      aria-label="Carry yards"
                    />
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={YARD_MIN}
                      max={YARD_MAX}
                      step={1}
                      value={editTotal}
                      onChange={(e) => setEditTotal(e.target.value)}
                      className={inputTight}
                      aria-label="Total yards"
                    />
                  </td>
                  <td className="px-2 py-2 align-top text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={editSaving}
                      className="mr-2 text-emerald-400 hover:text-emerald-300 text-xs font-medium disabled:opacity-50"
                    >
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={editSaving}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden />
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2.5 text-slate-500 tabular-nums text-center">
                    {row.sort_order == null ? '—' : sortOrderNum(row)}
                  </td>
                  <td className="px-2 py-2.5 font-medium text-emerald-400/95 tabular-nums">{row.short_name}</td>
                  <td className="px-3 py-2.5 text-slate-200">{row.name}</td>
                  <td className="px-2 py-2.5">
                    <span className={clubTypeBadgeClasses(row.club_type)}>
                      {String(row.club_type ?? '—')}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center text-slate-400">
                    {row.is_putter ? (
                      <span className="text-emerald-400 font-medium text-xs">Yes</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-2 py-2.5 text-slate-300 tabular-nums">{row.carry_distance}</td>
                  <td className="px-2 py-2.5 text-slate-300 tabular-nums">{row.total_distance}</td>
                  <td className="px-2 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-400 hover:bg-slate-700/80 hover:text-white transition-colors mr-1"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil className="w-3.5 h-3.5" aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(row.id)}
                      disabled={removingId === row.id}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-red-400/90 hover:bg-red-950/50 hover:text-red-300 disabled:opacity-50 transition-colors"
                      aria-label={`Remove ${row.name} from bag`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden />
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
