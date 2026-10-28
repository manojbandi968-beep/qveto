import { useState, useRef, useEffect } from 'react'
import type { FC } from 'react'
import {
  Bell,
  CheckCheck,
  UserCheck,
  MessageSquare,
  Clock,
  AlertTriangle,
  RotateCcw,
  Loader2,
  Inbox,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../hooks/useNotifications.ts'
import { useOrganization } from '../../organizations/hooks/useOrganization.ts'
import { formatRelativeTime } from '../../tasks/utils.ts'
import type { NotificationRecord, NotificationType } from '../types.ts'

interface NotificationTypeConfig {
  icon: typeof Bell
  iconWrapperClass: string
  label: string
  pillClass: string
}

const getNotificationConfig = (type: NotificationType): NotificationTypeConfig => {
  switch (type) {
    case 'task_assigned':
      return {
        icon: UserCheck,
        iconWrapperClass: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
        label: 'Assigned',
        pillClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25',
      }
    case 'comment_added':
      return {
        icon: MessageSquare,
        iconWrapperClass: 'border-violet-500/30 bg-violet-500/10 text-violet-400',
        label: 'Comment',
        pillClass: 'bg-violet-500/15 text-violet-300 border-violet-500/25',
      }
    case 'due_soon':
      return {
        icon: Clock,
        iconWrapperClass: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
        label: 'Due Tomorrow',
        pillClass: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
      }
    case 'overdue':
      return {
        icon: AlertTriangle,
        iconWrapperClass: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
        label: 'Overdue',
        pillClass: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
      }
    default:
      return {
        icon: Bell,
        iconWrapperClass: 'border-slate-800 bg-slate-900 text-slate-400',
        label: 'Notification',
        pillClass: 'bg-slate-800 text-slate-400 border-slate-700',
      }
  }
}

export const NotificationCenter: FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    realtimeStatus,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  } = useNotifications()

  const { currentOrganization, memberships, switchOrganization } = useOrganization()
  const navigate = useNavigate()

  const [isOpen, setIsOpen] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleMarkAll = async () => {
    if (unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    try {
      await markAllAsRead()
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNotificationClick = async (notification: NotificationRecord) => {
    // 1. Mark as read
    if (!notification.read_at) {
      await markAsRead(notification.id)
    }

    // 2. Switch organization if needed and user belongs to it
    if (
      notification.organization_id &&
      notification.organization_id !== currentOrganization?.id
    ) {
      const isMember = memberships.some((m) => m.organization_id === notification.organization_id)
      if (isMember) {
        switchOrganization(notification.organization_id)
      }
    }

    // 3. Navigate to task within project
    if (notification.project_id && notification.task_id) {
      navigate(`/projects/${notification.project_id}?taskId=${notification.task_id}`)
    } else if (notification.project_id) {
      navigate(`/projects/${notification.project_id}`)
    }

    // 4. Close dropdown
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer ${
          isOpen
            ? 'border-indigo-500/80 bg-indigo-500/10 text-indigo-300'
            : 'border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-900 hover:text-slate-200'
        }`}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white ring-2 ring-slate-950 shadow-sm shadow-indigo-500/50 animate-in fade-in zoom-in duration-150">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Notifications Panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-xl z-50 overflow-hidden flex flex-col max-h-[520px] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-3 bg-slate-900/40">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-200">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                  {unreadCount} new
                </span>
              )}
              {realtimeStatus === 'connected' && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium ml-1"
                  title="Realtime updates active"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live
                </span>
              )}
              {realtimeStatus === 'unavailable' && (
                <span
                  className="flex items-center gap-1 rounded bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-400 font-medium ml-1"
                  title="Live updates unavailable"
                >
                  Live unavailable
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleMarkAll}
              disabled={unreadCount === 0 || markingAll}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer ${
                unreadCount > 0 && !markingAll
                  ? 'text-indigo-400 hover:text-indigo-300'
                  : 'text-slate-600 cursor-not-allowed'
              }`}
              title="Mark all as read"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              <span>Mark all as read</span>
            </button>
          </div>

          {/* List Body */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-800/40">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mb-2" />
                <p className="text-xs">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <p className="text-xs text-rose-400 mb-3">{error}</p>
                <button
                  type="button"
                  onClick={() => refreshNotifications()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 border border-slate-800 text-slate-500 mb-2.5">
                  <Inbox className="h-5 w-5" />
                </div>
                <p className="text-xs font-medium text-slate-400">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No notifications for this workspace.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const isUnread = !notification.read_at
                const config = getNotificationConfig(notification.type)
                const IconComponent = config.icon

                return (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isUnread
                        ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${config.iconWrapperClass}`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    {/* Notification content */}
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <p
                            className={`text-xs truncate ${
                              isUnread
                                ? 'font-semibold text-slate-100'
                                : 'font-medium text-slate-300'
                            }`}
                          >
                            {notification.title}
                          </p>
                          <span
                            className={`rounded px-1.5 py-0.2 text-[9px] font-medium border shrink-0 ${config.pillClass}`}
                          >
                            {config.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {notification.body}
                      </p>
                    </div>

                    {/* Unread dot */}
                    {isUnread && (
                      <span
                        className="h-2 w-2 rounded-full bg-indigo-500 mt-1.5 shrink-0"
                        title="Unread"
                      />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
