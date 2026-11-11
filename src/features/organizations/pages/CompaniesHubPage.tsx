import { useState, useEffect, useMemo } from 'react'
import type { FC, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  Search,
  Plus,
  Edit3,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Send,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useOrganization } from '../hooks/useOrganization.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import {
  fetchAllDirectoryCompanies,
  registerCompanyInDirectory,
} from '../services/companyDirectoryService.ts'
import {
  submitJoinRequest,
  getUserPendingJoinRequests,
} from '../services/joinRequestsService.ts'
import type { CompanyDirectoryItem } from '../types.ts'

export const CompaniesHubPage: FC = () => {
  const { user } = useAuth()
  const {
    currentOrganization,
    currentRole,
    organizations,
    memberships,
    switchOrganization,
    createOrganization,
    updateOrganization,
  } = useOrganization()

  const [searchQuery, setSearchQuery] = useState('')
  const [directory, setDirectory] = useState<CompanyDirectoryItem[]>([])
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [joinModalTarget, setJoinModalTarget] = useState<CompanyDirectoryItem | null>(null)

  // Form states
  const [newOrgName, setNewOrgName] = useState('')
  const [newOrgIndustry, setNewOrgIndustry] = useState('')
  const [newOrgDescription, setNewOrgDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit form state
  const [editOrgName, setEditOrgName] = useState(currentOrganization?.name || '')
  const [editOrgIndustry, setEditOrgIndustry] = useState(currentOrganization?.industry || '')
  const [editOrgDescription, setEditOrgDescription] = useState(currentOrganization?.description || '')

  // Join note
  const [joinNote, setJoinNote] = useState('')

  const [pendingRequests, setPendingRequests] = useState<string[]>([])

  const currentOrgId = currentOrganization?.id
  const isOwner = currentRole === 'owner'
  const isManager = currentRole === 'manager'
  const canEditOrg = isOwner || isManager

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3500)
  }

  const showError = (msg: string) => {
    setErrorToast(msg)
    setTimeout(() => setErrorToast(null), 4000)
  }

  // Load companies
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await fetchAllDirectoryCompanies(organizations)
        if (isMounted) {
          setDirectory(data)
          if (user) {
            const reqs = getUserPendingJoinRequests(user.id)
            setPendingRequests(reqs.map((r) => r.organizationId))
          }
        }
      } catch (err) {
        console.error('Failed to load companies directory:', err)
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [organizations, user])

  // Search filter
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

  // Handle Create Company
  const handleCreateCompany = async (e: FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) {
      showError('Company name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      const { organization, error } = await createOrganization(newOrgName.trim(), {
        industry: newOrgIndustry.trim() || 'General Technology',
        description: newOrgDescription.trim(),
      })

      if (error || !organization) {
        throw new Error(error?.message || 'Failed to create company.')
      }

      registerCompanyInDirectory({
        id: organization.id,
        name: organization.name,
        industry: newOrgIndustry.trim() || 'General Technology',
        description: newOrgDescription.trim() || 'Custom created workspace.',
        membersCount: 1,
        isSample: false,
      })

      // Refresh local directory
      const updated = await fetchAllDirectoryCompanies([organization, ...organizations])
      setDirectory(updated)

      setIsCreateModalOpen(false)
      setNewOrgName('')
      setNewOrgIndustry('')
      setNewOrgDescription('')
      showToast(`Company "${organization.name}" created and set as active workspace!`)
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Error creating company.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Edit Company
  const handleEditCompany = async (e: FormEvent) => {
    e.preventDefault()
    if (!currentOrgId) return
    if (!editOrgName.trim()) {
      showError('Company name cannot be blank.')
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await updateOrganization(currentOrgId, editOrgName.trim(), {
        industry: editOrgIndustry.trim(),
        description: editOrgDescription.trim(),
      })

      if (error) throw error

      registerCompanyInDirectory({
        id: currentOrgId,
        name: editOrgName.trim(),
        industry: editOrgIndustry.trim() || 'General Workspace',
        description: editOrgDescription.trim() || '',
        membersCount: 1,
        isSample: false,
      })

      // Refresh list
      const updated = await fetchAllDirectoryCompanies(organizations)
      setDirectory(updated)

      setIsEditModalOpen(false)
      showToast('Company information updated successfully!')
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update company.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Request to Join
  const handleSendJoinRequest = () => {
    if (!joinModalTarget || !user) return

    const req = submitJoinRequest({
      organizationId: joinModalTarget.id,
      organizationName: joinModalTarget.name,
      userId: user.id,
      userEmail: user.email || 'teammate@user.com',
      userName: user.email?.split('@')[0],
      note: joinNote.trim() || 'Requesting teammate access to collaborate.',
    })

    setPendingRequests((prev) => [...prev, req.organizationId])
    setJoinModalTarget(null)
    setJoinNote('')
    showToast(`Join request submitted to ${joinModalTarget.name}! The company admin has been notified.`)
  }

  return (
    <div className="space-y-8 max-w-6xl pb-12">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-3 text-xs text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-rose-500/30 bg-rose-950/90 px-4 py-3 text-xs text-rose-300 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2">
          <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Building2 className="h-8 w-8 text-indigo-400" />
            <span>Companies Hub</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Find organizations, manage active workspaces, switch companies, or invite teammates.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add / Create Company</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. CURRENT ACTIVE ORGANIZATION HERO CARD */}
      {/* ========================================================================= */}
      {currentOrganization ? (
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-slate-900/90 via-slate-950/95 to-indigo-950/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xl shadow-indigo-500/30">
                <Building2 className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Our Active Organization
                  </span>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Workspace
                  </span>
                  {currentRole && (
                    <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300 capitalize">
                      {currentRole === 'owner' ? '👑 Workspace Owner' : `${currentRole} Role`}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {currentOrganization.name}
                </h2>

                <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                  {currentOrganization.description ||
                    'All projects, Kanban tasks, team conversations, and reports are unified inside this workspace.'}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 flex-wrap">
              {canEditOrg && (
                <button
                  type="button"
                  onClick={() => {
                    setEditOrgName(currentOrganization.name)
                    setEditOrgIndustry(currentOrganization.industry || '')
                    setEditOrgDescription(currentOrganization.description || '')
                    setIsEditModalOpen(true)
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white hover:border-slate-600 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Edit Organization</span>
                </button>
              )}

              <Link
                to="/team"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600/20 border border-indigo-500/40 px-4 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition-colors cursor-pointer"
              >
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                <span>Team Members</span>
              </Link>

              <Link
                to="/my-work"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <span>Open Tasks</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* ========================================================================= */}
      {/* 2. YOUR WORKSPACES (SWITCHER) */}
      {/* ========================================================================= */}
      {memberships.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span>Your Workspaces ({memberships.length})</span>
            </h3>
            <span className="text-xs text-slate-400">Click to switch current workspace</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberships.map((m) => {
              const isCurrent = m.organization_id === currentOrgId
              return (
                <div
                  key={m.id}
                  onClick={() => !isCurrent && switchOrganization(m.organization_id)}
                  className={`rounded-2xl border p-5 transition-all duration-200 cursor-pointer ${
                    isCurrent
                      ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-sm ${
                          isCurrent
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {m.organization.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white truncate max-w-[150px]">
                          {m.organization.name}
                        </h4>
                        <span className="text-[11px] text-slate-400 capitalize">
                          Role: {m.role}
                        </span>
                      </div>
                    </div>

                    {isCurrent ? (
                      <span className="rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5">
                        Active
                      </span>
                    ) : (
                      <span className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium">
                        Switch &rarr;
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. FIND A COMPANY BY NAME (SEARCH DIRECTORY) */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-4 border-t border-slate-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-indigo-400" />
              <span>Find a Company by Name</span>
            </h3>
            <p className="text-xs text-slate-400">
              Search available organizations in the directory and request access or view status.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or industry..."
              className="h-10 w-full rounded-xl border border-slate-800 bg-slate-950/80 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCompanies.map((comp) => {
            const isUserMember = organizations.some((o) => o.id === comp.id)
            const isCurrent = comp.id === currentOrgId
            const isRequested = pendingRequests.includes(comp.id)

            return (
              <div
                key={comp.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-5 flex flex-col justify-between hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-200 space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-indigo-400 border border-slate-700 font-bold text-base">
                        {comp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white leading-tight">{comp.name}</h4>
                        <span className="rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.2 text-[10px] font-semibold">
                          {comp.industry}
                        </span>
                      </div>
                    </div>

                    {comp.isSample && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-medium text-slate-400">
                        Demo
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {comp.description}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-slate-400" />
                      <span>{comp.membersCount} teammates</span>
                    </span>
                    {comp.ownerEmail && (
                      <span className="truncate max-w-[140px] text-slate-400">
                        • {comp.ownerEmail}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card CTA */}
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between">
                  {isCurrent ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Current Workspace</span>
                    </span>
                  ) : isUserMember ? (
                    <button
                      type="button"
                      onClick={() => switchOrganization(comp.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <span>Enter Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : isRequested ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                      <Clock className="h-3.5 w-3.5 animate-spin" />
                      <span>Join Request Pending</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setJoinModalTarget(comp)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                    >
                      <Send className="h-3 w-3" />
                      <span>Request to Join</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="py-12 text-center rounded-2xl border border-dashed border-slate-800 p-8 space-y-3">
            <Building2 className="h-8 w-8 text-slate-600 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-300">No organizations found</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No company matches &ldquo;{searchQuery}&rdquo;. You can create and register a new company right now.
            </p>
            <button
              type="button"
              onClick={() => {
                setNewOrgName(searchQuery)
                setIsCreateModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create &ldquo;{searchQuery}&rdquo;</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE NEW COMPANY */}
      {/* ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Create New Company</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Company Name *</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. HyperScale Labs, Quantum AI"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Industry / Domain</label>
                <input
                  type="text"
                  value={newOrgIndustry}
                  onChange={(e) => setNewOrgIndustry(e.target.value)}
                  placeholder="e.g. AI SaaS, FinTech, E-commerce, Design"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Short Description</label>
                <textarea
                  rows={3}
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  placeholder="Briefly describe what this company or team works on..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Create Workspace</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT COMPANY */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Edit Company Information</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditCompany} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Company Name *</label>
                <input
                  type="text"
                  required
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Industry / Domain</label>
                <input
                  type="text"
                  value={editOrgIndustry}
                  onChange={(e) => setEditOrgIndustry(e.target.value)}
                  placeholder="e.g. Enterprise Cloud, Design, Security"
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Short Description</label>
                <textarea
                  rows={3}
                  value={editOrgDescription}
                  onChange={(e) => setEditOrgDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REQUEST TO JOIN COMPANY */}
      {/* ========================================================================= */}
      {joinModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Request to Join</h3>
              </div>
              <button
                type="button"
                onClick={() => setJoinModalTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1">
              <div className="text-sm font-bold text-white">{joinModalTarget.name}</div>
              <div className="text-xs text-indigo-400 font-medium">{joinModalTarget.industry}</div>
              <p className="text-xs text-slate-400 pt-1">{joinModalTarget.description}</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Message / Note for Company Admin (Optional)
              </label>
              <textarea
                rows={3}
                value={joinNote}
                onChange={(e) => setJoinNote(e.target.value)}
                placeholder="Explain your role or project goals to the company admin..."
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setJoinModalTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendJoinRequest}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Request</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
