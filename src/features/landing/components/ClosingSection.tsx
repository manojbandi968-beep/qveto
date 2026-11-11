import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

export const ClosingSection: FC = () => {
  return (
    <section className="relative py-20 lg:py-28 bg-slate-950 border-t border-slate-900 overflow-hidden">
      {/* Background glow effects */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[700px] max-w-full rounded-full bg-gradient-to-r from-indigo-600/15 via-violet-600/15 to-transparent blur-3xl"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 via-slate-900/50 to-slate-950/90 p-8 sm:p-12 lg:p-16 text-center backdrop-blur-xl shadow-2xl shadow-black/60 space-y-6">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Start organizing your team&apos;s work today.
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-xl mx-auto leading-relaxed">
            Experience how structured workspaces, rapid Kanban workflows, and strict access
            boundaries bring complete clarity to your delivery cycle.
          </p>

          {/* Account CTA buttons ONLY: Sign Up and Sign In */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <span>Sign Up</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/60 px-8 py-3.5 text-base font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 hover:-translate-y-0.5 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

