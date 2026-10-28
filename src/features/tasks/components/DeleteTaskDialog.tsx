import { useState } from 'react'
import type { FC } from 'react'
import { AlertTriangle, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import type { TaskRecord } from '../types.ts'

interface DeleteTaskDialogProps {
  task: TaskRecord | null
  isOpen: boolean
  onClose: () => void
  onTaskDeleted: (taskId: string) => void
}

export const DeleteTaskDialog: FC<DeleteTaskDialogProps> = ({
  task,
  isOpen,
  onClose,
  onTaskDeleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen || !task) return null

  const handleDelete = async () => {
    setErrorMessage(null)
    setIsDeleting(true)

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
        .eq('project_id', task.project_id)

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setErrorMessage('Permission denied: Only organization owners and managers can delete tasks.')
        } else {
          setErrorMessage(error.message || 'Failed to delete task.')
        }
        return
      }

      onTaskDeleted(task.id)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
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
        aria-labelledby="delete-task-title"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h2 id="delete-task-title" className="text-base font-semibold text-white">
              Delete Task
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-white">&ldquo;{task.title}&rdquo;</span>?
            </p>
            <p className="text-[11px] text-slate-500">
              This task and its status history will be permanently deleted. This action cannot be undone.
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
              <span>Delete Task</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
