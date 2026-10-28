import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  ArrowRight,
  Sparkles,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useOrganization } from '../hooks/useOrganization.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'

export const OnboardingPage: FC = () => {
  const navigate = useNavigate()
  const { createOrganization, memberships } = useOrganization()
  const { user } = useAuth()

  const [orgName, setOrgName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const hasExistingOrgs = memberships.length > 0

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedName = orgName.trim()
    if (!trimmedName) {
      setErrorMessage('Organization name is required.')
      return
    }

    if (trimmedName.length < 2) {
      setErrorMessage('Organization name must be at least 2 characters long.')
      return
    }

    setIsSubmitting(true)

    try {
      const { organization, error } = await createOrganization(trimmedName)

      if (error || !organization) {
        setErrorMessage(error?.message || 'Failed to create organization. Please try again.')
        return
      }

      setSuccessMessage(`Workspace "${organization.name}" created successfully! Redirecting...`)

      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cyan-600/5 blur-3xl" />

      <div className="relative w-full max-w-lg space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
              <Layers className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              ProjectFlow
            </span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {hasExistingOrgs ? 'Create another workspace' : 'Welcome! Set up your organization'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
            {hasExistingOrgs
              ? 'Add an additional team workspace to collaborate on distinct projects.'
              : 'Organizations keep your projects, tasks, and team members securely organized.'}
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMessage && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Organization Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="org-name">
                Organization / Company Name
              </label>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  id="org-name"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Acme Studio, PixelCraft Labs"
                  autoFocus
                  className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                You will automatically become the <span className="text-indigo-400 font-medium">Owner</span> of this workspace.
              </p>
            </div>

            {/* Authenticated Owner Confirmation Note */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-slate-300 font-medium">Row Level Security Verified</p>
                <p className="text-[11px] text-slate-500">
                  Owner will be set to your authenticated ID (<span className="text-slate-400 font-mono text-[10px]">{user?.email}</span>).
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/40 active:scale-[0.99] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Cancel / Back if already has organizations */}
          {hasExistingOrgs && (
            <div className="text-center pt-2">
              <Link
                to="/dashboard"
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                &larr; Return to Dashboard
              </Link>
            </div>
          )}
        </div>

        {/* Feature highlight badges */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800/50 bg-slate-900/30">
            <Users className="h-4 w-4 text-indigo-400" />
            <span>Multi-tenant</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800/50 bg-slate-900/30">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <span>Auto Ownership</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800/50 bg-slate-900/30">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>RLS Isolated</span>
          </div>
        </div>
      </div>
    </div>
  )
}
