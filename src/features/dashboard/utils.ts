import { isTaskOverdue, statusConfig } from '../tasks/utils.ts'
import type { TaskRecord, TaskStatus, OrgMemberOption } from '../tasks/types.ts'
import type { ProjectRecord } from '../projects/types.ts'
import type {
  DashboardDateRange,
  DashboardMetrics,
  ProjectProgressItem,
  StatusDistribution,
  StatusDistributionItem,
  MemberWorkloadItem,
} from './types.ts'

export const getDateRangeStart = (range: DashboardDateRange, now = new Date()): Date | null => {
  if (range === '7d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 7)
    return d
  }
  if (range === '30d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 30)
    return d
  }
  return null
}

export const isDateInRange = (
  dateIso: string | null | undefined,
  startDate: Date | null
): boolean => {
  if (!dateIso) return false
  if (!startDate) return true
  const d = new Date(dateIso)
  return d.getTime() >= startDate.getTime()
}

export const isTaskCompletedOnTime = (
  completedAt: string | null | undefined,
  dueDate: string | null | undefined
): boolean => {
  if (!completedAt || !dueDate) return false
  const [year, month, day] = dueDate.split('-').map(Number)
  const dueEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
  const completedDate = new Date(completedAt)
  return completedDate.getTime() <= dueEndOfDay.getTime()
}

export const calculateDashboardMetrics = (
  projects: ProjectRecord[],
  tasks: TaskRecord[],
  notifications: Array<{ read_at: string | null; created_at: string }>,
  dateRange: DashboardDateRange,
  now = new Date()
): DashboardMetrics => {
  const startDate = getDateRangeStart(dateRange, now)

  // 1. Active projects count
  const activeProjectsCount = projects.length

  // 2. Active tasks count
  const activeTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled')
  const activeTasksCount = activeTasks.length

  // 3. Completed in period count
  const completedInPeriod = tasks.filter(
    (t) => t.status === 'done' && isDateInRange(t.completed_at || t.updated_at, startDate)
  )
  const completedInPeriodCount = completedInPeriod.length

  // 4. Overdue tasks count
  const overdueTasksCount = tasks.filter((t) => isTaskOverdue(t.due_date, t.status)).length

  // 5. Task completion rate:
  // non-cancelled tasks created during selected period that are done / all non-cancelled tasks created in period
  const createdInPeriodNonCancelled = tasks.filter(
    (t) => t.status !== 'cancelled' && isDateInRange(t.created_at, startDate)
  )
  const taskCompletionDenominator = createdInPeriodNonCancelled.length
  const taskCompletionNumerator = createdInPeriodNonCancelled.filter((t) => t.status === 'done').length
  const taskCompletionRate =
    taskCompletionDenominator > 0
      ? Math.round((taskCompletionNumerator / taskCompletionDenominator) * 100)
      : null

  // 6. On-time completion rate:
  // tasks completed during selected period with a due date where completed_at is on/before due date
  // / all tasks completed during that period with a due date
  const completedWithDueDate = completedInPeriod.filter((t) => Boolean(t.due_date))
  const onTimeCompletionDenominator = completedWithDueDate.length
  const onTimeCompletionNumerator = completedWithDueDate.filter((t) =>
    isTaskCompletedOnTime(t.completed_at || t.updated_at, t.due_date)
  ).length
  const onTimeCompletionRate =
    onTimeCompletionDenominator > 0
      ? Math.round((onTimeCompletionNumerator / onTimeCompletionDenominator) * 100)
      : null

  // 7. Assignment coverage:
  // active tasks with an assignee / all active tasks
  const assignmentCoverageDenominator = activeTasksCount
  const assignmentCoverageNumerator = activeTasks.filter((t) => Boolean(t.assignee_id)).length
  const assignmentCoverageRate =
    assignmentCoverageDenominator > 0
      ? Math.round((assignmentCoverageNumerator / assignmentCoverageDenominator) * 100)
      : null

  // 8. Notification read rate:
  // in-app notifications marked as read / all in-app notifications created during selected period
  const periodNotifications = notifications.filter((n) => isDateInRange(n.created_at, startDate))
  const notificationReadDenominator = periodNotifications.length
  const notificationReadNumerator = periodNotifications.filter((n) => Boolean(n.read_at)).length
  const notificationReadRate =
    notificationReadDenominator > 0
      ? Math.round((notificationReadNumerator / notificationReadDenominator) * 100)
      : null

  return {
    activeProjectsCount,
    activeTasksCount,
    completedInPeriodCount,
    overdueTasksCount,
    taskCompletionRate,
    taskCompletionNumerator,
    taskCompletionDenominator,
    onTimeCompletionRate,
    onTimeCompletionNumerator,
    onTimeCompletionDenominator,
    assignmentCoverageRate,
    assignmentCoverageNumerator,
    assignmentCoverageDenominator,
    notificationReadRate,
    notificationReadNumerator,
    notificationReadDenominator,
  }
}

export const calculateProjectProgress = (
  projects: ProjectRecord[],
  tasks: TaskRecord[]
): ProjectProgressItem[] => {
  return projects.map((project) => {
    const projectTasks = tasks.filter((t) => t.project_id === project.id)
    const totalNonCancelled = projectTasks.filter((t) => t.status !== 'cancelled').length
    const completedTasks = projectTasks.filter((t) => t.status === 'done').length
    const progressPercentage =
      totalNonCancelled > 0 ? Math.round((completedTasks / totalNonCancelled) * 100) : null

    return {
      project,
      totalNonCancelled,
      completedTasks,
      progressPercentage,
    }
  })
}

const statusOrder: TaskStatus[] = ['todo', 'in_progress', 'review', 'done', 'cancelled']
const statusBgBars: Record<TaskStatus, string> = {
  todo: 'bg-slate-600',
  in_progress: 'bg-indigo-500',
  review: 'bg-amber-500',
  done: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
}

export const calculateStatusDistribution = (tasks: TaskRecord[]): StatusDistribution => {
  const totalTasks = tasks.length

  const items: StatusDistributionItem[] = statusOrder.map((status) => {
    const count = tasks.filter((t) => t.status === status).length
    const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0

    return {
      status,
      label: statusConfig[status].label,
      count,
      percentage,
      colorBadge: statusConfig[status].badge,
      bgBar: statusBgBars[status],
    }
  })

  return { items, totalTasks }
}

export const calculateWorkloadOverview = (
  activeTasks: TaskRecord[],
  members: OrgMemberOption[],
  currentUserId?: string
): MemberWorkloadItem[] => {
  const totalActive = activeTasks.length

  // Map known organization members
  const memberItems: MemberWorkloadItem[] = members.map((member) => {
    const activeTaskCount = activeTasks.filter((t) => t.assignee_id === member.user_id).length
    const workloadPercentage =
      totalActive > 0 ? Math.round((activeTaskCount / totalActive) * 100) : 0
    const isCurrentUser = member.user_id === currentUserId
    const displayName = member.label.split(' • ')[0].trim()

    return {
      userId: member.user_id,
      displayName,
      role: member.role,
      isCurrentUser,
      activeTaskCount,
      workloadPercentage,
    }
  })

  // Calculate unassigned active tasks
  const unassignedCount = activeTasks.filter((t) => !t.assignee_id).length
  if (unassignedCount > 0 || memberItems.length === 0) {
    memberItems.push({
      userId: null,
      displayName: 'Unassigned',
      role: undefined,
      isCurrentUser: false,
      activeTaskCount: unassignedCount,
      workloadPercentage:
        totalActive > 0 ? Math.round((unassignedCount / totalActive) * 100) : 0,
    })
  }

  // Sort descending by active task count, then by name
  return memberItems.sort((a, b) => {
    if (b.activeTaskCount !== a.activeTaskCount) {
      return b.activeTaskCount - a.activeTaskCount
    }
    // Keep unassigned towards the bottom if equal
    if (a.userId === null) return 1
    if (b.userId === null) return -1
    return a.displayName.localeCompare(b.displayName)
  })
}

