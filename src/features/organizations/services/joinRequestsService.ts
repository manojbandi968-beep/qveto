import type { OrganizationJoinRequest } from '../types.ts'

const STORAGE_KEY = 'projectflow_join_requests_v1'

const SEED_REQUESTS: OrganizationJoinRequest[] = [
  {
    id: 'req-sample-01',
    organizationId: 'org-seed-acme',
    organizationName: 'Acme Innovations',
    userId: 'user-cand-01',
    userEmail: 'dev.sarah@external-tech.org',
    userName: 'Sarah Jenkins',
    status: 'pending',
    requestedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    note: 'Hi! I am a full-stack engineer and would love to collaborate on the upcoming Q4 sprint.',
  },
  {
    id: 'req-sample-02',
    organizationId: 'org-seed-acme',
    organizationName: 'Acme Innovations',
    userId: 'user-cand-02',
    userEmail: 'michael.ross@designforge.io',
    userName: 'Michael Ross',
    status: 'pending',
    requestedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    note: 'Requesting employee access to manage the design system tokens and component assets.',
  },
]

function getStoredRequests(): OrganizationJoinRequest[] {
  if (typeof window === 'undefined') return SEED_REQUESTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REQUESTS))
      return SEED_REQUESTS
    }
    return JSON.parse(raw) as OrganizationJoinRequest[]
  } catch {
    return SEED_REQUESTS
  }
}

function saveStoredRequests(requests: OrganizationJoinRequest[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
  } catch (err) {
    console.error('Failed to save join requests:', err)
  }
}

export function submitJoinRequest(data: {
  organizationId: string
  organizationName: string
  userId: string
  userEmail: string
  userName?: string
  note?: string
}): OrganizationJoinRequest {
  const all = getStoredRequests()
  const newReq: OrganizationJoinRequest = {
    id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organizationId: data.organizationId,
    organizationName: data.organizationName,
    userId: data.userId,
    userEmail: data.userEmail,
    userName: data.userName || data.userEmail.split('@')[0],
    status: 'pending',
    requestedAt: new Date().toISOString(),
    note: data.note || 'Requested access via Company Directory search.',
  }

  saveStoredRequests([newReq, ...all])
  return newReq
}

export function getJoinRequestsForOrganization(organizationId: string): OrganizationJoinRequest[] {
  const all = getStoredRequests()
  return all.filter((r) => r.organizationId === organizationId)
}

export function getUserPendingJoinRequests(userId: string): OrganizationJoinRequest[] {
  const all = getStoredRequests()
  return all.filter((r) => r.userId === userId && r.status === 'pending')
}

export function updateJoinRequestStatus(
  requestId: string,
  newStatus: 'approved' | 'declined'
): OrganizationJoinRequest | null {
  const all = getStoredRequests()
  let updated: OrganizationJoinRequest | null = null

  const next = all.map((r) => {
    if (r.id === requestId) {
      updated = { ...r, status: newStatus }
      return updated
    }
    return r
  })

  saveStoredRequests(next)
  return updated
}
