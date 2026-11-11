import type { FC } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout.tsx'
import { AuthLayout } from '../components/layout/AuthLayout.tsx'
import { LoginPage } from '../features/auth/pages/LoginPage.tsx'
import { RegisterPage } from '../features/auth/pages/RegisterPage.tsx'
import { CompaniesHubPage } from '../features/organizations/pages/CompaniesHubPage.tsx'
import { MyWorkPage } from '../features/tasks/pages/MyWorkPage.tsx'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage.tsx'
import { ProjectsPage } from '../features/projects/pages/ProjectsPage.tsx'
import { ProjectDetailsPage } from '../features/projects/pages/ProjectDetailsPage.tsx'
import { TeamPage } from '../features/organizations/pages/TeamPage.tsx'
import { ProfilePage } from '../features/organizations/pages/ProfilePage.tsx'
import { SettingsPage } from '../features/organizations/pages/SettingsPage.tsx'
import { OnboardingPage } from '../features/organizations/pages/OnboardingPage.tsx'
import { AcceptInvitePage } from '../features/organizations/pages/AcceptInvitePage.tsx'
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
        to="/companies"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Return to Companies Hub</span>
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

        {/* Accept workspace invitation flow */}
        <Route path="/invite/:inviteId" element={<AcceptInvitePage />} />

        {/* Workspace views requiring an active organization */}
        <Route element={<RequireOrganization />}>
          <Route element={<AppLayout />}>
            {/* 1. Companies Hub */}
            <Route path="/companies" element={<CompaniesHubPage />} />

            {/* 2. My Work (about our tasks) */}
            <Route path="/my-work" element={<MyWorkPage />} />
            <Route path="/tasks" element={<Navigate to="/my-work" replace />} />

            {/* 3. Projects */}
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:projectId" element={<ProjectDetailsPage />} />

            {/* 4. Reports & Analytics */}
            <Route path="/analytics" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* 5. Team Members */}
            <Route path="/team" element={<TeamPage />} />

            {/* 6. My Profile */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Additional Settings */}
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Public-Only Auth Routes (redirect to /companies if logged in) */}
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
