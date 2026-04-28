// AI assisted development
import { useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { buildPlanningView } from '../../utils/planningSegments'

/**
 * @param {object} props
 * @param {{ mapMarkers?: unknown[] } | null} props.hole
 * @param {(markerKind: string) => Promise<void>} props.onRemoveMarker
 * @param {boolean} props.removing
 * @param {string | null} props.message
 */
export default function PlanningDistancesPanel({ hole, onRemoveMarker, removing, message }) {
  const { segments, markerRemovals } = useMemo(() => buildPlanningView(hole), [hole])

  return (
    <div className="p-3 flex flex-col gap-5 flex-1 min-h-0 overflow-y-auto">
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Shots</h3>
        {segments.length === 0 ? (
          <p className="text-sm text-slate-500 leading-snug">
            Place <span className="text-slate-400">tee shot location</span> and set{' '}
            <span className="text-slate-400">green center</span> in Mapping mode to see distances.
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

      {markerRemovals.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Remove pins</h3>
          <p className="text-xs text-slate-500 mb-2 leading-snug">
            Clearing the tee shot removes all planning pins on this hole. Clearing 1st landing also clears 2nd shot.
          </p>
          <ul className="space-y-2">
            {markerRemovals.map((m) => (
              <li
                key={m.kind}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2"
              >
                <span className="text-sm text-slate-300">{m.label}</span>
                <button
                  type="button"
                  disabled={removing}
                  onClick={() => onRemoveMarker(m.kind)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-900/50 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-950/40 disabled:opacity-45 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {message && (
        <p className={`text-xs ${message.startsWith('Removed') ? 'text-emerald-400' : 'text-red-400'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
