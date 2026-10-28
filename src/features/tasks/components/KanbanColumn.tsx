import type { FC } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { Plus, CheckSquare } from 'lucide-react'
import { KanbanCard } from './KanbanCard.tsx'
import type { KanbanColumnDef } from '../utils.ts'
import type {
  OrgMemberOption,
  TaskRecord,
  TaskStatus,
} from '../types.ts'

interface KanbanColumnProps {
  column: KanbanColumnDef
  tasks: TaskRecord[]
  canCreateTask: boolean
  onOpenCreateModal: () => void
  onSelectTask: (task: TaskRecord) => void
  onStatusChange: (task: TaskRecord, newStatus: TaskStatus) => void
  members: OrgMemberOption[]
  currentUserId: string | undefined
  currentRole: string | null
}

export const KanbanColumn: FC<KanbanColumnProps> = ({
  column,
  tasks,
  canCreateTask,
  onOpenCreateModal,
  onSelectTask,
  onStatusChange,
  members,
  currentUserId,
  currentRole,
}) => {
  const isAdmin = currentRole === 'owner' || currentRole === 'manager'

  return (
    <div
      className="flex flex-col rounded-2xl border border-slate-800/80 bg-slate-900/30 p-3 sm:p-3.5 backdrop-blur-xs min-w-[270px] flex-1 max-w-full"
      role="region"
      aria-label={`${column.title} column with ${tasks.length} tasks`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-800/60 mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2.5 w-2.5 rounded-full ${column.dotColor}`} />
          <h3 className="text-xs font-bold text-white tracking-wide">
            {column.title}
          </h3>
          <span className="rounded-full bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
            {tasks.length}
          </span>
        </div>

        {canCreateTask && column.id === 'todo' && (
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="flex items-center gap-1 rounded-md bg-indigo-600/20 border border-indigo-500/30 px-2 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-600/30 hover:text-white transition-colors cursor-pointer"
            title="Create task in To Do"
            aria-label="Add new task to To Do column"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </button>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 flex flex-col gap-2.5 min-h-[300px] rounded-xl p-1.5 transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-indigo-500/10 ring-1 ring-indigo-500/30'
                : 'bg-transparent'
            }`}
          >
            {tasks.map((task, index) => {
              const canDrag =
                isAdmin || (currentRole === 'member' && task.assignee_id === currentUserId)

              return (
                <KanbanCard
                  key={task.id}
                  task={task}
                  index={index}
                  canDrag={canDrag}
                  members={members}
                  currentUserId={currentUserId}
                  onClick={() => onSelectTask(task)}
                  onStatusChange={onStatusChange}
                />
              )
            })}

            {provided.placeholder}

            {/* Empty Column State */}
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800/70 p-6 text-center my-auto min-h-[160px]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800/50 text-slate-500 mb-2">
                  <CheckSquare className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-slate-400">
                  No {column.title.toLowerCase()} tasks
                </p>
                <p className="mt-1 text-[11px] text-slate-600 max-w-[170px]">
                  {isAdmin
                    ? 'Drag a task here or create a new one'
                    : 'Tasks in this stage will appear here'}
                </p>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
