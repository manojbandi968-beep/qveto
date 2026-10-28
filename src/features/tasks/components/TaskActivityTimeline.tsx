import { useState, useEffect, useCallback } from 'react'
import type { FC } from 'react'
import {
  History,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  UserCheck,
  Calendar,
  AlertTriangle,
  Edit3,
  MessageSquare,
  Activity,
} from 'lucide-react'
import { supabase } from '../../../lib/supabase.ts'
import { createDebounce } from '../../../lib/realtime.ts'
import { useAuth } from '../../auth/hooks/useAuth.ts'
import { formatActivityDescription, formatRelativeTime } from '../utils.ts'
import type { ActivityEvent, OrgMemberOption } from '../types.ts'

interface TaskActivityTimelineProps {
  taskId: string
  members: OrgMemberOption[]
  onActivityCountChange?: (count: number) => void
}

export const TaskActivityTimeline: FC<TaskActivityTimelineProps> = ({
  taskId,
  members,
  onActivityCountChange,
}) => {
  const { user } = useAuth()
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivity = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from('activity_events')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (queryError) {
        if (queryError.code === '42501' || queryError.message.includes('row-level security')) {
          setError('Permission denied: You cannot view activity for this task.')
        } else {
          setError(queryError.message || 'Failed to load task activity.')
        }
        setEvents([])
        return
      }

      const list = (data as ActivityEvent[]) || []
      setEvents(list)
      onActivityCountChange?.(list.length)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(msg)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [taskId, onActivityCountChange])

  useEffect(() => {
    let isMounted = true

    const run = async () => {
      if (!isMounted) return
      await fetchActivity()
    }

    void run()

    const debouncedRefetch = createDebounce(() => {
      void fetchActivity()
    }, 250)

    const channel = supabase
      .channel(`realtime:task-activity:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_events',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          debouncedRefetch.trigger()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      debouncedRefetch.cancel()
      void supabase.removeChannel(channel)
    }
  }, [taskId, fetchActivity])

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'task_created':
        return <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
      case 'task_status_changed':
        return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
      case 'task_assignee_changed':
        return <UserCheck className="h-3.5 w-3.5 text-blue-400" />
      case 'task_due_date_changed':
        return <Calendar className="h-3.5 w-3.5 text-amber-400" />
      case 'task_priority_changed':
        return <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
      case 'task_updated':
        return <Edit3 className="h-3.5 w-3.5 text-cyan-400" />
      case 'comment_created':
        return <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
      default:
        return <Activity className="h-3.5 w-3.5 text-slate-400" />
    }
  }

  return (
    <div className="space-y-4" aria-label="Task Activity History">
      {/* Error notification */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center p-8 text-center text-xs text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-400 mr-2" />
          <span>Loading activity history...</span>
        </div>
      ) : events.length === 0 ? (
        /* Empty activity state */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-6 text-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/60 text-slate-500 mb-2">
            <History className="h-4 w-4" />
          </div>
          <p className="text-xs font-medium text-slate-300">No activity recorded yet</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Changes to task status, assignments, due dates, and comments will be logged here.
          </p>
        </div>
      ) : (
        /* Reverse Chronological Timeline */
        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-slate-800">
          {events.map((event) => {
            const description = formatActivityDescription(event, user?.id, members)
            const timeAgo = formatRelativeTime(event.created_at)

            return (
              <div key={event.id} className="relative group text-xs">
                {/* Timeline dot with icon */}
                <div className="absolute -left-6 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 border border-slate-800 shadow-xs">
                  {getEventIcon(event.event_type)}
                </div>

                {/* Event description and relative time */}
                <div className="flex flex-col gap-0.5 bg-slate-900/40 rounded-lg p-2.5 border border-slate-800/60 hover:border-slate-800 transition-colors">
                  <p className="text-slate-200 leading-relaxed font-normal">
                    {description}
                  </p>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {timeAgo}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
