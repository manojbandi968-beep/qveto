import { useState, useEffect, useCallback, useMemo } from 'react'
import type { FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  ShieldCheck,
  Plus,
  RotateCcw,
  Calendar,
  Database,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import type { RealtimeConnectionStatus } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { LoadingScreen } from '../../../components/common/LoadingScreen.tsx'
import { DashboardMetricsCards } from '../components/DashboardMetricsCards.tsx'
import { ProjectProgressSection } from '../components/ProjectProgressSection.tsx'
import { TaskStatusDistributionSection } from '../components/TaskStatusDistributionSection.tsx'
import { WorkloadOverviewSection } from '../components/WorkloadOverviewSection.tsx'
import { RecentActivitySection } from '../components/RecentActivitySection.tsx'
import { MetricDefinitionsPanel } from '../components/MetricDefinitionsPanel.tsx'
import {
  calculateDashboardMetrics,
  calculateProjectProgress,
  calculateStatusDistribution,
  calculateWorkloadOverview,
} from '../utils.ts'
import type { DashboardDateRange } from '../types.ts'
import type { ProjectRecord } from '../../projects/types.ts'
import type { TaskRecord, OrgMemberOption, ActivityEvent } from '../../tasks/types.ts'

interface NotificationSimple {
  id: string
  organization_id: string
  read_at: string | null
  created_at: string
}

const getSavedDateRange = (): DashboardDateRange => {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('projectflow_dashboard_period')
      if (saved === '7d' || saved === '30d' || saved === 'all') return saved
    } catch {
      // LocalStorage access restricted
    }
  }
  return '30d'
}

export const DashboardPage: FC = () => {
  const { user } = useAuth()
  const { currentOrganization, currentRole, loading: orgLoading } = useOrganization()

  const [dateRange, setDateRange] = useState<DashboardDateRange>(getSavedDateRange)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data states
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [tasks, setTasks] = useState<TaskRecord[]>([])
  const [orgMembers, setOrgMembers] = useState<OrgMemberOption[]>([])
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([])
  const [notifications, setNotifications] = useState<NotificationSimple[]>([])
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionStatus>('connecting')

  const orgId = currentOrganization?.id
  const userId = user?.id
  const userEmail = user?.email

  const handleDateRangeChange = (range: DashboardDateRange) => {
    setDateRange(range)
    try {
      localStorage.setItem('projectflow_dashboard_period', range)
    } catch {
      // LocalStorage write error ignored
    }
  }

  const fetchDashboardData = useCallback(async (activeOrgId: string, currentUserId?: string) => {
    try {
      // 1. Fetch projects for the active organization
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
          ? supabase.from('tasks').select('*').in('project_id', projectIds)
          : Promise.resolve({ data: [] as TaskRecord[], error: null }),
        supabase
          .from('organization_members')
          .select('id, user_id, role')
          .eq('organization_id', activeOrgId),
        supabase
          .from('activity_events')
          .select('*')
          .eq('organization_id', activeOrgId)
          .order('created_at', { ascending: false })
          .limit(10),
        currentUserId
          ? supabase
              .from('notifications')
              .select('id, organization_id, read_at, created_at')
              .eq('organization_id', activeOrgId)
              .eq('recipient_id', currentUserId)
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
      const msg = err instanceof Error ? err.message : 'Failed to load organization report data.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [userEmail])

  useEffect(() => {
    let isMounted = true

    const sync = async () => {
      if (!orgId) {
        if (isMounted) {
          setLoading(false)
        }
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

  // Scoped Supabase Realtime subscription for organization dashboard
  useEffect(() => {
    if (!orgId) return

    const debouncedRefetch = createDebounce(() => {
      void fetchDashboardData(orgId, userId)
    }, 350)

    let channel = supabase.channel(`realtime:dashboard:${orgId}`)

    // 1. Listen for project changes in this organization
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'projects',
        filter: `organization_id=eq.${orgId}`,
      },
      () => {
        debouncedRefetch.trigger()
      }
    )

    // 2. Listen for activity events in this organization
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'activity_events',
        filter: `organization_id=eq.${orgId}`,
      },
      () => {
        debouncedRefetch.trigger()
      }
    )

    // 3. Listen for notifications if user is present
    if (userId) {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          debouncedRefetch.trigger()
        }
      )
    }

    // 4. Listen for tasks in known projects of this organization
    projects.forEach((proj) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `project_id=eq.${proj.id}`,
        },
        () => {
          debouncedRefetch.trigger()
        }
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

  // Computed metrics and visual breakdowns
  const metrics = useMemo(
    () => calculateDashboardMetrics(projects, tasks, notifications, dateRange),
    [projects, tasks, notifications, dateRange]
  )

  const projectProgress = useMemo(
    () => calculateProjectProgress(projects, tasks),
    [projects, tasks]
  )

  const statusDistribution = useMemo(
    () => calculateStatusDistribution(tasks),
    [tasks]
  )

  const workloadOverview = useMemo(
    () =>
      calculateWorkloadOverview(
        tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled'),
        orgMembers,
        userId
      ),
    [tasks, orgMembers, userId]
  )

  const canManageProjects = currentRole === 'owner' || currentRole === 'manager'
  const displayName = user?.email?.split('@')[0] || 'there'
  const orgName = currentOrganization?.name || 'Workspace'

  if (orgLoading || (loading && !error && projects.length === 0 && tasks.length === 0)) {
    return <LoadingScreen message="Loading organization reporting dashboard..." />
  }

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4">
          <Building2 className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white">No active organization selected</h2>
        <p className="mt-2 text-sm text-slate-400 max-w-md">
          Please select or create an organization workspace to view project metrics and team reports.
        </p>
        <Link
          to="/onboarding"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Create workspace</span>
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-4">
        <h3 className="text-base font-semibold text-rose-300">Unable to load dashboard data</h3>
        <p className="text-xs text-rose-200/80 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={() => {
            if (orgId) {
              void fetchDashboardData(orgId, userId)
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Try again</span>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl flex items-center gap-2">
              <Building2 className="h-6 w-6 text-indigo-400 hidden sm:inline-block" />
              <span>{orgName}</span>
            </h1>
            {currentRole && (
              <span className="inline-flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-300 capitalize">
                <ShieldCheck className="h-3 w-3 text-indigo-400" />
                {currentRole}
              </span>
            )}
            {realtimeStatus === 'connected' && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400"
                title="Realtime updates active"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Reports
              </span>
            )}
            {realtimeStatus === 'unavailable' && (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400"
                title="Live updates unavailable (manual refresh active)"
              >
                Live unavailable
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Welcome back, <span className="text-slate-200 font-medium capitalize">{displayName}</span>. Here&apos;s your organization performance report.
          </p>
        </div>

        {/* Date Range Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Range Pills */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 p-1 text-xs">
            <Calendar className="h-3.5 w-3.5 text-slate-500 ml-1.5 mr-1 hidden sm:inline-block" />
            {(['7d', '30d', 'all'] as const).map((range) => {
              const label = range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : 'All Time'
              const isActive = dateRange === range
              return (
                <button
                  key={range}
                  type="button"
                  onClick={() => handleDateRangeChange(range)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {canManageProjects && (
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Link>
          )}
        </div>
      </div>

      {/* Supabase & Workspace Isolation Info Bar */}
      <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-violet-950/40 p-4 sm:p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                <span>Active Workspace:</span>
                <span className="text-indigo-300 font-medium">{orgName}</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.2 text-[10px] text-indigo-300 font-mono capitalize">
                  Role: {currentRole || 'Member'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Reporting strictly scoped to this organization. Authenticated as{' '}
                <span className="text-slate-300 font-mono">{user?.email}</span>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
              RLS Scoped
            </span>
          </div>
        </div>
      </div>

      {/* 1. Summary Metrics Cards (8 metrics) */}
      <DashboardMetricsCards metrics={metrics} dateRange={dateRange} />

      {/* 2. Metric Calculation Formulas Guide */}
      <MetricDefinitionsPanel />

      {/* 3. Deep Dive Grid: Project Progress, Status Distribution, Workload, Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 spans on desktop): Project Progress & Task Status Distribution */}
        <div className="space-y-6 lg:col-span-2">
          {/* Project Progress Section */}
          <ProjectProgressSection
            items={projectProgress}
            canCreateProject={canManageProjects}
          />

          {/* Task Status Distribution */}
          <TaskStatusDistributionSection distribution={statusDistribution} />
        </div>

        {/* Right Column (1 span on desktop): Workload Overview & Recent Activity */}
        <div className="space-y-6">
          {/* Workload Overview */}
          <WorkloadOverviewSection workloadItems={workloadOverview} />

          {/* Recent Activity Feed */}
          <RecentActivitySection
            events={activityEvents}
            currentUserId={userId}
            members={orgMembers}
          />
        </div>
      </div>
    </div>
  )
}
