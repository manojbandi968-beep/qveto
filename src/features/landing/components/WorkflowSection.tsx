import type { FC } from 'react'
import { FolderTree, Users, Rocket, ArrowRight } from 'lucide-react'

export const WorkflowSection: FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Organize work',
      description:
        'Structure initiatives into dedicated organization spaces and manageable project boards. Define clear tasks, set priorities, and assign deliverables.',
      icon: FolderTree,
      gradient: 'from-indigo-500/20 to-indigo-600/5',
      border: 'border-indigo-500/30',
      badge: 'bg-indigo-500/10 text-indigo-400',
    },
    {
      step: '02',
      title: 'Collaborate clearly',
      description:
        'Coordinate directly inside task cards with threaded discussions, secure file attachments, and smart notifications that eliminate communication silos.',
      icon: Users,
      gradient: 'from-violet-500/20 to-violet-600/5',
      border: 'border-violet-500/30',
      badge: 'bg-violet-500/10 text-violet-400',
    },
    {
      step: '03',
      title: 'Deliver on time',
      description:
        'Track live progress across Kanban stages, inspect real-time workload rollups, and unblock team members to hit deadlines with confidence.',
      icon: Rocket,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      border: 'border-emerald-500/30',
      badge: 'bg-emerald-500/10 text-emerald-400',
    },
  ]

  return (
    <section id="workflow" className="relative py-20 lg:py-28 bg-slate-950/60 border-t border-slate-900">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-violet-400">
            How It Works
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            From roadmap to production in three steps
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            A continuous, low-overhead cycle designed to keep engineers and product teams moving
            forward without friction.
          </p>
        </div>

        {/* 3-Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group flex flex-col justify-between"
              >
                <div>
                  {/* Top step number and icon */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-2xl font-black text-slate-700 group-hover:text-indigo-400/80 transition-colors font-mono">
                      {item.step}
                    </span>
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient} ${item.badge} border ${item.border} group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-semibold text-white tracking-tight mb-3">
                    {item.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Sub-step indicator */}
                <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
                  <span>Phase {index + 1} of 3</span>
                  {index < 2 ? (
                    <ArrowRight className="h-4 w-4 text-slate-600 hidden md:block" />
                  ) : (
                    <span className="text-emerald-400 font-medium">Ship</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
