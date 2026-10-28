import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, ArrowUpRight, Plus, AlertCircle } from 'lucide-react'
import type { ProjectProgressItem } from '../types.ts'

interface ProjectProgressSectionProps {
  items: ProjectProgressItem[]
  canCreateProject?: boolean
}

export const ProjectProgressSection: FC<ProjectProgressSectionProps> = ({
  items,
  canCreateProject,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <FolderKanban className="h-4 w-4 text-indigo-400" />
            <span>Project Progress</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Completion of non-cancelled tasks across workspace projects
          </p>
        </div>

        <Link
          to="/projects"
          className="flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          <span>View all projects</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900/20 p-8 text-center">
          <FolderKanban className="h-8 w-8 text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-300">No projects in this workspace</p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Create your first project to start tracking tasks and milestone progress.
          </p>
          {canCreateProject && (
            <Link
              to="/projects"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-500 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create project</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(({ project, totalNonCancelled, completedTasks, progressPercentage }) => {
            const hasEligibleTasks = totalNonCancelled > 0

            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 hover:border-slate-700 hover:bg-slate-900/70 transition-all cursor-pointer"
              >
                {/* Project Info */}
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200 group-hover:text-indigo-300 transition-colors truncate">
                      {project.name}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  {project.description ? (
                    <p className="text-xs text-slate-400 line-clamp-1">{project.description}</p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No description provided</p>
                  )}
                </div>

                {/* Progress Visual */}
                <div className="flex items-center gap-4 sm:w-64 shrink-0">
                  <div className="w-full space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">
                        {hasEligibleTasks
                          ? `${completedTasks} of ${totalNonCancelled} tasks`
                          : 'Tasks'}
                      </span>
                      {hasEligibleTasks ? (
                        <span className="font-semibold text-slate-200">
                          {progressPercentage}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
                          <AlertCircle className="h-2.5 w-2.5 text-slate-500" />
                          No eligible tasks
                        </span>
                      )}
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      {hasEligibleTasks ? (
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-800/60" />
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

