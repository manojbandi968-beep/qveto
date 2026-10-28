import { useState, useEffect, useMemo, useRef } from 'react'
import type { FC, FormEvent } from 'react'
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Trash2,
  User,
  ShieldAlert,
  MessageSquare,
  History,
  Paperclip,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import {
  isTaskOverdue,
  isTaskDueTomorrow,
  formatDueDate,
  statusConfig,
  priorityConfig,
  getNowIsoString,
} from '../utils.ts'
import { DeleteTaskDialog } from './DeleteTaskDialog.tsx'
import { TaskCommentsSection } from './TaskCommentsSection.tsx'
import { TaskActivityTimeline } from './TaskActivityTimeline.tsx'
import { TaskAttachmentsSection } from './TaskAttachmentsSection.tsx'
import type {
  OrgMemberOption,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../types.ts'

interface TaskDrawerProps {
  task: TaskRecord | null
  isOpen: boolean
  onClose: () => void
  onTaskUpdated: (updatedTask: TaskRecord) => void
  onTaskDeleted: (taskId: string) => void
  members: OrgMemberOption[]
}

const ALLOWED_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled']
const ALLOWED_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

export const TaskDrawer: FC<TaskDrawerProps> = ({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  members,
}) => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'todo')
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [assigneeId, setAssigneeId] = useState<string>(task?.assignee_id ?? '')
  const [dueDate, setDueDate] = useState<string>(task?.due_date ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'comments' | 'attachments' | 'activity'>('comments')
  const [commentsCount, setCommentsCount] = useState(0)
  const [attachmentsCount, setAttachmentsCount] = useState(0)
  const [activityCount, setActivityCount] = useState(0)
  const [activityRefreshKey, setActivityRefreshKey] = useState(0)
  const [remoteUpdateConflict, setRemoteUpdateConflict] = useState(false)

  // Track if user has unsaved edits in progress
  const isDirty = useMemo(() => {
    if (!task) return false
    return (
      title !== (task.title ?? '') ||
      description !== (task.description ?? '') ||
      status !== task.status ||
      priority !== task.priority ||
      assigneeId !== (task.assignee_id ?? '') ||
      dueDate !== (task.due_date ?? '')
    )
  }, [task, title, description, status, priority, assigneeId, dueDate])

  const isDirtyRef = useRef(isDirty)
  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  // Scoped Realtime subscription for this task
  useEffect(() => {
    if (!task?.id || !isOpen) return

    const channel = supabase
      .channel(`realtime:task-detail:${task.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tasks',
          filter: `id=eq.${task.id}`,
        },
        (payload) => {
          const updated = payload.new as TaskRecord
          if (!updated) return
          onTaskUpdated(updated)

          if (!isDirtyRef.current) {
            setTitle(updated.title ?? '')
            setDescription(updated.description ?? '')
            setStatus(updated.status)
            setPriority(updated.priority)
            setAssigneeId(updated.assignee_id ?? '')
            setDueDate(updated.due_date ?? '')
            setRemoteUpdateConflict(false)
          } else {
            setRemoteUpdateConflict(true)
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [task?.id, isOpen, onTaskUpdated])

  if (!isOpen || !task) return null

  const isAdmin = currentRole === 'owner' || currentRole === 'manager'
  const isAssignedMember = Boolean(user && task.assignee_id === user.id)
  const canEdit = isAdmin || isAssignedMember
  const canDelete = isAdmin
  const canChangeAssignee = isAdmin

  const overdue = isTaskOverdue(task.due_date, task.status)
  const dueTomorrow = isTaskDueTomorrow(task.due_date, task.status)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!canEdit) {
      setErrorMessage('Permission denied: You do not have permission to edit this task.')
      return
    }

    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setErrorMessage('Task title cannot be empty.')
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

    if (dueDate) {
      const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && !isNaN(new Date(dueDate).getTime())
      if (!isValidDate) {
        setErrorMessage('Invalid due date format.')
        return
      }
    }

    setIsSubmitting(true)

    try {
      // Determine completed_at transition
      let completedAt: string | null = task.completed_at
      if (status === 'done' && task.status !== 'done') {
        completedAt = getNowIsoString()
      } else if (status !== 'done' && task.status === 'done') {
        completedAt = null
      }

      const updatePayload = {
        title: trimmedTitle,
        description: description.trim() || null,
        status,
        priority,
        assignee_id: canChangeAssignee ? (assigneeId.trim() || null) : task.assignee_id,
        due_date: dueDate.trim() || null,
        completed_at: completedAt,
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updatePayload)
        .eq('id', task.id)
        .eq('project_id', task.project_id)
        .select('*')
        .single()

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setErrorMessage('Permission denied: Supabase RLS rejected this update.')
        } else {
          setErrorMessage(error.message || 'Failed to update task.')
        }
        return
      }

      onTaskUpdated(data as TaskRecord)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteSuccess = (deletedId: string) => {
    setIsDeleteDialogOpen(false)
    onTaskDeleted(deletedId)
    onClose()
  }

  const assignedMemberLabel = members.find((m) => m.user_id === task.assignee_id)?.label ??
    (task.assignee_id === user?.id ? 'You' : task.assignee_id ? `Member (${task.assignee_id.slice(0, 8)})` : 'Unassigned')

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => {
          if (!isSubmitting) onClose()
        }}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-slate-800 bg-slate-950 shadow-2xl shadow-black focus:outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-drawer-title"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusConfig[task.status].badge}`}
            >
              {statusConfig[task.status].label}
            </span>
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${priorityConfig[task.priority].badge}`}
            >
              {priorityConfig[task.priority].label}
            </span>
            {overdue && (
              <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[11px] font-medium text-rose-300">
                <AlertCircle className="h-3 w-3" />
                Overdue
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canDelete && (
              <button
                type="button"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={isSubmitting}
                className="rounded-lg p-1.5 text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors cursor-pointer"
                title="Delete task"
                aria-label="Delete task"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Permission Notice */}
          {!canEdit && (
            <div className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-slate-200">Read-Only View</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Only organization owners, managers, or the assigned member may modify this task.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Remote Update Conflict Notice */}
          {remoteUpdateConflict && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 animate-in fade-in">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-medium text-amber-200">Remote update detected</p>
                <p className="mt-0.5 text-[11px] text-amber-300/80">
                  This task was updated in the background. Your active unsaved edits are preserved. Saving will apply your changes.
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form id="task-drawer-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="drawer-title" className="text-xs font-medium text-slate-300">
                Task Title {canEdit && <span className="text-rose-400">*</span>}
              </label>
              {canEdit ? (
                <input
                  id="drawer-title"
                  type="text"
                  required
                  disabled={isSubmitting}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50"
                />
              ) : (
                <h2 id="task-drawer-title" className="text-lg font-bold text-white break-words">
                  {task.title}
                </h2>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="drawer-desc" className="text-xs font-medium text-slate-300">
                Description
              </label>
              {canEdit ? (
                <textarea
                  id="drawer-desc"
                  rows={4}
                  disabled={isSubmitting}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add details, checklists, or context for this task..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 resize-none"
                />
              ) : (
                <div className="rounded-lg border border-slate-850 bg-slate-900/30 p-3.5 text-xs text-slate-300 whitespace-pre-line leading-relaxed min-h-[70px]">
                  {task.description || <span className="text-slate-500 italic">No description provided.</span>}
                </div>
              )}
            </div>

            {/* Status & Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="drawer-status" className="text-xs font-medium text-slate-300">
                  Status {canEdit && <span className="text-rose-400">*</span>}
                </label>
                {canEdit ? (
                  <select
                    id="drawer-status"
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
                ) : (
                  <div className="flex h-10 items-center rounded-lg border border-slate-800 bg-slate-900/30 px-3 text-xs text-slate-300">
                    {statusConfig[task.status].label}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="drawer-priority" className="text-xs font-medium text-slate-300">
                  Priority {canEdit && <span className="text-rose-400">*</span>}
                </label>
                {canEdit ? (
                  <select
                    id="drawer-priority"
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
                ) : (
                  <div className="flex h-10 items-center rounded-lg border border-slate-800 bg-slate-900/30 px-3 text-xs text-slate-300">
                    {priorityConfig[task.priority].label}
                  </div>
                )}
              </div>
            </div>

            {/* Assignee & Due Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="drawer-assignee" className="text-xs font-medium text-slate-300">
                  Assignee
                </label>
                {canChangeAssignee ? (
                  <select
                    id="drawer-assignee"
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
                ) : (
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/30 px-3 text-xs text-slate-300 truncate">
                    <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{assignedMemberLabel}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="drawer-due-date" className="text-xs font-medium text-slate-300">
                  Due Date
                </label>
                {canEdit ? (
                  <input
                    id="drawer-due-date"
                    type="date"
                    disabled={isSubmitting}
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-800 bg-slate-900/60 px-3 text-sm text-slate-200 transition-colors focus:border-indigo-500 focus:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 scheme-dark"
                  />
                ) : (
                  <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/30 px-3 text-xs text-slate-300">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    <span>{formatDueDate(task.due_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Overdue Warning Alert Box */}
          {overdue && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
              <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Task is Overdue</p>
                <p className="mt-0.5 text-rose-300/90 text-[11px] leading-relaxed">
                  The scheduled due date ({formatDueDate(task.due_date)}) has passed and the task has not been completed.
                </p>
              </div>
            </div>
          )}

          {/* Due Tomorrow Alert Box */}
          {dueTomorrow && !overdue && task.status !== 'done' && task.status !== 'cancelled' && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300">
              <Clock className="h-4.5 w-4.5 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Due Tomorrow</p>
                <p className="mt-0.5 text-amber-300/90 text-[11px] leading-relaxed">
                  This task is due tomorrow ({formatDueDate(task.due_date)}).
                </p>
              </div>
            </div>
          )}

          {/* Metadata Section */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Task Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  Created:{' '}
                  <span className="text-slate-300 font-medium">
                    {new Date(task.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>
                  Updated:{' '}
                  <span className="text-slate-300 font-medium">
                    {new Date(task.updated_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </span>
              </div>

              {task.completed_at && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>
                    Completed:{' '}
                    <span className="text-emerald-300 font-medium">
                      {new Date(task.completed_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Comments and Activity Section */}
          <div className="pt-6 border-t border-slate-800/80 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('comments')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
                aria-pressed={activeTab === 'comments'}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>Comments</span>
                {commentsCount > 0 && (
                  <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 font-medium">
                    {commentsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('attachments')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'attachments'
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
                aria-pressed={activeTab === 'attachments'}
              >
                <Paperclip className="h-3.5 w-3.5" />
                <span>Attachments</span>
                {attachmentsCount > 0 && (
                  <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 font-medium">
                    {attachmentsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('activity')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'activity'
                    ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
                aria-pressed={activeTab === 'activity'}
              >
                <History className="h-3.5 w-3.5" />
                <span>Activity</span>
                {activityCount > 0 && (
                  <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300 font-medium">
                    {activityCount}
                  </span>
                )}
              </button>
            </div>

            {activeTab === 'comments' ? (
              <TaskCommentsSection
                taskId={task.id}
                members={members}
                onCommentCountChange={setCommentsCount}
              />
            ) : activeTab === 'attachments' ? (
              <TaskAttachmentsSection
                taskId={task.id}
                projectId={task.project_id}
                organizationId={currentOrganization?.id || ''}
                canUpload={canEdit}
                members={members}
                onAttachmentCountChange={setAttachmentsCount}
                onActivityChanged={() => setActivityRefreshKey((k) => k + 1)}
              />
            ) : (
              <TaskActivityTimeline
                key={activityRefreshKey}
                taskId={task.id}
                members={members}
                onActivityCountChange={setActivityCount}
              />
            )}
          </div>
        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 bg-slate-950/80 backdrop-blur-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {canEdit ? 'Cancel' : 'Close'}
          </button>

          {canEdit && (
            <button
              type="submit"
              form="task-drawer-form"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {canDelete && (
        <DeleteTaskDialog
          task={task}
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          onTaskDeleted={handleDeleteSuccess}
        />
      )}
    </>
  )
}
