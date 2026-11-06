import type { FC } from 'react'
import {
  FolderKanban,
  Kanban,
  MessageSquare,
  Bell,
  Paperclip,
  Activity,
  Clock,
  Layers,
} from 'lucide-react'

export const FeatureBentoGrid: FC = () => {
  return (
    <section id="features" className="relative py-20 lg:py-28 border-t border-slate-900 bg-slate-950/40">
      {/* Background radial accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[800px] max-w-full rounded-full bg-indigo-600/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Platform Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Engineered for high-performing teams
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Everything your team needs to plan, track, and ship complex projects in a unified,
            low-friction workspace.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Bento Item 1 (Wide): Clear project structure */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-3 max-w-md">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Clear project structure
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Organize work hierarchically with organization-wide workspaces, scoped project
                  containers, custom milestones, and member roles designed for clarity and ownership.
                </p>
              </div>

              {/* Visual preview widget */}
              <div className="w-full md:w-64 rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center gap-2 text-slate-400 pb-2 border-b border-slate-800">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-semibold text-slate-200">Organization Space</span>
                </div>
                <div className="space-y-1.5 pl-2 border-l border-indigo-500/30">
                  <div className="flex items-center justify-between rounded bg-slate-900/80 px-2 py-1 text-slate-300">
                    <span>Core Platform</span>
                    <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between rounded bg-slate-900/80 px-2 py-1 text-slate-300">
                    <span>Mobile Experience</span>
                    <span className="text-[10px] text-indigo-400 font-medium">Sprint 8</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Item 2: Task management and Kanban workflow */}
          <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 group-hover:scale-105 transition-transform">
                <Kanban className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-white tracking-tight">
                Task management and Kanban workflow
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Visual boards with drag-and-drop transitions, customizable statuses, checklist
                subtasks, and urgent priority tags that keep backlogs organized.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-slate-400">
                <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-300">To Do</span>
                <span className="text-slate-600">&rarr;</span>
                <span className="rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 px-2.5 py-1">
                  In Progress
                </span>
                <span className="text-slate-600">&rarr;</span>
                <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-300">Done</span>
              </div>
            </div>
          </div>

          {/* Bento Item 3: Team comments and activity history */}
          <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
                <MessageSquare className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-white tracking-tight">
                Team comments and activity history
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Centralize discussions directly inside task cards with threaded conversations,
                timestamped modification logs, and full team context.
              </p>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-slate-300 flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-600/30 text-[10px] text-cyan-300 font-bold">
                  AK
                </div>
                <div className="leading-tight">
                  <span className="font-semibold text-white">Updated acceptance criteria</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">All unit tests verified locally.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bento Item 4: Smart deadline notifications */}
          <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-white tracking-tight">
                Smart deadline notifications
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Stay informed with targeted alerts for upcoming due dates, newly assigned work, and
                priority escalations without notification overload.
              </p>
              <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-300">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Due in 24 hours: Security policy audit</span>
              </div>
            </div>
          </div>

          {/* Bento Item 5: Private file attachments */}
          <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group">
            <div className="space-y-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                <Paperclip className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-semibold text-white tracking-tight">
                Private file attachments
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Attach technical specifications, architecture diagrams, and design assets directly
                to tasks with secure storage and signed URL access controls.
              </p>
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-xs text-slate-300">
                <span className="truncate">system-architecture-spec.pdf</span>
                <span className="text-slate-500 shrink-0 ml-2">2.4 MB</span>
              </div>
            </div>
          </div>

          {/* Bento Item 6 (Wide): Live updates and reporting */}
          <div className="lg:col-span-3 rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-3 max-w-xl">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-105 transition-transform">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight">
                  Live updates and reporting
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Realtime state synchronization propagates board changes across team screens
                  immediately. High-level dashboard rollups provide instant visibility into sprint
                  health, completion ratios, and team velocity.
                </p>
              </div>

              {/* Inline mini metric cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
                  <span className="text-xs text-slate-400 block">Active Tasks</span>
                  <span className="text-lg font-bold text-white">48</span>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
                  <span className="text-xs text-slate-400 block">On-Time</span>
                  <span className="text-lg font-bold text-emerald-400">96%</span>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-center">
                  <span className="text-xs text-slate-400 block">Sync Latency</span>
                  <span className="text-lg font-bold text-indigo-400">&lt; 80ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
