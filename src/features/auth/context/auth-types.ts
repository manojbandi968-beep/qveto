import type { User, Session, AuthError } from '@supabase/supabase-js'

export interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<{ error: AuthError | null }>
}
