import { createContext } from 'react'
import type { AuthContextValue } from './auth-types.ts'

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
