import { useLocation } from 'react-router-dom'
import { ModuleStub } from '../crm/CrmPage'

const MODULES = {
  '/app/document-vault': {
    title: 'Document vault',
    color: 'bg-lavender',
    copy: 'Contracts, BAAs, licenses, and practice documents will live here.',
  },
  '/app/resources': {
    title: 'Resources',
    color: 'bg-lavender',
    copy: 'Shared SOPs, templates, and practice resources will live here.',
  },
  '/app/training': {
    title: 'Training',
    color: 'bg-lavender',
    copy: 'Onboarding checklists and training assignments will live here.',
  },
  '/app/inventory': {
    title: 'Inventory',
    color: 'bg-lavender',
    copy: 'Supplies, par levels, and reorder tracking will live here.',
  },
  '/app/no-shows': {
    title: 'No-shows',
    color: 'bg-cyan',
    copy: 'Missed appointments, recovery outreach, and waitlist fills will live here.',
  },
  '/app/phone': {
    title: 'Phone & text',
    color: 'bg-cyan',
    copy: 'Call logs, SMS threads, and front-desk messaging will live here.',
  },
  '/app/voip': {
    title: 'Phone & text (VoIP)',
    color: 'bg-teal',
    copy: 'Connect RingCentral or another VoIP provider, assign numbers, and turn on texting.',
  },
  '/app/email-domains': {
    title: 'Email & domains',
    color: 'bg-teal',
    copy: 'Connect Gmail, Microsoft 365, or other mailboxes and verify sending domains.',
  },
  '/app/mobile': {
    title: 'Mobile app',
    color: 'bg-teal',
    copy: 'Choose who can use the phone app — the whole product or selected features.',
  },
  '/app/brand': {
    title: 'Company & brand',
    color: 'bg-teal',
    copy: 'Logo, colors, fonts, and email footer used across emails, letters, and texts.',
  },
  '/app/plans-access': {
    title: 'Plans & access',
    color: 'bg-teal',
    copy: 'Plan limits, access groups, and who can change company settings.',
  },
  '/app/provider-leads': {
    title: 'Provider leads',
    color: 'bg-yellow',
    copy: 'Referral-partner and recruiting outreach pipelines will live here.',
  },
  '/app/cms-search': {
    title: 'CMS provider search',
    color: 'bg-yellow',
    copy: 'Search NPPES and import clinicians into Provider leads.',
  },
  '/app/email-campaigns': {
    title: 'Email campaigns',
    color: 'bg-yellow',
    copy: 'Build, send, and track practice email campaigns.',
  },
  '/app/social': {
    title: 'Social posts',
    color: 'bg-yellow',
    copy: 'Queue and publish social posts for the practice brand.',
  },
  '/app/marketing': {
    title: 'Email & social',
    color: 'bg-yellow',
    copy: 'Campaigns, reviews, email, and social posts will live here.',
  },
  '/app/agents': {
    title: 'AI agents',
    color: 'bg-yellow',
    copy: 'Drafting agents, follow-up helpers, and outreach automation will live here.',
  },
  '/app/setup': {
    title: 'Practice setup',
    color: 'bg-teal',
    copy: 'Profile, locations, departments, and policies — finish the remaining setup checklist items.',
  },
  '/app/operations': {
    title: 'Operations',
    color: 'bg-lavender',
    copy: 'Documents, vendor BAAs, roles, and audit log will live here.',
  },
  '/app/timeclock': {
    title: 'Time Clock',
    color: 'bg-teal',
    copy: 'Clock-in, timesheets, and payroll export will live here.',
  },
}

export default function ComingSoonPage() {
  const { pathname } = useLocation()
  const mod = MODULES[pathname] || {
    title: 'Coming soon',
    color: 'bg-lavender',
    copy: 'This module is on the roadmap for your practice workspace.',
  }
  return <ModuleStub title={mod.title} color={mod.color} copy={mod.copy} />
}
