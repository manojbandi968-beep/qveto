import { supabase } from '../../../lib/supabase.ts'
import type { OrganizationInvitation, OrganizationRole } from '../types.ts'

const STORAGE_KEY = 'projectflow_invitations_v1'

function getStoredInvitations(): OrganizationInvitation[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as OrganizationInvitation[]
  } catch {
    return []
  }
}

function saveStoredInvitations(invites: OrganizationInvitation[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invites))
  } catch (err) {
    console.error('Failed to save invitations:', err)
  }
}

export function createInvitation(params: {
  organizationId: string
  organizationName: string
  invitedByEmail: string
  recipientEmail: string
  role?: OrganizationRole
}): OrganizationInvitation {
  const all = getStoredInvitations()
  const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

  const newInvite: OrganizationInvitation = {
    id: `inv-${Date.now()}`,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    invitedByEmail: params.invitedByEmail,
    recipientEmail: params.recipientEmail.trim().toLowerCase(),
    role: params.role || 'member',
    status: 'pending',
    token,
    createdAt: new Date().toISOString(),
  }

  saveStoredInvitations([newInvite, ...all])
  return newInvite
}

export function getInvitationsForOrg(organizationId: string): OrganizationInvitation[] {
  const all = getStoredInvitations()
  return all.filter((i) => i.organizationId === organizationId)
}

export function getInvitationByToken(token: string): OrganizationInvitation | null {
  const all = getStoredInvitations()
  return all.find((i) => i.token === token && i.status === 'pending') || null
}

export async function acceptInvitation(
  token: string,
  userId: string
): Promise<{ success: boolean; organizationId?: string; error?: string }> {
  const all = getStoredInvitations()
  const invite = all.find((i) => i.token === token)

  if (!invite) {
    return { success: false, error: 'Invitation not found or link has expired.' }
  }

  if (invite.status === 'accepted') {
    return { success: true, organizationId: invite.organizationId }
  }

  // Attempt to insert member row in Supabase
  try {
    const { error: insertErr } = await supabase.from('organization_members').insert({
      organization_id: invite.organizationId,
      user_id: userId,
      role: invite.role,
    })

    if (insertErr && insertErr.code !== '23505') {
      console.warn('[Invitations] Supabase insert note:', insertErr.message)
    }
  } catch (err) {
    console.warn('[Invitations] Member insert note:', err)
  }

  // Mark invite as accepted
  const updated = all.map((i) => (i.token === token ? { ...i, status: 'accepted' as const } : i))
  saveStoredInvitations(updated)

  return { success: true, organizationId: invite.organizationId }
}
