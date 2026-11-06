import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../pages/LoginPage.tsx'
import { supabase } from '../../../lib/supabase.ts'

vi.mock('../../../lib/supabase.ts', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: {}, error: null }),
      resend: vi.fn(),
    },
  },
}))

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a Google sign-in option and triggers OAuth flow', async () => {
    const oauthMock = vi.mocked(supabase.auth.signInWithOAuth)

    render(
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage />
      </MemoryRouter>
    )

    const googleButton = screen.getByRole('button', { name: /continue with google/i })
    expect(googleButton).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(googleButton)
    })

    expect(oauthMock).toHaveBeenCalledTimes(1)
    expect(oauthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: expect.stringContaining('http'),
      },
    })
  })
})
