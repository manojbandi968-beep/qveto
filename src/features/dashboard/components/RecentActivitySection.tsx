import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { Activity, Clock, ExternalLink } from 'lucide-react'
import { formatActivityDescription, formatRelativeTime } from '../../tasks/utils.ts'
import type { ActivityEvent, OrgMemberOption } from '../../tasks/types.ts'

interface RecentActivitySectionProps {
  events: ActivityEvent[]
  currentUserId?: string
  members?: OrgMemberOption[]
}

export const RecentActivitySection: FC<RecentActivitySectionProps> = ({
  events,
  currentUserId,
  members,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-indigo-400" />
          <span>Recent Activity</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Audit events logged across the active organization
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center text-xs text-slate-500">
          No activity recorded in this workspace yet.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-3">
          {events.map((event) => {
            const description = formatActivityDescription(event, currentUserId, members)
            const timeAgo = formatRelativeTime(event.created_at)

            const destination =
              event.project_id && event.task_id
                ? `/projects/${event.project_id}?taskId=${event.task_id}`
                : event.project_id
                ? `/projects/${event.project_id}`
                : null

            return (
              <div
                key={event.id}
                className="group flex items-start justify-between gap-3 p-2.5 rounded-lg border border-slate-800/50 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/60 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    {description}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span>{timeAgo}</span>
                  </div>
                </div>

                {destination && (
                  <Link
                    to={destination}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-800 text-slate-500 hover:border-slate-700 hover:bg-slate-800 hover:text-indigo-300 transition-colors"
                    title="View task or project"
                    aria-label="View task or project"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

