import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DigitalBagPanel from '../DigitalBagPanel'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockAddClub = vi.fn()
const mockUpdateClub = vi.fn()
const mockRemoveClub = vi.fn()

let hookReturn = {}

vi.mock('../../../../hooks/useClubs', () => ({
  useClubs: (...args) => hookReturn,
}))

// We mock child components so we can test DigitalBagPanel in isolation.
// Each mock renders a minimal stub that exposes the props it received.
vi.mock('../BagAddClubForm', () => ({
  default: (props) => (
    <div data-testid="bag-add-club-form">
      <span data-testid="add-form-clubs">{JSON.stringify(props.clubs)}</span>
      <button data-testid="trigger-add" onClick={() => props.onAdd({ name: 'test' })}>
        Add
      </button>
      <button data-testid="trigger-set-error" onClick={() => props.setError('form error')}>
        Set Error
      </button>
      <button data-testid="trigger-set-message" onClick={() => props.setMessage('form msg')}>
        Set Message
      </button>
      <button data-testid="trigger-clear-error" onClick={() => props.setError(null)}>
        Clear Error
      </button>
      <button data-testid="trigger-clear-message" onClick={() => props.setMessage(null)}>
        Clear Message
      </button>
    </div>
  ),
}))

vi.mock('../BagClubList', () => ({
  default: (props) => (
    <div data-testid="bag-club-list">
      <span data-testid="list-clubs">{JSON.stringify(props.clubs)}</span>
      <button data-testid="trigger-update" onClick={() => props.onUpdate('id-1', { name: 'updated' })}>
        Update
      </button>
      <button data-testid="trigger-remove" onClick={() => props.onRemove('id-1')}>
        Remove
      </button>
      <button data-testid="list-set-error" onClick={() => props.setError('list error')}>
        Set List Error
      </button>
      <button data-testid="list-set-message" onClick={() => props.setMessage('list msg')}>
        Set List Message
      </button>
    </div>
  ),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const MOCK_CLUBS = [
  { id: '1', name: '7 Iron', carry_distance: 155, total_distance: 165 },
  { id: '2', name: 'Driver', carry_distance: 270, total_distance: 295 },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupHook(overrides = {}) {
  hookReturn = {
    clubs: overrides.clubs ?? MOCK_CLUBS,
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    addClub: overrides.addClub ?? mockAddClub,
    updateClub: overrides.updateClub ?? mockUpdateClub,
    removeClub: overrides.removeClub ?? mockRemoveClub,
  }
}

function renderPanel(userId = 'user-123') {
  const user = userEvent.setup()
  render(
    <DigitalBagPanel
      userId={userId}
      clubs={hookReturn.clubs}
      loading={hookReturn.loading}
      fetchError={hookReturn.error}
      activeClubId={null}
      onSelectClub={vi.fn()}
      addClub={hookReturn.addClub}
      updateClub={hookReturn.updateClub}
      removeClub={hookReturn.removeClub}
    />
  )
  return { user }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('DigitalBagPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupHook()
  })

  // =========================================================================
  // RENDERING — BASIC STRUCTURE
  // =========================================================================
  describe('Basic Structure', () => {
    it('renders the heading "My bag"', () => {
      renderPanel()
      expect(screen.getByRole('heading', { name: /my bag/i })).toBeInTheDocument()
    })

    it('renders the description text', () => {
      renderPanel()
      expect(screen.getByText(/clubs are ordered by/i)).toBeInTheDocument()
      expect(screen.getByText('sort order')).toBeInTheDocument()
    })

    it('renders BagAddClubForm when not loading', () => {
      renderPanel()
      expect(screen.getByTestId('bag-add-club-form')).toBeInTheDocument()
    })

    it('renders BagClubList when not loading', () => {
      renderPanel()
      expect(screen.getByTestId('bag-club-list')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // LOADING STATE
  // =========================================================================
  describe('Loading State', () => {
    it('shows loading text when loading is true', () => {
      setupHook({ loading: true })
      renderPanel()
      expect(screen.getByText(/loading clubs/i)).toBeInTheDocument()
    })

    it('does not render BagAddClubForm while loading', () => {
      setupHook({ loading: true })
      renderPanel()
      expect(screen.queryByTestId('bag-add-club-form')).not.toBeInTheDocument()
    })

    it('does not render BagClubList while loading', () => {
      setupHook({ loading: true })
      renderPanel()
      expect(screen.queryByTestId('bag-club-list')).not.toBeInTheDocument()
    })

    it('does not show loading text when loading is false', () => {
      setupHook({ loading: false })
      renderPanel()
      expect(screen.queryByText(/loading clubs/i)).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // ERROR DISPLAY
  // =========================================================================
  describe('Error Display', () => {
    it('displays fetch error from useClubs', () => {
      setupHook({ error: 'Failed to load clubs' })
      renderPanel()

      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Failed to load clubs')
    })

    it('does not display error when there is none', () => {
      setupHook({ error: null })
      renderPanel()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    it('displays local error set by child components', async () => {
      const { user } = renderPanel()
      // Trigger setError from BagAddClubForm mock
      await user.click(screen.getByTestId('trigger-set-error'))

      expect(screen.getByRole('alert')).toHaveTextContent('form error')
    })

    it('local error takes precedence over fetch error (via || logic)', async () => {
      // When both exist, displayError = error || fetchError → local error wins
      setupHook({ error: 'fetch error' })
      const { user } = renderPanel()

      await user.click(screen.getByTestId('trigger-set-error'))

      // local 'form error' is set, displayError = 'form error' || 'fetch error' = 'form error'
      expect(screen.getByRole('alert')).toHaveTextContent('form error')
    })

    it('shows fetch error when local error is cleared', async () => {
      setupHook({ error: 'fetch error' })
      const { user } = renderPanel()

      // Set then clear local error
      await user.click(screen.getByTestId('trigger-set-error'))
      await user.click(screen.getByTestId('trigger-clear-error'))

      // displayError falls back to fetchError
      expect(screen.getByRole('alert')).toHaveTextContent('fetch error')
    })

    it('hides error display when both errors are cleared', async () => {
      const { user } = renderPanel()

      await user.click(screen.getByTestId('trigger-set-error'))
      expect(screen.getByRole('alert')).toBeInTheDocument()

      await user.click(screen.getByTestId('trigger-clear-error'))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  // =========================================================================
  // MESSAGE DISPLAY
  // =========================================================================
  describe('Message Display', () => {
    it('does not display message initially', () => {
      renderPanel()
      expect(screen.queryByText('form msg')).not.toBeInTheDocument()
    })

    it('displays message when set by child component', async () => {
      const { user } = renderPanel()
      await user.click(screen.getByTestId('trigger-set-message'))

      expect(screen.getByText('form msg')).toBeInTheDocument()
    })

    it('clears message when set to null', async () => {
      const { user } = renderPanel()
      await user.click(screen.getByTestId('trigger-set-message'))
      expect(screen.getByText('form msg')).toBeInTheDocument()

      await user.click(screen.getByTestId('trigger-clear-message'))
      expect(screen.queryByText('form msg')).not.toBeInTheDocument()
    })

    it('displays message from BagClubList', async () => {
      const { user } = renderPanel()
      await user.click(screen.getByTestId('list-set-message'))

      expect(screen.getByText('list msg')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // PROPS PASSING
  // =========================================================================
  describe('Props Passing', () => {
    it('passes clubs to BagAddClubForm', () => {
      renderPanel()
      const addFormClubs = screen.getByTestId('add-form-clubs')
      expect(JSON.parse(addFormClubs.textContent)).toEqual(MOCK_CLUBS)
    })

    it('passes clubs to BagClubList', () => {
      renderPanel()
      const listClubs = screen.getByTestId('list-clubs')
      expect(JSON.parse(listClubs.textContent)).toEqual(MOCK_CLUBS)
    })

    it('passes addClub as onAdd to BagAddClubForm', async () => {
      const { user } = renderPanel()
      await user.click(screen.getByTestId('trigger-add'))

      expect(mockAddClub).toHaveBeenCalledOnce()
      expect(mockAddClub).toHaveBeenCalledWith({ name: 'test' })
    })

    it('passes updateClub as onUpdate to BagClubList', async () => {
      const { user } = renderPanel()
      await user.click(screen.getByTestId('trigger-update'))

      expect(mockUpdateClub).toHaveBeenCalledOnce()
      expect(mockUpdateClub).toHaveBeenCalledWith('id-1', { name: 'updated' })
    })

    it('passes removeClub as onRemove to BagClubList', async () => {
      const { user } = renderPanel()
      await user.click(screen.getByTestId('trigger-remove'))

      expect(mockRemoveClub).toHaveBeenCalledOnce()
      expect(mockRemoveClub).toHaveBeenCalledWith('id-1')
    })

    it('shares the same setError between both children', async () => {
      const { user } = renderPanel()

      // Error set from form
      await user.click(screen.getByTestId('trigger-set-error'))
      expect(screen.getByRole('alert')).toHaveTextContent('form error')

      // Clear from form, set from list
      await user.click(screen.getByTestId('trigger-clear-error'))
      await user.click(screen.getByTestId('list-set-error'))
      expect(screen.getByRole('alert')).toHaveTextContent('list error')
    })

    it('shares the same setMessage between both children', async () => {
      const { user } = renderPanel()

      await user.click(screen.getByTestId('trigger-set-message'))
      expect(screen.getByText('form msg')).toBeInTheDocument()

      // List message replaces form message
      await user.click(screen.getByTestId('list-set-message'))
      expect(screen.queryByText('form msg')).not.toBeInTheDocument()
      expect(screen.getByText('list msg')).toBeInTheDocument()
    })
  })

  // =========================================================================
  // EMPTY CLUBS
  // =========================================================================
  describe('Empty Clubs', () => {
    it('passes empty array to children when no clubs', () => {
      setupHook({ clubs: [] })
      renderPanel()

      expect(JSON.parse(screen.getByTestId('add-form-clubs').textContent)).toEqual([])
      expect(JSON.parse(screen.getByTestId('list-clubs').textContent)).toEqual([])
    })
  })
})
