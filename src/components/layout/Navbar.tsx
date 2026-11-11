import type { FC } from 'react'
import { Building2, Menu } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { useOrganization } from '../../features/organizations/hooks/useOrganization.ts'
import { NotificationCenter } from '../../features/notifications/index.ts'
import { ThemeToggle } from './ThemeToggle.tsx'
import { ProfileButton } from './ProfileButton.tsx'

interface NavbarProps {
  onOpenMobile?: () => void
}

export const Navbar: FC<NavbarProps> = ({ onOpenMobile }) => {
  const { currentOrganization, currentRole } = useOrganization()
  const location = useLocation()

  // Derive dynamic page title based on active pathname
  const getPageTitle = () => {
    const path = location.pathname
    if (path.startsWith('/companies')) return 'Companies Hub'
    if (path.startsWith('/my-work')) return 'My Work'
    if (path.startsWith('/projects/') && path !== '/projects') return 'Project Details'
    if (path.startsWith('/projects')) return 'Projects'
    if (path.startsWith('/analytics') || path.startsWith('/dashboard')) return 'Reports & Analytics'
    if (path.startsWith('/team')) return 'Team Members'
    if (path.startsWith('/profile')) return 'My Profile'
    if (path.startsWith('/settings')) return 'Settings'
    return 'Dashboard'
  }

  const pageTitle = getPageTitle()

  return (
    <header className="sticky top-0 z-30 flex h-20 w-full items-center justify-between border-b border-slate-800/60 bg-slate-950/80 px-4 sm:px-8 backdrop-blur-xl transition-colors">
      {/* Left: Mobile-only trigger & Page Title (NO button beside it on desktop) */}
      <div className="flex items-center gap-3 sm:gap-4">
        {onOpenMobile && (
          <button
            type="button"
            onClick={onOpenMobile}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white lg:hidden cursor-pointer"
            aria-label="Open mobile navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {pageTitle}
            </h1>

            {/* Active Workspace Pill */}
            {currentOrganization && (
              <div className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                <span className="font-semibold text-slate-200">
                  {currentOrganization.name}
                </span>
                {currentRole && (
                  <span className="ml-1 rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300 capitalize">
                    {currentRole}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle + Notifications + Profile Button */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Dark / Light Theme Toggle Switch */}
        <ThemeToggle />

        {/* Notifications Center with Bell icon and badge */}
        <NotificationCenter />

        {/* Profile Avatar Button with status indicator dot & dropdown */}
        <ProfileButton />
      </div>
    </header>
  )
}
