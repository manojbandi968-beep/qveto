import { useState, useEffect, useMemo } from 'react'
import type { FC, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  ArrowRight,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Search,
  Send,
  Plus,
} from 'lucide-react'
import { useOrganization } from '../hooks/useOrganization.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import {
  fetchAllDirectoryCompanies,
  registerCompanyInDirectory,
} from '../services/companyDirectoryService.ts'
import { submitJoinRequest } from '../services/joinRequestsService.ts'
import type { CompanyDirectoryItem } from '../types.ts'

export const OnboardingPage: FC = () => {
  const navigate = useNavigate()
  const { createOrganization, memberships, switchOrganization } = useOrganization()
  const { user } = useAuth()

  // Tab: 'find' or 'create'
  const [activeTab, setActiveTab] = useState<'find' | 'create'>('create')

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [directory, setDirectory] = useState<CompanyDirectoryItem[]>([])

  // Create form state
  const [orgName, setOrgName] = useState('')
  const [orgIndustry, setOrgIndustry] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const hasExistingOrgs = memberships.length > 0

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await fetchAllDirectoryCompanies()
        if (isMounted) setDirectory(data)
      } catch (err) {
        console.error('Failed to load companies:', err)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [])

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return directory
    return directory.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    )
  }, [directory, searchQuery])

  // Create New Company Submit
  const handleCreateSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const trimmedName = orgName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Company name must be at least 2 characters long.')
      return
    }

    setIsSubmitting(true)
    try {
      const { organization, error } = await createOrganization(trimmedName, {
        industry: orgIndustry.trim() || 'General Technology',
      })

      if (error || !organization) {
        setErrorMessage(error?.message || 'Failed to create organization. Please try again.')
        return
      }

      registerCompanyInDirectory({
        id: organization.id,
        name: organization.name,
        industry: orgIndustry.trim() || 'General Technology',
        description: 'New company workspace on ProjectFlow.',
        membersCount: 1,
        isSample: false,
      })

      setSuccessMessage(`Workspace "${organization.name}" created successfully! Redirecting...`)
      setTimeout(() => {
        navigate('/companies', { replace: true })
      }, 700)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Request to join existing company
  const handleRequestJoin = (company: CompanyDirectoryItem) => {
    if (!user) return
    submitJoinRequest({
      organizationId: company.id,
      organizationName: company.name,
      userId: user.id,
      userEmail: user.email || 'teammate@user.com',
      userName: user.email?.split('@')[0],
      note: 'Requested access via Onboarding search.',
    })
    setSuccessMessage(`Join request submitted to ${company.name}! Redirecting to Companies Hub...`)
    setTimeout(() => {
      navigate('/companies', { replace: true })
    }, 1000)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />

      <div className="relative w-full max-w-xl space-y-6">
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
            {hasExistingOrgs ? 'Manage or Join Company' : 'Welcome! Set up your Organization'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Create a new company workspace as an owner, or find an existing company by name to join.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Fill Company Name (Create)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('find')}
            className={`flex-1 py-2.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'find'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Find Company by Name</span>
          </button>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50 space-y-6">
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

          {/* TAB 1: CREATE NEW COMPANY */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300" htmlFor="org-name">
                  Company / Organization Name *
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
                    placeholder="e.g. Acme Innovations, PixelCraft Labs"
                    className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300" htmlFor="org-ind">
                  Industry / Focus (Optional)
                </label>
                <input
                  id="org-ind"
                  type="text"
                  disabled={isSubmitting}
                  value={orgIndustry}
                  onChange={(e) => setOrgIndustry(e.target.value)}
                  placeholder="e.g. Software SaaS, Design, FinTech, E-commerce"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs text-slate-400 flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-slate-300 font-medium">Automatic Admin Ownership</p>
                  <p className="text-[11px] text-slate-500">
                    You will be assigned as <span className="text-indigo-400 font-semibold">Owner</span> with full permissions to invite teammates and approve join requests.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-3 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-violet-500 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create &amp; Enter Workspace</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: FIND COMPANY BY NAME */}
          {activeTab === 'find' && (
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search existing company (e.g. Acme, Pixel, Nexus)..."
                  className="h-11 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-10 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* List of found companies */}
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredCompanies.map((c) => {
                  const isMember = memberships.some((m) => m.organization_id === c.id)
                  return (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-3 hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{c.name}</span>
                          <span className="rounded bg-indigo-500/10 text-indigo-400 px-1.5 py-0.2 text-[10px] font-semibold">
                            {c.industry}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{c.description}</p>
                      </div>

                      {isMember ? (
                        <button
                          type="button"
                          onClick={() => {
                            switchOrganization(c.id)
                            navigate('/companies')
                          }}
                          className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                        >
                          Enter
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestJoin(c)}
                          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors cursor-pointer"
                        >
                          <Send className="h-3 w-3" />
                          <span>Request Join</span>
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {hasExistingOrgs && (
            <div className="text-center pt-2">
              <Link
                to="/companies"
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                &larr; Go to Companies Hub
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
