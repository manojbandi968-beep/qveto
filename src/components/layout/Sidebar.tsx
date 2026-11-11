import type { FC } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  CheckSquare,
  FolderKanban,
  BarChart3,
  Users,
  UserCheck,
  Layers,
  LogOut,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react'
import { useAuth } from '../../features/auth/hooks/useAuth.ts'
import { useOrganization } from '../../features/organizations/hooks/useOrganization.ts'

interface SidebarProps {
  isExpanded: boolean
  onToggleExpand: () => void
  isMobileOpen?: boolean
  onCloseMobile?: () => void
}

// Exactly matching the requested architecture and order:
// 1. Companies Hub
// 2. My Work (about our tasks)
// 3. Projects
// 4. Reports & Analytics
// 5. Team Members
// 6. My Profile (below team in navbar)
const navItems = [
  { name: 'Companies Hub', to: '/companies', icon: Building2 },
  { name: 'My Work', to: '/my-work', icon: CheckSquare },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Reports & Analytics', to: '/analytics', icon: BarChart3 },
  { name: 'Team Members', to: '/team', icon: Users },
  { name: 'My Profile', to: '/profile', icon: UserCheck },
]

export const Sidebar: FC<SidebarProps> = ({
  isExpanded,
  onToggleExpand,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const { signOut, loading: authLoading } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const showExpanded = isExpanded

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col justify-between border-slate-800/80 bg-slate-950/95 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static ${
          isMobileOpen
            ? 'w-64 translate-x-0 border-r p-5 shadow-2xl'
            : '-translate-x-full lg:translate-x-0 ' +
              (showExpanded
                ? 'lg:w-64 border-r p-5 shadow-xl'
                : 'lg:w-20 border-r py-5 px-3 items-center')
        }`}
      >
        {/* ========================================================================= */}
        {/* TOP SECTION: BRAND LOGO + OPTIONAL WORKSPACE */}
        {/* ========================================================================= */}
        <div className={`flex flex-col w-full ${showExpanded ? '' : 'items-center'}`}>
          {showExpanded ? (
            <div className="flex items-center justify-between w-full">
              <Link
                to="/companies"
                onClick={onCloseMobile}
                className="flex items-center gap-3 group"
                aria-label="ProjectFlow Home"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 transition-transform group-hover:scale-105 active:scale-95">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-base text-white tracking-tight">
                      ProjectFlow
                    </span>
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300">
                      v0.1
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium truncate">
                    Team Collaboration
                  </span>
                </div>
              </Link>

              {/* Close button on mobile only */}
              {onCloseMobile && (
                <button
                  type="button"
                  onClick={onCloseMobile}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          ) : (
            <Link
              to="/companies"
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 active:scale-95"
              aria-label="ProjectFlow Home"
            >
              <Layers className="h-6 w-6" />
            </Link>
          )}

          {/* Active Workspace Info (visible when expanded) */}
          {showExpanded && currentOrganization && (
            <div className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Our Organization</span>
                </span>
                {currentRole && (
                  <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300 capitalize">
                    {currentRole}
                  </span>
                )}
              </div>
              <p className="mt-1 font-bold text-sm text-white truncate">
                {currentOrganization.name}
              </p>
            </div>
          )}

          {/* Section Heading */}
          {showExpanded && (
            <div className="pt-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
              Navigation
            </div>
          )}

          {/* ========================================================================= */}
          {/* NAVIGATION LINKS: COMPANIES HUB, MY WORK, PROJECTS, ANALYTICS, TEAM, PROFILE */}
          {/* ========================================================================= */}
          <nav
            className={`flex flex-col w-full gap-1.5 ${
              showExpanded ? 'pt-1' : 'pt-5 items-center'
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onCloseMobile}
                  aria-label={item.name}
                  className={({ isActive }) =>
                    `group flex items-center transition-all duration-200 cursor-pointer ${
                      showExpanded
                        ? `w-full gap-3 px-3.5 py-2.5 rounded-xl ${
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold shadow-sm shadow-indigo-500/10'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                          }`
                        : `h-11 w-11 justify-center rounded-2xl ${
                            isActive
                              ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-md shadow-indigo-500/10'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-5 w-5 shrink-0 transition-transform duration-200 ${
                          isActive
                            ? 'text-indigo-400'
                            : 'text-slate-400 group-hover:scale-110 group-hover:text-slate-200'
                        }`}
                      />
                      {showExpanded && (
                        <span className="text-sm font-medium tracking-wide">
                          {item.name}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>

          {/* ========================================================================= */}
          {/* TOGGLE EXPAND/COLLAPSE BUTTON: BELOW PROFILE */}
          {/* ========================================================================= */}
          <div className={`w-full pt-3 ${showExpanded ? '' : 'flex justify-center'}`}>
            {showExpanded ? (
              <button
                type="button"
                onClick={onToggleExpand}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 cursor-pointer"
                aria-label="Collapse navigation"
              >
                <span className="text-xs font-semibold text-slate-300">Collapse sidebar</span>
                <ChevronLeft className="h-4 w-4 text-indigo-400" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleExpand}
                className="group flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/60 text-indigo-400 hover:text-white hover:border-indigo-500/50 hover:bg-indigo-600/20 transition-all duration-200 cursor-pointer shadow-sm shadow-indigo-500/10"
                aria-label="Open navigation menu"
              >
                <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: SIGN OUT */}
        {/* ========================================================================= */}
        <div
          className={`w-full pt-4 border-t border-slate-800/60 ${
            showExpanded ? 'flex flex-col gap-2' : 'flex justify-center'
          }`}
        >
          {showExpanded ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authLoading}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/20 border border-transparent transition-all cursor-pointer"
              aria-label="Sign Out"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="text-xs font-semibold">Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authLoading}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
              aria-label="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
