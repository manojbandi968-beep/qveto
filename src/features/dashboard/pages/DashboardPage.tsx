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
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import type { RealtimeConnectionStatus } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import { TaskDrawer } from '../../tasks/components/TaskDrawer.tsx'
import { CreateTaskModal } from '../../tasks/components/CreateTaskModal.tsx'
import type { ProjectRecord } from '../../projects/types.ts'
import type { TaskRecord, OrgMemberOption, ActivityEvent } from '../../tasks/types.ts'

interface NotificationSimple {
  id: string
  organization_id: string
  read_at: string | null
  created_at: string
}

export const DashboardPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole, loading: orgLoading } = useOrganization()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([])
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [, setNotifications] = useState<NotificationSimple[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('connecting')

  // UI Interactive States
  const [timelineFilter, setTimelineFilter] = useState<'today' | 'week' | 'month' | 'year'>('week')
  const [isTimerRunning, setIsTimerRunning] = useState(true)
  const [timerSeconds, setTimerSeconds] = useState(3476) // 00:57:56 initial
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)

  const orgId = currentOrganization?.id
  const userId = user?.id
  const userEmail = user?.email
  const canManage = currentRole === 'owner' || currentRole === 'manager'

  // Focus timer tick
  useEffect(() => {
    if (!isTimerRunning) return
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isTimerRunning])

  const formatTimer = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`
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

  // Active focus task (First in-progress or highest priority task)
  const focusTask = useMemo(() => {
    const inProgress = tasks.find((t) => t.status === 'in_progress')
    if (inProgress) return inProgress
    const urgent = tasks.find((t) => t.priority === 'urgent' && t.status !== 'done')
    if (urgent) return urgent
    return tasks[0] || null
  }, [tasks])

  const focusProject = focusTask ? projectMap.get(focusTask.project_id) : null

  // Today's Tasks
  const todayTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
    return active.slice(0, 3)
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

  // Days of week schedule demo mapping for the timeline
  const scheduleDays = useMemo(() => {
    return [
      { day: 'MON 18', tasks: tasks.filter((_, i) => i % 5 === 0) },
      { day: 'TUE 19', tasks: tasks.filter((_, i) => i % 5 === 1) },
      { day: 'WED 20', tasks: tasks.filter((_, i) => i % 5 === 2), active: true },
      { day: 'THU 21', tasks: tasks.filter((_, i) => i % 5 === 3) },
      { day: 'FRI 22', tasks: tasks.filter((_, i) => i % 5 === 4) },
    ]
  }, [tasks])

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
      {/* Realtime Status Sub-indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-medium text-slate-300">
            {realtimeStatus === 'connected' ? 'Realtime Connected' : 'Connecting to Realtime...'}
          </span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-slate-400">
            {tasks.length} total tasks across {projects.length} projects
          </span>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsCreateTaskOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Task</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP ROW: 3 BENTO CARDS (Focus Card, Today's Tasks, Schedule/Meetings) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Active Focus Timer Widget (Matching reference screenshot) */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md relative overflow-hidden group">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="font-semibold text-slate-300">Active Focus</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {focusTask?.priority || 'Normal'}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight truncate">
              {focusTask?.title || 'No active focus task'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {focusProject?.name || currentOrganization?.name || 'Workspace'}
            </p>
          </div>

          {/* Large Center Circular Action Button */}
          <div className="my-5 flex items-center justify-center">
            <button
              type="button"
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              title={isTimerRunning ? 'Pause Focus Timer' : 'Start Focus Timer'}
              className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-rose-500 via-rose-600 to-orange-500 text-white shadow-xl shadow-rose-600/30 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              {isTimerRunning ? (
                <Pause className="h-8 w-8 fill-current" />
              ) : (
                <Play className="h-8 w-8 fill-current ml-1" />
              )}
            </button>
          </div>

          {/* Bottom Timer Stats */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <div>
              <span className="text-[10px] uppercase text-slate-500 block font-medium">Today</span>
              <span className="font-mono font-semibold text-slate-200">
                {formatTimer(timerSeconds)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-slate-500 block font-medium">Limits</span>
              <span className="font-mono font-semibold text-slate-200">06:00:00</span>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Tasks */}
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
                <p className="text-xs text-slate-500 py-6 text-center">No tasks for today</p>
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
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white ${
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
                      <span className="text-slate-600 hover:text-amber-400 transition-colors">
                        ★
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Card 3: Today's Schedule & Meetings */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 flex flex-col justify-between shadow-xl backdrop-blur-md">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Today&apos;s schedule</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                  {activityEvents.length || 3}
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
              {/* Schedule slot 1 */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-rose-400">10:00 AM</span>
                  <span className="text-slate-500">Sync</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                  Sprint roadmap and team feedback
                </p>
              </div>

              {/* Schedule slot 2 */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-indigo-400">01:00 PM</span>
                  <span className="text-slate-500">Design</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                  Design system component audit
                </p>
              </div>

              {/* Schedule slot 3 */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-emerald-400">03:00 PM</span>
                  <span className="text-slate-500">Deploy</span>
                </div>
                <p className="text-xs font-semibold text-slate-200 line-clamp-2">
                  Staging verification and test runs
                </p>
              </div>

              {/* Schedule slot 4 (+ Action) */}
              <button
                type="button"
                onClick={() => setIsCreateTaskOpen(true)}
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
        {/* Left Column (~68% on desktop): Projects Weekly Schedule Grid */}
        <div className="lg:col-span-8 rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 sm:p-6 shadow-xl backdrop-blur-md space-y-5">
          {/* Timeline Header & Range filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-white">Projects</h3>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>
            </div>

            {/* Time filter selector */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-1 text-xs">
              {(['today', 'week', 'month', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimelineFilter(mode)}
                  className={`rounded-lg px-3 py-1 font-medium capitalize transition-colors cursor-pointer ${
                    timelineFilter === mode
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Schedule Grid with Time Axis & Live Timeline Cursor */}
          <div className="relative overflow-x-auto">
            {/* The red live timeline cursor line cutting across the grid */}
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
                  {/* Column Day Header */}
                  <div
                    className={`rounded-xl p-2 text-center text-xs font-bold ${
                      col.active
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-950/60 text-slate-400 border border-slate-800/60'
                    }`}
                  >
                    {col.day}
                  </div>

                  {/* Tasks in this column */}
                  <div className="space-y-2.5 min-h-[300px]">
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
                            <div className="flex items-center gap-1.5">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 text-[9px] font-bold text-indigo-300">
                                {userEmail?.[0]?.toUpperCase() || 'U'}
                              </div>
                              <span className="text-slate-500">01h 53m</span>
                            </div>
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
        </div>

        {/* Right Column (~32% on desktop): Live Analytics Panel */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card A: Activity Metric Card */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">Activity</h4>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="h-3 w-3" />
                  <span>+12%</span>
                </span>
              </div>
              <button type="button" className="text-slate-500 hover:text-white">
                <MoreVertical className="h-4 w-4" />
              </button>
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

            <div className="flex items-center gap-5">
              {/* SVG Donut */}
              <div className="relative h-24 w-24 shrink-0 flex items-center justify-center">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="14"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="4"
                  />
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
              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-300">09:30 AM</span>
                  <p className="text-[11px] text-slate-400">Check automated test runs</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-300">10:00 AM</span>
                  <p className="text-[11px] text-slate-400">Client Presentation &amp; review</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-rose-400" />
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-2.5 text-xs">
                <div>
                  <span className="text-[11px] font-bold text-slate-300">04:15 PM</span>
                  <p className="text-[11px] text-slate-400">Production staging deployment</p>
                </div>
                <span className="h-2 w-2 rounded-full bg-amber-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

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

      {/* Quick Task Creation Modal */}
      {isCreateTaskOpen && projects.length > 0 && (
        <CreateTaskModal
          projectId={projects[0].id}
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={(newTask) => {
            setTasks((prev) => [newTask, ...prev])
            setIsCreateTaskOpen(false)
          }}
          members={orgMembers}
        />
      )}
    </div>
  )
}
