import { useContext } from 'react'
import { OrganizationContext } from '../context/org-context-def.ts'
import type { OrganizationContextValue } from '../types.ts'

export const useOrganization = (): OrganizationContextValue => {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}
