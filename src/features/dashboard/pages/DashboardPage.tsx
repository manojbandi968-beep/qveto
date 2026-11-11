import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Play,
  Pause,
  Plus,
  RotateCcw,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  MoreVertical,
  FolderPlus,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import type { RealtimeConnectionStatus } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import { TaskDrawer } from '../../tasks/components/TaskDrawer.tsx'
import { CreateTaskModal } from '../../tasks/components/CreateTaskModal.tsx'
import { CreateProjectModal } from '../../projects/components/CreateProjectModal.tsx'
import type { ProjectRecord } from '../../projects/types.ts'
import type { TaskRecord, OrgMemberOption, ActivityEvent } from '../../tasks/types.ts'

interface NotificationSimple {
  id: string
  organization_id: string
  read_at: string | null
  created_at: string
}

interface ScheduleSlot {
  id: string
  time: string
  type: string
  title: string
  description: string
  color: string
}

export const DashboardPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole, loading: orgLoading } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  // Data states
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([])
  const [, setActivityEvents] = useState<ActivityEvent[]>([])
  const [, setNotifications] = useState<NotificationSimple[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('connecting')

  // Interactive UI States
  const [timelineFilter, setTimelineFilter] = useState<'today' | 'week' | 'month' | 'year'>('week')
  const [isFilterBarOpen, setIsFilterBarOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Modals & Popovers
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isActivityMenuOpen, setIsActivityMenuOpen] = useState(false)
  const [selectedScheduleSlot, setSelectedScheduleSlot] = useState<ScheduleSlot | null>(null)

  // Reminders state (interactive)
  const [reminders, setReminders] = useState([
    { id: '1', time: '09:30 AM', title: 'Check automated test runs', priority: 'low', done: false },
    { id: '2', time: '10:00 AM', title: 'Client Presentation & review', priority: 'high', done: false },
    { id: '3', time: '04:15 PM', title: 'Production staging deployment', priority: 'urgent', done: false },
  ])

  // Schedule slots state (interactive)
  const [scheduleSlots] = useState<ScheduleSlot[]>([
    {
      id: 's1',
      time: '10:00 AM',
      type: 'Sync',
      title: 'Sprint roadmap and team feedback',
      description: 'Review active deliverables and resolve cross-discipline blockers with team.',
      color: 'text-rose-400',
    },
    {
      id: 's2',
      time: '01:00 PM',
      type: 'Design',
      title: 'Design system component audit',
      description: 'Standardize dark/light theme tokens and button typography across views.',
      color: 'text-indigo-400',
    },
    {
      id: 's3',
      time: '03:00 PM',
      type: 'Deploy',
      title: 'Staging verification and test runs',
      description: 'Verify PostgreSQL RLS policies and validate staging environment builds.',
      color: 'text-emerald-400',
    },
  ])

  const orgId = currentOrganization?.id
  const userId = user?.id
  const userEmail = user?.email
  const canManage = currentRole === 'owner' || currentRole === 'manager'

  const showToast = (msg: string) => {
    setSuccessToast(msg)
    setTimeout(() => setSuccessToast(null), 3000)
  }

  // Realtime Data Fetching
  const fetchDashboardData = useCallback(async (activeOrgId: string, currentUserId?: string) => {
    try {
      // 1. Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('organization_id', activeOrgId)
        .order('created_at', { ascending: false })

      if (projectsError) throw projectsError

      const projectRecords = (projectsData as ProjectRecord[]) || []
      const projectIds = projectRecords.map((p) => p.id)

      // 2. Concurrently fetch tasks, organization members, activity events, and notifications
      const [tasksRes, membersRes, activityRes, notificationsRes] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('tasks').select('*').in('project_id', projectIds).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as TaskRecord[], error: null }),
        supabase.from('organization_members').select('id, user_id, role').eq('organization_id', activeOrgId),
        supabase.from('activity_events').select('*').eq('organization_id', activeOrgId).order('created_at', { ascending: false }).limit(10),
        currentUserId
          ? supabase.from('notifications').select('id, organization_id, read_at, created_at').eq('organization_id', activeOrgId).eq('recipient_id', currentUserId)
          : Promise.resolve({ data: [] as NotificationSimple[], error: null }),
      ])

      if (tasksRes.error) throw tasksRes.error
      if (membersRes.error) throw membersRes.error
      if (activityRes.error) throw activityRes.error

      const rawMembers = membersRes.data || []
      const mappedMembers: OrgMemberOption[] = rawMembers.map((m) => {
        const isMe = m.user_id === currentUserId
        const roleCapitalized = m.role.charAt(0).toUpperCase() + m.role.slice(1)
        return {
          user_id: m.user_id,
          role: m.role,
          label: isMe
            ? `${userEmail ? userEmail + ' ' : ''}(You • ${roleCapitalized})`
            : `Member (${m.user_id.slice(0, 8)}) • ${roleCapitalized}`,
        }
      })

      setProjects(projectRecords)
      setTasks((tasksRes.data as TaskRecord[]) || [])
      setOrgMembers(mappedMembers)
      setActivityEvents((activityRes.data as ActivityEvent[]) || [])
      setNotifications((notificationsRes.data as NotificationSimple[]) || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization report data.')
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  // Initial Sync
  useEffect(() => {
    let isMounted = true
    const sync = async () => {
      if (!orgId) {
        if (isMounted) setLoading(false)
        return
      }
      await fetchDashboardData(orgId, userId)
    }
    void sync()
    return () => {
      isMounted = false
    }
  }, [orgId, userId, fetchDashboardData])

  const projectIdsKey = useMemo(() => projects.map((p) => p.id).sort().join(','), [projects])

  // Realtime Supabase Subscription
  useEffect(() => {
    if (!orgId) return

    const debouncedRefetch = createDebounce(() => {
      void fetchDashboardData(orgId, userId)
    }, 350)

    let channel = supabase.channel(`realtime:modern-dashboard:${orgId}`)

    // Listen for project mutations
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects', filter: `organization_id=eq.${orgId}` },
      () => debouncedRefetch.trigger()
    )

    // Listen for activity events
    channel = channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'activity_events', filter: `organization_id=eq.${orgId}` },
      () => debouncedRefetch.trigger()
    )

    // Listen for task changes
    projects.forEach((proj) => {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${proj.id}` },
        () => debouncedRefetch.trigger()
      )
    })

    channel.subscribe((status) => {
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
  }, [orgId, userId, projects, projectIdsKey, fetchDashboardData])

  // Project map for quick lookup
  const projectMap = useMemo(() => {
    const map = new Map<string, ProjectRecord>()
    projects.forEach((p) => map.set(p.id, p))
    return map
  }, [projects])

  // Filtered tasks for timeline
  const filteredTimelineTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false
      return true
    })
  }, [tasks, statusFilter, priorityFilter])

  // Today's Tasks
  const todayTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
    return active.slice(0, 4)
  }, [tasks])

  // Projects Distribution for Donut Chart
  const projectDistribution = useMemo(() => {
    if (projects.length === 0 || tasks.length === 0) return []
    const total = tasks.length
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

    return projects.map((p, idx) => {
      const count = tasks.filter((t) => t.project_id === p.id).length
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0
      return {
        id: p.id,
        name: p.name,
        count,
        percentage,
        color: colors[idx % colors.length],
      }
    }).sort((a, b) => b.count - a.count).slice(0, 4)
  }, [projects, tasks])

  // Overall Activity Percentage
  const activityRate = useMemo(() => {
    if (tasks.length === 0) return 70
    const completed = tasks.filter((t) => t.status === 'done').length
    return Math.min(100, Math.max(15, Math.round((completed / tasks.length) * 100)))
  }, [tasks])

  // Week schedule mapping
  const scheduleDays = useMemo(() => {
    return [
      { day: 'MON 18', tasks: filteredTimelineTasks.filter((_, i) => i % 5 === 0) },
      { day: 'TUE 19', tasks: filteredTimelineTasks.filter((_, i) => i % 5 === 1) },
      { day: 'WED 20', tasks: filteredTimelineTasks.filter((_, i) => i % 5 === 2), active: true },
      { day: 'THU 21', tasks: filteredTimelineTasks.filter((_, i) => i % 5 === 3) },
      { day: 'FRI 22', tasks: filteredTimelineTasks.filter((_, i) => i % 5 === 4) },
    ]
  }, [filteredTimelineTasks])

  // Smart handler for "Create Task": if 0 projects exist, prompts to create project first!
  const handleOpenTaskCreation = () => {
    if (projects.length === 0) {
      setIsCreateProjectOpen(true)
    } else {
      setIsCreateTaskOpen(true)
    }
  }

  // Toggle Reminder Done status
  const handleToggleReminder = (id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !r.done } : r))
    )
    showToast('Reminder status updated.')
  }

  if (orgLoading || (loading && projects.length === 0 && tasks.length === 0)) {
    return <LoadingScreen message="Loading dashboard..." />
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-4">
        <h3 className="text-base font-semibold text-rose-300">Unable to load dashboard data</h3>
        <p className="text-xs text-rose-200/80 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={() => orgId && fetchDashboardData(orgId, userId)}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:text-white cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Retry</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl border border-emerald-500/30 bg-emerald-950/90 px-4 py-2.5 text-xs text-emerald-300 shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Realtime Status Sub-indicator & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-300">
            {realtimeStatus === 'connected' ? 'Realtime Connected' : 'Connecting to Realtime...'}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400">
            {tasks.length} total tasks across {projects.length} {projects.length === 1 ? 'project' : 'projects'}
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {canManage && (
            <button
              type="button"
              onClick={() => setIsCreateProjectOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              <span>Create Project</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              onClick={handleOpenTaskCreation}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{projects.length === 0 ? 'Create First Project' : 'Create Task'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP ROW: 2 BALANCED BENTO CARDS (Today's Tasks & Today's Schedule) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Today's Tasks */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Today&apos;s tasks</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                  {todayTasks.length}
                </span>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5"
              >
                <span>Manage</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Task list items */}
            <div className="space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
                  <p className="text-xs text-slate-500">No active tasks in this workspace.</p>
                  <button
                    type="button"
                    onClick={handleOpenTaskCreation}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Task for Today</span>
                  </button>
                </div>
              ) : (
                todayTasks.map((t, idx) => {
                  const proj = projectMap.get(t.project_id)
                  const isFirst = idx === 0
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="flex items-center gap-3 rounded-2xl border border-slate-800/60 bg-slate-950/60 p-3 hover:border-slate-700 hover:bg-slate-950/90 transition-all cursor-pointer"
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedTask(t)
                        }}
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white cursor-pointer ${
                          isFirst ? 'bg-rose-500' : 'bg-indigo-600/80'
                        }`}
                      >
                        {isFirst ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                      </button>
                      <div className="min-w-0 flex-1 text-xs">
                        <p className="font-semibold text-slate-200 truncate">{t.title}</p>
                        <p className="text-[11px] text-indigo-400 truncate mt-0.5">
                          {proj?.name || 'Project'}
                        </p>
                      </div>
                      <span className="text-slate-500 hover:text-amber-400 text-xs transition-colors">
                        ★
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Today's Schedule & Milestones */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Today&apos;s schedule</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                  {scheduleSlots.length}
                </span>
              </div>
              <Link
                to="/tasks"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-0.5"
              >
                <span>View all</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {scheduleSlots.map((slot) => (
                <div
                  key={slot.id}
                  onClick={() => setSelectedScheduleSlot(slot)}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1 hover:border-slate-700 hover:bg-slate-950/90 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className={`font-bold ${slot.color}`}>{slot.time}</span>
                    <span className="text-slate-500">{slot.type}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                    {slot.title}
                  </p>
                </div>
              ))}

              {/* Quick Add Schedule/Task Slot */}
              <button
                type="button"
                onClick={handleOpenTaskCreation}
                className="rounded-2xl border border-dashed border-indigo-500/30 bg-indigo-950/10 p-3 flex flex-col items-center justify-center text-center text-indigo-400 hover:bg-indigo-950/20 hover:border-indigo-500/50 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4 mb-0.5" />
                <span className="text-[11px] font-semibold">New Task</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LOWER SECTION: PROJECTS SCHEDULE & TIMELINE (LEFT) + ANALYTICS (RIGHT) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (8 cols): Projects Schedule Grid */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">Projects</h3>
              {/* Working Filter Toggle Button */}
              <button
                type="button"
                onClick={() => setIsFilterBarOpen(!isFilterBarOpen)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  isFilterBarOpen || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                    : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:text-white hover:border-slate-700'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>
            </div>

            {/* Time Filter Selector: Today / Week / Month / Year */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs">
              {(['today', 'week', 'month', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimelineFilter(mode)}
                  className={`rounded-lg px-3 py-1 font-medium capitalize transition-colors cursor-pointer ${
                    timelineFilter === mode
                      ? 'bg-slate-800 text-white shadow-sm font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible Filter Bar */}
          {isFilterBarOpen && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Priority:</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-white focus:outline-none"
                  >
                    <option value="all">All</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              {(statusFilter !== 'all' || priorityFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all')
                    setPriorityFilter('all')
                  }}
                  className="text-xs text-indigo-400 hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>
          )}

          {/* DYNAMIC VIEW BASED ON SELECTED TIMELINE FILTER */}
          {timelineFilter === 'today' && (
            <div className="space-y-3 py-2">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Today&apos;s Active Timeline</span>
                <span className="text-rose-400 font-mono">● LIVE</span>
              </div>
              <div className="space-y-2.5">
                {[
                  { time: '09:00 AM', title: 'Daily Standup & Sprint Check', status: 'done', color: 'border-emerald-500/30' },
                  { time: '11:00 AM', title: 'Database Migration & Indexing', status: 'in_progress', color: 'border-indigo-500/40 bg-indigo-950/20' },
                  { time: '02:00 PM', title: 'Frontend UI Code Review', status: 'todo', color: 'border-slate-800' },
                  { time: '04:30 PM', title: 'Realtime Deployment Verification', status: 'todo', color: 'border-slate-800' },
                ].map((item) => (
                  <div
                    key={item.time}
                    className={`flex items-center justify-between rounded-xl border p-3 text-xs ${item.color}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-indigo-300 font-bold">{item.time}</span>
                      <span className="font-semibold text-slate-200">{item.title}</span>
                    </div>
                    <span className="capitalize text-slate-400">{item.status.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {timelineFilter === 'week' && (
            <div className="relative overflow-x-auto">
              {/* Red live timeline cursor */}
              <div
                className="pointer-events-none absolute left-0 right-0 top-36 z-20 flex items-center"
                title="Current Timeline Cursor"
              >
                <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                  10:28 AM
                </span>
                <div className="h-px flex-1 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              </div>

              <div className="grid grid-cols-5 gap-3 min-w-[650px] pt-1">
                {scheduleDays.map((col) => (
                  <div key={col.day} className="space-y-3">
                    <div
                      className={`rounded-xl p-2 text-center text-xs font-bold ${
                        col.active
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-950/60 text-slate-400 border border-slate-800/60'
                      }`}
                    >
                      {col.day}
                    </div>

                    <div className="space-y-2.5 min-h-[280px]">
                      {col.tasks.slice(0, 2).map((t, tIdx) => {
                        const priorityColor =
                          t.priority === 'urgent'
                            ? 'text-rose-400'
                            : t.priority === 'high'
                            ? 'text-amber-400'
                            : 'text-emerald-400'

                        return (
                          <div
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className={`rounded-2xl border p-3 space-y-2 transition-all cursor-pointer ${
                              col.active && tIdx === 0
                                ? 'border-rose-500/30 bg-rose-950/20 shadow-md shadow-rose-950/30'
                                : 'border-slate-800/80 bg-slate-950/70 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="flex items-center gap-1 font-semibold text-slate-300">
                                <span className={`h-1.5 w-1.5 rounded-full ${priorityColor}`} />
                                <span className="capitalize">{t.status.replace('_', ' ')}</span>
                              </span>
                              <span className="text-slate-500 font-mono">09:00</span>
                            </div>

                            <h4 className="text-xs font-semibold text-white leading-snug line-clamp-2">
                              {t.title}
                            </h4>

                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              {t.description || 'Task details and progress'}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10px] text-slate-400">
                              <span className="text-slate-500">01h 53m</span>
                              <span className="text-slate-500">💬 3</span>
                            </div>
                          </div>
                        )
                      })}

                      {col.tasks.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-800/50 bg-slate-950/30 p-4 text-center text-[11px] text-slate-600">
                          Break time
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {timelineFilter === 'month' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((wk, idx) => (
                <div key={wk} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200">{wk}</span>
                    <span className="text-emerald-400 font-mono font-bold">
                      {idx === 0 ? '100%' : idx === 1 ? '75%' : 'Planned'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: idx === 0 ? '100%' : idx === 1 ? '75%' : '20%' }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {idx === 0 ? 'Sprint kickoff completed' : idx === 1 ? 'Current sprint milestones' : 'Upcoming roadmaps'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {timelineFilter === 'year' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
              {['Q1 Foundations', 'Q2 Scale', 'Q3 Collaboration', 'Q4 Enterprise'].map((q, idx) => (
                <div key={q} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2 text-xs">
                  <span className="font-bold text-white block">{q}</span>
                  <p className="text-[11px] text-slate-400">
                    {idx === 0 ? 'Completed' : idx === 1 ? 'In Progress' : 'Roadmapped'}
                  </p>
                  <span className="inline-block rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] text-indigo-300 font-medium">
                    {idx === 0 ? '12 Milestones' : '8 Milestones'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (4 cols): Live Analytics Panel */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card A: Activity Metric Card */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Activity</h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12%</span>
                </span>
              </div>

              {/* Working 3-dots Menu Button */}
              <button
                type="button"
                onClick={() => setIsActivityMenuOpen(!isActivityMenuOpen)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Activity Options"
              >
                <MoreVertical className="h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              {isActivityMenuOpen && (
                <div className="absolute right-0 top-8 z-30 w-44 rounded-xl border border-slate-800 bg-slate-950 p-1.5 shadow-2xl backdrop-blur-xl text-xs space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsActivityMenuOpen(false)
                      if (orgId) void fetchDashboardData(orgId, userId)
                      showToast('Activity data refreshed.')
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white text-left cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Refresh metrics</span>
                  </button>
                  <Link
                    to="/tasks"
                    onClick={() => setIsActivityMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-300 hover:bg-slate-900 hover:text-white text-left"
                  >
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>View all tasks</span>
                  </Link>
                </div>
              )}
            </div>

            <div>
              <span className="text-3xl font-black text-white">{activityRate}%</span>
            </div>

            {/* Daily Vertical Activity Bars */}
            <div className="flex items-end justify-between gap-2 h-24 pt-2">
              {[
                { day: 'Mon', val: 92 },
                { day: 'Tue', val: 41 },
                { day: 'Wed', val: 78 },
                { day: 'Thu', val: 60 },
                { day: 'Fri', val: 85 },
              ].map((b) => (
                <div key={b.day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                  <div className="w-full bg-slate-800/80 rounded-lg overflow-hidden h-full flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-indigo-600 to-violet-500 rounded-lg transition-all duration-500"
                      style={{ height: `${b.val}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{b.day}</span>
                  <span className="text-[9px] text-slate-400 font-mono">{b.val}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card B: Projects Worked (Donut Chart) */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Projects worked</h4>
              <span className="text-xs text-rose-400 font-semibold">-5% ↘</span>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-4 space-y-3">
                <p className="text-xs text-slate-500">No projects created yet.</p>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setIsCreateProjectOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span>Create First Project</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-5">
                {/* SVG Donut */}
                <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="#1e293b" strokeWidth="4" />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="4"
                      strokeDasharray="44 100"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="4"
                      strokeDasharray="24 100"
                      strokeDashoffset="-44"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="14"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeDasharray="18 100"
                      strokeDashoffset="-68"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-sm font-extrabold text-white block">
                      {projects.length}
                    </span>
                    <span className="text-[9px] text-slate-500 block leading-tight">projects</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  {projectDistribution.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-slate-300 truncate">{item.name}</span>
                      </div>
                      <span className="font-mono text-slate-400 font-semibold text-[11px] ml-2">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card C: Reminders / Critical Deadlines */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Reminders</h4>
              <Link
                to="/tasks"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Manage &rarr;
              </Link>
            </div>

            <div className="space-y-2">
              {reminders.map((r) => (
                <div
                  key={r.id}
                  onClick={() => handleToggleReminder(r.id)}
                  className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all cursor-pointer ${
                    r.done
                      ? 'border-emerald-500/20 bg-emerald-950/10 text-slate-400 line-through'
                      : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-bold text-slate-300 block">{r.time}</span>
                    <p className="text-[11px] text-slate-400">{r.title}</p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                      r.done
                        ? 'bg-slate-600'
                        : r.priority === 'urgent'
                        ? 'bg-rose-400'
                        : r.priority === 'high'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Detail Modal */}
      {selectedScheduleSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Schedule Item</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScheduleSlot(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-indigo-400">{selectedScheduleSlot.time}</span>
                <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300 font-semibold">
                  {selectedScheduleSlot.type}
                </span>
              </div>
              <h4 className="text-sm font-semibold text-white">{selectedScheduleSlot.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {selectedScheduleSlot.description}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedScheduleSlot(null)}
                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedScheduleSlot(null)
                  handleOpenTaskCreation()
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-500"
              >
                Add as Project Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Drawer on click */}
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
      {isCreateTaskOpen && projects.length > 0 && (
        <CreateTaskModal
          projectId={projects[0].id}
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [newTask, ...prev])
            setIsCreateTaskOpen(false)
            showToast('New task created successfully!')
          }}
          members={orgMembers}
        />
      )}

      {/* Create Project Modal */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={(newProject) => {
            setProjects((prev) => [newProject, ...prev])
            setIsCreateProjectOpen(false)
            showToast(`Project "${newProject.name}" created! You can now add tasks.`)
          }}
        />
      )}
    </div>
  )
}
