// AI assisted development
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * ## V2Header
 *
 * Renders the top toolbar/header for the MapLibre v2 course mapping canvas.
 * Handles course branding, V2 status indicators, and mode selection.
 */
export default function V2Header({
  courseId,
  courseName,
  workspaceMode,
  onWorkspaceModeChange,
  isMappingAdmin,
  overlaysLoading,
  overlaysError,
  overlaysCount,
  onSaveCourseLocation,
  savingLocation,
  locationFeedback,
}) {
  return (
    <header className="v2-header shrink-0 px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/60">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link
          to={`/course/${courseId}/details`}
          className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-slate-400 hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Course page
        </Link>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <h1 className="v2-header__title text-lg font-semibold text-white truncate min-w-0">
          {courseName}
        </h1>
        <span className="v2-header__badge">MapLibre v2</span>

        {overlaysLoading && (
          <span className="text-xs text-slate-400">Loading terrain…</span>
        )}
        {overlaysError && (
          <span className="text-xs text-red-400">Error: {overlaysError}</span>
        )}
        {!overlaysLoading && !overlaysError && overlaysCount > 0 && (
          <span className="text-xs text-slate-500">
            {overlaysCount} overlays
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Save Default Center Button */}
        {isMappingAdmin && (
          <button
            type="button"
            onClick={onSaveCourseLocation}
            disabled={savingLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
          >
            {savingLocation ? 'Saving…' : locationFeedback || 'Save Default Center'}
          </button>
        )}

        {/* Mode Toggle (Admin only) */}
        {isMappingAdmin && (
          <div
            className="flex rounded-lg border border-slate-700 bg-slate-900/80 p-0.5"
            role="group"
            aria-label="Workspace mode"
          >
            <button
              type="button"
              onClick={() => onWorkspaceModeChange('mapping')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
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
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all duration-200 ${
                workspaceMode === 'planning'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Planning
            </button>
          </div>
        )}

        <Link to={`/course/${courseId}`} className="v2-header__back font-medium text-slate-400 hover:text-emerald-400 transition-colors">
          ← Back to Leaflet v1
        </Link>
      </div>
    </header>
  )
}
