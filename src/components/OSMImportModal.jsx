import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { searchOSMCourses, fetchCourseDetailsFromOverpass, parseOSMDataToSchema } from '../features/map/utils/osmImport'
import { importCourseToSupabase } from '../services/courseImportService'
import { Search, Map as MapIcon, Download, X, Loader2 } from 'lucide-react'

export default function OSMImportModal({ onClose, onImportComplete }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [isImporting, setIsImporting] = useState(false)
  const [error, setError] = useState(null)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setError(null)
    setSearchResults([])
    setSelectedCourse(null)

    try {
      const results = await searchOSMCourses(searchQuery)
      setSearchResults(results)
    } catch (err) {
      setError('Failed to search OpenStreetMap. Please try again.')
    } finally {
      setIsSearching(false)
    }
  }

  const handleImport = async () => {
    if (!selectedCourse) return

    setIsImporting(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('You must be logged in to import a course.')

      // Fetch from Overpass using the bounding box
      const bbox = selectedCourse.boundingbox
      const { geojson } = await fetchCourseDetailsFromOverpass(selectedCourse.osm_type, selectedCourse.osm_id, bbox)
      
      // Parse to Schema
      const courseName = selectedCourse.display_name.split(',')[0] // Get first part of name
      const parsedData = parseOSMDataToSchema(geojson, courseName, user.id)

      // Import to Supabase
      const newCourseId = await importCourseToSupabase(parsedData)
      
      onImportComplete(newCourseId)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to import course.')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-emerald-500" />
            Import from OpenStreetMap
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSearch} className="mb-6">
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Course Name (e.g., Hunters Ridge Golf)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter course name..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
          </form>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm mb-6">
              {error}
            </div>
          )}

          {searchResults.length > 0 && !selectedCourse && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Select a course to import:</h3>
              {searchResults.map((result) => (
                <button
                  key={result.place_id}
                  onClick={() => setSelectedCourse(result)}
                  className="w-full text-left p-4 bg-slate-800/50 border border-slate-700 hover:border-emerald-500/50 rounded-xl transition-colors group"
                >
                  <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                    {result.display_name.split(',')[0]}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 truncate">
                    {result.display_name}
                  </p>
                </button>
              ))}
            </div>
          )}

          {selectedCourse && (
            <div className="bg-slate-800/50 border border-emerald-500/30 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-2">
                {selectedCourse.display_name.split(',')[0]}
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                {selectedCourse.display_name}
              </p>
              
              <div className="bg-slate-950/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-300">
                  This action will download all mapped features (holes, greens, tees, fairways, bunkers, etc.) for this course from OpenStreetMap and create a new course in your dashboard.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  disabled={isImporting}
                >
                  Back to Results
                </button>
                <button
                  onClick={handleImport}
                  disabled={isImporting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Import Course
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
