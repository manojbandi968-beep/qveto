import type { FC } from 'react'
import { Outlet, Link } from 'react-router-dom'
import { Layers, ShieldCheck, Zap, Users } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export const AuthLayout: FC = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-cyan-600/5 blur-3xl" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 group mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
              <Layers className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              ProjectFlow
            </span>
          </Link>
          <h2 className="text-xl font-semibold text-slate-100 tracking-tight">
            Streamline your team collaboration
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Powered by modern React, TypeScript & Supabase
          </p>
        </div>

        {/* Auth form outlet */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50">
          <Outlet />
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-3 gap-3 text-center text-xs text-slate-400">
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800/50 bg-slate-900/30">
            <Zap className="h-4 w-4 text-indigo-400" />
            <span>Instant Sync</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800/50 bg-slate-900/30">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Secure Auth</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800/50 bg-slate-900/30">
            <Users className="h-4 w-4 text-violet-400" />
            <span>Team Workspaces</span>
          </div>
        </div>

        {/* Bottom copyright/version */}
        <p className="text-center text-xs text-slate-400">
          &copy; {CURRENT_YEAR} ProjectFlow SaaS Foundation. All rights reserved.
        </p>
      </div>
    </div>
  )
}
