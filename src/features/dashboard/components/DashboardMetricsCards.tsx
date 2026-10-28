import type { FC } from 'react'
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Layers,
  UserCheck,
  CheckCheck,
  BellRing,
  Clock,
} from 'lucide-react'
import type { DashboardMetrics, DashboardDateRange } from '../types.ts'

interface DashboardMetricsCardsProps {
  metrics: DashboardMetrics
  dateRange: DashboardDateRange
}

export const DashboardMetricsCards: FC<DashboardMetricsCardsProps> = ({
  metrics,
  dateRange,
}) => {
  const periodLabel =
    dateRange === '7d' ? 'last 7 days' : dateRange === '30d' ? 'last 30 days' : 'all time'

  const cards = [
    {
      title: 'Active Projects',
      value: metrics.activeProjectsCount.toString(),
      subtext: 'In active workspace',
      icon: FolderKanban,
      color: 'from-blue-500/20 to-indigo-500/10 text-indigo-400 border-indigo-500/20',
      badge: null,
    },
    {
      title: 'Active Tasks',
      value: metrics.activeTasksCount.toString(),
      subtext: 'Excludes done & cancelled',
      icon: Layers,
      color: 'from-sky-500/20 to-blue-500/10 text-sky-400 border-sky-500/20',
      badge: null,
    },
    {
      title: 'Completed in Period',
      value: metrics.completedInPeriodCount.toString(),
      subtext: `Tasks finished (${periodLabel})`,
      icon: CheckCircle2,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20',
      badge: null,
    },
    {
      title: 'Overdue Tasks',
      value: metrics.overdueTasksCount.toString(),
      subtext: 'Passed due date & incomplete',
      icon: AlertTriangle,
      color:
        metrics.overdueTasksCount > 0
          ? 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/20'
          : 'from-slate-500/20 to-slate-600/10 text-slate-400 border-slate-700/40',
      badge:
        metrics.overdueTasksCount > 0
          ? { text: 'Needs attention', color: 'bg-rose-500/15 text-rose-400 border-rose-500/30' }
          : null,
    },
    {
      title: 'Task Completion Rate',
      value: metrics.taskCompletionRate !== null ? `${metrics.taskCompletionRate}%` : '—',
      subtext:
        metrics.taskCompletionDenominator > 0
          ? `${metrics.taskCompletionNumerator} of ${metrics.taskCompletionDenominator} created in period done`
          : 'No tasks created in period',
      icon: Clock,
      color: 'from-violet-500/20 to-purple-500/10 text-violet-400 border-violet-500/20',
      badge: null,
    },
    {
      title: 'On-Time Completion Rate',
      value: metrics.onTimeCompletionRate !== null ? `${metrics.onTimeCompletionRate}%` : '—',
      subtext:
        metrics.onTimeCompletionDenominator > 0
          ? `${metrics.onTimeCompletionNumerator} of ${metrics.onTimeCompletionDenominator} completed on/before due date`
          : 'No tasks completed with due date',
      icon: CheckCheck,
      color: 'from-teal-500/20 to-emerald-500/10 text-teal-400 border-teal-500/20',
      badge: null,
    },
    {
      title: 'Assignment Coverage',
      value: metrics.assignmentCoverageRate !== null ? `${metrics.assignmentCoverageRate}%` : '—',
      subtext:
        metrics.assignmentCoverageDenominator > 0
          ? `${metrics.assignmentCoverageNumerator} of ${metrics.assignmentCoverageDenominator} active tasks assigned`
          : 'No active tasks to assign',
      icon: UserCheck,
      color: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20',
      badge: null,
    },
    {
      title: 'In-App Notification Read Rate',
      value: metrics.notificationReadRate !== null ? `${metrics.notificationReadRate}%` : '—',
      subtext:
        metrics.notificationReadDenominator > 0
          ? `${metrics.notificationReadNumerator} of ${metrics.notificationReadDenominator} in-app alerts read (${periodLabel})`
          : 'No notifications in period',
      icon: BellRing,
      color: 'from-fuchsia-500/20 to-pink-500/10 text-fuchsia-400 border-fuchsia-500/20',
      badge: { text: 'In-app read rate', color: 'bg-slate-800 text-slate-300 border-slate-700' },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div
            key={card.title}
            className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/50 p-4 sm:p-5 backdrop-blur-md hover:border-slate-700/80 transition-all group"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-slate-400 line-clamp-1">
                  {card.title}
                </span>
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-gradient-to-br ${card.color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {card.value}
                </p>
                {card.badge && (
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${card.badge.color}`}
                  >
                    {card.badge.text}
                  </span>
                )}
              </div>
            </div>

            <p className="mt-2 text-[11px] text-slate-400 line-clamp-1">{card.subtext}</p>
          </div>
        )
      })}
    </div>
  )
}

