import type { FC } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Settings,
  Layers,
  LogOut,
  X,
  Loader2,
  Building2,
  Plus,
} from 'lucide-react'
import { useAuth } from '../../features/auth/hooks/useAuth.ts'
import { useOrganization } from '../../features/organizations/hooks/useOrganization.ts'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Tasks', to: '/tasks', icon: CheckSquare },
  { name: 'Team', to: '/team', icon: Users },
  { name: 'Settings', to: '/settings', icon: Settings },
]

export const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { user, signOut, loading: authLoading } = useAuth()
  const { currentOrganization, currentRole, memberships } = useOrganization()
  const navigate = useNavigate()

  const userEmail = user?.email || 'User'
  const userInitial = (user?.email?.[0] || 'U').toUpperCase()
  const displayName = user?.email?.split('@')[0] || 'Workspace Member'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/60">
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                ProjectFlow
                <span className="rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                  v0.1
                </span>
              </span>
              <p className="text-[11px] text-slate-400">Team Collaboration</p>
            </div>
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-900 hover:text-slate-200 lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Active Organization Card */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                <span>Active Workspace</span>
              </span>
              {currentRole && (
                <span className="rounded bg-indigo-500/15 border border-indigo-500/25 px-1.5 py-0.2 text-[9px] font-medium text-indigo-300 capitalize">
                  {currentRole}
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-white truncate">
              {currentOrganization?.name || 'Loading organization...'}
            </p>
            {memberships.length > 1 && (
              <p className="text-[10px] text-slate-500">
                Member of {memberships.length} organizations
              </p>
            )}
          </div>

          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Navigation</span>
              <Link
                to="/onboarding"
                title="Create another organization"
                className="text-slate-500 hover:text-indigo-400 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
              </Link>
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.name}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 shadow-xs'
                          : 'text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`h-4 w-4 transition-colors ${
                              isActive
                                ? 'text-indigo-400'
                                : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          <span>{item.name}</span>
                        </div>
                      </>
                    )}
                  </NavLink>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Bottom user footer with real logout */}
        <div className="border-t border-slate-800/80 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-500 text-sm font-semibold text-white">
                {userInitial}
              </div>
              <div className="text-left text-xs min-w-0 flex-1">
                <p className="font-medium text-slate-200 truncate capitalize">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate" title={userEmail}>
                  {userEmail}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authLoading}
              title="Sign Out"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-rose-400 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {authLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
