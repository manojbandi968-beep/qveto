import { useState } from 'react'
import type { FC } from 'react'
import { Info, ChevronDown } from 'lucide-react'

export const MetricDefinitionsPanel: FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  const definitions = [
    {
      term: 'Task completion rate',
      formula:
        'Non-cancelled tasks created during the selected period that are currently marked "done", divided by all non-cancelled tasks created during that period.',
      note: 'Displays "—" when no eligible tasks were created during the period.',
    },
    {
      term: 'On-time completion rate',
      formula:
        'Tasks completed during the selected period with a due date, where completed_at is on or before due_date (end-of-day), divided by all tasks completed during that period that have a due date.',
      note: 'Displays "—" when no tasks with due dates were completed during the period.',
    },
    {
      term: 'Overdue task count',
      formula:
        'Tasks with a due date before today and status other than "done" or "cancelled".',
      note: 'Snapshot of currently active tasks needing urgent attention.',
    },
    {
      term: 'Assignment coverage',
      formula:
        'Active tasks (excluding "done" and "cancelled") that have an assigned team member, divided by all active tasks.',
      note: 'Measures how much of the active project backlog has clear individual ownership.',
    },
    {
      term: 'Project progress',
      formula:
        'Completed tasks ("done") divided by all non-cancelled tasks in that project.',
      note: 'Displays "No eligible tasks" instead of a misleading 0% when a project contains only cancelled tasks or no tasks.',
    },
    {
      term: 'In-app notification read rate',
      formula:
        'In-app notifications marked as read (read_at is set), divided by all in-app notifications created during the selected period.',
      note: 'Tracks team engagement with in-app task assignments and comments (this is an in-app read rate, not external email delivery).',
    },
  ]

  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-900/30 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between p-3.5 sm:px-4 text-left hover:bg-slate-900/60 transition-colors cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
          <Info className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>How metrics are calculated</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            {isOpen ? 'Hide KPI definitions' : 'View KPI formulas'}
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? 'rotate-180 text-indigo-400' : 'text-slate-500'
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 space-y-3.5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {definitions.map((def) => (
              <div
                key={def.term}
                className="space-y-1 p-2.5 rounded-lg border border-slate-800/60 bg-slate-900/40"
              >
                <div className="font-semibold text-slate-200">{def.term}</div>
                <p className="text-slate-400 leading-relaxed text-[11px]">{def.formula}</p>
                <p className="text-slate-500 text-[10px] italic">{def.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

