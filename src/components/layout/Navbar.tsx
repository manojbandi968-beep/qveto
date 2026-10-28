import { useState, useRef, useEffect } from 'react'
import type { FC } from 'react'
import { Search, Plus, Menu, ChevronDown, LogOut, Check, Building2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/hooks/useAuth.ts'
import { useOrganization } from '../../features/organizations/hooks/useOrganization.ts'
import { NotificationCenter } from '../../features/notifications/index.ts'

interface NavbarProps {
  onToggleSidebar?: () => void
}

export const Navbar: FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, signOut, loading: authLoading } = useAuth()
  const {
    currentOrganization,
    currentRole,
    memberships,
    switchOrganization,
    loading: orgLoading,
  } = useOrganization()

  const navigate = useNavigate()
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  const userInitial = (user?.email?.[0] || 'U').toUpperCase()
  const displayName = user?.email?.split('@')[0] || 'Member'

  // Close switcher on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
        setIsSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 backdrop-blur-md sm:px-6">
      {/* Left section: mobile hamburger & search */}
      <div className="flex items-center gap-3 md:gap-4 flex-1 max-w-lg">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200 lg:hidden cursor-pointer"
            aria-label="Toggle mobile sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="relative w-full">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search projects, tasks, or teammates... (Press /)"
            className="h-9 w-full rounded-lg border border-slate-800 bg-slate-900/60 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500/80 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      {/* Right section: workspace switcher / indicator, quick action, notifications, user avatar */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Workspace Display / Switcher */}
        {orgLoading ? (
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-400">
            <span className="flex h-2 w-2 rounded-full bg-slate-600 animate-pulse" />
            <span>Loading workspace...</span>
          </div>
        ) : !currentOrganization ? (
          <Link
            to="/onboarding"
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-colors"
          >
            <Building2 className="h-3.5 w-3.5" />
            <span>Create Workspace</span>
          </Link>
        ) : memberships.length > 1 ? (
          // Switcher dropdown when user belongs to multiple organizations
          <div className="relative" ref={switcherRef}>
            <button
              type="button"
              onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
              className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label="Switch organization"
            >
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="max-w-[120px] truncate">{currentOrganization.name}</span>
              <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] text-slate-400 capitalize">
                {currentRole}
              </span>
              <ChevronDown className={`h-3 w-3 text-slate-500 transition-transform ${isSwitcherOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-800 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 space-y-1">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Switch Workspace ({memberships.length})
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {memberships.map((m) => {
                    const isSelected = m.organization_id === currentOrganization.id
                    return (
                      <button
                        key={m.organization_id}
                        type="button"
                        onClick={() => {
                          switchOrganization(m.organization_id)
                          setIsSwitcherOpen(false)
                        }}
                        className={`w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/15 text-indigo-300 font-medium border border-indigo-500/20'
                            : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate text-left">
                          <Building2 className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <span className="truncate">{m.organization.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-[10px] text-slate-500 capitalize">{m.role}</span>
                          {isSelected && <Check className="h-3 w-3 text-indigo-400" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="border-t border-slate-800/80 pt-1">
                  <Link
                    to="/onboarding"
                    onClick={() => setIsSwitcherOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-400 hover:bg-indigo-600/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create new workspace</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Single organization display
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/50 px-3 py-1.5 text-xs font-medium text-slate-300">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="max-w-[130px] truncate">{currentOrganization.name}</span>
            <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] text-slate-400 capitalize">
              {currentRole}
            </span>
          </div>
        )}

        {/* Quick New Project Button */}
        <Link
          to="/projects"
          className="hidden sm:inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-500/50 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Project</span>
        </Link>

        {/* Notifications */}
        <NotificationCenter />

        {/* User profile pill with quick logout */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800/80 bg-slate-900/50 p-1 pl-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-tr from-indigo-500 to-violet-500 text-xs font-semibold text-white">
            {userInitial}
          </div>
          <div className="hidden md:block text-left text-xs px-2">
            <p className="font-medium text-slate-200 leading-tight capitalize">{displayName}</p>
            <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            disabled={authLoading}
            title="Log Out"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  )
}
