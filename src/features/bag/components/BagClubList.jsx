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

export default function BagClubList({ clubs, activeClubId, onSelectClub, onUpdate, onRemove, setError, setMessage }) {
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editShortName, setEditShortName] = useState('')
  const [editClubType, setEditClubType] = useState('iron')
  const [editIsPutter, setEditIsPutter] = useState(false)
  const [editSortOrder, setEditSortOrder] = useState('')
  const [editCarry, setEditCarry] = useState('')
  const [editTotal, setEditTotal] = useState('')
  const [editMissLeft, setEditMissLeft] = useState('')
  const [editMissRight, setEditMissRight] = useState('')
  const [editMissShort, setEditMissShort] = useState('')
  const [editMissLong, setEditMissLong] = useState('')
  const [editStockShotShape, setEditStockShotShape] = useState('Straight')
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
    setEditMissLeft(String(row.miss_left ?? '0'))
    setEditMissRight(String(row.miss_right ?? '0'))
    setEditMissShort(String(row.miss_short ?? '0'))
    setEditMissLong(String(row.miss_long ?? '0'))
    setEditStockShotShape(row.stock_shot_shape || 'Straight')
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
    setEditMissLeft('')
    setEditMissRight('')
    setEditMissShort('')
    setEditMissLong('')
    setEditStockShotShape('Straight')
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
      miss_left: parseInt(editMissLeft) || 0,
      miss_right: parseInt(editMissRight) || 0,
      miss_short: parseInt(editMissShort) || 0,
      miss_long: parseInt(editMissLong) || 0,
      stock_shot_shape: editStockShotShape,
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

  const sortedClubs = [...clubs].sort((a, b) => {
    return (a.sort_order ?? 0) - (b.sort_order ?? 0)
  })

  const inputClass =
    'w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
  const inputTight = inputClass + ' py-1.5 text-xs'

  if (clubs.length === 0) {
    return <p className="text-slate-500 text-sm">No clubs yet. Use the form above to build your bag.</p>
  }

  return (
    <div className="space-y-3">
      {sortedClubs.map((row) => {
        const isEditing = editingId === row.id;
        const isActive = activeClubId === row.id;
        
        return (
          <div 
            key={row.id} 
            className={`bg-slate-900/40 border transition-all duration-200 rounded-xl overflow-hidden cursor-pointer ${
              isEditing ? 'border-emerald-500/50 ring-1 ring-emerald-500/20' : 
              isActive ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/5' :
              'border-slate-700 hover:border-slate-600'
            }`}
            onClick={() => onSelectClub && onSelectClub(row.id)}
          >
            {isEditing ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`edit-name-${row.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Club name</label>
                    <input
                      id={`edit-name-${row.id}`}
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={inputTight}
                      placeholder="e.g. Driver"
                    />
                  </div>
                  <div>
                    <label htmlFor={`edit-short-name-${row.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Short name</label>
                    <input
                      id={`edit-short-name-${row.id}`}
                      type="text"
                      value={editShortName}
                      onChange={(e) => setEditShortName(e.target.value)}
                      className={inputTight}
                      placeholder="e.g. Dr"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label htmlFor={`edit-type-${row.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Club type</label>
                    <select
                      id={`edit-type-${row.id}`}
                      value={editClubType}
                      onChange={(e) => {
                        const v = e.target.value
                        setEditClubType(v)
                        if (v === 'putter') setEditIsPutter(true)
                      }}
                      className={inputTight}
                    >
                      {CLUB_TYPE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`edit-sort-${row.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sort order</label>
                    <input
                      id={`edit-sort-${row.id}`}
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(e.target.value)}
                      className={inputTight}
                    />
                  </div>
                  <div className="flex items-end pb-2">
                    <label htmlFor={`edit-putter-${row.id}`} className="flex items-center gap-2 cursor-pointer">
                      <input
                        id={`edit-putter-${row.id}`}
                        type="checkbox"
                        checked={editIsPutter}
                        onChange={(e) => {
                          const v = e.target.checked
                          setEditIsPutter(v)
                          if (v) setEditClubType('putter')
                        }}
                        className="size-4 rounded border-slate-600 bg-slate-900 text-emerald-600"
                      />
                      <span className="text-xs text-slate-300">Is putter</span>
                    </label>
                  </div>
                </div>

                {!editIsPutter && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={`edit-carry-${row.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Carry yards</label>
                      <input
                        id={`edit-carry-${row.id}`}
                        type="number"
                        value={editCarry}
                        onChange={(e) => setEditCarry(e.target.value)}
                        className={inputTight}
                      />
                    </div>
                    <div>
                      <label htmlFor={`edit-total-${row.id}`} className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Total yards</label>
                      <input
                        id={`edit-total-${row.id}`}
                        type="number"
                        value={editTotal}
                        onChange={(e) => setEditTotal(e.target.value)}
                        className={inputTight}
                      />
                    </div>
                  </div>
                )}

                {!editIsPutter && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-[10px] font-bold text-emerald-500 uppercase mb-2 tracking-wider">Dispersion Modeling</label>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Shot Shape</label>
                        <select
                          value={editStockShotShape}
                          onChange={(e) => setEditStockShotShape(e.target.value)}
                          className={inputTight}
                        >
                          {['Big Draw', 'Draw', 'Slight Draw', 'Straight', 'Slight Fade', 'Fade', 'Big Fade'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Miss Left (yds)</label>
                        <input
                          type="number"
                          value={editMissLeft}
                          onChange={(e) => setEditMissLeft(e.target.value)}
                          className={inputTight}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Miss Right (yds)</label>
                        <input
                          type="number"
                          value={editMissRight}
                          onChange={(e) => setEditMissRight(e.target.value)}
                          className={inputTight}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Miss Short (yds)</label>
                        <input
                          type="number"
                          value={editMissShort}
                          onChange={(e) => setEditMissShort(e.target.value)}
                          className={inputTight}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Miss Long (yds)</label>
                        <input
                          type="number"
                          value={editMissLong}
                          onChange={(e) => setEditMissLong(e.target.value)}
                          className={inputTight}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                    disabled={editSaving}
                    className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
                    disabled={editSaving}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner border ${
                    row.is_putter ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-100'
                  }`}>
                    {row.short_name}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-100 font-bold">{row.name}</span>
                      <span className={clubTypeBadgeClasses(row.club_type)}>{row.club_type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {!row.is_putter && (
                    <div className="text-right">
                      <div className="text-emerald-400 font-extrabold text-2xl tracking-tighter tabular-nums leading-none">
                        {row.total_distance}<span className="text-[10px] font-bold ml-0.5 text-emerald-500/60 uppercase">yds</span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Carry: {row.carry_distance}y</div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1 border-l border-slate-800 pl-4 ml-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); startEdit(row); }}
                      className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-all"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(row.id); }}
                      disabled={removingId === row.id}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                      aria-label={`Remove ${row.name} from bag`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
