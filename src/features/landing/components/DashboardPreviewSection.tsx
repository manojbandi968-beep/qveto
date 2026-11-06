import type { FC } from 'react'
import {
  BarChart3,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  FolderKanban,
  Users2,
} from 'lucide-react'

export const DashboardPreviewSection: FC = () => {
  return (
    <section className="relative py-20 lg:py-28 bg-slate-950/80 border-t border-slate-900">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Reporting & Visibility
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Clarity across your entire project portfolio
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Stay ahead of bottlenecks with continuous visibility into team workload distribution,
            project progress, overdue work, and completion metrics.
          </p>
        </div>

        {/* Dashboard Preview Shell */}
        <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-5 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Metric 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Active Projects</span>
                <FolderKanban className="h-4 w-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">12</span>
                <span className="text-xs font-medium text-emerald-400">All Healthy</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Across 3 active workspaces</p>
            </div>

            {/* Metric 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Active Tasks</span>
                <TrendingUp className="h-4 w-4 text-violet-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">48</span>
                <span className="text-xs font-medium text-indigo-300">22 In Progress</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">14 in review phase</p>
            </div>

            {/* Metric 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Overdue Tasks</span>
                <AlertTriangle className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400">0</span>
                <span className="text-xs font-medium text-emerald-400">Zero Backlog</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Target dates fulfilled</p>
            </div>

            {/* Metric 4 */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-xs font-medium">Completion Rate</span>
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white">96.8%</span>
                <span className="text-xs font-medium text-emerald-400">High Velocity</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Based on current cycle</p>
            </div>
          </div>

          {/* Breakdown Section: Workload & Project Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-semibold text-white">Team Workload Distribution</h3>
                </div>
                <span className="text-xs text-slate-400">4 Disciplines</span>
              </div>

              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Frontend & Design System</span>
                    <span className="text-slate-400 font-mono">14 tasks (78%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full w-[78%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Backend & Database Infrastructure</span>
                    <span className="text-slate-400 font-mono">18 tasks (85%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full w-[85%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">Security & Role Access Controls</span>
                    <span className="text-slate-400 font-mono">6 tasks (100%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300 font-medium">DevOps & Deployment Pipelines</span>
                    <span className="text-slate-400 font-mono">10 tasks (62%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full w-[62%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Project Progress Overview */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-violet-400" />
                  <h3 className="text-sm font-semibold text-white">Project Progress & Milestones</h3>
                </div>
                <span className="text-xs text-slate-400">Current Sprint</span>
              </div>

              <div className="space-y-3.5">
                <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">
                      Core Infrastructure Overhaul
                    </span>
                    <span className="text-emerald-400 font-medium">92% Finished</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">
                      Row-Level Security Hardening
                    </span>
                    <span className="text-emerald-400 font-medium">100% Complete</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full w-[100%]" />
                  </div>
                </div>

                <div className="rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">
                      Real-time Event Synchronization
                    </span>
                    <span className="text-indigo-400 font-medium">75% In Progress</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full w-[75%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
