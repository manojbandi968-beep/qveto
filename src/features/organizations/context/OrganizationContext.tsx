import { useEffect, useState, useCallback } from 'react'
import type { FC, ReactNode } from 'react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { OrganizationContext } from './org-context-def.ts'
import type {
  Organization,
  OrganizationMembership,
  OrganizationRole,
  OrganizationContextValue,
} from '../types.ts'

export const OrganizationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([])
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null)
  const [currentRole, setCurrentRole] = useState<OrganizationRole | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const getStorageKey = useCallback((userId: string) => `projectflow_selected_org_${userId}`, [])

  const loadOrganizations = useCallback(async (userId: string, preferredOrgId?: string) => {
    try {
      setLoading(true)
      setError(null)

      // 1. Fetch user's organization memberships
      const { data: memberRows, error: memberError } = await supabase
        .from('organization_members')
        .select('id, organization_id, role, created_at')
        .eq('user_id', userId)

      if (memberError) {
        throw new Error(memberError.message)
      }

      if (!memberRows || memberRows.length === 0) {
        setOrganizations([])
        setMemberships([])
        setCurrentOrganization(null)
        setCurrentRole(null)
        localStorage.removeItem(getStorageKey(userId))
        return
      }

      // 2. Fetch corresponding organizations
      const orgIds = memberRows.map((m) => m.organization_id)
      const { data: orgRows, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, owner_id, created_at, updated_at')
        .in('id', orgIds)

      if (orgError) {
        throw new Error(orgError.message)
      }

      const orgMap = new Map<string, Organization>()
      ;(orgRows || []).forEach((org) => {
        orgMap.set(org.id, org)
      })

      // Combine memberships with organization details
      const resolvedMemberships: OrganizationMembership[] = []
      const resolvedOrgs: Organization[] = []

      memberRows.forEach((member) => {
        const org = orgMap.get(member.organization_id)
        if (org) {
          resolvedMemberships.push({
            id: member.id,
            organization_id: member.organization_id,
            role: member.role as OrganizationRole,
            organization: org,
          })
          resolvedOrgs.push(org)
        }
      })

      setOrganizations(resolvedOrgs)
      setMemberships(resolvedMemberships)

      // 3. Resolve selected organization
      const storageKey = getStorageKey(userId)
      const savedOrgId = preferredOrgId || localStorage.getItem(storageKey)

      let selectedMembership = resolvedMemberships.find((m) => m.organization_id === savedOrgId)

      // If saved organization is invalid or not found, fall back to first membership
      if (!selectedMembership && resolvedMemberships.length > 0) {
        selectedMembership = resolvedMemberships[0]
      }

      if (selectedMembership) {
        setCurrentOrganization(selectedMembership.organization)
        setCurrentRole(selectedMembership.role)
        localStorage.setItem(storageKey, selectedMembership.organization_id)
      } else {
        setCurrentOrganization(null)
        setCurrentRole(null)
        localStorage.removeItem(storageKey)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load organizations'
      console.error('[OrganizationContext] Error loading organizations:', msg)
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [getStorageKey])

  useEffect(() => {
    let isMounted = true

    const syncOrgs = async () => {
      if (!user) {
        if (isMounted) {
          setOrganizations([])
          setMemberships([])
          setCurrentOrganization(null)
          setCurrentRole(null)
          setLoading(false)
          setError(null)
        }
        return
      }

      await loadOrganizations(user.id)
    }

    void syncOrgs()

    return () => {
      isMounted = false
    }
  }, [user, loadOrganizations])

  const switchOrganization = useCallback((orgId: string) => {
    if (!user) return

    const membership = memberships.find((m) => m.organization_id === orgId)
    if (membership) {
      setCurrentOrganization(membership.organization)
      setCurrentRole(membership.role)
      localStorage.setItem(getStorageKey(user.id), orgId)
    } else {
      console.warn('[OrganizationContext] Attempted to switch to invalid organization ID:', orgId)
    }
  }, [user, memberships, getStorageKey])

  const refreshOrganizations = useCallback(async () => {
    if (!user) return
    await loadOrganizations(user.id, currentOrganization?.id)
  }, [user, loadOrganizations, currentOrganization])

  const createOrganization = useCallback(async (name: string): Promise<{ organization: Organization | null; error: Error | null }> => {
    if (!user) {
      return { organization: null, error: new Error('User must be authenticated to create an organization.') }
    }

    try {
      setLoading(true)
      setError(null)

      // Insert organization with owner_id = user.id
      // Database trigger automatically inserts the owner membership
      const { data, error: insertError } = await supabase
        .from('organizations')
        .insert({
          name: name.trim(),
          owner_id: user.id,
        })
        .select('id, name, owner_id, created_at, updated_at')
        .single()

      if (insertError) {
        throw new Error(insertError.message)
      }

      // Reload organizations and explicitly select newly created organization
      await loadOrganizations(user.id, data.id)

      return { organization: data as Organization, error: null }
    } catch (err: unknown) {
      const errObj = err instanceof Error ? err : new Error('Failed to create organization')
      setError(errObj.message)
      return { organization: null, error: errObj }
    } finally {
      setLoading(false)
    }
  }, [user, loadOrganizations])

  const value: OrganizationContextValue = {
    organizations,
    memberships,
    currentOrganization,
    currentRole,
    loading,
    error,
    createOrganization,
    switchOrganization,
    refreshOrganizations,
  }

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  )
}
