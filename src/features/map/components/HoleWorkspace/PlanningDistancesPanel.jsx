import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { buildPlanningView } from '../../utils/planningSegments'
import { getRecommendedClub } from '../../../bag/utils/dispersion'

export default function PlanningDistancesPanel({ hole, onRemoveMarker, onInsertPlanningMarker, removing, message, clubs = [] }) {
  const { segments } = useMemo(() => buildPlanningView(hole), [hole])

  return (
    <div className="p-4 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto">
      {segments.length === 0 ? (
        <p className="text-sm text-slate-500 leading-snug">
          Add a <span className="text-slate-400">landing zone</span> or ensure mapping markers are set to see distances.
        </p>
      ) : (
        <div className="flex flex-col">
          {segments.map((s, idx) => {
            const recommendedClub = getRecommendedClub(s.playsLike, clubs)
            const clubLabel = recommendedClub ? recommendedClub.short_name : '--'
            
            let percentage = null
            if (recommendedClub && recommendedClub.typical_distance) {
              const pct = Math.round((s.playsLike / recommendedClub.typical_distance) * 100)
              percentage = `${pct}%`
            }

            return (
              <div key={s.id} className="flex flex-col">
                <div className="flex items-center justify-between border-2 border-slate-700 bg-slate-900/80 p-3 rounded-md">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-medium text-slate-200">{clubLabel}</span>
                    {percentage && (
                      <span className="text-sm font-medium text-slate-400">{percentage}</span>
                    )}
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <span className="text-3xl font-medium text-slate-200 tabular-nums leading-none">
                        {s.yards}y
                      </span>
                      {s.elevationDiffFeet !== 0 && (
                        <div className="flex flex-col items-center justify-center leading-none text-slate-400 ml-1">
                          <span className="text-[10px]">
                            {s.elevationDiffFeet > 0 ? '^' : 'v'}
                          </span>
                          <span className="text-[10px] font-semibold tabular-nums">
                            {Math.abs(s.elevationDiffFeet)}ft
                          </span>
                        </div>
                      )}
                    </div>
                    {s.playsLike !== s.yards && (
                      <span className="text-sm font-medium text-slate-500 tabular-nums mt-1">
                        {s.playsLike}y
                      </span>
                    )}
                  </div>
                </div>

                {/* + button to split this segment */}
                <div className="flex justify-center -my-3 z-10 relative py-3">
                  <button
                    onClick={() => onInsertPlanningMarker && onInsertPlanningMarker(s.start, s.end)}
                    className="w-6 h-6 rounded-full bg-slate-950 border-2 border-slate-600 flex items-center justify-center hover:bg-slate-800 hover:border-emerald-500 hover:text-emerald-400 transition-colors text-slate-300 shadow-md"
                    title="Split this shot"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      
      {message && (
        <p className={`text-xs mt-2 ${message.toLowerCase().includes('removed') ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
