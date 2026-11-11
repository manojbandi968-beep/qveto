import { supabase } from '../../../lib/supabase.ts'
import type { CompanyDirectoryItem, Organization } from '../types.ts'

const STORAGE_KEY = 'projectflow_company_directory_v1'

const SEED_COMPANIES: CompanyDirectoryItem[] = [
  {
    id: 'org-seed-acme',
    name: 'Acme Innovations',
    industry: 'Technology & AI SaaS',
    description: 'Next-generation cloud collaboration, project execution, and developer toolkits for high-growth tech teams.',
    membersCount: 16,
    ownerEmail: 'alex.chen@acme-innovations.io',
    isSample: true,
  },
  {
    id: 'org-seed-pixelcraft',
    name: 'PixelCraft Studios',
    industry: 'Creative & UI/UX Design',
    description: 'Design systems, digital agency workflows, branding, and interactive interface engineering for web and mobile.',
    membersCount: 9,
    ownerEmail: 'sarah.miller@pixelcraft.design',
    isSample: true,
  },
  {
    id: 'org-seed-nexus',
    name: 'Nexus Cloud Technologies',
    industry: 'DevOps & Infrastructure',
    description: 'Scalable Kubernetes orchestration, automated CI/CD pipelines, and multi-cloud security monitoring.',
    membersCount: 24,
    ownerEmail: 'marcus.vance@nexuscloud.tech',
    isSample: true,
  },
  {
    id: 'org-seed-stripe-logistics',
    name: 'Stripe Logistics & Global',
    industry: 'Fintech & Supply Chain',
    description: 'Enterprise cross-border payments, distributed warehousing logic, and real-time ledger accounting.',
    membersCount: 19,
    ownerEmail: 'elena.rostova@stripelogistics.com',
    isSample: true,
  },
  {
    id: 'org-seed-apex',
    name: 'Apex Global Systems',
    industry: 'Enterprise Software & Data',
    description: 'Mission-critical enterprise workflow automation, compliance data management, and operational analytics.',
    membersCount: 32,
    ownerEmail: 'david.kim@apex-global.com',
    isSample: true,
  },
]

function getStoredCustomCompanies(): CompanyDirectoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as CompanyDirectoryItem[]
  } catch {
    return []
  }
}

function saveCustomCompanies(companies: CompanyDirectoryItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
  } catch (err) {
    console.error('Failed to save custom companies directory:', err)
  }
}

export async function fetchAllDirectoryCompanies(userOrgs: Organization[] = []): Promise<CompanyDirectoryItem[]> {
  const custom = getStoredCustomCompanies()

  // Also attempt to read from Supabase organizations table
  let supabaseOrgs: CompanyDirectoryItem[] = []
  try {
    const { data } = await supabase.from('organizations').select('id, name, owner_id, created_at')
    if (data && data.length > 0) {
      supabaseOrgs = data.map((o) => ({
        id: o.id,
        name: o.name,
        industry: 'General Workspace',
        description: `Active organization hosted on ProjectFlow. Created on ${new Date(o.created_at).toLocaleDateString()}.`,
        membersCount: 1,
        isSample: false,
        created_at: o.created_at,
      }))
    }
  } catch {
    // If RLS prevents global select, fallback cleanly
  }

  // Convert user's active organizations to directory items
  const userOrgItems: CompanyDirectoryItem[] = userOrgs.map((o) => ({
    id: o.id,
    name: o.name,
    industry: o.industry || 'Active Organization',
    description: o.description || 'Your authenticated company workspace on ProjectFlow.',
    membersCount: 1,
    isSample: false,
    created_at: o.created_at,
  }))

  // Merge and deduplicate by ID and Name
  const map = new Map<string, CompanyDirectoryItem>()

  // 1. Seed companies
  SEED_COMPANIES.forEach((c) => map.set(c.id, c))

  // 2. Custom created companies
  custom.forEach((c) => map.set(c.id, c))

  // 3. Supabase organizations
  supabaseOrgs.forEach((c) => map.set(c.id, c))

  // 4. User's own organizations
  userOrgItems.forEach((c) => map.set(c.id, c))

  return Array.from(map.values())
}

export async function searchCompanies(query: string, userOrgs: Organization[] = []): Promise<CompanyDirectoryItem[]> {
  const all = await fetchAllDirectoryCompanies(userOrgs)
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return all

  return all.filter(
    (c) =>
      c.name.toLowerCase().includes(trimmed) ||
      c.industry.toLowerCase().includes(trimmed) ||
      c.description.toLowerCase().includes(trimmed)
  )
}

export function registerCompanyInDirectory(company: CompanyDirectoryItem) {
  const existing = getStoredCustomCompanies()
  const filtered = existing.filter((c) => c.id !== company.id)
  saveCustomCompanies([...filtered, company])
}
