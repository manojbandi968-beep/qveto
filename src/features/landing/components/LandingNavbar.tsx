import { useState, type FC } from 'react'
import { Link } from 'react-router-dom'
import { Layers, Menu, X } from 'lucide-react'

export const LandingNavbar: FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    setMobileMenuOpen(false)
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            <Layers className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            ProjectFlow
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav aria-label="Landing page navigation" className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            onClick={(e) => handleScroll(e, 'features')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Features
          </a>
          <a
            href="#workflow"
            onClick={(e) => handleScroll(e, 'workflow')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Workflow
          </a>
          <a
            href="#security"
            onClick={(e) => handleScroll(e, 'security')}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
          >
            Security
          </a>
        </nav>

        {/* Right-side Account Actions ONLY: Sign In and Sign Up */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900/60 transition-colors"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 px-4 pt-2 pb-6 space-y-4 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 pt-2">
            <a
              href="#features"
              onClick={(e) => handleScroll(e, 'features')}
              className="text-base font-medium text-slate-300 hover:text-white transition-colors py-1"
            >
              Features
            </a>
            <a
              href="#workflow"
              onClick={(e) => handleScroll(e, 'workflow')}
              className="text-base font-medium text-slate-300 hover:text-white transition-colors py-1"
            >
              Workflow
            </a>
            <a
              href="#security"
              onClick={(e) => handleScroll(e, 'security')}
              className="text-base font-medium text-slate-300 hover:text-white transition-colors py-1"
            >
              Security
            </a>
          </nav>

          {/* Right-side Account Actions ONLY in mobile */}
          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 py-2.5 text-sm font-medium text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
