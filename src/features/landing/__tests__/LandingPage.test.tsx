import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '../pages/LandingPage.tsx'

// Mock HTMLCanvasElement.getContext and window.matchMedia for jsdom
beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    scale: vi.fn(),
  })

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('LandingPage', () => {
  const renderLandingPage = () => {
    return render(
      <MemoryRouter initialEntries={['/']}>
        <LandingPage />
      </MemoryRouter>
    )
  }

  it('renders the brand title and navigation links', () => {
    renderLandingPage()

    const brandNames = screen.getAllByText('ProjectFlow')
    expect(brandNames.length).toBeGreaterThanOrEqual(1)

    // Navigation anchor links
    const featuresLinks = screen.getAllByText('Features')
    expect(featuresLinks.length).toBeGreaterThanOrEqual(1)

    const workflowLinks = screen.getAllByText('Workflow')
    expect(workflowLinks.length).toBeGreaterThanOrEqual(1)

    const securityLinks = screen.getAllByText('Security')
    expect(securityLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('renders the hero eyebrow, main heading, and supporting copy exactly as specified', () => {
    renderLandingPage()

    // Eyebrow
    expect(
      screen.getByText('PROJECT MANAGEMENT, WITHOUT THE CHAOS')
    ).toBeInTheDocument()

    // Main heading
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Bring every project, task, and conversation into flow/i,
      })
    ).toBeInTheDocument()

    // Supporting copy
    expect(
      screen.getByText(
        /ProjectFlow helps teams organize work, collaborate securely, track progress, and stay ahead of deadlines/i
      )
    ).toBeInTheDocument()
  })

  it('strictly contains ONLY Sign In and Sign Up as account CTA actions', () => {
    renderLandingPage()

    // Confirm presence of Sign In and Sign Up links
    const signInLinks = screen.getAllByRole('link', { name: /Sign In/i })
    expect(signInLinks.length).toBeGreaterThanOrEqual(2)
    signInLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/login')
    })

    const signUpLinks = screen.getAllByRole('link', { name: /Sign Up/i })
    expect(signUpLinks.length).toBeGreaterThanOrEqual(2)
    signUpLinks.forEach((link) => {
      expect(link).toHaveAttribute('href', '/register')
    })

    // Strict validation: Verify forbidden buttons do NOT exist
    expect(screen.queryByText(/Get Started/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Book a Demo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Book Demo/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Try Free/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Start Free Trial/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pricing/i)).not.toBeInTheDocument()
  })

  it('renders the product preview composition with Kanban columns', () => {
    renderLandingPage()

    const todoElements = screen.getAllByText('To Do')
    expect(todoElements.length).toBeGreaterThanOrEqual(1)

    const inProgressElements = screen.getAllByText('In Progress')
    expect(inProgressElements.length).toBeGreaterThanOrEqual(1)

    const doneElements = screen.getAllByText('Done')
    expect(doneElements.length).toBeGreaterThanOrEqual(1)

    expect(screen.getByText(/Sprint Progress/i)).toBeInTheDocument()
  })

  it('renders the Feature Bento Grid items', () => {
    renderLandingPage()

    expect(screen.getByText('Clear project structure')).toBeInTheDocument()
    expect(screen.getByText('Task management and Kanban workflow')).toBeInTheDocument()
    expect(screen.getByText('Team comments and activity history')).toBeInTheDocument()
    expect(screen.getByText('Smart deadline notifications')).toBeInTheDocument()
    expect(screen.getByText('Private file attachments')).toBeInTheDocument()
    expect(screen.getByText('Live updates and reporting')).toBeInTheDocument()
  })

  it('renders the 3-step Workflow section', () => {
    renderLandingPage()

    expect(screen.getByText('Organize work')).toBeInTheDocument()
    expect(screen.getByText('Collaborate clearly')).toBeInTheDocument()
    expect(screen.getByText('Deliver on time')).toBeInTheDocument()
  })

  it('renders the Dashboard Preview section with workload and project metrics', () => {
    renderLandingPage()

    expect(
      screen.getByText(/Clarity across your entire project portfolio/i)
    ).toBeInTheDocument()
    expect(screen.getByText('Active Projects')).toBeInTheDocument()
    expect(screen.getAllByText('Active Tasks').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Overdue Tasks')).toBeInTheDocument()
    expect(screen.getByText('Completion Rate')).toBeInTheDocument()
    expect(screen.getByText('Team Workload Distribution')).toBeInTheDocument()
    expect(screen.getByText('Project Progress & Milestones')).toBeInTheDocument()
  })

  it('renders the architectural Security section without unsupported compliance claims', () => {
    renderLandingPage()

    expect(screen.getByText('Organization-based access')).toBeInTheDocument()
    expect(screen.getByText('Role-based permissions')).toBeInTheDocument()
    expect(screen.getByText('Private attachments')).toBeInTheDocument()
    expect(screen.getByText('Protected data')).toBeInTheDocument()

    // Ensure no unsupported fake compliance claims exist
    expect(screen.queryByText(/SOC-?2/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/HIPAA/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/ISO 27001/i)).not.toBeInTheDocument()
  })

  it('renders the Closing section and Footer with current year copyright', () => {
    renderLandingPage()

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /Start organizing your team's work today/i,
      })
    ).toBeInTheDocument()

    const currentYear = new Date().getFullYear().toString()
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument()
  })
})
