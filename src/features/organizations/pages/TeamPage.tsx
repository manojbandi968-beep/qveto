import { useState, useEffect, useCallback } from 'react'
import type { FC, FormEvent } from 'react'
import {
  Users,
  ShieldCheck,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  UserPlus,
  Crown,
  Shield,
  User,
  Info,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../hooks/useOrganization.ts'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import type { OrganizationRole } from '../types.ts'

interface MemberWithProfile {
  id: string
  organization_id: string
  user_id: string
  role: OrganizationRole
  created_at: string
}

export const TeamPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Add Member Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [targetRole, setTargetRole] = useState<OrganizationRole>('member')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const orgId = currentOrganization?.id
  const currentUserId = user?.id
  const isOwner = currentRole === 'owner'
  const isManager = currentRole === 'manager'
  const canManageMembers = isOwner || isManager

  const fetchMembers = useCallback(async (activeOrgId: string) => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('created_at', { ascending: true })

      if (fetchErr) throw fetchErr
      setMembers((data as MemberWithProfile[]) || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const sync = async () => {
      if (!orgId) {
        if (isMounted) setLoading(false)
        return
      }
      await fetchMembers(orgId)
    }

    void sync()

    return () => {
      isMounted = false
    }
  }, [orgId, fetchMembers])

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault()
    setModalError(null)

    const cleanUserId = targetUserId.trim()
    if (!cleanUserId) {
      setModalError('Please enter a User ID (UUID).')
      return
    }

    if (!orgId) return

    setIsSubmitting(true)
    try {
      const { data, error: insertErr } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: cleanUserId,
          role: targetRole,
        })
        .select()
        .single()

      if (insertErr) {
        if (insertErr.code === '23505') {
          throw new Error('This user is already a member of this workspace.')
        }
        if (insertErr.code === '23503') {
          throw new Error('No user found with this User ID. Please check the UID from Supabase Auth.')
        }
        throw insertErr
      }

      setMembers((prev) => [...prev, data as MemberWithProfile])
      setSuccessMessage(`Team member successfully added with role "${targetRole}".`)
      setIsModalOpen(false)
      setTargetUserId('')
      setTargetRole('member')
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Failed to add member.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: OrganizationRole) => {
    if (!isOwner) return

    try {
      const { error: updateErr } = await supabase
        .from('organization_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (updateErr) throw updateErr

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      )
      setSuccessMessage('Member role updated.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role.')
    }
  }

  const handleRemoveMember = async (member: MemberWithProfile) => {
    if (!isOwner) return
    if (member.user_id === currentUserId) {
      setError('You cannot remove yourself from your own organization.')
      return
    }

    if (!confirm('Are you sure you want to remove this member from the organization?')) {
      return
    }

    try {
      const { error: deleteErr } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', member.id)

      if (deleteErr) throw deleteErr

      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      setSuccessMessage('Member removed from workspace.')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.')
    }
  }

  if (loading && members.length === 0) {
    return <LoadingScreen message="Loading workspace team members..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
            <Users className="h-7 w-7 text-indigo-400" />
            <span>Team Members</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Manage organization members, workspace roles, and collaboration permissions in{' '}
            <span className="text-slate-200 font-medium">
              {currentOrganization?.name || 'your workspace'}
            </span>
            .
          </p>
        </div>

        {canManageMembers && (
          <button
            type="button"
            onClick={() => {
              setModalError(null)
              setIsModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Member Count & Overview Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">
              {members.length} {members.length === 1 ? 'Active Member' : 'Active Members'}
            </h2>
            <p className="text-xs text-slate-400">
              Workspace access is enforced by PostgreSQL Row Level Security (RLS).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>Your Role:</span>
          <span className="font-semibold text-indigo-300 capitalize">{currentRole || 'Member'}</span>
        </div>
      </div>

      {/* Members Directory */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Workspace Members Directory</h2>
          <span className="text-xs text-slate-500">ID &amp; Role Mappings</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {members.map((member) => {
            const isMe = member.user_id === currentUserId
            const roleBadgeConfig = {
              owner: {
                bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                icon: Crown,
              },
              manager: {
                bg: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
                icon: Shield,
              },
              member: {
                bg: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
                icon: User,
              },
            }[member.role] || {
              bg: 'bg-slate-800 text-slate-400 border-slate-700',
              icon: User,
            }

            const RoleIcon = roleBadgeConfig.icon

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-slate-900/60 transition-colors"
              >
                {/* Left: Avatar & Identity */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-sm font-bold text-white shadow-md shadow-indigo-500/20">
                    {isMe ? (user?.email?.[0] || 'U').toUpperCase() : 'M'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100 truncate">
                        {isMe ? user?.email : `Team Member`}
                      </span>
                      {isMe && (
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-bold text-indigo-300">
                          You
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
                      <span>UID: {member.user_id.slice(0, 16)}...</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(member.user_id, member.id)}
                        title="Copy User ID"
                        className="hover:text-slate-300 transition-colors"
                      >
                        {copiedId === member.id ? (
                          <Check className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Role selection & actions */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  {isOwner && !isMe ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        handleRoleChange(member.id, e.target.value as OrganizationRole)
                      }
                      className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none cursor-pointer"
                    >
                      <option value="member">Member</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold capitalize ${roleBadgeConfig.bg}`}
                    >
                      <RoleIcon className="h-3.5 w-3.5" />
                      <span>{member.role}</span>
                    </span>
                  )}

                  {isOwner && !isMe && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      title="Remove member from workspace"
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Add Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-white">Add Team Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs text-indigo-300 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-indigo-400" />
              <span>
                Enter the teammate&apos;s User ID (UID) from your Supabase Authentication table to
                link them to this organization.
              </span>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Teammate User ID (UUID)
                </label>
                <input
                  type="text"
                  required
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  placeholder="e.g. 9f770804-2c02-4968-bacf-1cbff1580f34"
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Workspace Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value as OrganizationRole)}
                  className="w-full h-9 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  <option value="member">Member (Can view projects and edit assigned tasks)</option>
                  <option value="manager">Manager (Can create projects and manage all tasks)</option>
                  {isOwner && <option value="owner">Owner (Full administrative rights)</option>}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <span>Add Member</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
