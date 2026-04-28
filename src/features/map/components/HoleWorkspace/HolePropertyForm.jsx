import { useState, useCallback } from 'react'
import { Flag } from 'lucide-react'

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
