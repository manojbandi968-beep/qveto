import type { FC } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth.ts'
import { LoadingScreen } from '../components/common/LoadingScreen.tsx'

export const ProtectedRoute: FC = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <LoadingScreen message="Authenticating session..." />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
