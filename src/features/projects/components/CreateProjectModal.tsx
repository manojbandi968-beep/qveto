import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { X, FolderPlus, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import type { ProjectRecord } from '../types.ts'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated: (project: ProjectRecord) => void
}

export const CreateProjectModal: FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated,
}) => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const canCreate = currentRole === 'owner' || currentRole === 'manager'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!canCreate) {
      setErrorMessage('Only organization owners and managers can create projects.')
      return
    }

    if (!currentOrganization) {
      setErrorMessage('No active organization selected.')
      return
    }

    if (!user) {
      setErrorMessage('You must be signed in to create a project.')
      return
    }

    const trimmedName = name.trim()
    if (!trimmedName) {
      setErrorMessage('Project name is required.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          organization_id: currentOrganization.id,
          name: trimmedName,
          description: description.trim() || null,
          created_by: user.id,
        })
        .select('id, organization_id, name, description, created_by, created_at, updated_at')
        .single()

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setErrorMessage('Permission denied: You do not have permission to create projects in this organization.')
        } else {
          setErrorMessage(error.message || 'Failed to create project.')
        }
        return
      }

      setName('')
      setDescription('')
      onProjectCreated(data as ProjectRecord)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/60"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/25">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 id="create-project-title" className="text-base font-semibold text-white">
                Create New Project
              </h2>
              <p className="text-xs text-slate-400">
                Workspace: <span className="text-slate-300 font-medium">{currentOrganization?.name}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="project-name">
              Project Name <span className="text-rose-400">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Website Overhaul, Mobile App v2"
              autoFocus
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="project-desc">
              Description <span className="text-slate-500 text-[11px]">(optional)</span>
            </label>
            <textarea
              id="project-desc"
              rows={3}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of project goals and scope..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Project</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
