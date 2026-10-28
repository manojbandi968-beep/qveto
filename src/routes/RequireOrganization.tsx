import type { FC } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useOrganization } from '../features/organizations/hooks/useOrganization.ts'
import { LoadingScreen } from '../components/common/LoadingScreen.tsx'

export const RequireOrganization: FC = () => {
  const { currentOrganization, loading, memberships } = useOrganization()

  if (loading) {
    return <LoadingScreen message="Loading workspace..." />
  }

  if (memberships.length === 0 || !currentOrganization) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
