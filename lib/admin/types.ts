import { PlanTier } from '@/lib/subscription/plans'

export interface HeroContent {
  badge: string
  headline: string
  highlightText: string
  subheadline: string
  primaryCtaText: string
  secondaryCtaText: string
}

export interface AnnouncementContent {
  enabled: boolean
  text: string
  linkText: string
  linkUrl: string
  variant: 'gold' | 'emerald' | 'amber'
}

export interface PricingCopyContent {
  freeSubheading: string
  proSubheading: string
  eliteSubheading: string
  proBadge: string
  eliteBadge: string
}

export interface SettingsContent {
  maintenanceMode: boolean
  allowNewSignups: boolean
  supportEmail: string
  contactNotice: string
}

export interface CMSData {
  hero: HeroContent
  announcement: AnnouncementContent
  pricing: PricingCopyContent
  settings: SettingsContent
}

export const DEFAULT_CMS_DATA: CMSData = {
  hero: {
    badge: 'Dual-Engine Document Intelligence Platform',
    headline: 'Your Documents.',
    highlightText: 'Understood with AI.',
    subheadline:
      'Organize hundreds of complex PDFs, search meaning with semantic vectors, extract structured metadata, and verify facts with grounded page-level citations.',
    primaryCtaText: 'Start Free Forever',
    secondaryCtaText: 'View Pricing & Plans',
  },
  announcement: {
    enabled: false,
    text: '🚀 Welcome to FileMind 2.0: Dual-Engine Vector Search & Biometric Encryption are now live!',
    linkText: 'Learn More',
    linkUrl: '/about',
    variant: 'gold',
  },
  pricing: {
    freeSubheading: 'Essential PDF management & private cloud storage for individuals.',
    proSubheading: 'For legal, finance, and technical researchers needing AI extraction.',
    eliteSubheading: 'High-volume workflows, 10 GB storage, and hardware biometric vault.',
    proBadge: 'RECOMMENDED',
    eliteBadge: 'ADVANCED POWER',
  },
  settings: {
    maintenanceMode: false,
    allowNewSignups: true,
    supportEmail: 'contact@filemindhub.xyz',
    contactNotice: 'Our technical support team typically responds within 2-4 business hours.',
  },
}

export interface AdminUserListItem {
  id: string
  email: string
  fullName: string
  tier: PlanTier
  planName: string
  isManualGrant: boolean
  isSuspended: boolean
  emailConfirmed: boolean
  createdAt: string
  lastSignInAt: string | null
  totalDocuments: number
  totalStorageBytes: number
  totalStorageFormatted: string
  aiQueriesCount: number
}

export interface AdminUserDetail {
  id: string
  email: string
  fullName: string
  tier: PlanTier
  planName: string
  emailConfirmed: boolean
  createdAt: string
  lastSignInAt: string | null
  isSuspended: boolean
  storageBytes: number
  storageFormatted: string
  storageLimitBytes: number
  storageLimitFormatted: string
  documentsCount: number
  aiUsageCount: number
  manualGrant: Record<string, any> | null
  metadata: Record<string, any>
  documents: Array<{
    id: string
    title: string | null
    file_name: string
    file_size: number
    processing_status: string
    created_at: string
  }>
}

export interface GrantRecord {
  id: string
  user_id: string
  user_email: string
  granted_by_email: string
  tier: 'pro' | 'elite'
  duration_days: number | null
  starts_at: string
  expires_at: string | null
  reason: string
  status: 'active' | 'revoked' | 'expired'
  created_at: string
}

export interface AuditLogItem {
  id: string
  admin_id: string
  admin_email: string
  action_type: string
  target_id: string | null
  target_email: string | null
  details: Record<string, any>
  reason: string | null
  created_at: string
}
