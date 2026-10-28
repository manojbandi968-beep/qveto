import type {
  ActivityEvent,
  OrgMemberOption,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from './types.ts'

export const isTaskOverdue = (dueDate: string | null, status: TaskStatus): boolean => {
  if (!dueDate || status === 'done' || status === 'cancelled') return false
  const due = new Date(dueDate + 'T23:59:59')
  const now = new Date()
  return due.getTime() < now.getTime()
}

export const isTaskDueTomorrow = (dueDate: string | null, status: TaskStatus): boolean => {
  if (!dueDate || status === 'done' || status === 'cancelled') return false
  const [year, month, day] = dueDate.split('-').map(Number)
  const due = new Date(year, month - 1, day)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return (
    due.getFullYear() === tomorrow.getFullYear() &&
    due.getMonth() === tomorrow.getMonth() &&
    due.getDate() === tomorrow.getDate()
  )
}

export const getNowIsoString = (): string => {
  return new Date().toISOString()
}

export const formatDueDate = (dueDate: string | null): string => {
  if (!dueDate) return 'No due date'
  // parse YYYY-MM-DD
  const [year, month, day] = dueDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export const statusConfig: Record<
  TaskStatus,
  { label: string; color: string; badge: string }
> = {
  todo: {
    label: 'To Do',
    color: 'text-slate-400',
    badge: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-indigo-400',
    badge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  review: {
    label: 'In Review',
    color: 'text-amber-400',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  done: {
    label: 'Done',
    color: 'text-emerald-400',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-rose-400',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
}

export const priorityConfig: Record<
  TaskPriority,
  { label: string; badge: string; rank: number }
> = {
  low: {
    label: 'Low',
    badge: 'bg-slate-800/80 text-slate-400 border-slate-700',
    rank: 1,
  },
  medium: {
    label: 'Medium',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    rank: 2,
  },
  high: {
    label: 'High',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    rank: 3,
  },
  urgent: {
    label: 'Urgent',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    rank: 4,
  },
}

export const sortTasks = (
  tasks: TaskRecord[],
  sortBy: 'newest' | 'oldest' | 'due_date' | 'priority'
): TaskRecord[] => {
  return [...tasks].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'priority':
        return priorityConfig[b.priority].rank - priorityConfig[a.priority].rank
      case 'due_date': {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      }
      default:
        return 0
    }
  })
}

export interface KanbanColumnDef {
  id: 'todo' | 'in_progress' | 'review' | 'done'
  title: string
  colorBadge: string
  dotColor: string
}

export const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'todo',
    title: 'To Do',
    colorBadge: 'bg-slate-800 text-slate-300 border-slate-700',
    dotColor: 'bg-slate-400',
  },
  {
    id: 'in_progress',
    title: 'In Progress',
    colorBadge: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    dotColor: 'bg-indigo-400',
  },
  {
    id: 'review',
    title: 'In Review',
    colorBadge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-400',
  },
  {
    id: 'done',
    title: 'Done',
    colorBadge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    dotColor: 'bg-emerald-400',
  },
]

export const getActorDisplayName = (
  actorId: string | null | undefined,
  currentUserId?: string,
  members?: OrgMemberOption[]
): string => {
  if (!actorId) return 'Someone'
  if (actorId === currentUserId) return 'You'
  const member = members?.find((m) => m.user_id === actorId)
  if (member) {
    return member.label.split(' • ')[0].trim()
  }
  return `Member (${actorId.slice(0, 8)})`
}

export const formatActivityDescription = (
  event: ActivityEvent,
  currentUserId?: string,
  members?: OrgMemberOption[]
): string => {
  const actor = getActorDisplayName(event.actor_id, currentUserId, members)

  switch (event.event_type) {
    case 'task_created':
      return `${actor} created this task.`
    case 'task_status_changed': {
      const oldStatus = event.metadata.old_status as TaskStatus | undefined
      const newStatus = event.metadata.new_status as TaskStatus | undefined
      const oldLabel = oldStatus && statusConfig[oldStatus] ? statusConfig[oldStatus].label : oldStatus || 'unknown'
      const newLabel = newStatus && statusConfig[newStatus] ? statusConfig[newStatus].label : newStatus || 'unknown'
      return `${actor} moved this task from ${oldLabel} to ${newLabel}.`
    }
    case 'task_assignee_changed': {
      const newAssigneeId = event.metadata.new_assignee_id as string | null | undefined
      if (!newAssigneeId) {
        return `${actor} unassigned this task.`
      }
      const assigneeName = getActorDisplayName(newAssigneeId, currentUserId, members)
      return `${actor} assigned this task to ${assigneeName}.`
    }
    case 'task_due_date_changed': {
      const oldDue = event.metadata.old_due_date as string | null | undefined
      const newDue = event.metadata.new_due_date as string | null | undefined
      if (!oldDue && newDue) {
        return `${actor} set due date to ${formatDueDate(newDue)}.`
      }
      if (oldDue && !newDue) {
        return `${actor} removed the due date.`
      }
      if (oldDue && newDue) {
        return `${actor} changed due date from ${formatDueDate(oldDue)} to ${formatDueDate(newDue)}.`
      }
      return `${actor} updated the due date.`
    }
    case 'task_priority_changed': {
      const oldPri = event.metadata.old_priority as TaskPriority | undefined
      const newPri = event.metadata.new_priority as TaskPriority | undefined
      const oldLabel = oldPri && priorityConfig[oldPri] ? priorityConfig[oldPri].label : oldPri || 'unknown'
      const newLabel = newPri && priorityConfig[newPri] ? priorityConfig[newPri].label : newPri || 'unknown'
      return `${actor} changed priority from ${oldLabel} to ${newLabel}.`
    }
    case 'task_updated':
      return `${actor} updated task details.`
    case 'comment_created':
      return `${actor} added a comment.`
    case 'attachment_uploaded': {
      const filename = (event.metadata.filename as string) || 'a file'
      return `${actor} attached "${filename}".`
    }
    case 'attachment_deleted': {
      const filename = (event.metadata.filename as string) || 'a file'
      return `${actor} removed attachment "${filename}".`
    }
    default:
      return `${actor} updated this task.`
  }
}

export const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000))

  if (diffInSeconds < 60) return 'Just now'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h ago`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(1)} MB`
}

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'text/plain',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export const ALLOWED_ATTACHMENT_EXTENSIONS = [
  '.txt',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.doc',
  '.docx',
]

export const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const validateAttachmentFile = (file: File): { valid: boolean; error?: string } => {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds the 10 MB limit (current: ${formatFileSize(file.size)}).`,
    }
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  const isMimeAllowed = ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.type)
  const isExtAllowed = ALLOWED_ATTACHMENT_EXTENSIONS.includes(extension)

  if (!isMimeAllowed && !isExtAllowed) {
    return {
      valid: false,
      error: 'Unsupported file type. Only PDF, PNG, JPEG, TXT, DOC, and DOCX files are permitted.',
    }
  }

  return { valid: true }
}


