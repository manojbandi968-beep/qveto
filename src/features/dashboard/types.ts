import type { ProjectRecord } from '../projects/types.ts'
import type { TaskStatus } from '../tasks/types.ts'

export type DashboardDateRange = '7d' | '30d' | 'all'

export interface DashboardMetrics {
  activeProjectsCount: number
  activeTasksCount: number
  completedInPeriodCount: number
  overdueTasksCount: number

  taskCompletionRate: number | null
  taskCompletionNumerator: number
  taskCompletionDenominator: number

  onTimeCompletionRate: number | null
  onTimeCompletionNumerator: number
  onTimeCompletionDenominator: number

  assignmentCoverageRate: number | null
  assignmentCoverageNumerator: number
  assignmentCoverageDenominator: number

  notificationReadRate: number | null
  notificationReadNumerator: number
  notificationReadDenominator: number
}

export interface ProjectProgressItem {
  project: ProjectRecord
  totalNonCancelled: number
  completedTasks: number
  progressPercentage: number | null
}

export interface StatusDistributionItem {
  status: TaskStatus
  label: string
  count: number
  percentage: number
  colorBadge: string
  bgBar: string
}

export interface StatusDistribution {
  items: StatusDistributionItem[]
  totalTasks: number
}

export interface MemberWorkloadItem {
  userId: string | null
  displayName: string
  role?: string
  isCurrentUser: boolean
  activeTaskCount: number
  workloadPercentage: number
}

