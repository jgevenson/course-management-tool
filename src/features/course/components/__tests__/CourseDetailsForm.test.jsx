import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CourseDetailsForm from '../CourseDetailsForm'

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
  phone: '831-624-3811',
  website: 'https://www.pebblebeach.com',
  notes: 'Beautiful course.',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(props = {}) {
  const course = props.course ?? MOCK_COURSE
  const onSave = props.onSave ?? vi.fn().mockResolvedValue({ success: true })
  const user = userEvent.setup()

  render(<CourseDetailsForm course={course} onSave={onSave} />)

  return { user, onSave }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CourseDetailsForm Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('renders the section heading', () => {
      setup()
      expect(screen.getByText('Course information')).toBeInTheDocument()
    })

    it('populates fields with course data', () => {
      setup()
      expect(screen.getByLabelText(/course name/i)).toHaveValue(MOCK_COURSE.name)
      expect(screen.getByLabelText(/address/i)).toHaveValue(MOCK_COURSE.address_line)
      expect(screen.getByLabelText(/city/i)).toHaveValue(MOCK_COURSE.city)
      expect(screen.getByLabelText(/state \/ region/i)).toHaveValue(MOCK_COURSE.region)
      expect(screen.getByLabelText(/postal code/i)).toHaveValue(MOCK_COURSE.postal_code)
      expect(screen.getByLabelText(/country/i)).toHaveValue(MOCK_COURSE.country)
      expect(screen.getByLabelText(/phone/i)).toHaveValue(MOCK_COURSE.phone)
      expect(screen.getByLabelText(/website/i)).toHaveValue(MOCK_COURSE.website)
      expect(screen.getByLabelText(/notes/i)).toHaveValue(MOCK_COURSE.notes)
    })

    it('renders the save button', () => {
      setup()
      expect(screen.getByRole('button', { name: /save course information/i })).toBeInTheDocument()
    })
  })

  // =========================================================================
  // FORM UPDATES
  // =========================================================================
  describe('Form Updates', () => {
    it('updates state when typing in fields', async () => {
      const { user } = setup()
      const nameInput = screen.getByLabelText(/course name/i)
      
      await user.clear(nameInput)
      await user.type(nameInput, 'New Course Name')
      
      expect(nameInput).toHaveValue('New Course Name')
    })
  })

  // =========================================================================
  // SUBMISSION
  // =========================================================================
  describe('Submission', () => {
    it('calls onSave with updated data', async () => {
      const { user, onSave } = setup()
      
      const nameInput = screen.getByLabelText(/course name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'Spyglass Hill')
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Spyglass Hill',
        address_line: MOCK_COURSE.address_line,
      }))
    })

    it('trims whitespace before saving', async () => {
      const { user, onSave } = setup()
      
      const cityInput = screen.getByLabelText(/city/i)
      await user.clear(cityInput)
      await user.type(cityInput, '  Monterey  ')
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        city: 'Monterey',
      }))
    })

    it('sends null for empty strings (except name)', async () => {
      const { user, onSave } = setup()
      
      const addressInput = screen.getByLabelText(/address/i)
      await user.clear(addressInput)
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        address_line: null,
      }))
    })

    it('falls back to original name if name is cleared', async () => {
      const { user, onSave } = setup()
      
      const nameInput = screen.getByLabelText(/course name/i)
      await user.clear(nameInput)
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
        name: MOCK_COURSE.name,
      }))
    })

    it('shows loading state during save', async () => {
      const onSave = vi.fn().mockReturnValue(new Promise(() => {})) // Never resolves
      const { user } = setup({ onSave })
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(screen.getByText('Saving…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('displays success message on successful save', async () => {
      const { user } = setup()
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(screen.getByText('Saved course details.')).toBeInTheDocument()
      expect(screen.getByText('Saved course details.')).toHaveClass('text-emerald-400')
    })

    it('clears success message after timeout', async () => {
      const { user } = setup()
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      // Wait for message to appear
      await waitFor(() => {
        expect(screen.getByText('Saved course details.')).toBeInTheDocument()
      })
      
      // Advance timers within act
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Saved course details.')).not.toBeInTheDocument()
      })
    })

    it('displays error message on failed save', async () => {
      const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Database error' })
      const { user } = setup({ onSave })
      
      await user.click(screen.getByRole('button', { name: /save course information/i }))
      
      expect(screen.getByText('Database error')).toBeInTheDocument()
      expect(screen.getByText('Database error')).toHaveClass('text-red-400')
    })
  })

  // =========================================================================
  // REACTIVE UPDATES
  // =========================================================================
  describe('Reactive Updates', () => {
    it('updates form when course prop changes', async () => {
      const { rerender } = render(<CourseDetailsForm course={MOCK_COURSE} onSave={vi.fn()} />)
      
      expect(screen.getByLabelText(/course name/i)).toHaveValue(MOCK_COURSE.name)
      
      const NEW_COURSE = { ...MOCK_COURSE, name: 'Cypress Point' }
      rerender(<CourseDetailsForm course={NEW_COURSE} onSave={vi.fn()} />)
      
      expect(screen.getByLabelText(/course name/i)).toHaveValue('Cypress Point')
    })
  })
})
