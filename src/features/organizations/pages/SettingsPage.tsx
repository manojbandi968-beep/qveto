import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings,
  Building2,
  ShieldCheck,
  User,
  Copy,
  Check,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../hooks/useOrganization.ts'

export const SettingsPage: FC = () => {
  const { user } = useAuth()
  const {
    currentOrganization,
    currentRole,
    memberships,
    switchOrganization,
    refreshOrganizations,
  } = useOrganization()

  const [orgName, setOrgName] = useState(currentOrganization?.name || '')
  const [prevOrgId, setPrevOrgId] = useState(currentOrganization?.id)

  if (currentOrganization && currentOrganization.id !== prevOrgId) {
    setPrevOrgId(currentOrganization.id)
    setOrgName(currentOrganization.name)
  }

  const [isSaving, setIsSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleCopy = (text: string, key: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleUpdateName = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (currentRole !== 'owner') {
      setErrorMsg('Only organization owners can rename the workspace.')
      return
    }

    const trimmed = orgName.trim()
    if (!trimmed || trimmed.length < 2) {
      setErrorMsg('Workspace name must be at least 2 characters.')
      return
    }

    if (!currentOrganization) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: trimmed })
        .eq('id', currentOrganization.id)

      if (error) throw error

      await refreshOrganizations()
      setSuccessMsg('Workspace name updated successfully!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to update workspace name.')
    } finally {
      setIsSaving(false)
    }
  }

  const isOwner = currentRole === 'owner'

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
          <Settings className="h-7 w-7 text-indigo-400" />
          <span>Workspace Settings</span>
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage workspace profile, account authentication, and organization preferences.
        </p>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Workspace Profile */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Organization Profile</h2>
            <p className="text-xs text-slate-400">
              Workspace identifier and naming details
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateName} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Workspace Name
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                disabled={!isOwner}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-950 px-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {isOwner && (
                <button
                  type="submit"
                  disabled={isSaving || orgName.trim() === currentOrganization?.name}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                </button>
              )}
            </div>
            {!isOwner && (
              <p className="text-[11px] text-slate-500 mt-1">
                Only workspace Owners can edit the organization name.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Organization ID (UUID)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={currentOrganization?.id || ''}
                className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-950/70 px-3 text-xs text-slate-400 font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() =>
                  currentOrganization?.id && handleCopy(currentOrganization.id, 'org-id')
                }
                title="Copy Organization ID"
                className="h-9 px-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
              >
                {copiedKey === 'org-id' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Section 2: Account Details */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Your Account</h2>
            <p className="text-xs text-slate-400">
              Personal authentication and role assignment
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Signed-in Email
            </label>
            <input
              type="text"
              readOnly
              value={user?.email || ''}
              className="w-full h-9 rounded-lg border border-slate-800 bg-slate-950/70 px-3 text-xs text-slate-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Your User ID (UID)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={user?.id || ''}
                className="flex-1 h-9 rounded-lg border border-slate-800 bg-slate-950/70 px-3 text-xs text-slate-400 font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => user?.id && handleCopy(user.id, 'user-id')}
                title="Copy User ID"
                className="h-9 px-3 rounded-lg border border-slate-800 bg-slate-950 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs"
              >
                {copiedKey === 'user-id' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Give this ID to other organization owners to add you to their workspaces.
            </p>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-300">Your Current Role:</span>
            </div>
            <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-300 uppercase tracking-wide">
              {currentRole || 'Member'}
            </span>
          </div>
        </div>
      </div>

      {/* Section 3: Switch or Create Organization */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-sm font-semibold text-white">Your Organizations</h2>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create new workspace</span>
          </Link>
        </div>

        <div className="space-y-2">
          {memberships.map((m) => {
            const isSelected = m.organization_id === currentOrganization?.id
            return (
              <div
                key={m.organization_id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-500/40 bg-indigo-950/20'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className={`h-4 w-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className="text-xs font-semibold text-slate-200">
                    {m.organization.name}
                  </span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400 capitalize">
                    {m.role}
                  </span>
                </div>

                {isSelected ? (
                  <span className="text-xs font-medium text-indigo-400 flex items-center gap-1">
                    <Check className="h-3.5 w-3.5" />
                    <span>Active</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => switchOrganization(m.organization_id)}
                    className="text-xs font-medium text-slate-400 hover:text-white px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
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
