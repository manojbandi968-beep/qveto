export type OrganizationRole = 'owner' | 'manager' | 'member'

export interface Organization {
  id: string
  name: string
  owner_id: string
  created_at: string
  updated_at: string
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

export interface OrganizationContextValue {
  organizations: Organization[]
  memberships: OrganizationMembership[]
  currentOrganization: Organization | null
  currentRole: OrganizationRole | null
  loading: boolean
  error: string | null
  createOrganization: (name: string) => Promise<{ organization: Organization | null; error: Error | null }>
  switchOrganization: (orgId: string) => void
  refreshOrganizations: () => Promise<void>
}
