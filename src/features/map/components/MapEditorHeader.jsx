import { Link } from 'react-router-dom'
import { ArrowLeft, Crosshair } from 'lucide-react'

/**
 * Top toolbar for the map editor: back link, course name,
 * mapping/planning toggle, save-map-center button, and feedback banners.
 */
export default function MapEditorHeader({
  courseId,
  courseName,
  workspaceMode,
  onWorkspaceModeChange,
  savingLocation,
  locationFeedback,
  usingFallback,
  onSaveLocation,
  mapReady,
  markerMessage,
  regionMessage,
  regionDraft,
}) {
  return (
    <>
      <div className="shrink-0 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            to={`/course/${courseId}/details`}
            className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Course page
          </Link>
          <span className="text-slate-600 hidden sm:inline" aria-hidden>
            |
          </span>
          <h1 className="text-lg font-semibold text-white truncate min-w-0">{courseName}</h1>
        </div>

        <div
          className="flex rounded-lg border border-slate-600 bg-slate-900/80 p-0.5 shrink-0"
          role="group"
          aria-label="Workspace mode"
        >
          <button
            type="button"
            onClick={() => onWorkspaceModeChange('mapping')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              workspaceMode === 'mapping'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mapping
          </button>
          <button
            type="button"
            onClick={() => onWorkspaceModeChange('planning')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              workspaceMode === 'planning'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Planning
          </button>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-2">
            {usingFallback && (
              <p className="text-xs text-slate-500 hidden sm:block max-w-[220px] text-right">
                No coordinates — pan map, then save
              </p>
            )}
            <button
              type="button"
              disabled={!mapReady || savingLocation}
              onClick={onSaveLocation}
              title="Saves the geographic center of the current map view as this course's location"
              className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 hover:border-emerald-500/40 disabled:opacity-45 disabled:pointer-events-none transition-all duration-200"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" aria-hidden />
              {savingLocation ? 'Saving…' : 'Save map center'}
            </button>
          </div>
          {locationFeedback && (
            <p
              className={`text-xs text-right max-w-[280px] ${locationFeedback === 'Location saved' ? 'text-emerald-400' : 'text-red-400'}`}
            >
              {locationFeedback}
            </p>
          )}
        </div>
      </div>

      {markerMessage && (
        <div className="shrink-0 px-4 py-1.5 bg-red-950/40 border-b border-red-900/50 text-xs text-red-300">
          {markerMessage}
        </div>
      )}

      {regionMessage && !regionDraft && (
        <div className="shrink-0 px-4 py-1.5 bg-amber-950/30 border-b border-amber-900/40 text-xs text-amber-200/90">
          {regionMessage}
        </div>
      )}
    </>
  )
}
