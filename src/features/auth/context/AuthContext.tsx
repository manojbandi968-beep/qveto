import { useEffect, useState } from 'react'
import type { FC, ReactNode } from 'react'
import type { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase.ts'
import { AuthContext } from './auth-context-def.ts'
import type { AuthContextValue } from './auth-types.ts'

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    // 1. Restore existing session on initial load
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('[Auth] Error getting initial session:', error.message)
        }
        if (isMounted) {
          setSession(data.session)
          setUser(data.session?.user ?? null)
        }
      } catch (err) {
        console.error('[Auth] Unexpected error resolving session:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // 2. Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (isMounted) {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (!error) {
        setSession(null)
        setUser(null)
      }
      return { error }
    } catch (err) {
      return { error: err as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const value: AuthContextValue = {
    user,
    session,
    loading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
