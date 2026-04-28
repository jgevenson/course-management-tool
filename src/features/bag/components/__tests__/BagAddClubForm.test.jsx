import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BagAddClubForm from '../BagAddClubForm'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(props = {}) {
  const onAdd = props.onAdd ?? vi.fn().mockResolvedValue({ success: true })
  const clubs = props.clubs ?? []
  const setError = props.setError ?? vi.fn()
  const setMessage = props.setMessage ?? vi.fn()
  const user = userEvent.setup()

  render(
    <BagAddClubForm
      onAdd={onAdd}
      clubs={clubs}
      setError={setError}
      setMessage={setMessage}
    />
  )

  return {
    user,
    onAdd,
    setError,
    setMessage,
    nameInput: screen.getByLabelText(/^name$/i),
    shortNameInput: screen.getByLabelText(/short name/i),
    clubTypeSelect: screen.getByLabelText(/club type/i),
    putterCheckbox: screen.getByRole('checkbox', { name: /putter/i }),
    sortOrderInput: screen.getByLabelText(/sort order/i),
    carryInput: screen.getByLabelText(/carry/i),
    totalInput: screen.getByLabelText(/total/i),
    submitButton: screen.getByRole('button', { name: /add to bag/i }),
  }
}

/** Set a number input's value in a way React 19 picks up */
function setInputValue(element, value) {
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  ).set
  nativeSetter.call(element, value)
  fireEvent.input(element, { target: element })
  fireEvent.change(element, { target: element })
}

/** Fill in all required fields with valid defaults */
async function fillValid(user, overrides = {}) {
  const name = overrides.name ?? '7 Iron'
  const shortName = overrides.shortName ?? '7i'
  const carry = overrides.carry ?? '150'
  const total = overrides.total ?? '160'
  const sortOrder = overrides.sortOrder // don't fill if not provided (auto-populated)

  const nameInput = screen.getByLabelText(/^name$/i)
  const shortNameInput = screen.getByLabelText(/short name/i)
  const carryInput = screen.getByLabelText(/carry/i)
  const totalInput = screen.getByLabelText(/total/i)
  const sortOrderInput = screen.getByLabelText(/sort order/i)

  await user.type(nameInput, name)
  await user.type(shortNameInput, shortName)
  setInputValue(carryInput, carry)
  setInputValue(totalInput, total)

  if (sortOrder !== undefined) {
    setInputValue(sortOrderInput, sortOrder)
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BagAddClubForm Component', () => {
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
    it('renders the form heading', () => {
      setup()
      expect(screen.getByText('Add a club')).toBeInTheDocument()
    })

    it('renders all input fields', () => {
      const { nameInput, shortNameInput, clubTypeSelect, putterCheckbox, sortOrderInput, carryInput, totalInput } = setup()
      expect(nameInput).toBeInTheDocument()
      expect(shortNameInput).toBeInTheDocument()
      expect(clubTypeSelect).toBeInTheDocument()
      expect(putterCheckbox).toBeInTheDocument()
      expect(sortOrderInput).toBeInTheDocument()
      expect(carryInput).toBeInTheDocument()
      expect(totalInput).toBeInTheDocument()
    })

    it('renders the submit button', () => {
      const { submitButton } = setup()
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveTextContent('Add to bag')
    })

    it('renders all club type options', () => {
      setup()
      expect(screen.getByRole('option', { name: 'Wood' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Hybrid' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Iron' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Wedge' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Putter' })).toBeInTheDocument()
    })

    it('defaults club type to "iron"', () => {
      const { clubTypeSelect } = setup()
      expect(clubTypeSelect).toHaveValue('iron')
    })

    it('defaults putter checkbox to unchecked', () => {
      const { putterCheckbox } = setup()
      expect(putterCheckbox).not.toBeChecked()
    })

    it('name and short name inputs start empty', () => {
      const { nameInput, shortNameInput } = setup()
      expect(nameInput).toHaveValue('')
      expect(shortNameInput).toHaveValue('')
    })

    it('carry and total inputs start empty', () => {
      const { carryInput, totalInput } = setup()
      expect(carryInput).toHaveValue(null) // number inputs return null when empty
      expect(totalInput).toHaveValue(null)
    })

    it('renders proper labels', () => {
      setup()
      expect(screen.getByText('Sort order')).toBeInTheDocument()
      expect(screen.getByText('Short name')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Club type')).toBeInTheDocument()
      expect(screen.getByText('Carry (yd)')).toBeInTheDocument()
      expect(screen.getByText('Total (yd)')).toBeInTheDocument()
    })

    it('renders placeholders on text inputs', () => {
      setup()
      expect(screen.getByPlaceholderText('e.g. 7 Iron')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Dr, 7i, PW')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // SORT ORDER AUTO-CALCULATION
  // =========================================================================
  describe('Sort Order Auto-Calculation', () => {
    it('sets sort order to 1 when clubs array is empty', () => {
      const { sortOrderInput } = setup({ clubs: [] })
      expect(sortOrderInput).toHaveValue(1)
    })

    it('sets sort order to next after existing clubs', () => {
      const clubs = [
        { sort_order: 1 },
        { sort_order: 3 },
        { sort_order: 5 },
      ]
      const { sortOrderInput } = setup({ clubs })
      expect(sortOrderInput).toHaveValue(6)
    })

    it('handles clubs with non-numeric sort orders', () => {
      const clubs = [
        { sort_order: 'abc' },
        { sort_order: 2 },
      ]
      const { sortOrderInput } = setup({ clubs })
      expect(sortOrderInput).toHaveValue(3)
    })

    it('handles clubs with undefined sort orders', () => {
      const clubs = [
        { sort_order: undefined },
        { sort_order: null },
      ]
      const { sortOrderInput } = setup({ clubs })
      // All map to 0, so next is 1
      expect(sortOrderInput).toHaveValue(1)
    })
  })

  // =========================================================================
  // PUTTER / CLUB TYPE SYNCING
  // =========================================================================
  describe('Putter / Club Type Syncing', () => {
    it('sets club type to putter when putter checkbox is checked', async () => {
      const { user, putterCheckbox, clubTypeSelect } = setup()
      await user.click(putterCheckbox)

      expect(putterCheckbox).toBeChecked()
      expect(clubTypeSelect).toHaveValue('putter')
    })

    it('unchecking putter keeps club type as putter (does not auto-revert)', async () => {
      const { user, putterCheckbox, clubTypeSelect } = setup()
      await user.click(putterCheckbox) // check
      await user.click(putterCheckbox) // uncheck

      expect(putterCheckbox).not.toBeChecked()
      // The checkbox handler only sets type to putter when checked; unchecking doesn't change type
      expect(clubTypeSelect).toHaveValue('putter')
    })

    it('selecting putter from dropdown checks the putter checkbox', async () => {
      const { user, putterCheckbox, clubTypeSelect } = setup()
      await user.selectOptions(clubTypeSelect, 'putter')

      expect(clubTypeSelect).toHaveValue('putter')
      expect(putterCheckbox).toBeChecked()
    })

    it('selecting a non-putter type unchecks the putter checkbox', async () => {
      const { user, putterCheckbox, clubTypeSelect } = setup()

      // First select putter
      await user.selectOptions(clubTypeSelect, 'putter')
      expect(putterCheckbox).toBeChecked()

      // Then select wood
      await user.selectOptions(clubTypeSelect, 'wood')
      expect(putterCheckbox).not.toBeChecked()
      expect(clubTypeSelect).toHaveValue('wood')
    })
  })

  // =========================================================================
  // VALIDATION
  // =========================================================================
  describe('Validation', () => {
    it('shows error when name is empty', async () => {
      const { user, submitButton, setError } = setup()
      const shortNameInput = screen.getByLabelText(/short name/i)
      const carryInput = screen.getByLabelText(/carry/i)
      const totalInput = screen.getByLabelText(/total/i)

      await user.type(shortNameInput, '7i')
      setInputValue(carryInput, '150')
      setInputValue(totalInput, '160')

      await user.click(submitButton)

      expect(setError).toHaveBeenCalledWith('Club name is required.')
    })

    it('shows error when short name is empty', async () => {
      const { user, submitButton, setError, nameInput } = setup()
      await user.type(nameInput, '7 Iron')

      const carryInput = screen.getByLabelText(/carry/i)
      const totalInput = screen.getByLabelText(/total/i)
      setInputValue(carryInput, '150')
      setInputValue(totalInput, '160')

      await user.click(submitButton)

      expect(setError).toHaveBeenCalledWith('Short name (abbreviation) is required.')
    })

    it('shows error when sort order is empty', async () => {
      const { user, submitButton, setError, sortOrderInput } = setup()

      // Fill valid data first, then clear sort order
      await fillValid(user)
      setInputValue(sortOrderInput, '')

      await user.click(submitButton)

      expect(setError).toHaveBeenCalledWith('Order is required.')
    })

    it('sort order input has min=0 and max=99 constraints', () => {
      const { sortOrderInput } = setup()
      expect(sortOrderInput).toHaveAttribute('min', '0')
      expect(sortOrderInput).toHaveAttribute('max', '99')
      expect(sortOrderInput).toHaveAttribute('step', '1')
    })

    it('shows error when carry distance is empty', async () => {
      const { user, submitButton, setError } = setup()

      const nameInput = screen.getByLabelText(/^name$/i)
      const shortNameInput = screen.getByLabelText(/short name/i)
      await user.type(nameInput, '7 Iron')
      await user.type(shortNameInput, '7i')
      // Leave carry empty, fill total
      const totalInput = screen.getByLabelText(/total/i)
      setInputValue(totalInput, '160')

      await user.click(submitButton)

      expect(setError).toHaveBeenCalledWith('Distance is required.')
    })

    it('carry input has min=0 and max=400 constraints', () => {
      const { carryInput } = setup()
      expect(carryInput).toHaveAttribute('min', '0')
      expect(carryInput).toHaveAttribute('max', '400')
      expect(carryInput).toHaveAttribute('step', '1')
    })

    it('total input has min=0 and max=400 constraints', () => {
      const { totalInput } = setup()
      expect(totalInput).toHaveAttribute('min', '0')
      expect(totalInput).toHaveAttribute('max', '400')
      expect(totalInput).toHaveAttribute('step', '1')
    })

    it('carry and total inputs use step=1 to enforce whole numbers', () => {
      const { carryInput, totalInput } = setup()
      expect(carryInput).toHaveAttribute('type', 'number')
      expect(carryInput).toHaveAttribute('step', '1')
      expect(totalInput).toHaveAttribute('type', 'number')
      expect(totalInput).toHaveAttribute('step', '1')
    })

    it('shows error when carry is greater than total', async () => {
      const { user, submitButton, setError } = setup()
      await fillValid(user, { carry: '200', total: '180' })
      await user.click(submitButton)

      expect(setError).toHaveBeenCalledWith('Carry cannot be greater than total distance.')
    })

    it('allows carry equal to total', async () => {
      const { user, submitButton, setError, onAdd } = setup()
      await fillValid(user, { carry: '150', total: '150' })
      await user.click(submitButton)

      expect(setError).not.toHaveBeenCalledWith('Carry cannot be greater than total distance.')
      expect(onAdd).toHaveBeenCalled()
    })

    it('allows zero yard values', async () => {
      const { user, submitButton, onAdd } = setup()
      await fillValid(user, { carry: '0', total: '0' })
      await user.click(submitButton)

      expect(onAdd).toHaveBeenCalled()
      const call = onAdd.mock.calls[0][0]
      expect(call.carry_distance).toBe(0)
      expect(call.total_distance).toBe(0)
    })

    it('clears message before validating', async () => {
      const { user, submitButton, setMessage } = setup()
      await user.click(submitButton)
      expect(setMessage).toHaveBeenCalledWith(null)
    })
  })

  // =========================================================================
  // SUCCESSFUL SUBMISSION
  // =========================================================================
  describe('Successful Submission', () => {
    it('calls onAdd with correct payload', async () => {
      const { user, submitButton, onAdd } = setup()
      await fillValid(user, { sortOrder: '5' })
      await user.click(submitButton)

      expect(onAdd).toHaveBeenCalledOnce()
      expect(onAdd).toHaveBeenCalledWith({
        name: '7 Iron',
        short_name: '7i',
        club_type: 'iron',
        is_putter: false,
        sort_order: 5,
        carry_distance: 150,
        total_distance: 160,
      })
    })

    it('sends putter type and is_putter=true when putter is selected', async () => {
      const { user, submitButton, onAdd, putterCheckbox } = setup()
      await fillValid(user)
      await user.click(putterCheckbox)
      await user.click(submitButton)

      const call = onAdd.mock.calls[0][0]
      expect(call.club_type).toBe('putter')
      expect(call.is_putter).toBe(true)
    })

    it('sends correct type when club type dropdown is changed', async () => {
      const { user, submitButton, onAdd, clubTypeSelect } = setup()
      await fillValid(user)
      await user.selectOptions(clubTypeSelect, 'wedge')
      await user.click(submitButton)

      expect(onAdd.mock.calls[0][0].club_type).toBe('wedge')
    })

    it('resets all fields after successful add', async () => {
      const { user, submitButton, nameInput, shortNameInput, carryInput, totalInput, clubTypeSelect, putterCheckbox } = setup()
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(nameInput).toHaveValue('')
        expect(shortNameInput).toHaveValue('')
        expect(carryInput).toHaveValue(null)
        expect(totalInput).toHaveValue(null)
        expect(clubTypeSelect).toHaveValue('iron')
        expect(putterCheckbox).not.toBeChecked()
      })
    })

    it('calls setMessage with "Club added." on success', async () => {
      const { user, submitButton, setMessage } = setup()
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(setMessage).toHaveBeenCalledWith('Club added.')
      })
    })

    it('clears success message after timeout', async () => {
      const { user, submitButton, setMessage } = setup()
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(setMessage).toHaveBeenCalledWith('Club added.')
      })

      // Advance timers past the 2500ms timeout
      vi.advanceTimersByTime(2600)

      expect(setMessage).toHaveBeenCalledWith(null)
    })

    it('clears error before calling onAdd', async () => {
      const { user, submitButton, setError } = setup()
      await fillValid(user)
      await user.click(submitButton)

      // setError(null) is called right before onAdd
      expect(setError).toHaveBeenCalledWith(null)
    })
  })

  // =========================================================================
  // FAILED SUBMISSION
  // =========================================================================
  describe('Failed Submission', () => {
    it('displays error when onAdd returns failure', async () => {
      const onAdd = vi.fn().mockResolvedValue({ success: false, error: 'Duplicate club name' })
      const { user, submitButton, setError } = setup({ onAdd })
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(setError).toHaveBeenCalledWith('Duplicate club name')
      })
    })

    it('does not reset fields after failed add', async () => {
      const onAdd = vi.fn().mockResolvedValue({ success: false, error: 'fail' })
      const { user, submitButton, nameInput } = setup({ onAdd })
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(nameInput).toHaveValue('7 Iron')
      })
    })

    it('does not show success message after failed add', async () => {
      const onAdd = vi.fn().mockResolvedValue({ success: false, error: 'fail' })
      const { user, submitButton, setMessage } = setup({ onAdd })
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        // setMessage should only have been called with null (the initial clear)
        expect(setMessage).not.toHaveBeenCalledWith('Club added.')
      })
    })
  })

  // =========================================================================
  // LOADING STATE
  // =========================================================================
  describe('Loading State', () => {
    it('shows "Adding…" while saving', async () => {
      const onAdd = vi.fn().mockReturnValue(new Promise(() => {})) // never resolves
      const { user, submitButton } = setup({ onAdd })
      await fillValid(user)
      await user.click(submitButton)

      expect(screen.getByText('Adding…')).toBeInTheDocument()
    })

    it('disables submit button while saving', async () => {
      const onAdd = vi.fn().mockReturnValue(new Promise(() => {}))
      const { user, submitButton } = setup({ onAdd })
      await fillValid(user)
      await user.click(submitButton)

      expect(submitButton).toBeDisabled()
    })

    it('re-enables submit button after save completes', async () => {
      const { user, submitButton } = setup()
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
        expect(submitButton).toHaveTextContent('Add to bag')
      })
    })

    it('re-enables submit button after save fails', async () => {
      const onAdd = vi.fn().mockResolvedValue({ success: false, error: 'fail' })
      const { user, submitButton } = setup({ onAdd })
      await fillValid(user)
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  describe('Edge Cases', () => {
    it('trims whitespace from name', async () => {
      const { user, submitButton, onAdd, nameInput, shortNameInput, carryInput, totalInput } = setup()
      await user.type(nameInput, '  7 Iron  ')
      await user.type(shortNameInput, '7i')
      setInputValue(carryInput, '150')
      setInputValue(totalInput, '160')
      await user.click(submitButton)

      expect(onAdd.mock.calls[0][0].name).toBe('7 Iron')
    })

    it('trims whitespace from short name', async () => {
      const { user, submitButton, onAdd } = setup()
      const nameInput = screen.getByLabelText(/^name$/i)
      const shortNameInput = screen.getByLabelText(/short name/i)
      const carryInput = screen.getByLabelText(/carry/i)
      const totalInput = screen.getByLabelText(/total/i)

      await user.type(nameInput, '7 Iron')
      await user.type(shortNameInput, '  7i  ')
      setInputValue(carryInput, '150')
      setInputValue(totalInput, '160')
      await user.click(submitButton)

      expect(onAdd.mock.calls[0][0].short_name).toBe('7i')
    })

    it('treats whitespace-only name as empty', async () => {
      const { user, submitButton, setError, shortNameInput, carryInput, totalInput } = setup()
      const nameInput = screen.getByLabelText(/^name$/i)
      await user.type(nameInput, '   ')
      await user.type(shortNameInput, '7i')
      setInputValue(carryInput, '150')
      setInputValue(totalInput, '160')
      await user.click(submitButton)

      expect(setError).toHaveBeenCalledWith('Club name is required.')
    })

    it('resolves is_putter true when dropdown is set to putter (without checkbox)', async () => {
      const { user, submitButton, onAdd, clubTypeSelect } = setup()
      await fillValid(user)
      await user.selectOptions(clubTypeSelect, 'putter')
      await user.click(submitButton)

      const call = onAdd.mock.calls[0][0]
      expect(call.club_type).toBe('putter')
      expect(call.is_putter).toBe(true)
    })

    it('allows max yardage of 400', async () => {
      const { user, submitButton, onAdd } = setup()
      await fillValid(user, { carry: '400', total: '400' })
      await user.click(submitButton)

      expect(onAdd).toHaveBeenCalled()
      expect(onAdd.mock.calls[0][0].carry_distance).toBe(400)
    })

    it('sort order input rejects negative values via HTML min constraint', () => {
      const { sortOrderInput } = setup()
      expect(sortOrderInput).toHaveAttribute('min', '0')
    })

    it('accepts sort order of 0', async () => {
      const { user, submitButton, onAdd } = setup()
      await fillValid(user, { sortOrder: '0' })
      await user.click(submitButton)

      expect(onAdd).toHaveBeenCalled()
      expect(onAdd.mock.calls[0][0].sort_order).toBe(0)
    })

    it('accepts sort order of 99', async () => {
      const { user, submitButton, onAdd } = setup()
      await fillValid(user, { sortOrder: '99' })
      await user.click(submitButton)

      expect(onAdd).toHaveBeenCalled()
      expect(onAdd.mock.calls[0][0].sort_order).toBe(99)
    })
  })
})
