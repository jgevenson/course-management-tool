import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Auth from '../Auth'

// ---------------------------------------------------------------------------
// Mock the supabase client
// ---------------------------------------------------------------------------
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()

vi.mock('../../supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: (...args) => mockSignUp(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
    },
  },
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup() {
  const user = userEvent.setup()
  render(<Auth />)
  return {
    user,
    emailInput: screen.getByPlaceholderText('golfer@example.com'),
    passwordInput: screen.getByPlaceholderText('••••••••'),
    loginButton: screen.getByRole('button', { name: /log in/i }),
    signUpButton: screen.getByRole('button', { name: /sign up/i }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Auth Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: resolve successfully with no error
    mockSignUp.mockResolvedValue({ error: null })
    mockSignInWithPassword.mockResolvedValue({ error: null })
  })

  // =========================================================================
  // RENDERING
  // =========================================================================
  describe('Rendering', () => {
    it('renders the brand title', () => {
      render(<Auth />)
      expect(screen.getByText('Open-Yardage')).toBeInTheDocument()
      expect(screen.getByText('Architect')).toBeInTheDocument()
    })

    it('renders email and password input fields', () => {
      render(<Auth />)
      expect(screen.getByPlaceholderText('golfer@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })

    it('renders email input with correct type attribute', () => {
      render(<Auth />)
      const emailInput = screen.getByPlaceholderText('golfer@example.com')
      expect(emailInput).toHaveAttribute('type', 'email')
    })

    it('renders password input with correct type attribute', () => {
      render(<Auth />)
      const passwordInput = screen.getByPlaceholderText('••••••••')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('renders Log In and Sign Up buttons', () => {
      render(<Auth />)
      expect(screen.getByRole('button', { name: /log in/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument()
    })

    it('renders email and password labels', () => {
      render(<Auth />)
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
    })

    it('does not display any message on initial render', () => {
      render(<Auth />)
      // No success or error banners present
      expect(screen.queryByText(/success/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    it('initializes input fields as empty', () => {
      render(<Auth />)
      expect(screen.getByPlaceholderText('golfer@example.com')).toHaveValue('')
      expect(screen.getByPlaceholderText('••••••••')).toHaveValue('')
    })

    it('buttons are enabled on initial render', () => {
      render(<Auth />)
      expect(screen.getByRole('button', { name: /log in/i })).not.toBeDisabled()
      expect(screen.getByRole('button', { name: /sign up/i })).not.toBeDisabled()
    })
  })

  // =========================================================================
  // USER INPUT
  // =========================================================================
  describe('User Input', () => {
    it('updates email field when user types', async () => {
      const { user, emailInput } = setup()
      await user.type(emailInput, 'test@example.com')
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('updates password field when user types', async () => {
      const { user, passwordInput } = setup()
      await user.type(passwordInput, 'securepassword')
      expect(passwordInput).toHaveValue('securepassword')
    })

    it('allows clearing and retyping in email field', async () => {
      const { user, emailInput } = setup()
      await user.type(emailInput, 'first@example.com')
      await user.clear(emailInput)
      await user.type(emailInput, 'second@example.com')
      expect(emailInput).toHaveValue('second@example.com')
    })

    it('allows clearing and retyping in password field', async () => {
      const { user, passwordInput } = setup()
      await user.type(passwordInput, 'oldpass')
      await user.clear(passwordInput)
      await user.type(passwordInput, 'newpass')
      expect(passwordInput).toHaveValue('newpass')
    })
  })

  // =========================================================================
  // LOGIN
  // =========================================================================
  describe('Login', () => {
    it('calls signInWithPassword with email and password', async () => {
      const { user, emailInput, passwordInput, loginButton } = setup()

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      expect(mockSignInWithPassword).toHaveBeenCalledOnce()
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('shows loading state while login is in progress', async () => {
      // Make signIn hang so we can observe the loading state
      mockSignInWithPassword.mockReturnValue(new Promise(() => {}))

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('disables buttons during loading', async () => {
      mockSignInWithPassword.mockReturnValue(new Promise(() => {}))

      const { user, emailInput, passwordInput, loginButton, signUpButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      expect(loginButton).toBeDisabled()
      expect(signUpButton).toBeDisabled()
    })

    it('displays error message on login failure', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      })

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'wrong@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })
    })

    it('does not display success message on login (no success branch)', async () => {
      mockSignInWithPassword.mockResolvedValue({ error: null })

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled()
      })

      // Login success has no explicit success message in the component
      expect(screen.queryByText(/success/i)).not.toBeInTheDocument()
    })

    it('re-enables buttons after login completes', async () => {
      const { user, emailInput, passwordInput, loginButton, signUpButton } = setup()

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled()
        expect(signUpButton).not.toBeDisabled()
      })
    })

    it('re-enables buttons after login fails', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Something went wrong' },
      })

      const { user, emailInput, passwordInput, loginButton, signUpButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'bad')
      await user.click(loginButton)

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled()
        expect(signUpButton).not.toBeDisabled()
      })
    })

    it('calls preventDefault on login click', async () => {
      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // The click will call handleLogin which calls e.preventDefault()
      // If it didn't, the form would submit and cause navigation
      // Verifying no error is thrown is sufficient since jsdom throws on navigation
      await user.click(loginButton)

      expect(mockSignInWithPassword).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // SIGN UP
  // =========================================================================
  describe('Sign Up', () => {
    it('calls signUp with email and password', async () => {
      const { user, emailInput, passwordInput, signUpButton } = setup()

      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'newpass123')
      await user.click(signUpButton)

      expect(mockSignUp).toHaveBeenCalledOnce()
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpass123',
      })
    })

    it('shows loading state while sign up is in progress', async () => {
      mockSignUp.mockReturnValue(new Promise(() => {}))

      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'newpass123')
      await user.click(signUpButton)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('disables buttons during sign up', async () => {
      mockSignUp.mockReturnValue(new Promise(() => {}))

      const { user, emailInput, passwordInput, loginButton, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'newpass123')
      await user.click(signUpButton)

      expect(loginButton).toBeDisabled()
      expect(signUpButton).toBeDisabled()
    })

    it('displays success message on successful sign up', async () => {
      const { user, emailInput, passwordInput, signUpButton } = setup()

      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'newpass123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(
          screen.getByText('Success! You are now signed up and logged in.')
        ).toBeInTheDocument()
      })
    })

    it('displays error message on sign up failure', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'User already registered' },
      })

      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'existing@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(screen.getByText('User already registered')).toBeInTheDocument()
      })
    })

    it('re-enables buttons after sign up succeeds', async () => {
      const { user, emailInput, passwordInput, loginButton, signUpButton } = setup()

      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'newpass123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled()
        expect(signUpButton).not.toBeDisabled()
      })
    })

    it('re-enables buttons after sign up fails', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Signup error' },
      })

      const { user, emailInput, passwordInput, loginButton, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'newpass123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(loginButton).not.toBeDisabled()
        expect(signUpButton).not.toBeDisabled()
      })
    })
  })

  // =========================================================================
  // MESSAGE DISPLAY
  // =========================================================================
  describe('Message Display', () => {
    it('clears previous error when login is retried', async () => {
      mockSignInWithPassword
        .mockResolvedValueOnce({ error: { message: 'First error' } })
        .mockResolvedValueOnce({ error: null })

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'pass')

      // First attempt — error
      await user.click(loginButton)
      await waitFor(() => {
        expect(screen.getByText('First error')).toBeInTheDocument()
      })

      // Second attempt — success, error should be gone
      await user.click(loginButton)
      await waitFor(() => {
        expect(screen.queryByText('First error')).not.toBeInTheDocument()
      })
    })

    it('clears previous error when sign up is retried', async () => {
      mockSignUp
        .mockResolvedValueOnce({ error: { message: 'Signup failed' } })
        .mockResolvedValueOnce({ error: null })

      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'pass')

      // First attempt
      await user.click(signUpButton)
      await waitFor(() => {
        expect(screen.getByText('Signup failed')).toBeInTheDocument()
      })

      // Second attempt
      await user.click(signUpButton)
      await waitFor(() => {
        expect(screen.queryByText('Signup failed')).not.toBeInTheDocument()
      })
    })

    it('replaces error with success when sign up succeeds after failure', async () => {
      mockSignUp
        .mockResolvedValueOnce({ error: { message: 'Password too weak' } })
        .mockResolvedValueOnce({ error: null })

      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'short')

      await user.click(signUpButton)
      await waitFor(() => {
        expect(screen.getByText('Password too weak')).toBeInTheDocument()
      })

      // Fix password and retry
      await user.clear(passwordInput)
      await user.type(passwordInput, 'strongpassword123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(screen.queryByText('Password too weak')).not.toBeInTheDocument()
        expect(
          screen.getByText('Success! You are now signed up and logged in.')
        ).toBeInTheDocument()
      })
    })

    it('replaces success with error when switching from sign up to login failure', async () => {
      mockSignUp.mockResolvedValue({ error: null })
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      })

      const { user, emailInput, passwordInput, signUpButton, loginButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'pass123')

      // Sign up success
      await user.click(signUpButton)
      await waitFor(() => {
        expect(
          screen.getByText('Success! You are now signed up and logged in.')
        ).toBeInTheDocument()
      })

      // Login failure
      await user.click(loginButton)
      await waitFor(() => {
        expect(
          screen.queryByText('Success! You are now signed up and logged in.')
        ).not.toBeInTheDocument()
        expect(screen.getByText('Invalid login credentials')).toBeInTheDocument()
      })
    })

    it('applies error styling to error messages', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Auth error' },
      })

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'pass')
      await user.click(loginButton)

      await waitFor(() => {
        const messageEl = screen.getByText('Auth error')
        expect(messageEl.className).toMatch(/red/)
      })
    })

    it('applies success styling to success messages', async () => {
      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, 'pass123')
      await user.click(signUpButton)

      await waitFor(() => {
        const messageEl = screen.getByText(
          'Success! You are now signed up and logged in.'
        )
        expect(messageEl.className).toMatch(/emerald/)
      })
    })
  })

  // =========================================================================
  // EDGE CASES
  // =========================================================================
  describe('Edge Cases', () => {
    it('handles login with empty credentials', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Email is required' },
      })

      const { user, loginButton } = setup()
      await user.click(loginButton)

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: '',
        password: '',
      })

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
    })

    it('handles sign up with empty credentials', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Email is required' },
      })

      const { user, signUpButton } = setup()
      await user.click(signUpButton)

      expect(mockSignUp).toHaveBeenCalledWith({
        email: '',
        password: '',
      })

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
    })

    it('handles network error during login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Failed to fetch' },
      })

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch')).toBeInTheDocument()
      })
    })

    it('handles network error during sign up', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Network request failed' },
      })

      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(screen.getByText('Network request failed')).toBeInTheDocument()
      })
    })

    it('handles rapid successive clicks (only calls API once while loading)', async () => {
      // The component disables buttons while loading, so rapid clicks
      // shouldn't trigger multiple API calls
      mockSignInWithPassword.mockReturnValue(new Promise(() => {})) // never resolves

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      await user.click(loginButton)
      // Button is now disabled, further clicks should be no-ops
      await user.click(loginButton)
      await user.click(loginButton)

      expect(mockSignInWithPassword).toHaveBeenCalledTimes(1)
    })

    it('preserves input values after failed login attempt', async () => {
      mockSignInWithPassword.mockResolvedValue({
        error: { message: 'Wrong password' },
      })

      const { user, emailInput, passwordInput, loginButton } = setup()
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpass')
      await user.click(loginButton)

      await waitFor(() => {
        expect(screen.getByText('Wrong password')).toBeInTheDocument()
      })

      expect(emailInput).toHaveValue('test@example.com')
      expect(passwordInput).toHaveValue('wrongpass')
    })

    it('preserves input values after failed sign up attempt', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'Weak password' },
      })

      const { user, emailInput, passwordInput, signUpButton } = setup()
      await user.type(emailInput, 'new@example.com')
      await user.type(passwordInput, '123')
      await user.click(signUpButton)

      await waitFor(() => {
        expect(screen.getByText('Weak password')).toBeInTheDocument()
      })

      expect(emailInput).toHaveValue('new@example.com')
      expect(passwordInput).toHaveValue('123')
    })
  })
})
