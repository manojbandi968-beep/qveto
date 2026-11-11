import { useState, useEffect, useCallback } from 'react'
import type { FC, FormEvent } from 'react'
import {
  Users,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Mail,
  Send,
  Crown,
  Shield,
  User,
  X,
  ExternalLink,
  Inbox,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../hooks/useOrganization.ts'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import {
  createInvitation,
} from '../services/invitationsService.ts'
import {
  getJoinRequestsForOrganization,
  updateJoinRequestStatus,
} from '../services/joinRequestsService.ts'
import type { OrganizationRole, OrganizationInvitation, OrganizationJoinRequest } from '../types.ts'

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

  // Join Requests
  const [joinRequests, setJoinRequests] = useState<OrganizationJoinRequest[]>([])

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<OrganizationRole>('member')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteModalError, setInviteModalError] = useState<string | null>(null)

  // Simulated Email Preview Modal
  const [emailPreviewInvite, setEmailPreviewInvite] = useState<OrganizationInvitation | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const orgId = currentOrganization?.id
  const orgName = currentOrganization?.name || 'Workspace'
  const currentUserId = user?.id
  const isOwner = currentRole === 'owner'
  const isManager = currentRole === 'manager'
  const canManageMembers = isOwner || isManager // Admin capabilities

  const showToast = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3500)
  }

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

  const loadRequests = useCallback((activeOrgId: string) => {
    const reqs = getJoinRequestsForOrganization(activeOrgId)
    setJoinRequests(reqs)
  }, [])

  useEffect(() => {
    let isMounted = true
    const sync = async () => {
      if (!orgId) {
        if (isMounted) setLoading(false)
        return
      }
      await fetchMembers(orgId)
      if (isMounted) {
        loadRequests(orgId)
      }
    }
    void sync()
    return () => {
      isMounted = false
    }
  }, [orgId, fetchMembers, loadRequests])

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // 1. Send Email Invitation
  const handleSendInvite = (e: FormEvent) => {
    e.preventDefault()
    setInviteModalError(null)

    const cleanEmail = inviteEmail.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setInviteModalError('Please enter a valid email address.')
      return
    }

    if (!orgId) return

    setIsInviting(true)
    try {
      const invite = createInvitation({
        organizationId: orgId,
        organizationName: orgName,
        invitedByEmail: user?.email || 'admin@company.com',
        recipientEmail: cleanEmail,
        role: inviteRole,
      })

      setIsInviteModalOpen(false)
      setInviteEmail('')
      setInviteRole('member')

      // Open email preview modal to show the simulated email!
      setEmailPreviewInvite(invite)
      showToast(`Invitation email dispatched to ${cleanEmail}!`)
    } catch (err) {
      setInviteModalError(err instanceof Error ? err.message : 'Failed to send invite.')
    } finally {
      setIsInviting(false)
    }
  }

  // 2. Approve Join Request
  const handleApproveJoinRequest = async (request: OrganizationJoinRequest) => {
    if (!canManageMembers || !orgId) return

    try {
      // 1. Insert member into organization in Supabase
      const { error: insertErr } = await supabase
        .from('organization_members')
        .insert({
          organization_id: orgId,
          user_id: request.userId,
          role: 'member',
        })

      if (insertErr && insertErr.code !== '23505') {
        console.warn('Membership insert note:', insertErr.message)
      }

      // 2. Update status in service
      updateJoinRequestStatus(request.id, 'approved')
      setJoinRequests((prev) =>
        prev.map((r) => (r.id === request.id ? { ...r, status: 'approved' } : r))
      )

      await fetchMembers(orgId)
      showToast(`Approved ${request.userName} (${request.userEmail})! They now have employee dashboard access.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve join request.')
    }
  }

  // 3. Decline Join Request
  const handleDeclineJoinRequest = (requestId: string) => {
    if (!canManageMembers) return
    updateJoinRequestStatus(requestId, 'declined')
    setJoinRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'declined' } : r))
    )
    showToast('Join request declined.')
  }

  // 4. Role Change
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
      showToast('Member role updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member role.')
    }
  }

  // 5. Remove Member
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
      showToast('Member removed from workspace.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member.')
    }
  }

  const pendingJoinRequests = joinRequests.filter((r) => r.status === 'pending')

  if (loading && members.length === 0) {
    return <LoadingScreen message="Loading workspace team members..." />
  }

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Toast Alert */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-xs text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
              <Users className="h-7 w-7 text-indigo-400" />
              <span>Team Members</span>
            </h1>

            {canManageMembers ? (
              <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-300">
                Admin Dashboard
              </span>
            ) : (
              <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-400">
                Teammate Dashboard (Employee)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Collaborate with teammates in <strong className="text-slate-200">{orgName}</strong>.
            {canManageMembers
              ? ' As an admin, you can invite teammates by email and review incoming join requests.'
              : ' View your teammates and managers across this workspace.'}
          </p>
        </div>

        {canManageMembers && (
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              <span>Invite Teammate via Email</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. ADMIN JOIN REQUESTS SECTION (ON THE SAME PAGE) */}
      {/* ========================================================================= */}
      {canManageMembers && (
        <div className="rounded-2xl border border-indigo-500/30 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Join Requests</h3>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {pendingJoinRequests.length}
              </span>
            </div>
            <span className="text-xs text-slate-400">
              Users requesting access via Company Directory
            </span>
          </div>

          {pendingJoinRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center text-xs text-slate-500">
              No pending join requests right now. When users find {orgName} in the company search, their requests will appear here for admin approval.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJoinRequests.map((req) => (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{req.userName}</span>
                      <span className="text-xs text-indigo-400 font-mono">({req.userEmail})</span>
                      <span className="rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5">
                        Pending Admin Review
                      </span>
                    </div>
                    {req.note && (
                      <p className="text-xs text-slate-400 italic">&ldquo;{req.note}&rdquo;</p>
                    )}
                    <div className="text-[10px] text-slate-500">
                      Requested on {new Date(req.requestedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleDeclineJoinRequest(req.id)}
                      className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleApproveJoinRequest(req)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Approve Access</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. TEAM MEMBERS LIST */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Active Members ({members.length})</span>
          </h3>
          <span className="text-xs text-slate-400">
            {canManageMembers ? 'Full administration enabled' : 'Teammate view'}
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 divide-y divide-slate-800/60 overflow-hidden shadow-xl">
          {members.map((member) => {
            const isMe = member.user_id === currentUserId
            const roleBadge =
              member.role === 'owner'
                ? { label: 'Owner', bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: Crown }
                : member.role === 'manager'
                ? { label: 'Manager / Admin', bg: 'bg-violet-500/20 text-violet-300 border-violet-500/30', icon: Shield }
                : { label: 'Teammate (Employee)', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: User }

            const Icon = roleBadge.icon

            return (
              <div
                key={member.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 hover:bg-slate-900/80 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700">
                    {member.user_id.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-white">
                        {isMe ? 'You' : `Teammate (${member.user_id.slice(0, 8)})`}
                      </span>
                      {isMe && (
                        <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300">
                          Current Account
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-500">{member.user_id}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(member.user_id, member.id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy User ID"
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

                {/* Right: Role selection / display & actions */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${roleBadge.bg}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{roleBadge.label}</span>
                  </span>

                  {isOwner && !isMe && (
                    <select
                      value={member.role}
                      onChange={(e) => void handleRoleChange(member.id, e.target.value as OrganizationRole)}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="member">Teammate (Member)</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                    </select>
                  )}

                  {isOwner && !isMe && (
                    <button
                      type="button"
                      onClick={() => void handleRemoveMember(member)}
                      className="p-1.5 rounded-lg text-slate-500 hover:bg-rose-500/10 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Remove Member"
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

      {/* ========================================================================= */}
      {/* MODAL 1: INVITE TEAMMATE VIA EMAIL */}
      {/* ========================================================================= */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Invite Teammate via Email</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {inviteModalError && (
              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {inviteModalError}
              </div>
            )}

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Teammate Email Address *</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. colleague@company.com"
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrganizationRole)}
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="member">Teammate / Employee Dashboard (Member)</option>
                  <option value="manager">Manager / Admin (Manager)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Members have full access to tasks, projects, Kanban boards, and team comments.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Invitation Email</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EMAIL SENT PREVIEW (SIMULATED EMAIL INBOX) */}
      {/* ========================================================================= */}
      {emailPreviewInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-500/40 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Email Notification Dispatched!</h3>
              </div>
              <button
                type="button"
                onClick={() => setEmailPreviewInvite(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Email UI box */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 text-xs">
              <div className="border-b border-slate-800/80 pb-2.5 space-y-1 text-slate-400">
                <div>
                  <strong className="text-slate-300">To:</strong> {emailPreviewInvite.recipientEmail}
                </div>
                <div>
                  <strong className="text-slate-300">From:</strong> ProjectFlow &lt;no-reply@projectflow.app&gt;
                </div>
                <div>
                  <strong className="text-slate-300">Subject:</strong> You&apos;ve been invited to join {emailPreviewInvite.organizationName}
                </div>
              </div>

              <div className="space-y-2 text-slate-300 pt-1 leading-relaxed">
                <p>Hello,</p>
                <p>
                  <strong>{emailPreviewInvite.invitedByEmail}</strong> has invited you to join the team workspace at{' '}
                  <strong className="text-white">{emailPreviewInvite.organizationName}</strong> as a{' '}
                  <span className="text-indigo-400 font-semibold">{emailPreviewInvite.role}</span>.
                </p>
                <p className="text-slate-400">
                  Accept the invitation below to activate your employee dashboard and access all assigned tasks and project boards.
                </p>
              </div>

              {/* Action buttons inside email */}
              <div className="pt-3 flex items-center gap-3">
                <a
                  href={`/invite/${emailPreviewInvite.token}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Accept Invite &amp; Open Dashboard</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/invite/${emailPreviewInvite.token}`
                    void navigator.clipboard.writeText(url)
                    setCopiedLink(true)
                    setTimeout(() => setCopiedLink(false), 2000)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:text-white"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedLink ? 'Copied Link' : 'Copy Direct Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setEmailPreviewInvite(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
