// AI assisted development
import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { buildPlanningView } from '../../utils/planningSegments'

/**
 * @param {object} props
 * @param {object | null} props.hole
 * @param {(markerId: string) => Promise<void>} props.onRemoveMarker
 * @param {boolean} props.removing
 * @param {string | null} props.message
 */
export default function PlanningDistancesPanel({ hole, onRemoveMarker, removing, message }) {
  const { segments, markers } = useMemo(() => buildPlanningView(hole), [hole])

  const landingAreas = useMemo(() => {
    return markers.filter(m => m.marker_type === 'landing_area')
  }, [markers])

  return (
    <div className="p-3 flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Shots</h3>
        {segments.length === 0 ? (
          <p className="text-sm text-slate-500 leading-snug">
            Add a <span className="text-slate-400">landing zone</span> or ensure mapping markers are set to see distances.
          </p>
        ) : (
          <ul className="space-y-2">
            {segments.map((s) => (
              <li
                key={s.id}
                className="flex justify-between items-start gap-3 rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2.5"
              >
                <span className="text-sm text-slate-200 leading-snug">{s.label}</span>
                <span className="text-emerald-400 font-semibold tabular-nums shrink-0">{s.yards} yd</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {landingAreas.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Landing Areas</h3>
          <p className="text-xs text-slate-500 mb-2 leading-snug">
            Delete landing areas to simplify the strategy.
          </p>
          <ul className="space-y-2">
            {landingAreas.map((m, idx) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2"
              >
                <span className="text-sm text-slate-300">L{idx + 1}</span>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => onRemoveMarker(m.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-900/50 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-950/40 disabled:opacity-45 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.toLowerCase().includes('removed') ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
