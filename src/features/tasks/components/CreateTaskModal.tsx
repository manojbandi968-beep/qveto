import { useState } from 'react'
import type { FC, FormEvent } from 'react'
import { X, PlusCircle, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { getNowIsoString } from '../utils.ts'
import type {
  OrgMemberOption,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../types.ts'

interface CreateTaskModalProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onTaskCreated: (task: TaskRecord) => void
  members: OrgMemberOption[]
}

const ALLOWED_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled']
const ALLOWED_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export const CreateTaskModal: FC<CreateTaskModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onTaskCreated,
  members,
}) => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<TaskStatus>('todo')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const canCreate = currentRole === 'owner' || currentRole === 'manager'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!canCreate) {
      setErrorMessage('Permission denied: Only organization owners and managers can create tasks.')
      return
    }

    if (!user) {
      setErrorMessage('Authentication error: You must be logged in to create a task.')
      return
    }

    if (!currentOrganization) {
      setErrorMessage('No active organization selected.')
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage('Task title is required.')
      return
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      setErrorMessage('Invalid status selected.')
      return
    }

    if (!ALLOWED_PRIORITIES.includes(priority)) {
      setErrorMessage('Invalid priority selected.')
      return
    }

    // Validate due_date format if provided (YYYY-MM-DD)
    if (dueDate) {
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && !isNaN(new Date(dueDate).getTime())
      if (!isValidDate) {
        setErrorMessage('Invalid due date format.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      const isDone = status === 'done'
      const completedAt = isDone ? getNowIsoString() : null

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          title: trimmedTitle,
          description: description.trim() || null,
          status,
          priority,
          assignee_id: assigneeId.trim() || null,
          due_date: dueDate.trim() || null,
          created_by: user.id,
          completed_at: completedAt,
        })
        .select('*')
        .single()

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setErrorMessage('Permission denied: Only organization owners and managers can create tasks.')
        } else {
          setErrorMessage(error.message || 'Failed to create task.')
        }
        return
      }

      onTaskCreated(data as TaskRecord)
      handleClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    setTitle('')
    setDescription('')
    setStatus('todo')
    setPriority('medium')
    setAssigneeId('')
    setDueDate('')
    setErrorMessage(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl shadow-black/70 my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 id="create-task-title" className="text-base font-semibold text-white">
                Create New Task
              </h2>
              <p className="text-xs text-slate-400">
                Add an actionable task to this project
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
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
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="task-title">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              id="task-title"
              type="text"
              required
              disabled={isSubmitting}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Set up authentication endpoints"
              className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300" htmlFor="task-desc">
              Description <span className="text-slate-500 text-[11px]">(optional)</span>
            </label>
            <textarea
              id="task-desc"
              rows={3}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description, acceptance criteria, or links..."
              className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Status & Priority Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="task-status">
                Status <span className="text-rose-400">*</span>
              </label>
              <select
                id="task-status"
                value={status}
                disabled={isSubmitting}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Done</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="task-priority">
                Priority <span className="text-rose-400">*</span>
              </label>
              <select
                id="task-priority"
                value={priority}
                disabled={isSubmitting}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assignee & Due Date Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="task-assignee">
                Assignee <span className="text-slate-500 text-[11px]">(optional)</span>
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                disabled={isSubmitting}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300" htmlFor="task-due-date">
                Due Date <span className="text-slate-500 text-[11px]">(optional)</span>
              </label>
              <input
                id="task-due-date"
                type="date"
                disabled={isSubmitting}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 scheme-dark"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleClose}
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
                <span>Create Task</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
