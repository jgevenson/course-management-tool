import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'

// ---------------------------------------------------------------------------
// Mock supabase client
// ---------------------------------------------------------------------------
const mockSignOut = vi.fn()

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signOut: (...args) => mockSignOut(...args),
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders the Header inside a MemoryRouter at the given path.
 * Returns a userEvent instance for interaction.
 */
function renderAt(path = '/') {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>
  )
  return { user }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: null })
  })

  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('renders the brand name', () => {
      renderAt('/')
      expect(screen.getByText('Open-Yardage')).toBeInTheDocument()
      expect(screen.getByText('Architect')).toBeInTheDocument()
    })

    it('renders inside a <header> element', () => {
      renderAt('/')
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders a navigation region', () => {
      renderAt('/')
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('renders the Dashboard link', () => {
      renderAt('/')
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    })

    it('renders the Profile & Bag link', () => {
      renderAt('/')
      expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument()
    })

    it('renders the Sign Out button', () => {
      renderAt('/')
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument()
    })

    it('renders the brand heading as an h1', () => {
      renderAt('/')
      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('Open-Yardage')
      expect(heading).toHaveTextContent('Architect')
    })
  })

  // =========================================================================
  // NAVIGATION LINKS
  // =========================================================================
  describe('Navigation Links', () => {
    it('Dashboard link points to "/"', () => {
      renderAt('/')
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink).toHaveAttribute('href', '/')
    })

    it('Profile link points to "/profile"', () => {
      renderAt('/')
      const profileLink = screen.getByRole('link', { name: /profile/i })
      expect(profileLink).toHaveAttribute('href', '/profile')
    })
  })

  // =========================================================================
  // ACTIVE STATE STYLING
  // =========================================================================
  describe('Active State Styling', () => {
    it('applies active styles to Dashboard link when on "/"', () => {
      renderAt('/')
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink.className).toContain('text-emerald-400')
      expect(dashboardLink.className).toContain('bg-slate-800/80')
    })

    it('does not apply active styles to Profile link when on "/"', () => {
      renderAt('/')
      const profileLink = screen.getByRole('link', { name: /profile/i })
      expect(profileLink.className).not.toContain('text-emerald-400')
      expect(profileLink.className).toContain('text-slate-400')
    })

    it('applies active styles to Profile link when on "/profile"', () => {
      renderAt('/profile')
      const profileLink = screen.getByRole('link', { name: /profile/i })
      expect(profileLink.className).toContain('text-emerald-400')
      expect(profileLink.className).toContain('bg-slate-800/80')
    })

    it('does not apply active styles to Dashboard link when on "/profile"', () => {
      renderAt('/profile')
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(dashboardLink.className).not.toContain('text-emerald-400')
      expect(dashboardLink.className).toContain('text-slate-400')
    })

    it('no nav links are active on an unrelated route', () => {
      renderAt('/some-other-page')
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      const profileLink = screen.getByRole('link', { name: /profile/i })

      expect(dashboardLink.className).toContain('text-slate-400')
      expect(profileLink.className).toContain('text-slate-400')
      expect(dashboardLink.className).not.toContain('text-emerald-400')
      expect(profileLink.className).not.toContain('text-emerald-400')
    })

    it('does not match partial paths (e.g. "/profiles" ≠ "/profile")', () => {
      renderAt('/profiles')
      const profileLink = screen.getByRole('link', { name: /profile/i })
      expect(profileLink.className).not.toContain('text-emerald-400')
      expect(profileLink.className).toContain('text-slate-400')
    })
  })

  // =========================================================================
  // SIGN OUT
  // =========================================================================
  describe('Sign Out', () => {
    it('calls supabase.auth.signOut when Sign Out button is clicked', async () => {
      const { user } = renderAt('/')
      const signOutButton = screen.getByRole('button', { name: /sign out/i })

      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalledOnce()
    })

    it('calls signOut with no arguments', async () => {
      const { user } = renderAt('/')
      const signOutButton = screen.getByRole('button', { name: /sign out/i })

      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalledWith()
    })

    it('Sign Out button has title attribute for accessibility', () => {
      renderAt('/')
      const signOutButton = screen.getByTitle('Sign Out')
      expect(signOutButton).toBeInTheDocument()
    })

    it('does not call signOut on render', () => {
      renderAt('/')
      expect(mockSignOut).not.toHaveBeenCalled()
    })

    it('handles multiple sign out clicks', async () => {
      const { user } = renderAt('/')
      const signOutButton = screen.getByRole('button', { name: /sign out/i })

      await user.click(signOutButton)
      await user.click(signOutButton)

      expect(mockSignOut).toHaveBeenCalledTimes(2)
    })
  })

  // =========================================================================
  // STRUCTURE & ACCESSIBILITY
  // =========================================================================
  describe('Structure & Accessibility', () => {
    it('renders the brand heading inside the header', () => {
      renderAt('/')
      const header = screen.getByRole('banner')
      const heading = screen.getByRole('heading', { level: 1 })
      expect(header).toContainElement(heading)
    })

    it('renders Dashboard link inside the nav', () => {
      renderAt('/')
      const nav = screen.getByRole('navigation')
      const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
      expect(nav).toContainElement(dashboardLink)
    })

    it('renders Profile link outside the nav (in the right section)', () => {
      renderAt('/')
      const nav = screen.getByRole('navigation')
      const profileLink = screen.getByRole('link', { name: /profile/i })
      // Profile link is in the user-actions section, not inside <nav>
      expect(nav).not.toContainElement(profileLink)
    })

    it('renders Sign Out button outside the nav', () => {
      renderAt('/')
      const nav = screen.getByRole('navigation')
      const signOutButton = screen.getByRole('button', { name: /sign out/i })
      expect(nav).not.toContainElement(signOutButton)
    })

    it('displays "Profile & Bag" text in the profile link', () => {
      renderAt('/')
      expect(screen.getByText('Profile & Bag')).toBeInTheDocument()
    })

    it('displays "Sign Out" text in the sign out button', () => {
      renderAt('/')
      expect(screen.getByText('Sign Out')).toBeInTheDocument()
    })

    it('displays "Dashboard" text in the dashboard link', () => {
      renderAt('/')
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})
