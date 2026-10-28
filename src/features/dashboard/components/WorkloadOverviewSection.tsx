import type { FC } from 'react'
import { Users, HelpCircle } from 'lucide-react'
import type { MemberWorkloadItem } from '../types.ts'

interface WorkloadOverviewSectionProps {
  workloadItems: MemberWorkloadItem[]
}

export const WorkloadOverviewSection: FC<WorkloadOverviewSectionProps> = ({
  workloadItems,
}) => {
  const totalActiveTasks = workloadItems.reduce((acc, item) => acc + item.activeTaskCount, 0)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-indigo-400" />
          <span>Workload Overview</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Active tasks by assignee ({totalActiveTasks} active tasks)
        </p>
      </div>

      {workloadItems.length === 0 || totalActiveTasks === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-500">
          No active tasks assigned in this workspace.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
          {workloadItems.map((item) => {
            const isUnassigned = item.userId === null
            const initial = isUnassigned ? '?' : item.displayName.charAt(0).toUpperCase()

            return (
              <div key={item.userId ?? 'unassigned'} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold ${
                        isUnassigned
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                          : item.isCurrentUser
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-300 border border-slate-700/60'
                      }`}
                    >
                      {isUnassigned ? <HelpCircle className="h-3.5 w-3.5" /> : initial}
                    </div>

                    <span className="font-medium text-slate-200 truncate">
                      {item.displayName}
                    </span>

                    {item.role && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[9px] text-slate-400 capitalize shrink-0">
                        {item.role}
                      </span>
                    )}

                    {item.isCurrentUser && (
                      <span className="rounded border border-indigo-500/30 bg-indigo-500/15 px-1.5 py-0.2 text-[9px] font-medium text-indigo-300 shrink-0">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-white">
                      {item.activeTaskCount}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({item.workloadPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Progress / share bar */}
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isUnassigned
                        ? 'bg-amber-500/80'
                        : item.isCurrentUser
                        ? 'bg-indigo-500'
                        : 'bg-slate-400'
                    }`}
                    style={{ width: `${Math.max(item.activeTaskCount > 0 ? 3 : 0, item.workloadPercentage)}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

