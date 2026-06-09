import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CourseTeeSets from '../CourseTeeSets'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_TEES = [
  { id: 't-1', name: 'Blue', color_label: 'Blue', rating: 72.1, slope: 125, is_default: true },
  { id: 't-2', name: 'White', color_label: 'White', rating: 70.5, slope: 120, is_default: false },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(props = {}) {
  const tees = props.tees ?? MOCK_TEES
  const onAddTee = props.onAddTee ?? vi.fn().mockResolvedValue({ success: true })
  const onUpdateTee = props.onUpdateTee ?? vi.fn().mockResolvedValue({ success: true })
  const onRemoveTee = props.onRemoveTee ?? vi.fn().mockResolvedValue({ success: true })
  const onSetDefaultTee = props.onSetDefaultTee ?? vi.fn().mockResolvedValue({ success: true })
  const user = userEvent.setup()

  render(
    <CourseTeeSets
      tees={tees}
      onAddTee={onAddTee}
      onUpdateTee={onUpdateTee}
      onRemoveTee={onRemoveTee}
      onSetDefaultTee={onSetDefaultTee}
    />
  )

  return { user, onAddTee, onUpdateTee, onRemoveTee, onSetDefaultTee }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CourseTeeSets Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockImplementation(() => true)
  })

  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('renders the section heading', () => {
      setup()
      expect(screen.getByText('Tee sets')).toBeInTheDocument()
    })

    it('renders each tee in the list', () => {
      setup()
      expect(screen.getByLabelText('Name', { selector: '#tee-name-t-1' })).toHaveValue('Blue')
      expect(screen.getByLabelText('Name', { selector: '#tee-name-t-2' })).toHaveValue('White')
    })

    it('shows empty list message when no tees exist', () => {
      setup({ tees: [] })
      // The component doesn't show an explicit "No tees" message, 
      // but it doesn't render the list.
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // ADDING A TEE
  // =========================================================================
  describe('Adding a Tee', () => {
    it('shows error if name is empty', async () => {
      const { user, onAddTee } = setup()
      
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      expect(screen.getByText(/enter a tee name/i)).toBeInTheDocument()
      expect(onAddTee).not.toHaveBeenCalled()
    })

    it('calls onAddTee with correct payload', async () => {
      const { user, onAddTee } = setup()
      
      await user.type(screen.getByLabelText(/new tee name/i), 'Tips')
      
      const colorInput = screen.getByLabelText('Color label', { selector: '#new-tee-color' })
      fireEvent.change(colorInput, { target: { value: '#000000' } })
      
      await user.type(screen.getByLabelText('Rating', { selector: '#new-tee-rating' }), '74.5')
      await user.type(screen.getByLabelText('Slope', { selector: '#new-tee-slope' }), '135')
      
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      expect(onAddTee).toHaveBeenCalledWith({
        name: 'Tips',
        color_label: '#000000',
        rating: 74.5,
        slope: 135,
      })
    })

    it('resets form after successful add', async () => {
      const { user } = setup()
      
      const nameInput = screen.getByLabelText(/new tee name/i)
      await user.type(nameInput, 'Tips')
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      await waitFor(() => {
        expect(nameInput).toHaveValue('')
      })
    })

    it('displays error from API failure', async () => {
      const onAddTee = vi.fn().mockResolvedValue({ success: false, error: 'API Error' })
      const { user } = setup({ onAddTee })
      
      await user.type(screen.getByLabelText(/new tee name/i), 'Tips')
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      expect(screen.getByText('API Error')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // UPDATING A TEE
  // =========================================================================
  describe('Updating a Tee', () => {
    it('calls onUpdateTee when a field is blurred', async () => {
      const { onUpdateTee } = setup()
      
      const blueInput = screen.getByLabelText('Name', { selector: '#tee-name-t-1' })
      fireEvent.change(blueInput, { target: { value: 'Pro' } })
      fireEvent.blur(blueInput)
      
      expect(onUpdateTee).toHaveBeenCalledWith('t-1', { name: 'Pro' })
    })

    it('does not call onUpdateTee if value is unchanged', async () => {
      const { onUpdateTee } = setup()
      
      const blueInput = screen.getByLabelText('Name', { selector: '#tee-name-t-1' })
      fireEvent.blur(blueInput)
      
      expect(onUpdateTee).not.toHaveBeenCalled()
    })

    it('does not call onUpdateTee if name is cleared', async () => {
      const { onUpdateTee } = setup()
      
      const blueInput = screen.getByLabelText('Name', { selector: '#tee-name-t-1' })
      fireEvent.change(blueInput, { target: { value: '' } })
      fireEvent.blur(blueInput)
      
      expect(onUpdateTee).not.toHaveBeenCalled()
    })

    it('converts rating and slope to numbers on update', async () => {
      const { onUpdateTee } = setup()
      
      const ratingInput = screen.getByLabelText('Rating', { selector: '#tee-rating-t-1' })
      fireEvent.change(ratingInput, { target: { value: '73' } })
      fireEvent.blur(ratingInput)
      
      expect(onUpdateTee).toHaveBeenCalledWith('t-1', { rating: 73 })
    })
  })

  // =========================================================================
  // REMOVING A TEE
  // =========================================================================
  describe('Removing a Tee', () => {
    it('asks for confirmation before removing', async () => {
      const { user, onRemoveTee } = setup()
      
      const removeButtons = screen.getAllByTitle('Remove tee')
      await user.click(removeButtons[0])
      
      expect(window.confirm).toHaveBeenCalled()
      expect(onRemoveTee).toHaveBeenCalledWith('t-1')
    })

    it('does not remove if confirmation is cancelled', async () => {
      window.confirm.mockReturnValue(false)
      const { user, onRemoveTee } = setup()
      
      const removeButtons = screen.getAllByTitle('Remove tee')
      await user.click(removeButtons[0])
      
      expect(onRemoveTee).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // SETTING DEFAULT TEE
  // =========================================================================
  describe('Setting Default Tee', () => {
    it('calls onSetDefaultTee when radio is changed', async () => {
      const { user, onSetDefaultTee } = setup()
      
      const defaultRadios = screen.getAllByRole('radio', { name: /default/i })
      // White tee is at index 1 and is not default
      await user.click(defaultRadios[1])
      
      expect(onSetDefaultTee).toHaveBeenCalledWith('t-2')
    })

    it('does not call onSetDefaultTee if already default', async () => {
      const { user, onSetDefaultTee } = setup()
      
      const defaultRadios = screen.getAllByRole('radio', { name: /default/i })
      // Blue tee is at index 0 and is already default
      await user.click(defaultRadios[0])
      
      expect(onSetDefaultTee).not.toHaveBeenCalled()
    })
  })

  // =========================================================================
  // BUSY STATE
  // =========================================================================
  describe('Busy State', () => {
    it('disables inputs and buttons when busy', async () => {
      // Mock onAddTee to stay busy
      const onAddTee = vi.fn().mockReturnValue(new Promise(() => {}))
      const { user } = setup({ onAddTee })
      
      await user.type(screen.getByLabelText(/new tee name/i), 'Tips')
      await user.click(screen.getByRole('button', { name: /add/i }))
      
      expect(screen.getByRole('button', { name: /add/i })).toBeDisabled()
      expect(screen.getByLabelText('Name', { selector: '#tee-name-t-1' })).toBeDisabled()
    })
  })
})
