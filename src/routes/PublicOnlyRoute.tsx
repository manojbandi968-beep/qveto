import type { FC } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/hooks/useAuth.ts'
import { LoadingScreen } from '../components/common/LoadingScreen.tsx'

export const PublicOnlyRoute: FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="Checking session..." />
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
