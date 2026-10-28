import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '../ProtectedRoute.tsx'
import { RequireOrganization } from '../RequireOrganization.tsx'
import * as useAuthModule from '../../features/auth/hooks/useAuth.ts'
import * as useOrgModule from '../../features/organizations/hooks/useOrganization.ts'

vi.mock('../../features/auth/hooks/useAuth.ts')
vi.mock('../../features/organizations/hooks/useOrganization.ts')

describe('Route Guard Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ProtectedRoute', () => {
    it('renders loading state when auth session is initializing', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: null,
        session: null,
        loading: true,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText(/Authenticating session.../i)).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('redirects unauthenticated users to /login', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: null,
        session: null,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route path="/login" element={<div>Login Page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Login Page')).toBeInTheDocument()
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    })

    it('renders child outlet when user is authenticated', () => {
      vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
        user: { id: 'user-1', email: 'test@example.com' } as any,
        session: {} as any,
        loading: false,
        signIn: vi.fn(),
        signUp: vi.fn(),
        signOut: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/protected" element={<div>Protected Content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })
  })

  describe('RequireOrganization', () => {
    it('renders loading screen while organization context is loading', () => {
      vi.spyOn(useOrgModule, 'useOrganization').mockReturnValue({
        currentOrganization: null,
        currentRole: null,
        organizations: [],
        memberships: [],
        loading: true,
        switchOrganization: vi.fn(),
        createOrganization: vi.fn(),
        refreshOrganizations: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <Routes>
            <Route element={<RequireOrganization />}>
              <Route path="/workspace" element={<div>Workspace Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText(/Loading workspace.../i)).toBeInTheDocument()
      expect(screen.queryByText('Workspace Page')).not.toBeInTheDocument()
    })

    it('redirects to /onboarding if user has no organizations or none selected', () => {
      vi.spyOn(useOrgModule, 'useOrganization').mockReturnValue({
        currentOrganization: null,
        currentRole: null,
        organizations: [],
        memberships: [],
        loading: false,
        switchOrganization: vi.fn(),
        createOrganization: vi.fn(),
        refreshOrganizations: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <Routes>
            <Route path="/onboarding" element={<div>Onboarding Page</div>} />
            <Route element={<RequireOrganization />}>
              <Route path="/workspace" element={<div>Workspace Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Onboarding Page')).toBeInTheDocument()
      expect(screen.queryByText('Workspace Page')).not.toBeInTheDocument()
    })

    it('renders workspace content when organization is active', () => {
      vi.spyOn(useOrgModule, 'useOrganization').mockReturnValue({
        currentOrganization: { id: 'org-1', name: 'Acme Corp', slug: 'acme' } as any,
        currentRole: 'owner',
        organizations: [{ id: 'org-1', name: 'Acme Corp', slug: 'acme' }] as any,
        memberships: [{ organization_id: 'org-1', role: 'owner' }] as any,
        loading: false,
        switchOrganization: vi.fn(),
        createOrganization: vi.fn(),
        refreshOrganizations: vi.fn(),
      })

      render(
        <MemoryRouter initialEntries={['/workspace']}>
          <Routes>
            <Route element={<RequireOrganization />}>
              <Route path="/workspace" element={<div>Workspace Page</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      )

      expect(screen.getByText('Workspace Page')).toBeInTheDocument()
    })
  })
})

