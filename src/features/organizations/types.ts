export type OrganizationRole = 'owner' | 'manager' | 'member'

export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
  industry?: string
  description?: string
}

export interface OrganizationMemberRecord {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  created_at: string
}

export interface OrganizationMembership {
  id: string
  organization_id: string
  role: OrganizationRole
  organization: Organization
}

export interface CompanyDirectoryItem {
  id: string
  name: string
  description: string
  industry: string
  membersCount: number
  ownerEmail?: string
  isSample?: boolean
  created_at?: string
}

export interface OrganizationInvitation {
  id: string
  organizationId: string
  organizationName: string
  invitedByEmail: string
  recipientEmail: string
  role: OrganizationRole
  status: 'pending' | 'accepted' | 'expired'
  token: string
  createdAt: string
}

export interface OrganizationJoinRequest {
  id: string
  organizationId: string
  organizationName: string
  userId: string
  userEmail: string
  userName: string
  status: 'pending' | 'approved' | 'declined'
  requestedAt: string
  note?: string
}

export interface OrganizationContextValue {
  organizations: Organization[]
  memberships: OrganizationMembership[]
  currentOrganization: Organization | null
  currentRole: OrganizationRole | null
  loading: boolean
  error: string | null
  createOrganization: (name: string, details?: { industry?: string; description?: string }) => Promise<{ organization: Organization | null; error: Error | null }>
  updateOrganization: (orgId: string, name: string, details?: { industry?: string; description?: string }) => Promise<{ error: Error | null }>
  switchOrganization: (orgId: string) => void
  refreshOrganizations: () => Promise<void>
}
