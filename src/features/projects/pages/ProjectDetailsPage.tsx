import { useEffect, useState, useCallback, useMemo } from 'react'
import type { FC, MouseEvent } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  FolderKanban,
  Calendar,
  User,
  Edit3,
  Trash2,
  AlertCircle,
  Clock,
  CheckSquare,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Circle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  X,
  SlidersHorizontal,
  Kanban,
  List,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import type { RealtimeConnectionStatus } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { useNotifications } from '../../notifications/index.ts'
import { EditProjectModal } from '../components/EditProjectModal.tsx'
import { DeleteProjectDialog } from '../components/DeleteProjectDialog.tsx'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import {
  CreateTaskModal,
  TaskDrawer,
  KanbanBoard,
  isTaskOverdue,
  isTaskDueTomorrow,
  formatDueDate,
  statusConfig,
  priorityConfig,
  sortTasks,
  getNowIsoString,
} from '../../tasks/index.ts'
import type {
  OrgMemberOption,
  ProjectViewMode,
  TaskPriority,
  TaskRecord,
  TaskStatus,
} from '../../tasks/types.ts'
import type { ProjectRecord } from '../types.ts'

const getSavedViewMode = (projId?: string): ProjectViewMode => {
  if (typeof window !== 'undefined' && projId) {
    try {
      const saved = localStorage.getItem(`projectflow_view_${projId}`)
      if (saved === 'list' || saved === 'board') return saved
    } catch {
      // LocalStorage access restricted or unavailable
    }
  }
  return 'board'
}

export const ProjectDetailsPage: FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()
  const { refreshNotifications } = useNotifications()

  // View mode state with per-project memory and localStorage persistence
  const [viewPreferences, setViewPreferences] = useState<Record<string, ProjectViewMode>>({})
  const viewMode: ProjectViewMode =
    (projectId && viewPreferences[projectId]) || getSavedViewMode(projectId)

  const handleViewModeChange = (mode: ProjectViewMode) => {
    if (!projectId) return
    setViewPreferences((prev) => ({ ...prev, [projectId]: mode }))
    try {
      localStorage.setItem(`projectflow_view_${projectId}`, mode)
    } catch {
      // LocalStorage write error ignored
    }
  }

  // Project state
  const [project, setProject] = useState<ProjectRecord | null>(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [projectError, setProjectError] = useState<string | null>(null)
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false)
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false)

  // Tasks state
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [tasksError, setTasksError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('connecting')
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([])

  // Modal / Drawer state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const taskIdParam = searchParams.get('taskId')
  const currentTaskId = activeTaskId || taskIdParam

  // Derived selected task based on currentTaskId and tasks array
  const selectedTask = useMemo(() => {
    if (!currentTaskId || tasks.length === 0) return null
    return tasks.find((t) => t.id === currentTaskId) || null
  }, [currentTaskId, tasks])

  // Filters and Sorting
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'due_date' | 'priority'>('newest')

  const canManageProject = currentRole === 'owner' || currentRole === 'manager'
  const canCreateTask = currentRole === 'owner' || currentRole === 'manager'

  // Fetch organization members for assignees
  const fetchOrgMembers = useCallback(async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, user_id, role')
        .eq('organization_id', orgId)

      if (error || !data) {
        return
      }

      const options: OrgMemberOption[] = data.map((m) => {
        const isMe = m.user_id === user?.id
        const roleCapitalized = m.role.charAt(0).toUpperCase() + m.role.slice(1)
        return {
          user_id: m.user_id,
          role: m.role,
          label: isMe
            ? `${user?.email ? user.email + ' ' : ''}(You • ${roleCapitalized})`
            : `Member (${m.user_id.slice(0, 8)}) • ${roleCapitalized}`,
        }
      })

      setOrgMembers(options)
    } catch {
      // Organization members lookup is best-effort for assignee dropdown
    }
  }, [user])

  // Fetch tasks for the current project
  const fetchTasks = useCallback(async (projId: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projId)
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42501' || error.message.includes('row-level security')) {
          setTasksError('Permission denied: You do not have access to view tasks for this project.')
        } else {
          setTasksError(error.message || 'Failed to load project tasks.')
        }
        setTasks([])
        return
      }

      setTasks((data as TaskRecord[]) || [])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setTasksError(msg)
      setTasks([])
    } finally {
      setTasksLoading(false)
    }
  }, [])

  // Fetch project details, tasks, and org members
  const fetchProjectAndData = useCallback(async (id: string, orgId: string) => {
    try {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('id, organization_id, name, description, created_by, created_at, updated_at')
        .eq('id', id)
        .eq('organization_id', orgId)
        .maybeSingle()

      if (projErr) {
        if (projErr.code === '42501' || projErr.message.includes('row-level security')) {
          setProjectError('Permission denied: You do not have access to this project.')
        } else {
          setProjectError('Unable to load project details.')
        }
        setProject(null)
        setTasks([])
        setProjectLoading(false)
        setTasksLoading(false)
        return
      }

      if (!projData) {
        setProject(null)
        setTasks([])
        setProjectLoading(false)
        setTasksLoading(false)
        return
      }

      setProject(projData as ProjectRecord)
      setProjectLoading(false)

      await Promise.all([
        fetchTasks(projData.id),
        fetchOrgMembers(orgId),
      ])
    } catch {
      setProjectError('An unexpected error occurred while loading this project.')
      setProject(null)
      setTasks([])
      setProjectLoading(false)
      setTasksLoading(false)
    }
  }, [fetchTasks, fetchOrgMembers])

  useEffect(() => {
    let isMounted = true

    const syncData = async () => {
      if (!projectId || !currentOrganization) {
        if (isMounted) {
          setProjectLoading(false)
          setTasksLoading(false)
        }
        return
      }

      await fetchProjectAndData(projectId, currentOrganization.id)
    }

    void syncData()

    return () => {
      isMounted = false
    }
  }, [projectId, currentOrganization, fetchProjectAndData])

  // Scoped Supabase Realtime subscription for project tasks
  useEffect(() => {
    if (!projectId) return

    const debouncedRefetch = createDebounce(() => {
      void fetchTasks(projectId)
    }, 300)

    const channel = supabase
      .channel(`realtime:project-tasks:${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          debouncedRefetch.trigger()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('unavailable')
        }
      })

    return () => {
      debouncedRefetch.cancel()
      void supabase.removeChannel(channel)
    }
  }, [projectId, fetchTasks])

  // Clear all filters handler
  const handleClearFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setAssigneeFilter('all')
    setOverdueOnly(false)
    setSearchQuery('')
    setSortBy('newest')
  }

  const hasActiveFilters =
    statusFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assigneeFilter !== 'all' ||
    overdueOnly ||
    searchQuery.trim().length > 0 ||
    sortBy !== 'newest'

  // Client-side filtering & sorting
  const filteredTasks = useMemo(() => {
    const list = tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      if (assigneeFilter === 'unassigned' && t.assignee_id !== null) return false
      if (assigneeFilter === 'me' && t.assignee_id !== user?.id) return false
      if (
        assigneeFilter !== 'all' &&
        assigneeFilter !== 'unassigned' &&
        assigneeFilter !== 'me' &&
        t.assignee_id !== assigneeFilter
      ) {
        return false
      }
      if (overdueOnly && !isTaskOverdue(t.due_date, t.status)) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = t.title.toLowerCase().includes(q)
        const descMatch = t.description?.toLowerCase().includes(q) ?? false
        if (!titleMatch && !descMatch) return false
      }

      return true
    })

    return sortTasks(list, sortBy)
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, overdueOnly, searchQuery, sortBy, user?.id])

  // Task mutation handlers
  const handleSelectTask = (task: TaskRecord) => {
    setActiveTaskId(task.id)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('taskId', task.id)
        return next
      },
      { replace: true }
    )
  }

  const handleCloseDrawer = () => {
    setActiveTaskId(null)
    if (searchParams.has('taskId')) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('taskId')
          return next
        },
        { replace: true }
      )
    }
  }

  const handleTaskCreated = (newTask: TaskRecord) => {
    setTasks((prev) => [newTask, ...prev])
    setIsCreateTaskOpen(false)
    void refreshNotifications()
  }

  const handleTaskUpdated = (updatedTask: TaskRecord) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
    void refreshNotifications()
  }

  const handleTaskDeleted = (deletedTaskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId))
    if (currentTaskId === deletedTaskId) {
      handleCloseDrawer()
    }
    void refreshNotifications()
  }

  // Status change handler for Drag & Drop, quick card selector, and List view checkbox
  const handleTaskStatusUpdate = useCallback(
    async (task: TaskRecord, newStatus: TaskStatus): Promise<boolean> => {
      const canEditThisTask =
        currentRole === 'owner' ||
        currentRole === 'manager' ||
        (currentRole === 'member' && task.assignee_id === user?.id)

      if (!canEditThisTask) {
        setTasksError('Permission denied: You do not have permission to change this task status.')
        return false
      }

      if (task.status === newStatus) return true

      const isMovingToDone = newStatus === 'done'
      const newCompletedAt = isMovingToDone
        ? getNowIsoString()
        : task.status === 'done'
          ? null
          : task.completed_at

      // Optimistic state update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, status: newStatus, completed_at: newCompletedAt }
            : t
        )
      )

      try {
        const { data, error } = await supabase
          .from('tasks')
          .update({
            status: newStatus,
            completed_at: newCompletedAt,
          })
          .eq('id', task.id)
          .eq('project_id', task.project_id)
          .select('*')
          .single()

        if (error) {
          // Rollback on failure
          setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
          if (error.code === '42501' || error.message.includes('row-level security')) {
            setTasksError('Permission denied: Supabase RLS rejected this status update.')
          } else {
            setTasksError(error.message || 'Failed to update task status.')
          }
          return false
        }

        // Apply authoritative response
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? (data as TaskRecord) : t))
        )
        setTasksError(null)
        void refreshNotifications()
        return true
      } catch (err: unknown) {
        // Rollback on failure
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
        const msg = err instanceof Error ? err.message : 'Failed to update task status.'
        setTasksError(msg)
        return false
      }
    },
    [currentRole, user?.id, refreshNotifications]
  )

  // Quick toggle task completion status directly from the list item
  const handleToggleTaskStatus = async (task: TaskRecord, e: MouseEvent) => {
    e.stopPropagation()
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    await handleTaskStatusUpdate(task, nextStatus)
  }

  if (projectLoading) {
    return <LoadingScreen message="Loading project..." />
  }

  // Inaccessible or Not Found Project
  if (!project) {
    return (
      <div className="space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>

        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
            <AlertCircle className="h-6 w-6 text-amber-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Project Not Found or Unavailable</h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md">
            {projectError ||
              'This project does not exist, belongs to another organization, or your account lacks permission to view it.'}
          </p>
          <Link
            to="/projects"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Projects</span>
          </Link>
        </div>
      </div>
    )
  }

  const isCreator = user?.id === project.created_by
  const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const updatedDate = new Date(project.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="space-y-8">
      {/* Back button & top bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Projects</span>
        </Link>

        {/* Project Edit & Delete controls (Owners & Managers only) */}
        {canManageProject && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditProjectOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <Edit3 className="h-3.5 w-3.5 text-amber-400" />
              <span>Edit Project</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDeleteProjectOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Project</span>
            </button>
          </div>
        )}
      </div>

      {/* Project Overview Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-md space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/15 text-indigo-400 border border-indigo-500/25">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {project.name}
              </h1>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed max-w-3xl whitespace-pre-line">
              {project.description || 'No description provided for this project.'}
            </p>
          </div>

          <span className="self-start rounded-md border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-300">
            {currentOrganization?.name}
          </span>
        </div>

        {/* Project Metadata footer */}
        <div className="flex flex-wrap items-center gap-6 pt-5 border-t border-slate-800/60 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Creator: <span className="text-slate-200 font-medium">{isCreator ? 'You' : 'Team Member'}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Created: <span className="text-slate-200 font-medium">{createdDate}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-500" />
            <span>
              Updated: <span className="text-slate-200 font-medium">{updatedDate}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TASKS SECTION                                                             */}
      {/* ========================================================================= */}
      <section className="space-y-4" aria-label="Project Tasks">
        {/* Header bar with Count, View Toggle, and Create Task action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Project Tasks</h2>
            </div>
            <span className="rounded-full bg-slate-800 border border-slate-700/80 px-2.5 py-0.5 text-xs font-medium text-slate-300">
              {tasks.length}
            </span>
            {realtimeStatus === 'connected' && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium"
                title="Realtime updates active"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
            {realtimeStatus === 'unavailable' && (
              <span
                className="hidden sm:inline-flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-xs text-amber-400 font-medium"
                title="Live updates unavailable (manual refresh active)"
              >
                Live unavailable
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
            {/* View Mode Toggle: Board vs List */}
            <div
              className="flex items-center rounded-lg border border-slate-800 bg-slate-950/80 p-0.5"
              role="group"
              aria-label="View toggle"
            >
              <button
                type="button"
                onClick={() => handleViewModeChange('board')}
                aria-pressed={viewMode === 'board'}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${viewMode === 'board'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                title="Kanban Board view"
              >
                <Kanban className="h-3.5 w-3.5" />
                <span>Board</span>
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                aria-pressed={viewMode === 'list'}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${viewMode === 'list'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                title="Task List view"
              >
                <List className="h-3.5 w-3.5" />
                <span>List</span>
              </button>
            </div>

            {canCreateTask && (
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Tasks Error banner */}
        {tasksError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-400" />
              <span>{tasksError}</span>
            </div>
            <button
              type="button"
              onClick={() => void fetchTasks(project.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/20 px-3 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/30 transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 backdrop-blur-xs space-y-3">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9.5 w-full rounded-lg border border-slate-800 bg-slate-950/60 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 transition-colors focus:border-indigo-500 focus:bg-slate-950 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-500 hover:text-slate-300 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort Select */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as 'newest' | 'oldest' | 'due_date' | 'priority')
                }
                className="h-9.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 text-xs text-slate-200 transition-colors focus:border-indigo-500 focus:outline-none"
                aria-label="Sort tasks by"
              >
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="due_date">Sort: Due Date</option>
                <option value="priority">Sort: Priority</option>
              </select>
            </div>
          </div>

          {/* Filter Pills Row */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 mr-1">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Filters:</span>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-300 transition-colors focus:border-indigo-500 focus:outline-none"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">In Review</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | 'all')}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-300 transition-colors focus:border-indigo-500 focus:outline-none"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-8 rounded-lg border border-slate-800 bg-slate-950/60 px-2.5 text-xs text-slate-300 transition-colors focus:border-indigo-500 focus:outline-none"
              aria-label="Filter by assignee"
            >
              <option value="all">All Assignees</option>
              <option value="me">Assigned to Me</option>
              <option value="unassigned">Unassigned</option>
              {orgMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Overdue Only Toggle Button */}
            <button
              type="button"
              onClick={() => setOverdueOnly((prev) => !prev)}
              className={`h-8 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${overdueOnly
                  ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Overdue Only</span>
            </button>

            {/* Clear All Filters */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-8 inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
              >
                <X className="h-3 w-3" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* Task List Content */}
        {tasksLoading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-400 mb-2" />
            <p className="text-xs text-slate-400">Loading project tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          /* Empty project state */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-3">
              <CheckSquare className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No tasks yet</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              {canCreateTask
                ? 'Break this project down into actionable tasks, assign team members, and track completion.'
                : 'No tasks have been added to this project yet.'}
            </p>
            {canCreateTask && (
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Task</span>
              </button>
            )}
          </div>
        ) : filteredTasks.length === 0 ? (
          /* Empty filtered state */
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20 p-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800/80 text-slate-400 mb-3">
              <Filter className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white">No matching tasks</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              None of the tasks in this project match your current filter and search criteria.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset all filters</span>
            </button>
          </div>
        ) : viewMode === 'board' ? (
          <KanbanBoard
            tasks={filteredTasks}
            cancelledCount={tasks.filter((t) => t.status === 'cancelled').length}
            onTaskStatusChange={handleTaskStatusUpdate}
            onSelectTask={handleSelectTask}
            onOpenCreateModal={() => setIsCreateTaskOpen(true)}
            canCreateTask={canCreateTask}
            members={orgMembers}
            currentUserId={user?.id}
            currentRole={currentRole}
            onSwitchToListView={() => handleViewModeChange('list')}
          />
        ) : (
          /* Task List */
          <div className="space-y-2.5" role="list">
            {filteredTasks.map((task) => {
              const overdue = isTaskOverdue(task.due_date, task.status)
              const dueTomorrow = isTaskDueTomorrow(task.due_date, task.status)
              const isDone = task.status === 'done'
              const isCancelled = task.status === 'cancelled'
              const canEditThis =
                currentRole === 'owner' ||
                currentRole === 'manager' ||
                (currentRole === 'member' && task.assignee_id === user?.id)

              const isAssignedToMe = Boolean(user && task.assignee_id === user.id)
              const assignedOption = orgMembers.find((m) => m.user_id === task.assignee_id)

              return (
                <div
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-4 transition-all cursor-pointer ${overdue
                      ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60 hover:bg-rose-500/10'
                      : isDone
                        ? 'border-slate-800/60 bg-slate-900/20 opacity-80 hover:opacity-100 hover:border-slate-700'
                        : 'border-slate-800/80 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  role="listitem"
                >
                  {/* Left Side: Completion Toggle & Title & Description */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Status Toggle Checkbox */}
                    <button
                      type="button"
                      disabled={!canEditThis}
                      onClick={(e) => void handleToggleTaskStatus(task, e)}
                      aria-label={
                        isDone
                          ? 'Mark task as incomplete'
                          : 'Mark task as completed'
                      }
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${canEditThis ? 'cursor-pointer' : 'cursor-default opacity-60'
                        } ${isDone
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                          : 'border-slate-700 bg-slate-950/60 text-transparent hover:border-indigo-400'
                        }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold transition-colors ${isDone
                              ? 'text-slate-400 line-through'
                              : isCancelled
                                ? 'text-slate-500 line-through'
                                : 'text-white group-hover:text-indigo-300'
                            }`}
                        >
                          {task.title}
                        </span>

                        {overdue && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                            <AlertCircle className="h-2.5 w-2.5" />
                            Overdue
                          </span>
                        )}

                        {dueTomorrow && !overdue && !isDone && !isCancelled && (
                          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            <Clock className="h-2.5 w-2.5" />
                            Due tomorrow
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 max-w-2xl">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Badges (Status, Priority, Assignee, Due Date) */}
                  <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto shrink-0 pl-8 sm:pl-0">
                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${statusConfig[task.status].badge}`}
                    >
                      {statusConfig[task.status].label}
                    </span>

                    {/* Priority Badge */}
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${priorityConfig[task.priority].badge}`}
                    >
                      {priorityConfig[task.priority].label}
                    </span>

                    {/* Assignee Tag */}
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${isAssignedToMe
                          ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300'
                          : task.assignee_id
                            ? 'border-slate-800 bg-slate-900 text-slate-300'
                            : 'border-slate-800/60 bg-slate-950/40 text-slate-500'
                        }`}
                    >
                      <User className="h-3 w-3 shrink-0" />
                      <span className="max-w-[130px] truncate">
                        {isAssignedToMe
                          ? 'You'
                          : assignedOption
                            ? assignedOption.label.split(' • ')[0]
                            : task.assignee_id
                              ? `Member (${task.assignee_id.slice(0, 6)})`
                              : 'Unassigned'}
                      </span>
                    </div>

                    {/* Due Date */}
                    {task.due_date && (
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium ${overdue
                            ? 'border-rose-500/30 bg-rose-500/15 text-rose-300 font-semibold'
                            : dueTomorrow
                            ? 'border-amber-500/30 bg-amber-500/15 text-amber-300 font-medium'
                            : 'border-slate-800 bg-slate-900 text-slate-400'
                          }`}
                      >
                        <Calendar className="h-3 w-3 shrink-0" />
                        <span>{dueTomorrow ? 'Due tomorrow' : formatDueDate(task.due_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Edit Project Modal */}
      <EditProjectModal
        key={project.id}
        project={project}
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        onProjectUpdated={(updated) => setProject(updated)}
      />

      {/* Delete Project Confirmation Dialog */}
      <DeleteProjectDialog
        project={project}
        isOpen={isDeleteProjectOpen}
        onClose={() => setIsDeleteProjectOpen(false)}
        onProjectDeleted={() => navigate('/projects', { replace: true })}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        projectId={project.id}
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onTaskCreated={handleTaskCreated}
        members={orgMembers}
      />

      {/* Task Details and Editing Slide-over Drawer */}
      {selectedTask && (
        <TaskDrawer
          key={selectedTask.id}
          task={selectedTask}
          isOpen={Boolean(selectedTask)}
          onClose={handleCloseDrawer}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
          members={orgMembers}
        />
      )}
    </div>
  )
}
