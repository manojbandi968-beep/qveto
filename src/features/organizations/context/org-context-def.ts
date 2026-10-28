import { createContext } from 'react'
import type { OrganizationContextValue } from '../types.ts'

export const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)
