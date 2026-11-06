import type { FC } from 'react'
import { ShieldCheck, KeyRound, Lock, Server } from 'lucide-react'

export const SecuritySection: FC = () => {
  const securityPillars = [
    {
      title: 'Organization-based access',
      description:
        'Tenant data isolation is enforced directly at the database engine level using PostgreSQL Row Level Security (RLS). Every query is automatically scoped to the active organization identifier.',
      icon: ShieldCheck,
      badge: 'Tenant Isolation',
    },
    {
      title: 'Role-based permissions',
      description:
        'Structured privilege models ensure only authorized team members can create projects, assign work, or manage workspace membership through Owner, Manager, and Member roles.',
      icon: KeyRound,
      badge: 'RBAC Controls',
    },
    {
      title: 'Private attachments',
      description:
        'Files and specifications are stored in private storage buckets and only served through short-lived cryptographic signed URLs, preventing unauthorized public URL enumeration.',
      icon: Lock,
      badge: 'Signed URLs',
    },
    {
      title: 'Protected data',
      description:
        'End-to-end HTTPS/TLS encryption for all client-server communications, backed by cryptographically signed JSON Web Token (JWT) session validation on every mutation.',
      icon: Server,
      badge: 'Cryptographic Auth',
    },
  ]

  return (
    <section id="security" className="relative py-20 lg:py-28 bg-slate-950/40 border-t border-slate-900">
      {/* Background ambient lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-10 left-10 h-72 w-72 rounded-full bg-emerald-500/5 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Security & Compliance Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Security enforced by architecture, not promises
          </h2>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto">
            Your data confidentiality is guaranteed through proven multi-tenant isolation,
            cryptographic sessions, and granular permission boundaries.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {securityPillars.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl hover:border-slate-700 transition-all group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-md border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs font-medium text-slate-400">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-white tracking-tight mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {item.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
