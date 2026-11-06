import type { FC } from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout.tsx'
import { AuthLayout } from '../components/layout/AuthLayout.tsx'
import { LoginPage } from '../features/auth/pages/LoginPage.tsx'
import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.tsx'
import { ProjectsPage } from '../features/projects/pages/ProjectsPage.tsx'
import { ProjectDetailsPage } from '../features/projects/pages/ProjectDetailsPage.tsx'
import { OnboardingPage } from '../features/organizations/pages/OnboardingPage.tsx'
import { LandingPage } from '../features/landing/pages/LandingPage.tsx'
import { ProtectedRoute } from './ProtectedRoute.tsx'
import { RequireOrganization } from './RequireOrganization.tsx'
import { PublicOnlyRoute } from './PublicOnlyRoute.tsx'
import { AlertCircle, ArrowLeft } from 'lucide-react'

const NotFoundPage: FC = () => {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-4">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold text-white">404 - Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-400 max-w-sm">
        The route you are looking for does not exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  )
}

export const AppRoutes: FC = () => {
  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingPage />} />

      {/* Authenticated Routes */}
      <Route element={<ProtectedRoute />}>
        {/* Onboarding flow */}
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Workspace views requiring an active organization */}
        <Route element={<RequireOrganization />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Public-Only Auth Routes (redirect to /dashboard if logged in) */}
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
