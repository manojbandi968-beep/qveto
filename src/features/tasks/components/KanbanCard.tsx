import type { FC, MouseEvent } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import {
  GripVertical,
  Calendar,
  User,
  AlertCircle,
  Lock,
  ArrowRightLeft,
  CheckCircle2,
} from 'lucide-react'
import { isTaskOverdue, isTaskDueTomorrow, formatDueDate, priorityConfig } from '../utils.ts'
import type {
  OrgMemberOption,
  TaskRecord,
  TaskStatus,
} from '../types.ts'

interface KanbanCardProps {
  task: TaskRecord
  index: number
  canDrag: boolean
  members: OrgMemberOption[]
  currentUserId: string | undefined
  onClick: () => void
  onStatusChange: (task: TaskRecord, newStatus: TaskStatus) => void
}

export const KanbanCard: FC<KanbanCardProps> = ({
  task,
  index,
  canDrag,
  members,
  currentUserId,
  onClick,
  onStatusChange,
}) => {
  const overdue = isTaskOverdue(task.due_date, task.status)
  const dueTomorrow = isTaskDueTomorrow(task.due_date, task.status)
  const isDone = task.status === 'done'
  const isAssignedToMe = Boolean(currentUserId && task.assignee_id === currentUserId)
  const assignedOption = members.find((m) => m.user_id === task.assignee_id)

  const handleStatusSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    e.stopPropagation()
    const targetStatus = e.target.value as TaskStatus
    if (targetStatus && targetStatus !== task.status) {
      onStatusChange(task, targetStatus)
    }
  }

  const handleCardClick = (e: MouseEvent) => {
    // If the click originated from an interactive element like the status select, ignore
    const target = e.target as HTMLElement
    if (target.closest('select') || target.closest('button')) {
      return
    }
    onClick()
  }

  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={!canDrag}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          onClick={handleCardClick}
          aria-label={`Task: ${task.title}. Priority: ${task.priority}. Status: ${task.status}. ${
            !canDrag ? 'Dragging disabled for your role.' : 'Press spacebar to grab and move.'
          }`}
          className={`group relative rounded-xl border p-3.5 transition-all text-left select-none ${
            snapshot.isDragging
              ? 'border-indigo-500 bg-slate-900/95 shadow-2xl shadow-indigo-950/60 ring-2 ring-indigo-500/50 scale-[1.02] z-50'
              : overdue
              ? 'border-rose-500/40 bg-rose-500/5 hover:border-rose-500/60 hover:bg-rose-500/10'
              : isDone
              ? 'border-slate-800/60 bg-slate-900/30 opacity-85 hover:opacity-100 hover:border-slate-700'
              : 'border-slate-800/80 bg-slate-900/50 hover:border-slate-750 hover:bg-slate-900/80'
          } ${canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        >
          {/* Card Top Row: Drag Handle or Lock + Priority Badge + Move Menu */}
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {canDrag ? (
                <div
                  {...provided.dragHandleProps}
                  className="rounded p-0.5 text-slate-500 hover:text-slate-300 transition-colors cursor-grab active:cursor-grabbing focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  title="Drag to move task (or press Space for keyboard reordering)"
                  aria-label="Drag handle"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              ) : (
                <div
                  className="rounded p-0.5 text-slate-600"
                  title="View only: You do not have permission to move this task"
                >
                  <Lock className="h-3.5 w-3.5" />
                </div>
              )}

              <span
                className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  priorityConfig[task.priority].badge
                }`}
              >
                {priorityConfig[task.priority].label}
              </span>

              {overdue && (
                <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                  <AlertCircle className="h-2.5 w-2.5" />
                  Overdue
                </span>
              )}
            </div>

            {/* Accessible Direct "Move to" quick selector */}
            {canDrag && (
              <div
                className="relative shrink-0 flex items-center"
                onClick={(e) => e.stopPropagation()}
              >
                <label htmlFor={`quick-move-${task.id}`} className="sr-only">
                  Move task {task.title} to status
                </label>
                <div className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-950/80 px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-colors">
                  <ArrowRightLeft className="h-2.5 w-2.5 text-slate-500" />
                  <select
                    id={`quick-move-${task.id}`}
                    value={task.status}
                    onChange={handleStatusSelectChange}
                    className="bg-transparent text-[10px] text-slate-300 focus:outline-none cursor-pointer pr-1"
                    title="Change status directly"
                  >
                    <option value="todo" className="bg-slate-900 text-slate-200">
                      To Do
                    </option>
                    <option value="in_progress" className="bg-slate-900 text-slate-200">
                      In Progress
                    </option>
                    <option value="review" className="bg-slate-900 text-slate-200">
                      In Review
                    </option>
                    <option value="done" className="bg-slate-900 text-slate-200">
                      Done
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Card Title */}
          <h4
            className={`text-xs font-semibold leading-snug line-clamp-2 transition-colors mb-2 ${
              isDone
                ? 'text-slate-400 line-through'
                : 'text-white group-hover:text-indigo-200'
            }`}
          >
            {task.title}
          </h4>

          {/* Description Snippet if present */}
          {task.description && (
            <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Card Footer: Assignee & Due Date */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
            {/* Assignee */}
            <div
              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 max-w-[130px] truncate ${
                isAssignedToMe
                  ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25'
                  : task.assignee_id
                  ? 'bg-slate-800/60 text-slate-300 border border-slate-700/60'
                  : 'text-slate-500'
              }`}
            >
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {isAssignedToMe
                  ? 'You'
                  : assignedOption
                  ? assignedOption.label.split(' • ')[0]
                  : task.assignee_id
                  ? `Member (${task.assignee_id.slice(0, 6)})`
                  : 'Unassigned'}
              </span>
            </div>

            {/* Due Date or Completed Date */}
            {isDone && task.completed_at ? (
              <div className="inline-flex items-center gap-1 text-[10px] text-emerald-400/90 font-medium">
                <CheckCircle2 className="h-3 w-3" />
                <span>Done</span>
              </div>
            ) : task.due_date ? (
              <div
                className={`inline-flex items-center gap-1 text-[10px] ${
                  overdue
                    ? 'text-rose-400 font-semibold'
                    : dueTomorrow
                    ? 'text-amber-400 font-medium'
                    : 'text-slate-400'
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>{dueTomorrow ? 'Due tomorrow' : formatDueDate(task.due_date)}</span>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </Draggable>
  )
}
