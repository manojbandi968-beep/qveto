import type { FC } from 'react'
import { LandingNavbar } from '../components/LandingNavbar.tsx'
import { HeroSection } from '../components/HeroSection.tsx'
import { FeatureBentoGrid } from '../components/FeatureBentoGrid.tsx'
import { WorkflowSection } from '../components/WorkflowSection.tsx'
import { DashboardPreviewSection } from '../components/DashboardPreviewSection.tsx'
import { SecuritySection } from '../components/SecuritySection.tsx'
import { ClosingSection } from '../components/ClosingSection.tsx'
import { LandingFooter } from '../components/LandingFooter.tsx'

export const LandingPage: FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col scroll-smooth">
      {/* Sleek sticky navbar */}
      <LandingNavbar />

      {/* Main landing content */}
      <main className="flex-1">
        {/* Hero Section with reactive starfield */}
        <HeroSection />

        {/* Feature Bento Grid */}
        <FeatureBentoGrid />

        {/* 3-Step Workflow Section */}
        <WorkflowSection />

        {/* Dashboard & Reporting Preview */}
        <DashboardPreviewSection />

        {/* Architecture & Security Section */}
        <SecuritySection />

        {/* Closing Action Section */}
        <ClosingSection />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  )
}
