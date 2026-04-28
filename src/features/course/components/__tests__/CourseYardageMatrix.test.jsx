import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CourseYardageMatrix from '../CourseYardageMatrix'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_HOLES = [
  { id: 'h-1', hole_number: 1 },
  { id: 'h-2', hole_number: 2 },
]

const MOCK_TEES = [
  { id: 't-1', name: 'Blue', color_label: 'Blue' },
  { id: 't-2', name: 'White', color_label: 'White' },
]

const MOCK_YARDAGES = [
  { hole_id: 'h-1', tee_id: 't-1', yardage: 380 },
  { hole_id: 'h-2', tee_id: 't-2', yardage: 155 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(props = {}) {
  const holes = props.holes ?? MOCK_HOLES
  const tees = props.tees ?? MOCK_TEES
  const yardages = props.yardages ?? MOCK_YARDAGES
  const onSaveYardages = props.onSaveYardages ?? vi.fn().mockResolvedValue({ success: true })
  const user = userEvent.setup()

  render(
    <CourseYardageMatrix
      holes={holes}
      tees={tees}
      yardages={yardages}
      onSaveYardages={onSaveYardages}
    />
  )

  return { user, onSaveYardages }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CourseYardageMatrix Component', () => {
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
      expect(screen.getByText('Scorecard distances (yards)')).toBeInTheDocument()
    })

    it('renders tee names as column headers', () => {
      setup()
      expect(screen.getAllByText('Blue').length).toBeGreaterThan(0)
      expect(screen.getAllByText('White').length).toBeGreaterThan(0)
    })

    it('renders hole numbers as row headers', () => {
      setup()
      expect(screen.getByText('1')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('renders the save button', () => {
      setup()
      expect(screen.getByRole('button', { name: /save scorecard distances/i })).toBeInTheDocument()
    })

    it('disables save button if no holes or tees', () => {
      setup({ holes: [] })
      expect(screen.getByRole('button', { name: /save scorecard distances/i })).toBeDisabled()
    })
  })

  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  describe('Initialization', () => {
    it('populates fields with existing yardages', () => {
      setup()
      expect(screen.getByLabelText('Hole 1 Blue yardage')).toHaveValue(380)
      expect(screen.getByLabelText('Hole 2 White yardage')).toHaveValue(155)
      expect(screen.getByLabelText('Hole 1 White yardage')).toHaveValue(null)
    })
  })

  // =========================================================================
  // UPDATES
  // =========================================================================
  describe('Updates', () => {
    it('updates draft state when typing in cells', async () => {
      const { user } = setup()
      const input = screen.getByLabelText('Hole 1 White yardage')
      
      await user.type(input, '350')
      
      expect(input).toHaveValue(350)
    })
  })

  // =========================================================================
  // SUBMISSION
  // =========================================================================
  describe('Submission', () => {
    it('calls onSaveYardages with the draft map', async () => {
      const { user, onSaveYardages } = setup()
      
      await user.type(screen.getByLabelText('Hole 1 White yardage'), '350')
      await user.click(screen.getByRole('button', { name: /save scorecard distances/i }))
      
      expect(onSaveYardages).toHaveBeenCalledWith(expect.objectContaining({
        'h-1:t-1': '380',
        'h-1:t-2': '350',
      }))
    })

    it('shows loading state during save', async () => {
      const onSaveYardages = vi.fn().mockReturnValue(new Promise(() => {}))
      const { user } = setup({ onSaveYardages })
      
      await user.click(screen.getByRole('button', { name: /save scorecard distances/i }))
      
      expect(screen.getByText('Saving…')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
    })

    it('displays success message and clears after timeout', async () => {
      const { user } = setup()
      
      await user.click(screen.getByRole('button', { name: /save scorecard distances/i }))
      
      expect(screen.getByText('Scorecard distances saved.')).toBeInTheDocument()
      
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      
      await waitFor(() => {
        expect(screen.queryByText('Scorecard distances saved.')).not.toBeInTheDocument()
      })
    })

    it('displays error message from API failure', async () => {
      const onSaveYardages = vi.fn().mockResolvedValue({ success: false, error: 'Save failed' })
      const { user } = setup({ onSaveYardages })
      
      await user.click(screen.getByRole('button', { name: /save scorecard distances/i }))
      
      expect(screen.getByText('Save failed')).toBeInTheDocument()
      expect(screen.getByText('Save failed')).toHaveClass('text-red-400')
    })
  })

  // =========================================================================
  // EMPTY STATES
  // =========================================================================
  describe('Empty States', () => {
    it('shows message when no holes exist', () => {
      setup({ holes: [] })
      expect(screen.getByText(/this course has no holes yet/i)).toBeInTheDocument()
    })

    it('shows message when no tees exist', () => {
      setup({ tees: [] })
      expect(screen.getByText(/add at least one tee set above/i)).toBeInTheDocument()
    })
  })
})
