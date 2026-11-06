import type { FC } from 'react'
import { Link } from 'react-router-dom'
import { Layers } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export const LandingFooter: FC = () => {
  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const element = document.getElementById(targetId)
    if (element) {
      const navOffset = 80
      const elementPosition = element.getBoundingClientRect().top
      const offsetPosition = elementPosition + window.pageYOffset - navOffset
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      })
    }
  }

  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950 py-12 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pb-10 border-b border-slate-800/80">
          {/* Brand & Brief Description */}
          <div className="max-w-md space-y-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <Layers className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                ProjectFlow
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed">
              ProjectFlow is a project management and team collaboration platform designed for
              clean structure, real-time synchronization, and secure delivery.
            </p>
          </div>

          {/* Section Navigation & Account Links */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs font-medium">
            <span className="text-slate-500 uppercase tracking-wider text-[11px]">Navigate</span>
            <a
              href="#features"
              onClick={(e) => handleScroll(e, 'features')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={(e) => handleScroll(e, 'workflow')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Workflow
            </a>
            <a
              href="#security"
              onClick={(e) => handleScroll(e, 'security')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Security
            </a>

            <span className="text-slate-700 hidden sm:inline">|</span>

            {/* Account Links */}
            <Link
              to="/login"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
            >
              Sign Up
            </Link>
          </div>
        </div>

        {/* Copyright notice with current year */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>&copy; {CURRENT_YEAR} ProjectFlow. All rights reserved.</p>
          <p className="text-slate-600">Project Management &amp; Team Collaboration</p>
        </div>
      </div>
    </footer>
  )
}
