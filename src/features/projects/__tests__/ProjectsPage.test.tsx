import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ProjectsPage } from '../pages/ProjectsPage.tsx'
import * as useAuthModule from '../../auth/hooks/useAuth.ts'
import * as useOrgModule from '../../organizations/hooks/useOrganization.ts'
import { supabase } from '../../../lib/supabase.ts'

vi.mock('../../auth/hooks/useAuth.ts')
vi.mock('../../organizations/hooks/useOrganization.ts')
vi.mock('../../../lib/supabase.ts', () => ({
  supabase: {
    from: vi.fn(),
  },
}))

describe('ProjectsPage Component', () => {
  const mockOrg = { id: 'org-1', name: 'Test Org', slug: 'test-org' }
  const mockUser = { id: 'user-1', email: 'owner@example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(useAuthModule, 'useAuth').mockReturnValue({
      user: mockUser as any,
      session: {} as any,
      loading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    })
  })

  it('renders role-based "Create Project" button for organization owners', async () => {
    vi.spyOn(useOrgModule, 'useOrganization').mockReturnValue({
      currentOrganization: mockOrg as any,
      currentRole: 'owner',
      organizations: [mockOrg] as any,
      memberships: [{ organization_id: 'org-1', role: 'owner' }] as any,
      loading: false,
      switchOrganization: vi.fn(),
      createOrganization: vi.fn(),
      refreshOrganizations: vi.fn(),
    })

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    })

    // Owner should see Create Project buttons (top bar and empty state)
    const createButtons = screen.getAllByRole('button', { name: /Create Project/i })
    expect(createButtons.length).toBeGreaterThan(0)
  })

  it('hides "Create Project" action for non-manager members', async () => {
    vi.spyOn(useOrgModule, 'useOrganization').mockReturnValue({
      currentOrganization: mockOrg as any,
      currentRole: 'member',
      organizations: [mockOrg] as any,
      memberships: [{ organization_id: 'org-1', role: 'member' }] as any,
      loading: false,
      switchOrganization: vi.fn(),
      createOrganization: vi.fn(),
      refreshOrganizations: vi.fn(),
    })

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument()
    })

    // Member should NOT see Create Project button
    expect(screen.queryByRole('button', { name: /Create Project/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/Ask an owner or manager to add one/i)
    ).toBeInTheDocument()
  })

  it('renders error state with retry button when project loading fails', async () => {
    vi.spyOn(useOrgModule, 'useOrganization').mockReturnValue({
      currentOrganization: mockOrg as any,
      currentRole: 'owner',
      organizations: [mockOrg] as any,
      memberships: [{ organization_id: 'org-1', role: 'owner' }] as any,
      loading: false,
      switchOrganization: vi.fn(),
      createOrganization: vi.fn(),
      refreshOrganizations: vi.fn(),
    })

    const mockSelect = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed', code: '500' },
        }),
      }),
    })
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any)

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Error loading projects/i)).toBeInTheDocument()
      expect(screen.getByText('Database connection failed')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument()
    })
  })
})
