import { useState, useRef, useEffect } from 'react'
import type { FC } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LogOut,
  Settings,
  Users,
  Building2,
  Check,
  User,
} from 'lucide-react'
import { useAuth } from '../../features/auth/hooks/useAuth.ts'
import { useOrganization } from '../../features/organizations/hooks/useOrganization.ts'

export const ProfileButton: FC = () => {
  const { user, signOut, loading: authLoading } = useAuth()
  const {
    currentOrganization,
    currentRole,
    memberships,
    switchOrganization,
  } = useOrganization()

  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const userEmail = user?.email || 'User'
  const displayName = user?.email?.split('@')[0] || 'User'
  const userInitial = (user?.email?.[0] || 'U').toUpperCase()

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsOpen(false)
    await signOut()
    navigate('/login')
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Avatar Button with green online status dot */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User Profile Menu"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-500 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-transform hover:scale-105 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        <span>{userInitial}</span>
        {/* Active status dot */}
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-950" />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 shadow-2xl backdrop-blur-xl z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Info */}
          <div className="px-3 py-2.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 text-xs font-bold text-white">
                {userInitial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-100 truncate capitalize">
                  {displayName}
                </p>
                <p className="text-[11px] text-slate-400 truncate" title={userEmail}>
                  {userEmail}
                </p>
              </div>
            </div>

            {/* Role & Workspace badge */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded-lg border border-slate-800">
              <span className="truncate max-w-[120px]">
                {currentOrganization?.name || 'Workspace'}
              </span>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-bold text-indigo-300 capitalize">
                {currentRole || 'Member'}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1.5 space-y-0.5">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <User className="h-4 w-4 text-indigo-400" />
              <span>My Profile</span>
            </Link>

            <Link
              to="/companies"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Building2 className="h-4 w-4 text-slate-400" />
              <span>Companies Hub</span>
            </Link>

            <Link
              to="/team"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Users className="h-4 w-4 text-slate-400" />
              <span>Team Members</span>
            </Link>

            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-slate-300 hover:bg-slate-900 hover:text-white transition-colors"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Workspace Settings</span>
            </Link>
          </div>

          {/* Workspace Switcher if multiple */}
          {memberships.length > 1 && (
            <div className="border-t border-slate-800/80 py-1.5">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Switch Workspace
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {memberships.map((m) => {
                  const isSelected = m.organization_id === currentOrganization?.id
                  return (
                    <button
                      key={m.organization_id}
                      type="button"
                      onClick={() => {
                        switchOrganization(m.organization_id)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600/15 text-indigo-300 font-medium'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{m.organization.name}</span>
                      </div>
                      {isSelected && <Check className="h-3 w-3 text-indigo-400 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Logout */}
          <div className="border-t border-slate-800/80 pt-1.5">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={authLoading}
              className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-xs"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
