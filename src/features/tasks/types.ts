export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskRecord {
  id: string
  project_id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id: string | null
  due_date: string | null
  completed_at: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  status: TaskStatus
  priority: TaskPriority
  assignee_id?: string | null
  due_date?: string | null
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string | null
  due_date?: string | null
  completed_at?: string | null
}

export interface OrgMemberOption {
  user_id: string
  role: string
  label: string
}

export interface TaskFilterState {
  status: TaskStatus | 'all'
  priority: TaskPriority | 'all'
  assignee: string | 'all' | 'unassigned' | 'me'
  onlyOverdue: boolean
  sortBy: 'newest' | 'oldest' | 'due_date' | 'priority'
}

export type KanbanColumnId = 'todo' | 'in_progress' | 'review' | 'done'
export type ProjectViewMode = 'list' | 'board'

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  body: string
  created_at: string
  updated_at: string
}

export type ActivityEventType =
  | 'task_created'
  | 'task_status_changed'
  | 'task_assignee_changed'
  | 'task_due_date_changed'
  | 'task_priority_changed'
  | 'task_updated'
  | 'comment_created'
  | 'attachment_uploaded'
  | 'attachment_deleted'

export interface ActivityEvent {
  id: string
  organization_id: string
  project_id: string | null
  task_id: string | null
  actor_id: string | null
  event_type: ActivityEventType | string
  metadata: Record<string, unknown>
  created_at: string
}

export interface TaskAttachmentRecord {
  id: string
  organization_id: string
  project_id: string
  task_id: string
  uploaded_by: string
  storage_path: string
  original_filename: string
  mime_type: string
  size_bytes: number
  created_at: string
}


