import type { FC } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutGrid,
  FolderKanban,
  CheckSquare,
  Users,
  Settings,
  Layers,
  LogOut,
  Plus,
  X,
} from 'lucide-react'
import { useAuth } from '../../features/auth/hooks/useAuth.ts'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

const navItems = [
  { name: 'Dashboard', to: '/dashboard', icon: LayoutGrid },
  { name: 'Projects', to: '/projects', icon: FolderKanban },
  { name: 'Tasks', to: '/tasks', icon: CheckSquare },
  { name: 'Team', to: '/team', icon: Users },
  { name: 'Settings', to: '/settings', icon: Settings },
]

export const Sidebar: FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { signOut, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slim Icon Rail Sidebar matching the reference design */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-20 flex-col items-center justify-between border-r border-slate-800/80 bg-slate-950/95 py-5 backdrop-blur-xl transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Brand Logo */}
        <div className="flex flex-col items-center gap-6">
          <Link
            to="/dashboard"
            title="ProjectFlow Home"
            className="group flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:scale-110 active:scale-95"
          >
            <Layers className="h-6 w-6" />
          </Link>

          {/* Close button on mobile only */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white lg:hidden cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}

          {/* Navigation Icon List */}
          <nav className="flex flex-col items-center gap-3 pt-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  onClick={onClose}
                  title={item.name}
                  className={({ isActive }) =>
                    `group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 shadow-md shadow-indigo-500/10'
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${
                          isActive ? 'text-indigo-400' : 'text-slate-400'
                        }`}
                      />
                      {/* Tooltip on hover */}
                      <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 shadow-xl group-hover:block">
                        {item.name}
                      </span>
                    </>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* Center/Lower Action: Quick Action Button (styled like the vibrant button in the reference image) */}
        <div className="flex flex-col items-center gap-4">
          <Link
            to="/projects"
            title="Create / View Projects"
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/30 transition-transform hover:scale-110 active:scale-95"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90 duration-200" />
            <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-medium text-slate-200 shadow-xl group-hover:block">
              Quick Action / Projects
            </span>
          </Link>

          {/* Bottom: Sign Out Icon Button */}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={authLoading}
            title="Sign Out"
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-5 w-5 transition-transform group-hover:scale-110" />
            <span className="pointer-events-none absolute left-14 z-50 hidden whitespace-nowrap rounded-lg bg-slate-900 border border-slate-800 px-2.5 py-1 text-xs font-medium text-rose-300 shadow-xl group-hover:block">
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </>
  )
}
