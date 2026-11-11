import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import {
  User,
  Mail,
  Building2,
  Copy,
  Check,
  LogOut,
  Edit2,
  CheckCircle2,
  Key,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../hooks/useOrganization.ts'
import { useNavigate } from 'react-router-dom'

export const ProfilePage: FC = () => {
  const { user, signOut, loading: authLoading } = useAuth()
  const { currentOrganization, currentRole, memberships, switchOrganization } = useOrganization()
  const navigate = useNavigate()

  const [displayName, setDisplayName] = useState(
    user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teammate'
  )
  const [isEditingName, setIsEditingName] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [copiedId, setCopiedId] = useState(false)

  const handleCopyId = () => {
    if (!user) return
    void navigator.clipboard.writeText(user.id)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
  }

  const handleSaveName = (e: FormEvent) => {
    e.preventDefault()
    setIsEditingName(false)
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = (user?.email || 'PF')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="space-y-8 max-w-4xl pb-12">
      {/* Toast */}
      {savedSuccess && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-xs text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Profile display name updated!</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <User className="h-7 w-7 text-indigo-400" />
          <span>My Profile</span>
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-400">
          Personal account details, workspace role permissions, and active memberships.
        </p>
      </div>

      {/* Hero Profile Card */}
      <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-2xl font-black text-white shadow-xl shadow-indigo-500/30">
                {initials}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950">
                <span className="h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white">{displayName}</h2>
                {currentRole && (
                  <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-bold text-indigo-300 capitalize">
                    {currentRole === 'owner' ? '👑 Workspace Owner' : `${currentRole} Role`}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5 font-mono">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                <span>{user?.email}</span>
              </p>

              {currentOrganization && (
                <p className="text-xs text-indigo-400 flex items-center gap-1.5 pt-0.5 font-medium">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>Active Workspace: {currentOrganization.name}</span>
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={authLoading}
            className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Account Info & Display Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-400" />
            <span>Profile Details</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">Display Name</span>
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs"
                  >
                    Save
                  </button>
                </form>
              ) : (
                <div className="flex items-center justify-between mt-1 text-slate-200 font-semibold bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <span>{displayName}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <span className="text-slate-500 font-medium">Email Address (Supabase Auth)</span>
              <div className="mt-1 text-slate-200 font-semibold bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 font-mono">
                {user?.email}
              </div>
            </div>

            <div>
              <span className="text-slate-500 font-medium">User Unique ID (UUID)</span>
              <div className="mt-1 flex items-center justify-between text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px]">
                <span className="truncate pr-2">{user?.id}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="text-slate-400 hover:text-white"
                >
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-indigo-400" />
            <span>Security &amp; Permissions</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <span className="font-semibold text-slate-200">Role-Based Access Level</span>
              <p className="text-[11px] text-slate-400">
                You are currently acting with{' '}
                <strong className="text-indigo-300 capitalize">{currentRole || 'member'}</strong> permissions in{' '}
                {currentOrganization?.name}.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <span className="font-semibold text-slate-200">Authentication Protocol</span>
              <p className="text-[11px] text-slate-400">
                Secured via Supabase PostgreSQL Row Level Security (RLS) policies with JWT token isolation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-1">
              <span className="font-semibold text-slate-200">Last Session Login</span>
              <p className="text-[11px] text-slate-400">
                {user?.last_sign_in_at
                  ? new Date(user.last_sign_in_at).toLocaleString()
                  : 'Active authenticated session'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Workspace Memberships */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Building2 className="h-4 w-4 text-indigo-400" />
          <span>My Company Workspaces ({memberships.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memberships.map((m) => {
            const isCurrent = m.organization_id === currentOrganization?.id
            return (
              <div
                key={m.id}
                className={`rounded-2xl border p-4 flex items-center justify-between ${
                  isCurrent
                    ? 'border-indigo-500 bg-indigo-950/20'
                    : 'border-slate-800 bg-slate-900/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{m.organization.name}</span>
                    <span className="rounded bg-slate-800 px-2 py-0.2 text-[10px] font-semibold text-indigo-400 capitalize">
                      {m.role}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    ID: {m.organization_id.slice(0, 8)}...
                  </span>
                </div>

                {isCurrent ? (
                  <span className="text-xs font-semibold text-emerald-400">Active</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchOrganization(m.organization_id)}
                    className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white"
                  >
                    Switch
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
