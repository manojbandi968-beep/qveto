import { useState } from 'react'
import type { FC } from 'react'
import { AlertTriangle, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import type { ProjectRecord } from '../types.ts'

interface DeleteProjectDialogProps {
  project: ProjectRecord | null
  isOpen: boolean
  onClose: () => void
  onProjectDeleted: (projectId: string) => void
}

export const DeleteProjectDialog: FC<DeleteProjectDialogProps> = ({
  project,
  isOpen,
  onClose,
  onProjectDeleted,
}) => {
  const { currentOrganization, currentRole } = useOrganization()
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !project) return null

  const canDelete = currentRole === 'owner' || currentRole === 'manager'

  const handleDelete = async () => {
    setErrorMessage(null)

    if (!canDelete) {
      setErrorMessage('Only organization owners and managers can delete projects.')
      return
    }

    if (!currentOrganization) {
      setErrorMessage('No active organization selected.')
      return
    }

    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id)
        .eq('organization_id', currentOrganization.id)

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setErrorMessage('Permission denied: You do not have permission to delete this project.')
        } else {
          setErrorMessage(error.message || 'Failed to delete project.')
        }
        return
      }

      onProjectDeleted(project.id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred while deleting.'
      setErrorMessage(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div
        className="relative w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-950 p-6 shadow-2xl shadow-black/80 space-y-4"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 id="delete-dialog-title" className="text-base font-semibold text-white">
              Delete Project
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">&ldquo;{project.name}&rdquo;</span>?
            </p>
            <p className="text-[11px] text-slate-500">
              All tasks and activities in this project will be permanently removed. This action cannot be undone.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-rose-600/30 hover:bg-rose-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <span>Delete Project</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
