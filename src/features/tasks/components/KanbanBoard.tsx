import { useMemo } from 'react'
import type { FC } from 'react'
import { DragDropContext } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import { Info, Plus } from 'lucide-react'
import { KanbanColumn } from './KanbanColumn.tsx'
import { KANBAN_COLUMNS } from '../utils.ts'
import type {
  OrgMemberOption,
  TaskRecord,
  TaskStatus,
} from '../types.ts'

interface KanbanBoardProps {
  tasks: TaskRecord[]
  cancelledCount: number
  onTaskStatusChange: (task: TaskRecord, newStatus: TaskStatus) => Promise<boolean>
  onSelectTask: (task: TaskRecord) => void
  onOpenCreateModal: () => void
  canCreateTask: boolean
  members: OrgMemberOption[]
  currentUserId: string | undefined
  currentRole: string | null
  onSwitchToListView: () => void
}

export const KanbanBoard: FC<KanbanBoardProps> = ({
  tasks,
  cancelledCount,
  onTaskStatusChange,
  onSelectTask,
  onOpenCreateModal,
  canCreateTask,
  members,
  currentUserId,
  currentRole,
  onSwitchToListView,
}) => {
  // Filter out any cancelled tasks from the Kanban board view
  const activeBoardTasks = useMemo(() => {
    return tasks.filter((t) => t.status !== 'cancelled')
  }, [tasks])

  // Group tasks by status for the four Kanban columns
  const tasksByColumn = useMemo(() => {
    const grouped: Record<'todo' | 'in_progress' | 'review' | 'done', TaskRecord[]> = {
      todo: [],
      in_progress: [],
      review: [],
      done: [],
    }

    for (const task of activeBoardTasks) {
      if (task.status in grouped) {
        grouped[task.status as keyof typeof grouped].push(task)
      }
    }

    return grouped
  }, [activeBoardTasks])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If dropped outside any droppable target, ignore
    if (!destination) return

    // If dropped back in the same column and same position, ignore
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const targetStatus = destination.droppableId as TaskStatus
    const sourceStatus = source.droppableId as TaskStatus

    // If dropped in the same column, no status change needed
    if (targetStatus === sourceStatus) {
      return
    }

    const task = activeBoardTasks.find((t) => t.id === draggableId)
    if (!task) return

    // Check permission: only owners, managers, or assigned members can move
    const canMove =
      currentRole === 'owner' ||
      currentRole === 'manager' ||
      (currentRole === 'member' && task.assignee_id === currentUserId)

    if (!canMove) {
      return
    }

    // Trigger status update
    await onTaskStatusChange(task, targetStatus)
  }

  const handleStatusChangeDirect = (task: TaskRecord, newStatus: TaskStatus) => {
    void onTaskStatusChange(task, newStatus)
  }

  return (
    <div className="space-y-4">
      {/* Drag & Drop Context */}
      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Scrollable Container on small screens, responsive grid on desktop */}
        <div
          className="overflow-x-auto pb-4 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 focus:outline-none"
          tabIndex={0}
          aria-label="Kanban columns container. Scroll horizontally if columns overflow."
        >
          <div className="flex gap-4 min-w-[1080px] xl:min-w-0 xl:grid xl:grid-cols-4">
            {KANBAN_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={tasksByColumn[column.id]}
                canCreateTask={canCreateTask}
                onOpenCreateModal={onOpenCreateModal}
                onSelectTask={onSelectTask}
                onStatusChange={handleStatusChangeDirect}
                members={members}
                currentUserId={currentUserId}
                currentRole={currentRole}
              />
            ))}
          </div>
        </div>
      </DragDropContext>

      {/* Board Empty State if 0 tasks in all 4 columns */}
      {activeBoardTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/20 p-12 text-center">
          <p className="text-sm font-semibold text-white">No active tasks on the board</p>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            {canCreateTask
              ? 'Get started by creating your first task in the To Do column.'
              : 'Tasks added to this project will appear in their respective stages.'}
          </p>
          {canCreateTask && (
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      )}

      {/* Notice about cancelled tasks */}
      {cancelledCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-slate-500 shrink-0" />
            <span>
              {cancelledCount} cancelled {cancelledCount === 1 ? 'task is' : 'tasks are'} excluded from the board.
            </span>
          </div>
          <button
            type="button"
            onClick={onSwitchToListView}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
          >
            View in List &rarr;
          </button>
        </div>
      )}
    </div>
  )
}
