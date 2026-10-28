import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { NotificationCenter } from '../components/NotificationCenter.tsx'
import * as useNotificationsModule from '../hooks/useNotifications.ts'
import * as useOrgModule from '../../organizations/hooks/useOrganization.ts'

vi.mock('../hooks/useNotifications.ts')
vi.mock('../../organizations/hooks/useOrganization.ts')

describe('NotificationCenter Component', () => {
  const mockOrg = { id: 'org-1', name: 'Acme Org', slug: 'acme' }

  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('renders bell icon and opens dropdown showing empty state', () => {
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
      realtimeStatus: 'connected',
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: vi.fn(),
    })

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    )

    const bellBtn = screen.getByRole('button', { name: /Notifications/i })
    expect(bellBtn).toBeInTheDocument()

    // Click to open panel
    fireEvent.click(bellBtn)

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('All caught up!')).toBeInTheDocument()
    expect(screen.getByText(/No notifications for this workspace/i)).toBeInTheDocument()
  })

  it('renders error state with retry button when loading fails', () => {
    const refreshMock = vi.fn()
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: 'Failed to fetch notification feed.',
      realtimeStatus: 'unavailable',
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: refreshMock,
    })

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

    expect(screen.getByText('Failed to fetch notification feed.')).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /Retry/i })
    expect(retryBtn).toBeInTheDocument()

    fireEvent.click(retryBtn)
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('displays unread count badge and triggers markAllAsRead', async () => {
    const markAllMock = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(useNotificationsModule, 'useNotifications').mockReturnValue({
      notifications: [
        {
          id: 'n1',
          organization_id: 'org-1',
          recipient_id: 'user-1',
          actor_id: 'user-2',
          project_id: 'proj-1',
          task_id: 'task-1',
          type: 'task_assigned',
          title: 'New assignment',
          body: 'You were assigned to task Alpha',
          dedupe_key: 'key-1',
          read_at: null,
          created_at: '2026-10-28T10:00:00Z',
        },
      ],
      unreadCount: 1,
      loading: false,
      error: null,
      realtimeStatus: 'connected',
      markAsRead: vi.fn(),
      markAllAsRead: markAllMock,
      refreshNotifications: vi.fn(),
    })

    render(
      <MemoryRouter>
        <NotificationCenter />
      </MemoryRouter>
    )

    // Unread count badge on the closed button
    expect(screen.getByText('1')).toBeInTheDocument()

    // Open panel
    fireEvent.click(screen.getByRole('button', { name: /Notifications/i }))

    expect(screen.getByText('1 new')).toBeInTheDocument()
    const markAllBtn = screen.getByRole('button', { name: /Mark all as read/i })
    expect(markAllBtn).toBeEnabled()

    await act(async () => {
      fireEvent.click(markAllBtn)
    })
    expect(markAllMock).toHaveBeenCalledTimes(1)
  })
})
