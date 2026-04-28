import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CourseDetails from '../CourseDetails'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUpdateCourse = vi.fn()
const mockAddTee = vi.fn()
const mockUpdateTee = vi.fn()
const mockRemoveTee = vi.fn()
const mockSetDefaultTee = vi.fn()
const mockSaveYardages = vi.fn()

let hookReturn = {}

vi.mock('../../../../hooks/useCourse', () => ({
  useCourse: () => hookReturn,
}))

// Stub child components — render minimal output that exposes received props
vi.mock('../CourseDetailsForm', () => ({
  default: (props) => (
    <div data-testid="course-details-form">
      <span data-testid="form-course-name">{props.course?.name}</span>
      <button data-testid="form-save" onClick={() => props.onSave({ name: 'Updated' })}>
        Save
      </button>
    </div>
  ),
}))

vi.mock('../CourseTeeSets', () => ({
  default: (props) => (
    <div data-testid="course-tee-sets">
      <span data-testid="tee-sets-count">{props.tees?.length}</span>
      <button data-testid="tee-add" onClick={() => props.onAddTee({ name: 'Blue' })}>Add Tee</button>
      <button data-testid="tee-update" onClick={() => props.onUpdateTee('t-1', { name: 'Red' })}>Update Tee</button>
      <button data-testid="tee-remove" onClick={() => props.onRemoveTee('t-1')}>Remove Tee</button>
      <button data-testid="tee-default" onClick={() => props.onSetDefaultTee('t-1')}>Set Default</button>
    </div>
  ),
}))

vi.mock('../CourseYardageMatrix', () => ({
  default: (props) => (
    <div data-testid="course-yardage-matrix">
      <span data-testid="matrix-holes">{props.holes?.length}</span>
      <span data-testid="matrix-tees">{props.tees?.length}</span>
      <span data-testid="matrix-yardages">{props.yardages?.length}</span>
      <button data-testid="matrix-save" onClick={() => props.onSaveYardages({ 'h1:t1': 350 })}>
        Save Yardages
      </button>
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_COURSE = {
  id: 'course-1',
  name: 'Pebble Beach',
  address_line: '1700 17-Mile Drive',
  city: 'Pebble Beach',
  region: 'CA',
  postal_code: '93953',
  country: 'US',
}

const MOCK_TEES = [
  { id: 't-1', name: 'Blue', sort_order: 0, is_default: true },
  { id: 't-2', name: 'White', sort_order: 1, is_default: false },
]

const MOCK_HOLES = [
  { id: 'h-1', hole_number: 1 },
  { id: 'h-2', hole_number: 2 },
]

const MOCK_YARDAGES = [
  { id: 'y-1', hole_id: 'h-1', tee_id: 't-1', yardage: 380 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupHook(overrides = {}) {
  hookReturn = {
    course: overrides.course !== undefined ? overrides.course : MOCK_COURSE,
    tees: overrides.tees ?? MOCK_TEES,
    holes: overrides.holes ?? MOCK_HOLES,
    yardages: overrides.yardages ?? MOCK_YARDAGES,
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    updateCourse: overrides.updateCourse ?? mockUpdateCourse,
    addTee: overrides.addTee ?? mockAddTee,
    updateTee: overrides.updateTee ?? mockUpdateTee,
    removeTee: overrides.removeTee ?? mockRemoveTee,
    setDefaultTee: overrides.setDefaultTee ?? mockSetDefaultTee,
    saveYardages: overrides.saveYardages ?? mockSaveYardages,
  }
}

/**
 * Render CourseDetails within a MemoryRouter.
 * When courseId is provided, the route path includes it as a param.
 * When courseId is null, we navigate to a route without an :id param.
 */
function renderWithRouter(courseId = 'course-1') {
  if (courseId === null) {
    // Render at a path that has no :id param → useParams returns {}
    return render(
      <MemoryRouter initialEntries={['/details']}>
        <Routes>
          <Route path="/details" element={<CourseDetails />} />
        </Routes>
      </MemoryRouter>
    )
  }

  return render(
    <MemoryRouter initialEntries={[`/details/${courseId}`]}>
      <Routes>
        <Route path="/details/:id" element={<CourseDetails />} />
      </Routes>
    </MemoryRouter>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CourseDetails Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupHook()
  })

  // =========================================================================
  // NO COURSE ID
  // =========================================================================
  describe('Missing Course ID', () => {
    it('shows missing course id message', () => {
      renderWithRouter(null)
      expect(screen.getByText(/missing course id/i)).toBeInTheDocument()
    })

    it('renders a "Back to Dashboard" link', () => {
      renderWithRouter(null)
      const link = screen.getByRole('link', { name: /back to dashboard/i })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/')
    })

    it('does not render child components', () => {
      renderWithRouter(null)
      expect(screen.queryByTestId('course-details-form')).not.toBeInTheDocument()
      expect(screen.queryByTestId('course-tee-sets')).not.toBeInTheDocument()
      expect(screen.queryByTestId('course-yardage-matrix')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // LOADING STATE
  // =========================================================================
  describe('Loading State', () => {
    it('shows loading message', () => {
      setupHook({ loading: true })
      renderWithRouter()
      expect(screen.getByText(/loading course/i)).toBeInTheDocument()
    })

    it('does not render child components while loading', () => {
      setupHook({ loading: true })
      renderWithRouter()
      expect(screen.queryByTestId('course-details-form')).not.toBeInTheDocument()
      expect(screen.queryByTestId('course-tee-sets')).not.toBeInTheDocument()
      expect(screen.queryByTestId('course-yardage-matrix')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // ERROR STATE
  // =========================================================================
  describe('Error State', () => {
    it('displays the error message', () => {
      setupHook({ error: 'relation "tees" does not exist' })
      renderWithRouter()
      expect(screen.getByText('relation "tees" does not exist')).toBeInTheDocument()
    })

    it('shows the migration hint', () => {
      setupHook({ error: 'Some error' })
      renderWithRouter()
      expect(screen.getByText(/missing column or table/i)).toBeInTheDocument()
      expect(screen.getByText('supabase/migrations/')).toBeInTheDocument()
    })

    it('renders a "Back to Dashboard" link', () => {
      setupHook({ error: 'Some error' })
      renderWithRouter()
      const link = screen.getByRole('link', { name: /back to dashboard/i })
      expect(link).toHaveAttribute('href', '/')
    })

    it('does not render child components', () => {
      setupHook({ error: 'Some error' })
      renderWithRouter()
      expect(screen.queryByTestId('course-details-form')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // COURSE NOT FOUND
  // =========================================================================
  describe('Course Not Found', () => {
    it('shows not found message when course is null', () => {
      setupHook({ course: null })
      renderWithRouter()
      expect(screen.getByText(/course not found or you do not have access/i)).toBeInTheDocument()
    })

    it('renders a "Back to Dashboard" link', () => {
      setupHook({ course: null })
      renderWithRouter()
      const link = screen.getByRole('link', { name: /back to dashboard/i })
      expect(link).toHaveAttribute('href', '/')
    })

    it('does not render child components', () => {
      setupHook({ course: null })
      renderWithRouter()
      expect(screen.queryByTestId('course-details-form')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // SUCCESSFUL RENDER — HEADER
  // =========================================================================
  describe('Course Header', () => {
    it('displays the course name as h1', () => {
      renderWithRouter()
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Pebble Beach')
    })

    it('displays the formatted address', () => {
      renderWithRouter()
      expect(screen.getByText(/1700 17-Mile Drive/)).toBeInTheDocument()
      expect(screen.getByText(/Pebble Beach, CA/)).toBeInTheDocument()
    })

    it('renders the "Open map" link with correct href', () => {
      renderWithRouter()
      const mapLink = screen.getByRole('link', { name: /open map/i })
      expect(mapLink).toHaveAttribute('href', '/course/course-1')
    })

    it('formats address with only available parts', () => {
      setupHook({
        course: {
          ...MOCK_COURSE,
          address_line: null,
          postal_code: null,
          country: null,
        },
      })
      renderWithRouter()
      // Only city/region remain
      const addressText = screen.getByText(/Pebble Beach, CA/)
      expect(addressText).toBeInTheDocument()
    })

    it('omits address line entirely when all address fields are empty', () => {
      setupHook({
        course: {
          id: 'course-1',
          name: 'No Address Course',
          address_line: null,
          city: null,
          region: null,
          postal_code: null,
          country: null,
        },
      })
      renderWithRouter()
      // The address paragraph should not be rendered (formattedAddress is '')
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No Address Course')
      // MapPin icon paragraph should not exist
      expect(screen.queryByText('·')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // CHILD COMPONENT PROP PASSING
  // =========================================================================
  describe('Props Passing', () => {
    it('passes course to CourseDetailsForm', () => {
      renderWithRouter()
      expect(screen.getByTestId('form-course-name')).toHaveTextContent('Pebble Beach')
    })

    it('passes updateCourse as onSave to CourseDetailsForm', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      renderWithRouter()
      await user.click(screen.getByTestId('form-save'))
      expect(mockUpdateCourse).toHaveBeenCalledWith({ name: 'Updated' })
    })

    it('passes tees to CourseTeeSets', () => {
      renderWithRouter()
      expect(screen.getByTestId('tee-sets-count')).toHaveTextContent('2')
    })

    it('passes addTee to CourseTeeSets', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      renderWithRouter()
      await user.click(screen.getByTestId('tee-add'))
      expect(mockAddTee).toHaveBeenCalledWith({ name: 'Blue' })
    })

    it('passes updateTee to CourseTeeSets', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      renderWithRouter()
      await user.click(screen.getByTestId('tee-update'))
      expect(mockUpdateTee).toHaveBeenCalledWith('t-1', { name: 'Red' })
    })

    it('passes removeTee to CourseTeeSets', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      renderWithRouter()
      await user.click(screen.getByTestId('tee-remove'))
      expect(mockRemoveTee).toHaveBeenCalledWith('t-1')
    })

    it('passes setDefaultTee to CourseTeeSets', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      renderWithRouter()
      await user.click(screen.getByTestId('tee-default'))
      expect(mockSetDefaultTee).toHaveBeenCalledWith('t-1')
    })

    it('passes holes, tees, and yardages to CourseYardageMatrix', () => {
      renderWithRouter()
      expect(screen.getByTestId('matrix-holes')).toHaveTextContent('2')
      expect(screen.getByTestId('matrix-tees')).toHaveTextContent('2')
      expect(screen.getByTestId('matrix-yardages')).toHaveTextContent('1')
    })

    it('passes saveYardages to CourseYardageMatrix', async () => {
      const user = (await import('@testing-library/user-event')).default.setup()
      renderWithRouter()
      await user.click(screen.getByTestId('matrix-save'))
      expect(mockSaveYardages).toHaveBeenCalledWith({ 'h1:t1': 350 })
    })
  })

  // =========================================================================
  // ALL THREE CHILDREN RENDER
  // =========================================================================
  describe('All Children Render', () => {
    it('renders CourseDetailsForm', () => {
      renderWithRouter()
      expect(screen.getByTestId('course-details-form')).toBeInTheDocument()
    })

    it('renders CourseTeeSets', () => {
      renderWithRouter()
      expect(screen.getByTestId('course-tee-sets')).toBeInTheDocument()
    })

    it('renders CourseYardageMatrix', () => {
      renderWithRouter()
      expect(screen.getByTestId('course-yardage-matrix')).toBeInTheDocument()
    })
  })
})
