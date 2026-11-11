import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FC } from 'react'
import {
  CheckSquare,
  Search,
  Plus,
  Clock,
  AlertCircle,
  Calendar,
  CheckCircle2,
  User,
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
} from '../utils.ts'
import type { TaskRecord, OrgMemberOption, TaskStatus } from '../types.ts'
import type { ProjectRecord } from '../../projects/types.ts'

export const MyWorkPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [scopeFilter, setScopeFilter] = useState<'assigned' | 'all' | 'priority' | 'completed'>('assigned')

  // Modals & Drawers
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const orgId = currentOrganization?.id
  const userId = user?.id
  const userEmail = user?.email
  const canManage = currentRole === 'owner' || currentRole === 'manager'

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3000)
  }

  const fetchMyWorkData = useCallback(async (activeOrgId: string) => {
    try {
      setLoading(true)

      // 1. Fetch projects
      const { data: projectsData, error: projectsErr } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (projectsErr) throw projectsErr

      const projectRecords = (projectsData as ProjectRecord[]) || []
      const projectIds = projectRecords.map((p) => p.id)

      // 2. Fetch tasks & members
      const [tasksRes, membersRes] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('tasks').select('*').in('project_id', projectIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as TaskRecord[], error: null }),
        supabase.from('organization_members').select('id, user_id, role').eq('organization_id', activeOrgId),
      ])

      if (tasksRes.error) throw tasksRes.error
      if (membersRes.error) throw membersRes.error

      const rawMembers = membersRes.data || []
      const mappedMembers: OrgMemberOption[] = rawMembers.map((m) => {
        const isMe = m.user_id === userId
        const roleCap = m.role.charAt(0).toUpperCase() + m.role.slice(1)
        return {
          user_id: m.user_id,
          role: m.role,
          label: isMe
            ? `${userEmail ? userEmail + ' ' : ''}(You • ${roleCap})`
            : `Member (${m.user_id.slice(0, 8)}) • ${roleCap}`,
        }
      })

      setProjects(projectRecords)
      setTasks((tasksRes.data as TaskRecord[]) || [])
      setOrgMembers(mappedMembers)
    } catch (err) {
      console.error('Failed to load task workload:', err)
    } finally {
      setLoading(false)
    }
  }, [userId, userEmail])

  useEffect(() => {
    let isMounted = true
    const sync = async () => {
      if (!orgId) {
        if (isMounted) setLoading(false)
        return
      }
      await fetchMyWorkData(orgId)
    }
    void sync()
    return () => {
      isMounted = false
    }
  }, [orgId, fetchMyWorkData])

  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectRecord>()
    projects.forEach((p) => map.set(p.id, p))
    return map
  }, [projects])

  // Filter tasks based on scope and search
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // Scope filter
      if (scopeFilter === 'assigned' && t.assignee_id !== userId) return false
      if (scopeFilter === 'priority' && t.priority !== 'urgent' && t.priority !== 'high') return false
      if (scopeFilter === 'completed' && t.status !== 'done') return false
      if (scopeFilter !== 'completed' && t.status === 'done' && scopeFilter === 'assigned') return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = t.title.toLowerCase().includes(q)
        const descMatch = t.description?.toLowerCase().includes(q) || false
        const projName = projectMap.get(t.project_id)?.name.toLowerCase() || ''
        if (!titleMatch && !descMatch && !projName.includes(q)) return false
      }

      return true
    })
  }, [tasks, scopeFilter, searchQuery, userId, projectMap])

  // Stat metrics
  const myAssignedCount = useMemo(() => tasks.filter((t) => t.assignee_id === userId && t.status !== 'done').length, [tasks, userId])
  const inProgressCount = useMemo(() => tasks.filter((t) => (t.assignee_id === userId || scopeFilter === 'all') && t.status === 'in_progress').length, [tasks, userId, scopeFilter])
  const completedCount = useMemo(() => tasks.filter((t) => t.status === 'done').length, [tasks])
  const overdueCount = useMemo(() => tasks.filter((t) => isTaskOverdue(t.due_date, t.status)).length, [tasks])

  // Toggle quick task completion
  const handleToggleDone = useCallback(async (task: TaskRecord) => {
    const nextStatus: TaskStatus = task.status === 'done' ? 'todo' : 'done'
    const completedTimestamp = nextStatus === 'done' ? new Date().toISOString() : null
    try {
      const { error: updateErr } = await supabase
        .from('tasks')
        .update({ status: nextStatus, completed_at: completedTimestamp })
        .eq('id', task.id)

      if (updateErr) throw updateErr

      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      )
      showToast(nextStatus === 'done' ? 'Task marked as completed!' : 'Task reopened.')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update task.')
    }
  }, [])

  if (loading && tasks.length === 0) {
    return <LoadingScreen message="Loading your work queue..." />
  }

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-2.5 text-xs text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <CheckSquare className="h-7 w-7 text-indigo-400" />
            <span>My Work</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Keep track of your tasks, daily responsibilities, deadlines, and project milestones.
          </p>
        </div>

        {canManage && projects.length > 0 && (
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-500 hover:to-violet-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Assigned to Me</span>
            <User className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{myAssignedCount}</div>
          <p className="text-[11px] text-slate-500">Active tasks needing your attention</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>In Progress</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{inProgressCount}</div>
          <p className="text-[11px] text-slate-500">Currently undergoing active work</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Overdue Work</span>
            <AlertCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400">{overdueCount}</div>
          <p className="text-[11px] text-slate-500">Past target delivery dates</p>
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{completedCount}</div>
          <p className="text-[11px] text-slate-500">Tasks resolved across workspace</p>
        </div>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center rounded-xl bg-slate-900/80 p-1 border border-slate-800 text-xs flex-wrap">
          <button
            type="button"
            onClick={() => setScopeFilter('assigned')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              scopeFilter === 'assigned'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Assigned to Me ({myAssignedCount})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('priority')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              scopeFilter === 'priority'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            High Priority
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('completed')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
              scopeFilter === 'completed'
                ? 'bg-indigo-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks or project..."
            className="h-9 w-full rounded-lg border border-slate-800 bg-slate-950/80 pl-9 pr-3 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-2.5">
        {filteredTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800/80 bg-slate-900/30 p-12 text-center space-y-3">
            <CheckSquare className="h-10 w-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-semibold text-slate-300">No tasks in this view</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {scopeFilter === 'assigned'
                ? 'You currently have no open tasks assigned to you. Great job staying ahead!'
                : 'No tasks match the active filters or search terms.'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'done'
            const isOverdue = isTaskOverdue(task.due_date, task.status)
            const pMeta = priorityConfig[task.priority]
            const sMeta = statusConfig[task.status]
            const proj = projectMap.get(task.project_id)

            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`flex items-center gap-3.5 rounded-2xl border p-3.5 sm:p-4 transition-all duration-150 cursor-pointer ${
                  isDone
                    ? 'border-slate-800/50 bg-slate-950/40 opacity-70 hover:opacity-100'
                    : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90 shadow-sm'
                }`}
              >
                {/* Checkbox */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void handleToggleDone(task)
                  }}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-slate-950'
                      : 'border-slate-700 bg-slate-950 hover:border-indigo-500'
                  }`}
                  aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {isDone && <CheckCircle2 className="h-3.5 w-3.5 fill-current" />}
                </button>

                {/* Content */}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`font-semibold text-sm leading-snug ${
                        isDone ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {task.title}
                    </span>

                    {/* Project pill */}
                    {proj && (
                      <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.2 text-[10px] font-medium text-indigo-400">
                        {proj.name}
                      </span>
                    )}
                  </div>

                  {task.description && (
                    <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2.5 shrink-0 text-xs">
                  {/* Priority */}
                  <span className={`hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border ${pMeta.badge}`}>
                    {pMeta.label}
                  </span>

                  {/* Status */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${sMeta.badge}`}>
                    {sMeta.label}
                  </span>

                  {/* Due Date */}
                  {task.due_date && (
                    <div
                      className={`flex items-center gap-1 text-[11px] ${
                        isOverdue ? 'text-rose-400 font-bold' : 'text-slate-400'
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      <span>{formatDueDate(task.due_date)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Task Drawer */}
      {selectedTask && (
        <TaskDrawer
          task={selectedTask}
          isOpen={!!selectedTask}
          members={orgMembers}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={(updated) => {
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
            setSelectedTask(updated)
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
            setSelectedTask(null)
          }}
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
            showToast('New task added to your work queue!')
          }}
          members={orgMembers}
        />
      )}
    </div>
  )
}
