// AI assisted development
import { Link } from 'react-router-dom'
import { ArrowLeft, Crosshair } from 'lucide-react'

/**
 * ## Map Editor Header
 * 
 * The top toolbar for the map editor component. It provides essential navigation and 
 * mode-switching controls for the map-based course editing interface.
 *
 * ### Responsibilities
 * - **Navigation**: Displays a back link to the main course details page (`/course/${courseId}/details`), 
 *   allowing users to easily exit the editor.
 * - **Mode Switching**: For mapping administrators, it offers a toggle to switch between 
 *   **Mapping** and **Planning** workspace modes.
 * - **Location Management**: Provides a button to save the current map view's center coordinates 
 *   as the course's official location. This is only available to mapping admins.
 * - **Feedback & Status**: Renders dynamic feedback messages for various states, including 
 *   save status (success or error), marker placements, region drafts, and fallback mode warnings.
 * 
 * ### State & Props Management
 * The component acts as a **controlled presentation component**. It receives all its data and 
 * control signals via props from its parent component (`MapCanvas`). It does not manage any 
 * internal state. The `workspaceMode` prop determines which mode is currently active, and the 
 * `onWorkspaceModeChange` callback is invoked when the user interacts with the mode toggle.
 * 
 * ### Accessibility
 * - **Button Roles**: Buttons use `type="button"` and include `aria-label` attributes to 
 *   ensure screen readers can correctly identify and describe their purpose.
 * - **Icon Semantics**: Decorative icons use `aria-hidden="true"`.
 * - **Visual Feedback**: State changes are communicated through color changes, opacity 
 *   adjustments, and the display of text messages.
 * 
 * ### Usage Example
 * The component is typically rendered at the top of the `HoleWorkspace` layout. It relies on 
 * the parent component to manage the overall workspace state and data fetching.
 * 
 * @param {Object} props - The properties for the MapEditorHeader component.
 * @param {string} props.courseId - The unique identifier of the course.
 * @param {string} props.courseName - The name of the course.
 * @param {string} props.workspaceMode - The current mode of the workspace ('mapping' or 'planning').
 * @param {function} props.onWorkspaceModeChange - Callback function to handle mode changes.
 * @param {boolean} props.isMappingAdmin - Flag indicating if the user is a mapping administrator.
 * @param {boolean} props.savingLocation - Flag indicating if the location is currently being saved.
 * @param {string|null} props.locationFeedback - Feedback message related to location saving.
 * @param {boolean} props.usingFallback - Flag indicating if a fallback location is being used.
 * @param {function} props.onSaveLocation - Callback function to save the map center location.
 * @param {boolean} props.mapReady - Flag indicating if the map is ready.
 * @param {string|null} props.markerMessage - Message related to marker operations.
 * @param {string|null} props.regionMessage - Message related to region operations.
 * @param {Object|null} props.regionDraft - The current region draft object.
 * @returns {JSX.Element}
 */

export default function MapEditorHeader({
  courseId,
  courseName,
  workspaceMode,
  onWorkspaceModeChange,
  isMappingAdmin,
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
          <Link
            to={`/v2/course/${courseId}`}
            className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
          >
            Try MapLibre V2
          </Link>
          <span className="text-slate-600 hidden sm:inline" aria-hidden>
            |
          </span>
          <h1 className="text-lg font-semibold text-white truncate min-w-0">{courseName}</h1>
        </div>

        {isMappingAdmin && (
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
        )}

        {isMappingAdmin && (
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
        )}
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

