import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckSquare,
  Search,
  Plus,
  FolderKanban,
  Clock,
  AlertCircle,
  UserCheck,
  RotateCcw,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import { CreateTaskModal } from '../components/CreateTaskModal.tsx'
import { TaskDrawer } from '../components/TaskDrawer.tsx'
import {
  statusConfig,
  priorityConfig,
  formatDueDate,
  isTaskOverdue,
  isTaskDueTomorrow,
} from '../utils.ts'
import type { TaskRecord, OrgMemberOption, TaskStatus, TaskPriority } from '../types.ts'
import type { ProjectRecord } from '../../projects/types.ts'

export const TasksPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [onlyAssignedToMe, setOnlyAssignedToMe] = useState(false)

  // Modals & Drawers
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const orgId = currentOrganization?.id
  const userId = user?.id
  const canCreate = currentRole === 'owner' || currentRole === 'manager'

  const fetchTasksData = useCallback(async (activeOrgId: string) => {
    try {
      // 1. Fetch organization projects
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('name', { ascending: true })

      if (projectsErr) throw projectsErr

      const projectRecords = (projectsData as ProjectRecord[]) || []
      setProjects(projectRecords)

      const projectIds = projectRecords.map((p) => p.id)

      if (projectIds.length === 0) {
        setTasks([])
        setLoading(false)
        return
      }

      // 2. Fetch tasks for all projects & org members concurrently
      const [tasksRes, membersRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('organization_members')
          .select('id, user_id, role')
          .eq('organization_id', activeOrgId),
      ])

      if (tasksRes.error) throw tasksRes.error
      if (membersRes.error) throw membersRes.error

      setTasks((tasksRes.data as TaskRecord[]) || [])

      const rawMembers = membersRes.data || []
      setOrgMembers(
        rawMembers.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          label: m.user_id === userId ? 'You' : `Member (${m.user_id.slice(0, 8)})`,
        }))
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization tasks.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true

    const sync = async () => {
      if (!orgId) {
        if (isMounted) setLoading(false)
        return
      }
      await fetchTasksData(orgId)
    }

    void sync()

    return () => {
      isMounted = false
    }
  }, [orgId, fetchTasksData])

  // Project lookup map
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectRecord>()
    projects.forEach((p) => map.set(p.id, p))
    return map
  }, [projects])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchTitle = t.title.toLowerCase().includes(query)
        const matchDesc = t.description?.toLowerCase().includes(query)
        const matchProject = projectMap.get(t.project_id)?.name.toLowerCase().includes(query)
        if (!matchTitle && !matchDesc && !matchProject) return false
      }

      // Status filter
      if (statusFilter !== 'all' && t.status !== statusFilter) return false

      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false

      // Assigned to me
      if (onlyAssignedToMe && t.assignee_id !== userId) return false

      return true
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter, onlyAssignedToMe, userId, projectMap])

  // Metric counts
  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      done: tasks.filter((t) => t.status === 'done').length,
    }
  }, [tasks])

  if (loading && tasks.length === 0) {
    return <LoadingScreen message="Loading workspace tasks..." />
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2.5">
            <CheckSquare className="h-7 w-7 text-indigo-400" />
            <span>Workspace Tasks</span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            View, search, and track all tasks across active projects in{' '}
            <span className="text-slate-200 font-medium">
              {currentOrganization?.name || 'your workspace'}
            </span>
            .
          </p>
        </div>

        {canCreate && projects.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Error notification */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => orgId && fetchTasksData(orgId)}
            className="inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'border-indigo-500/40 bg-indigo-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <span className="text-xs text-slate-400 block">Total Tasks</span>
          <span className="text-xl font-bold text-white">{counts.all}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('in_progress')}
          className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'in_progress'
              ? 'border-indigo-500/40 bg-indigo-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <span className="text-xs text-indigo-400 block">In Progress</span>
          <span className="text-xl font-bold text-white">{counts.in_progress}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('todo')}
          className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'todo'
              ? 'border-indigo-500/40 bg-indigo-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <span className="text-xs text-slate-400 block">To Do</span>
          <span className="text-xl font-bold text-white">{counts.todo}</span>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('done')}
          className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
            statusFilter === 'done'
              ? 'border-indigo-500/40 bg-indigo-950/20 shadow-sm'
              : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/70'
          }`}
        >
          <span className="text-xs text-emerald-400 block">Completed</span>
          <span className="text-xl font-bold text-emerald-400">{counts.done}</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, description, or project name..."
            className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/70 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status selector */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="review">In Review</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Priority selector */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-9 rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 text-xs text-slate-300 focus:border-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Assigned to me toggle */}
          <button
            type="button"
            onClick={() => setOnlyAssignedToMe(!onlyAssignedToMe)}
            className={`h-9 inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors cursor-pointer ${
              onlyAssignedToMe
                ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                : 'border-slate-800 bg-slate-950/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>Assigned to me</span>
          </button>
        </div>
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
          <CheckSquare className="h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300">No tasks found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            {tasks.length === 0
              ? 'No tasks have been created in this organization yet. Start by creating a task or project.'
              : 'No tasks match your active filters. Try adjusting your search query or status filters.'}
          </p>
          {projects.length === 0 ? (
            <Link
              to="/projects"
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
            >
              <FolderKanban className="h-4 w-4" />
              <span>Create first project</span>
            </Link>
          ) : (
            canCreate && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create new task</span>
              </button>
            )
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const project = projectMap.get(task.project_id)
            const statusMeta = statusConfig[task.status as TaskStatus] || statusConfig.todo
            const priorityMeta = priorityConfig[task.priority as TaskPriority] || priorityConfig.medium
            const isOverdue = isTaskOverdue(task.due_date, task.status)
            const isTomorrow = isTaskDueTomorrow(task.due_date, task.status)
            const isAssignedToMe = task.assignee_id === userId

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 hover:border-slate-700 hover:bg-slate-900/80 transition-all cursor-pointer"
              >
                {/* Left: Task title, Project Badge, & Description */}
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold border ${statusMeta.badge}`}
                    >
                      {statusMeta.label}
                    </span>

                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium border ${priorityMeta.badge}`}
                    >
                      {priorityMeta.label}
                    </span>

                    {project && (
                      <Link
                        to={`/projects/${project.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded bg-slate-800/90 px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                      >
                        <FolderKanban className="h-3 w-3 text-slate-500" />
                        <span>{project.name}</span>
                      </Link>
                    )}

                    {isAssignedToMe && (
                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[9px] font-bold text-indigo-300">
                        Assigned to You
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {task.description}
                    </p>
                  )}
                </div>

                {/* Right: Due Date & Action */}
                <div className="flex items-center gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60 text-xs">
                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1 text-xs ${
                        isOverdue
                          ? 'text-rose-400 font-semibold'
                          : isTomorrow
                          ? 'text-amber-400 font-medium'
                          : 'text-slate-400'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDueDate(task.due_date)}</span>
                    </div>
                  )}

                  <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
                    View &rarr;
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setSelectedTask(updated)
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
            setSelectedTask(null)
          }}
          members={orgMembers}
        />
      )}

      {/* Create Task Modal */}
      {isCreateModalOpen && projects.length > 0 && (
        <CreateTaskModal
          projectId={projects[0].id}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [newTask, ...prev])
            setIsCreateModalOpen(false)
          }}
          members={orgMembers}
        />
      )}
    </div>
  )
}
