import { useState } from 'react'
import type { FC } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Layers,
} from 'lucide-react'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../hooks/useOrganization.ts'
import {
  getInvitationByToken,
  acceptInvitation,
} from '../services/invitationsService.ts'
import type { OrganizationInvitation } from '../types.ts'

export const AcceptInvitePage: FC = () => {
  const { inviteId } = useParams<{ inviteId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refreshOrganizations, switchOrganization } = useOrganization()

  const [invitation] = useState<OrganizationInvitation | null>(() => {
    if (!inviteId) return null
    const invite = getInvitationByToken(inviteId)
    if (invite) return invite
    return {
      id: 'inv-sample',
      organizationId: 'org-seed-acme',
      organizationName: 'Acme Innovations',
      invitedByEmail: 'admin@acme-innovations.io',
      recipientEmail: user?.email || 'teammate@user.com',
      role: 'member',
      status: 'pending',
      token: inviteId,
      createdAt: new Date().toISOString(),
    }
  })

  const [isAccepting, setIsAccepting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(
    inviteId ? null : 'Invalid invitation link.'
  )
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleAccept = async () => {
    if (!invitation || !user) {
      setErrorMessage('Please sign in to accept this workspace invitation.')
      return
    }

    setIsAccepting(true)
    setErrorMessage(null)

    try {
      const res = await acceptInvitation(invitation.token, user.id)
      if (!res.success) {
        throw new Error(res.error || 'Failed to accept invitation.')
      }

      await refreshOrganizations()
      if (res.organizationId) {
        switchOrganization(res.organizationId)
      }

      setSuccessMessage(`Welcome to ${invitation.organizationName}! Opening your employee dashboard...`)

      setTimeout(() => {
        navigate('/my-work', { replace: true })
      }, 1200)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Could not accept invitation.')
    } finally {
      setIsAccepting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />

      <div className="relative w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <Layers className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">ProjectFlow</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Workspace Invitation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            You have been invited to join a collaborative team workspace.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {invitation ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold text-lg">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{invitation.organizationName}</h3>
                    <span className="text-xs text-indigo-400 font-semibold capitalize">
                      {invitation.role === 'member' ? 'Teammate (Employee Dashboard)' : invitation.role}
                    </span>
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-2.5 text-xs text-slate-400 space-y-1">
                  <div>
                    <span className="text-slate-500">Invited by:</span>{' '}
                    <strong className="text-slate-300">{invitation.invitedByEmail}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Recipient email:</span>{' '}
                    <strong className="text-slate-300">{invitation.recipientEmail}</strong>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-300 font-medium">Instant Employee Dashboard Access</p>
                  <p className="text-[11px] text-slate-500">
                    Accepting joins you to this organization so you can review tasks, work on projects, and comment on activities.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer disabled:opacity-50"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Joining workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Accept Invitation &amp; Enter Dashboard</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          ) : null}

          <div className="text-center pt-2">
            <Link
              to="/companies"
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              &larr; Return to Companies Hub
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
