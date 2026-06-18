// AI assisted development
import { ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * ## HoleSelectorV2
 *
 * Component for navigation between holes on the golf course.
 * Includes next/prev navigation with wrapping, a direct selection grid,
 * and read-only display of basic hole statistics.
 */
export default function HoleSelectorV2({
  holes = [],
  selectedHoleIndex = 0,
  onSelectHoleIndex,
}) {
  const currentHole = holes[selectedHoleIndex] || null

  const handlePrev = () => {
    if (holes.length === 0) return
    const nextIdx = (selectedHoleIndex - 1 + holes.length) % holes.length
    onSelectHoleIndex(nextIdx)
  }

  const handleNext = () => {
    if (holes.length === 0) return
    const nextIdx = (selectedHoleIndex + 1) % holes.length
    onSelectHoleIndex(nextIdx)
  }

  return (
    <div className="w-full flex flex-col gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
      {/* Selector Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrev}
          disabled={holes.length <= 1}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Previous hole"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-sm font-bold text-white tracking-wide uppercase">
          {currentHole ? `Hole ${currentHole.hole_number}` : 'Course View'}
        </span>

        <button
          type="button"
          onClick={() => onSelectHoleIndex(selectedHoleIndex === -1 ? 0 : -1)}
          className={`p-1.5 rounded-lg border text-xs font-bold transition-colors ${
            selectedHoleIndex === -1 
              ? 'border-emerald-500 bg-emerald-600/20 text-emerald-400' 
              : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
          }`}
          aria-label="Toggle Course View"
        >
          All
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={holes.length <= 1}
          className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          aria-label="Next hole"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Holes */}
      {holes.length > 0 && (
        <div className="grid grid-cols-6 gap-1.5">
          {holes.map((hole, index) => {
            const isSelected = index === selectedHoleIndex
            return (
              <button
                key={hole.id || hole.hole_number}
                type="button"
                onClick={() => onSelectHoleIndex(index)}
                className={`py-1 text-xs font-bold rounded-md transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                    : 'bg-slate-800/60 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {hole.hole_number}
              </button>
            )
          })}
        </div>
      )}

      {/* Hole Details Table/Stats */}
      {currentHole && (
        <div className="mt-2 grid grid-cols-3 gap-2 text-center border-t border-slate-800/80 pt-3">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Par</div>
            <div className="text-sm font-semibold text-slate-200">{currentHole.par || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Yardage</div>
            <div className="text-sm font-semibold text-slate-200">{currentHole.scorecard_yardage || '—'}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">HCP / SI</div>
            <div className="text-sm font-semibold text-slate-200">{currentHole.stroke_index || '—'}</div>
          </div>
        </div>
      )}
    </div>
  )
}
