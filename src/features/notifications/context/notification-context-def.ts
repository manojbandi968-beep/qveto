import { createContext } from 'react'
import type { NotificationContextValue } from '../types.ts'

export const NotificationContext = createContext<NotificationContextValue | null>(null)

