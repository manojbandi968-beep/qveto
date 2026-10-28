import type { FC } from 'react'
import {
  PieChart,
  Circle,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type { TaskStatus } from '../../tasks/types.ts'
import type { StatusDistribution } from '../types.ts'

interface TaskStatusDistributionSectionProps {
  distribution: StatusDistribution
}

const statusIcons: Record<TaskStatus, typeof Circle> = {
  todo: Circle,
  in_progress: Clock,
  review: AlertCircle,
  done: CheckCircle2,
  cancelled: XCircle,
}

export const TaskStatusDistributionSection: FC<TaskStatusDistributionSectionProps> = ({
  distribution,
}) => {
  const { items, totalTasks } = distribution

  return (
    <div className="space-y-4" role="region" aria-label="Task status distribution">
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <PieChart className="h-4 w-4 text-indigo-400" />
          <span>Task Status Distribution</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {totalTasks} total {totalTasks === 1 ? 'task' : 'tasks'} recorded across active workspace
        </p>
      </div>

      {totalTasks === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-500">
          No tasks found in this workspace.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-4">
          {/* Accessible stacked proportional bar */}
          <div
            className="flex h-3 w-full rounded-full overflow-hidden bg-slate-800"
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Distribution of task statuses"
          >
            {items.map((item) => {
              if (item.count === 0) return null
              // Compute percentage or minimum visible width
              const widthPct = Math.max(2, (item.count / totalTasks) * 100)
              return (
                <div
                  key={item.status}
                  className={`${item.bgBar} h-full transition-all`}
                  style={{ width: `${widthPct}%` }}
                  title={`${item.label}: ${item.count} (${item.percentage}%)`}
                />
              )
            })}
          </div>

          {/* Cards for each status (does not rely on color alone) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {items.map((item) => {
              const Icon = statusIcons[item.status]
              return (
                <div
                  key={item.status}
                  className="flex flex-col justify-between rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs font-medium text-slate-300 truncate">
                      {item.label}
                    </span>
                    <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  </div>

                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-lg font-bold text-white">{item.count}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

