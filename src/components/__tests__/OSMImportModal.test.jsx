import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OSMImportModal from '../OSMImportModal'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn()
const mockSearchOSMCourses = vi.fn()
const mockFetchCourseDetailsFromOverpass = vi.fn()
const mockParseOSMDataToSchema = vi.fn()
const mockImportCourseToSupabase = vi.fn()

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
    },
  },
}))

vi.mock('../../features/map/utils/osmImport', () => ({
  searchOSMCourses: (...args) => mockSearchOSMCourses(...args),
  fetchCourseDetailsFromOverpass: (...args) => mockFetchCourseDetailsFromOverpass(...args),
  parseOSMDataToSchema: (...args) => mockParseOSMDataToSchema(...args),
}))

vi.mock('../../services/courseImportService', () => ({
  importCourseToSupabase: (...args) => mockImportCourseToSupabase(...args),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_RESULTS = [
  {
    place_id: 101,
    osm_type: 'way',
    osm_id: 201,
    display_name: 'Hunters Ridge Golf Course, 123 Golf Rd, Marion, Iowa',
    boundingbox: ['42.0', '42.1', '-91.6', '-91.5'],
  },
  {
    place_id: 102,
    osm_type: 'relation',
    osm_id: 202,
    display_name: 'Eagle Point Golf Club, 456 Eagle Ln, Dubuque, Iowa',
    boundingbox: ['42.5', '42.6', '-90.7', '-90.6'],
  },
]

const MOCK_USER = { id: 'user-abc-123' }
const MOCK_GEOJSON = { type: 'FeatureCollection', features: [] }
const MOCK_PARSED = { name: 'Hunters Ridge Golf Course', userId: MOCK_USER.id, holes: [] }
const MOCK_NEW_COURSE_ID = 'course-new-999'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(props = {}) {
  const onClose = props.onClose ?? vi.fn()
  const onImportComplete = props.onImportComplete ?? vi.fn()
  const user = userEvent.setup()

  render(<OSMImportModal onClose={onClose} onImportComplete={onImportComplete} />)

  return {
    user,
    onClose,
    onImportComplete,
    searchInput: screen.getByPlaceholderText('Enter course name...'),
    searchButton: screen.getByRole('button', { name: /search/i }),
    closeButton: screen.getByRole('button', { name: '' }), // X icon button has no text
  }
}

/** Perform a search and wait for results to appear */
async function searchAndWait(user, searchInput, searchButton, query = 'Hunters Ridge') {
  await user.type(searchInput, query)
  await user.click(searchButton)
  await waitFor(() => {
    expect(screen.getByText('Select a course to import:')).toBeInTheDocument()
  })
}

/** Perform a search, then select the first result */
async function searchAndSelect(user, searchInput, searchButton) {
  await searchAndWait(user, searchInput, searchButton)
  const firstResult = screen.getByText('Hunters Ridge Golf Course')
  await user.click(firstResult)
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /import course/i })).toBeInTheDocument()
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('OSMImportModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSearchOSMCourses.mockResolvedValue(MOCK_RESULTS)
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER } })
    mockFetchCourseDetailsFromOverpass.mockResolvedValue({ geojson: MOCK_GEOJSON })
    mockParseOSMDataToSchema.mockReturnValue(MOCK_PARSED)
    mockImportCourseToSupabase.mockResolvedValue(MOCK_NEW_COURSE_ID)
  })

  // =========================================================================
  // RENDERING — INITIAL STATE
  // =========================================================================
  describe('Initial Rendering', () => {
    it('renders the modal title', () => {
      setup()
      expect(screen.getByText('Import from OpenStreetMap')).toBeInTheDocument()
    })

    it('renders the search input with placeholder', () => {
      const { searchInput } = setup()
      expect(searchInput).toBeInTheDocument()
      expect(searchInput).toHaveAttribute('placeholder', 'Enter course name...')
    })

    it('renders the search button', () => {
      const { searchButton } = setup()
      expect(searchButton).toBeInTheDocument()
    })

    it('renders the close (X) button', () => {
      setup()
      // The close button is the one next to the title
      const header = screen.getByText('Import from OpenStreetMap').closest('div')
      const buttons = within(header).getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders the label text', () => {
      setup()
      expect(screen.getByText(/Course Name/)).toBeInTheDocument()
      expect(screen.getByText(/Hunters Ridge Golf/)).toBeInTheDocument()
    })

    it('search input starts empty', () => {
      const { searchInput } = setup()
      expect(searchInput).toHaveValue('')
    })

    it('does not show search results on initial render', () => {
      setup()
      expect(screen.queryByText('Select a course to import:')).not.toBeInTheDocument()
    })

    it('does not show error on initial render', () => {
      setup()
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument()
    })

    it('does not show the import confirmation panel initially', () => {
      setup()
      expect(screen.queryByRole('button', { name: /import course/i })).not.toBeInTheDocument()
      expect(screen.queryByText('Back to Results')).not.toBeInTheDocument()
    })

    it('search button is disabled when input is empty', () => {
      const { searchButton } = setup()
      expect(searchButton).toBeDisabled()
    })
  })

  // =========================================================================
  // CLOSE BUTTON
  // =========================================================================
  describe('Close Button', () => {
    it('calls onClose when the X button is clicked', async () => {
      const onClose = vi.fn()
      const user = userEvent.setup()
      render(<OSMImportModal onClose={onClose} onImportComplete={vi.fn()} />)

      // The X button is rendered right after the title
      const header = screen.getByText('Import from OpenStreetMap').closest('div')
      const closeBtn = within(header).getAllByRole('button')[0]
      await user.click(closeBtn)

      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  // =========================================================================
  // SEARCH
  // =========================================================================
  describe('Search', () => {
    it('enables search button when input has text', async () => {
      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, 'test')
      expect(searchButton).not.toBeDisabled()
    })

    it('disables search button when input is only whitespace', async () => {
      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, '   ')
      expect(searchButton).toBeDisabled()
    })

    it('calls searchOSMCourses with the search query', async () => {
      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, 'Hunters Ridge')
      await user.click(searchButton)

      expect(mockSearchOSMCourses).toHaveBeenCalledOnce()
      expect(mockSearchOSMCourses).toHaveBeenCalledWith('Hunters Ridge')
    })

    it('does not search when input is empty', async () => {
      const { user, searchButton } = setup()
      // Button is disabled, but let's verify no call is made even via form submit
      // We can't click a disabled button via userEvent
      expect(mockSearchOSMCourses).not.toHaveBeenCalled()
    })

    it('displays search results', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndWait(user, searchInput, searchButton)

      expect(screen.getByText('Hunters Ridge Golf Course')).toBeInTheDocument()
      expect(screen.getByText('Eagle Point Golf Club')).toBeInTheDocument()
    })

    it('displays the full display_name as secondary text', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndWait(user, searchInput, searchButton)

      expect(screen.getByText('Hunters Ridge Golf Course, 123 Golf Rd, Marion, Iowa')).toBeInTheDocument()
      expect(screen.getByText('Eagle Point Golf Club, 456 Eagle Ln, Dubuque, Iowa')).toBeInTheDocument()
    })

    it('shows "Select a course to import:" heading with results', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndWait(user, searchInput, searchButton)

      expect(screen.getByText('Select a course to import:')).toBeInTheDocument()
    })

    it('displays error when search fails', async () => {
      mockSearchOSMCourses.mockRejectedValue(new Error('Network error'))

      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, 'Bad query')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to search OpenStreetMap. Please try again.')).toBeInTheDocument()
      })
    })

    it('clears previous results on new search', async () => {
      const { user, searchInput, searchButton } = setup()

      // First search
      await searchAndWait(user, searchInput, searchButton)
      expect(screen.getByText('Hunters Ridge Golf Course')).toBeInTheDocument()

      // Set up second search with different results
      mockSearchOSMCourses.mockResolvedValue([
        {
          place_id: 103,
          osm_type: 'way',
          osm_id: 203,
          display_name: 'Pebble Beach Golf Links, Pebble Beach, California',
          boundingbox: ['36.5', '36.6', '-121.9', '-121.8'],
        },
      ])

      await user.clear(searchInput)
      await user.type(searchInput, 'Pebble Beach')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Pebble Beach Golf Links')).toBeInTheDocument()
      })
      expect(screen.queryByText('Hunters Ridge Golf Course')).not.toBeInTheDocument()
    })

    it('clears selected course on new search', async () => {
      const { user, searchInput, searchButton } = setup()

      // Search and select
      await searchAndSelect(user, searchInput, searchButton)
      expect(screen.getByRole('button', { name: /import course/i })).toBeInTheDocument()

      // New search should clear the selection
      mockSearchOSMCourses.mockResolvedValue([MOCK_RESULTS[1]])
      await user.clear(searchInput)
      await user.type(searchInput, 'Eagle Point')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /import course/i })).not.toBeInTheDocument()
      })
    })

    it('clears error on new search', async () => {
      // First search: fail
      mockSearchOSMCourses.mockRejectedValueOnce(new Error('fail'))

      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, 'bad')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/failed to search/i)).toBeInTheDocument()
      })

      // Second search: succeed
      mockSearchOSMCourses.mockResolvedValue(MOCK_RESULTS)
      await user.clear(searchInput)
      await user.type(searchInput, 'Hunters Ridge')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.queryByText(/failed to search/i)).not.toBeInTheDocument()
      })
    })

    it('disables search button while searching', async () => {
      mockSearchOSMCourses.mockReturnValue(new Promise(() => {})) // never resolves

      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, 'test')
      await user.click(searchButton)

      expect(searchButton).toBeDisabled()
    })
  })

  // =========================================================================
  // COURSE SELECTION
  // =========================================================================
  describe('Course Selection', () => {
    it('shows confirmation panel when a course is selected', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      expect(screen.getByRole('button', { name: /import course/i })).toBeInTheDocument()
      expect(screen.getByText('Back to Results')).toBeInTheDocument()
    })

    it('displays the selected course name', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      // The name appears as a heading in the confirmation panel
      const headings = screen.getAllByText('Hunters Ridge Golf Course')
      expect(headings.length).toBeGreaterThanOrEqual(1)
    })

    it('displays the full address of the selected course', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      expect(
        screen.getByText('Hunters Ridge Golf Course, 123 Golf Rd, Marion, Iowa')
      ).toBeInTheDocument()
    })

    it('displays the import description text', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      expect(
        screen.getByText(/download all mapped features/i)
      ).toBeInTheDocument()
    })

    it('hides the search results list when a course is selected', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      expect(screen.queryByText('Select a course to import:')).not.toBeInTheDocument()
      // The second result should not be visible
      expect(screen.queryByText('Eagle Point Golf Club')).not.toBeInTheDocument()
    })

    it('returns to search results when "Back to Results" is clicked', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      const backButton = screen.getByText('Back to Results')
      await user.click(backButton)

      await waitFor(() => {
        expect(screen.getByText('Select a course to import:')).toBeInTheDocument()
        expect(screen.getByText('Hunters Ridge Golf Course')).toBeInTheDocument()
        expect(screen.getByText('Eagle Point Golf Club')).toBeInTheDocument()
      })
    })

    it('can select a different course after going back', async () => {
      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      // Go back
      await user.click(screen.getByText('Back to Results'))

      // Select the second result
      await waitFor(() => {
        expect(screen.getByText('Eagle Point Golf Club')).toBeInTheDocument()
      })
      await user.click(screen.getByText('Eagle Point Golf Club'))

      await waitFor(() => {
        // Confirmation panel should show Eagle Point's full name
        expect(
          screen.getByText('Eagle Point Golf Club, 456 Eagle Ln, Dubuque, Iowa')
        ).toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // IMPORT
  // =========================================================================
  describe('Import', () => {
    it('calls the full import pipeline with correct arguments', async () => {
      const onImportComplete = vi.fn()
      const user = userEvent.setup()
      render(<OSMImportModal onClose={vi.fn()} onImportComplete={onImportComplete} />)

      const searchInput = screen.getByPlaceholderText('Enter course name...')
      const searchButton = screen.getByRole('button', { name: /search/i })

      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(mockGetUser).toHaveBeenCalledOnce()
        expect(mockFetchCourseDetailsFromOverpass).toHaveBeenCalledWith(
          'way', 201, ['42.0', '42.1', '-91.6', '-91.5']
        )
        expect(mockParseOSMDataToSchema).toHaveBeenCalledWith(
          MOCK_GEOJSON, 'Hunters Ridge Golf Course', 'user-abc-123'
        )
        expect(mockImportCourseToSupabase).toHaveBeenCalledWith(MOCK_PARSED)
      })
    })

    it('calls onImportComplete with the new course ID on success', async () => {
      const onImportComplete = vi.fn()
      const user = userEvent.setup()
      render(<OSMImportModal onClose={vi.fn()} onImportComplete={onImportComplete} />)

      const searchInput = screen.getByPlaceholderText('Enter course name...')
      const searchButton = screen.getByRole('button', { name: /search/i })

      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(onImportComplete).toHaveBeenCalledOnce()
        expect(onImportComplete).toHaveBeenCalledWith(MOCK_NEW_COURSE_ID)
      })
    })

    it('shows "Importing..." during import', async () => {
      mockImportCourseToSupabase.mockReturnValue(new Promise(() => {})) // never resolves

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      expect(screen.getByText('Importing...')).toBeInTheDocument()
    })

    it('disables Import Course button during import', async () => {
      mockImportCourseToSupabase.mockReturnValue(new Promise(() => {}))

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      const importButton = screen.getByRole('button', { name: /import course/i })
      await user.click(importButton)

      // The button text changes to "Importing..." while disabled
      const importingButton = screen.getByText('Importing...').closest('button')
      expect(importingButton).toBeDisabled()
    })

    it('disables "Back to Results" button during import', async () => {
      mockImportCourseToSupabase.mockReturnValue(new Promise(() => {}))

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      expect(screen.getByText('Back to Results').closest('button')).toBeDisabled()
    })

    it('displays error when user is not logged in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(screen.getByText('You must be logged in to import a course.')).toBeInTheDocument()
      })
    })

    it('displays error when Overpass fetch fails', async () => {
      mockFetchCourseDetailsFromOverpass.mockRejectedValue(new Error('Overpass timeout'))

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(screen.getByText('Overpass timeout')).toBeInTheDocument()
      })
    })

    it('displays error when Supabase import fails', async () => {
      mockImportCourseToSupabase.mockRejectedValue(new Error('Database insert failed'))

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(screen.getByText('Database insert failed')).toBeInTheDocument()
      })
    })

    it('displays fallback error message when error has no message', async () => {
      mockImportCourseToSupabase.mockRejectedValue({})

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to import course.')).toBeInTheDocument()
      })
    })

    it('does not call onImportComplete on failure', async () => {
      mockImportCourseToSupabase.mockRejectedValue(new Error('fail'))

      const onImportComplete = vi.fn()
      const user = userEvent.setup()
      render(<OSMImportModal onClose={vi.fn()} onImportComplete={onImportComplete} />)

      const searchInput = screen.getByPlaceholderText('Enter course name...')
      const searchButton = screen.getByRole('button', { name: /search/i })

      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(screen.getByText('fail')).toBeInTheDocument()
      })

      expect(onImportComplete).not.toHaveBeenCalled()
    })

    it('re-enables buttons after import fails', async () => {
      mockImportCourseToSupabase.mockRejectedValue(new Error('fail'))

      const { user, searchInput, searchButton } = setup()
      await searchAndSelect(user, searchInput, searchButton)
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(screen.getByText('fail')).toBeInTheDocument()
      })

      // Import button should be re-enabled (text reverts from "Importing...")
      expect(screen.getByRole('button', { name: /import course/i })).not.toBeDisabled()
      expect(screen.getByText('Back to Results').closest('button')).not.toBeDisabled()
    })

    it('clears previous error when retrying import', async () => {
      mockImportCourseToSupabase
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(MOCK_NEW_COURSE_ID)

      const { user, searchInput, searchButton, onImportComplete } = setup()
      await searchAndSelect(user, searchInput, searchButton)

      // First attempt — fails
      await user.click(screen.getByRole('button', { name: /import course/i }))
      await waitFor(() => {
        expect(screen.getByText('Temporary failure')).toBeInTheDocument()
      })

      // Second attempt — succeeds, error clears
      await user.click(screen.getByRole('button', { name: /import course/i }))
      await waitFor(() => {
        expect(screen.queryByText('Temporary failure')).not.toBeInTheDocument()
      })
    })
  })

  // =========================================================================
  // ERROR DISPLAY STYLING
  // =========================================================================
  describe('Error Display', () => {
    it('applies error styling to error messages', async () => {
      mockSearchOSMCourses.mockRejectedValue(new Error('fail'))

      const { user, searchInput, searchButton } = setup()
      await user.type(searchInput, 'test')
      await user.click(searchButton)

      await waitFor(() => {
        const errorEl = screen.getByText(/failed to search/i)
        expect(errorEl.className).toMatch(/red/)
      })
    })
  })

  // =========================================================================
  // FULL WORKFLOW
  // =========================================================================
  describe('Full Workflow', () => {
    it('completes the full search → select → import flow', async () => {
      const onClose = vi.fn()
      const onImportComplete = vi.fn()
      const user = userEvent.setup()
      render(<OSMImportModal onClose={onClose} onImportComplete={onImportComplete} />)

      const searchInput = screen.getByPlaceholderText('Enter course name...')
      const searchButton = screen.getByRole('button', { name: /search/i })

      // Step 1: Search
      await user.type(searchInput, 'Hunters Ridge')
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Hunters Ridge Golf Course')).toBeInTheDocument()
      })

      // Step 2: Select
      await user.click(screen.getByText('Hunters Ridge Golf Course'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /import course/i })).toBeInTheDocument()
      })

      // Step 3: Import
      await user.click(screen.getByRole('button', { name: /import course/i }))

      await waitFor(() => {
        expect(onImportComplete).toHaveBeenCalledWith(MOCK_NEW_COURSE_ID)
      })
    })
  })
})
