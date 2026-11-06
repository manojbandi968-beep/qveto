import { useState, useRef, useEffect, type FC } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  MessageSquare,
  Paperclip,
  ShieldCheck,
  Check,
} from 'lucide-react'
import { StarfieldCanvas } from './StarfieldCanvas.tsx'

export const HeroSection: FC = () => {
  const previewRef = useRef<HTMLDivElement | null>(null)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })
  const [isHovering, setIsHovering] = useState(false)

  useEffect(() => {
    const prefersReducedMotion =
      typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
    if (prefersReducedMotion) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!previewRef.current || window.innerWidth < 1024) return
      const rect = previewRef.current.getBoundingClientRect()
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (!isInside) {
        setIsHovering(false)
        setTilt({ rotateX: 0, rotateY: 0 })
        return
      }

      setIsHovering(true)
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5

      // Subtle tilt clamped to max 3.5 deg
      setTilt({
        rotateX: -y * 7,
        rotateY: x * 7,
      })
    }

    const handleMouseLeave = () => {
      setIsHovering(false)
      setTilt({ rotateX: 0, rotateY: 0 })
    }

    window.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
      {/* Background canvas starfield */}
      <StarfieldCanvas />

      {/* Ambient gradient glow blurs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[750px] max-w-full rounded-full bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-transparent blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 right-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Eyebrow, Headings and Text */}
        <div className="mx-auto max-w-3xl text-center space-y-6">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300 backdrop-blur-md shadow-sm shadow-indigo-950">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>PROJECT MANAGEMENT, WITHOUT THE CHAOS</span>
          </div>

          {/* Main heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Bring every project, task, and conversation{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-indigo-200 bg-clip-text text-transparent">
              into flow.
            </span>
          </h1>

          {/* Supporting copy */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto">
            ProjectFlow helps teams organize work, collaborate securely, track progress,
            and stay ahead of deadlines.
          </p>

          {/* Primary Account Actions ONLY: Sign Up & Sign In */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-7 py-3.5 text-base font-semibold text-white shadow-xl shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 hover:shadow-indigo-500/35 hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              <span>Sign Up</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-slate-700/80 bg-slate-900/60 px-7 py-3.5 text-base font-semibold text-slate-200 hover:text-white hover:bg-slate-800/80 hover:border-slate-600 hover:-translate-y-0.5 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-950"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Product Preview Composition */}
        <div className="mt-14 sm:mt-16 lg:mt-20 [perspective:1200px]">
          <div
            ref={previewRef}
            style={{
              transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`,
              transition: isHovering ? 'transform 0.15s ease-out' : 'transform 0.5s ease-out',
            }}
            className="relative rounded-2xl border border-slate-800/90 bg-slate-900/75 p-4 sm:p-6 lg:p-7 backdrop-blur-xl shadow-2xl shadow-indigo-950/60 transition-shadow hover:shadow-indigo-900/40"
          >
            {/* Window control chrome & Sprint status */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                </div>
                <div className="h-4 w-px bg-slate-800" />
                <span className="text-xs font-semibold text-slate-200">
                  Sprint Q4 • Infrastructure Modernization
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                  On Track
                </span>
              </div>

              {/* Progress metric */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                    Sprint Progress
                  </span>
                  <span className="text-xs font-bold text-white">78% Completed</span>
                </div>
                <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full w-[78%]" />
                </div>
              </div>
            </div>

            {/* Kanban Columns Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
              {/* Column 1: To Do */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      To Do
                    </span>
                  </div>
                  <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                    2
                  </span>
                </div>

                {/* Card 1 */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5 shadow-sm hover:border-slate-700 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400 border border-indigo-500/20">
                      Design System
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">Normal</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 leading-snug">
                    Standardize design tokens & UI components
                  </h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-slate-500" />
                        <span>3/4</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3 text-slate-500" />
                        <span>2</span>
                      </span>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600/30 text-[10px] font-bold text-indigo-300">
                      DS
                    </div>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20">
                      API
                    </span>
                    <span className="text-[10px] font-medium text-amber-400">High</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 leading-snug">
                    Define rate limiting & quota policies
                  </h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>Next week</span>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-600/30 text-[10px] font-bold text-cyan-300">
                      RL
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 2: In Progress */}
              <div className="rounded-xl border border-indigo-900/30 bg-slate-950/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                      In Progress
                    </span>
                  </div>
                  <span className="rounded-md bg-indigo-950/80 px-2 py-0.5 text-[11px] font-semibold text-indigo-300 border border-indigo-800/50">
                    2
                  </span>
                </div>

                {/* Card 3 - Highlighted task */}
                <div className="rounded-lg border border-indigo-500/40 bg-gradient-to-b from-slate-900 to-indigo-950/30 p-3.5 space-y-2.5 shadow-md shadow-indigo-950/40">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-400 border border-rose-500/20">
                      Security
                    </span>
                    <span className="text-[10px] font-bold text-rose-400">Urgent</span>
                  </div>
                  <h4 className="text-xs font-semibold text-white leading-snug">
                    Audit PostgreSQL Row Level Security (RLS) policies
                  </h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>5/6</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3 text-slate-500" />
                        <span>8</span>
                      </span>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600/30 text-[10px] font-bold text-rose-300 border border-rose-500/30">
                      SE
                    </div>
                  </div>
                </div>

                {/* Card 4 */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/90 p-3.5 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400 border border-violet-500/20">
                      Realtime
                    </span>
                    <span className="text-[10px] font-medium text-indigo-400">High</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 leading-snug">
                    Task state synchronization & live presence
                  </h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>Tomorrow</span>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-violet-600/30 text-[10px] font-bold text-violet-300">
                      RT
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 3: Done */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                      Done
                    </span>
                  </div>
                  <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                    4
                  </span>
                </div>

                {/* Card 5 */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5 opacity-90">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      Platform
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <Check className="h-3 w-3" />
                      <span>Completed</span>
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-300 line-through decoration-slate-600 leading-snug">
                    Multi-tenant workspace isolation architecture
                  </h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-500">
                    <span>Verified</span>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600/30 text-[10px] font-bold text-emerald-300">
                      MT
                    </div>
                  </div>
                </div>

                {/* Card 6 */}
                <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3.5 space-y-2.5 opacity-90">
                  <div className="flex items-center justify-between">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-300">
                      Auth
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-400">
                      <Check className="h-3 w-3" />
                      <span>Completed</span>
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-300 line-through decoration-slate-600 leading-snug">
                    Implement Google OAuth & credential authentication
                  </h4>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-500">
                    <span>Merged</span>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-slate-300">
                      GA
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlaid Floating Notification & Activity Detail */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/70">
              {/* Notification element */}
              <div className="inline-flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs text-slate-300 shadow-lg">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </div>
                <span>
                  <strong className="text-white font-medium">Notification:</strong> Assigned to{' '}
                  <span className="text-indigo-300">Row-level security audit</span>
                </span>
              </div>

              {/* Collaboration detail */}
              <div className="inline-flex items-center gap-2 text-xs text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>Live sync active • 4 team members connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
