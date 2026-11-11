import { useState } from 'react'
import type { FC } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar.tsx'
import { Navbar } from './Navbar.tsx'

export const AppLayout: FC = () => {
  // Desktop sidebar expanded state (expanded = full text labels, collapsed = slim icon rail)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('projectflow_sidebar_expanded')
      if (saved !== null) return saved === 'true'
      return true
    }
    return true
  })

  // Mobile sidebar open state
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('projectflow_sidebar_expanded', String(next))
      }
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[#0c0e14] text-slate-100 flex transition-colors duration-200">
      {/* Sidebar navigation: w-64 when open, w-20 when collapsed */}
      <Sidebar
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
        isMobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content viewport */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Navbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
