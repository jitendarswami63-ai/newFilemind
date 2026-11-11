export type PlanTier = 'free' | 'pro' | 'elite'

export interface PlanConfig {
  tier: PlanTier
  name: string
  tagline: string
  priceINR: number
  priceDisplay: string
  billingPeriod: string
  badgeLabel: string
  badgeVariant: 'free' | 'pro' | 'elite'
  includedStorageBytes: number
  includedStorageMB: number
  maxBatchFiles: number
  maxFileSizeBytes: number
  maxFileSizeMB: number
  hasAiFeatures: boolean
  hasPriorityProcessing: boolean
  monthlyAiAllowance: number
  features: string[]
  unsupportedFeatures?: string[]
}

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  free: {
    tier: 'free',
    name: 'Free Tier',
    tagline: 'Essential PDF management & private storage for individuals.',
    priceINR: 0,
    priceDisplay: '₹0',
    billingPeriod: '/ month',
    badgeLabel: 'FREE',
    badgeVariant: 'free',
    includedStorageBytes: 100 * 1024 * 1024,
    includedStorageMB: 100,
    maxBatchFiles: 10,
    maxFileSizeBytes: 5 * 1024 * 1024,
    maxFileSizeMB: 5,
    hasAiFeatures: false,
    hasPriorityProcessing: false,
    monthlyAiAllowance: 0,
    features: [
      '100 MB total private storage',
      'Maximum 10 PDF files per batch',
      'Maximum 5 MB per individual PDF',
      'Basic PDF upload & secure cloud storage',
      'PDF preview, download & deletion',
      'Basic file organization & metadata',
      'Bring Your Own Gemini API Key (BYOK) supported',
    ],
    unsupportedFeatures: [
      'No FileMind-managed Ask AI',
      'No semantic vector search',
      'No AI-generated summaries',
      'No auto categorization or tagging',
      'No priority processing queue',
    ],
  },
  pro: {
    tier: 'pro',
    name: 'Pro Intelligence',
    tagline: 'Recommended for researchers, analysts, and knowledge workers.',
    priceINR: 249,
    priceDisplay: '₹249',
    billingPeriod: '/ month (incl. GST)',
    badgeLabel: 'PRO',
    badgeVariant: 'pro',
    includedStorageBytes: 1024 * 1024 * 1024,
    includedStorageMB: 1024,
    maxBatchFiles: 100,
    maxFileSizeBytes: 25 * 1024 * 1024,
    maxFileSizeMB: 25,
    hasAiFeatures: true,
    hasPriorityProcessing: false,
    monthlyAiAllowance: 500,
    features: [
      '1 GB high-speed vault storage',
      'Maximum 100 PDFs per batch upload',
      'Maximum 25 MB per individual PDF',
      'AI-powered document extraction & understanding',
      'AI-generated titles, summaries & key insights',
      'Automatic categories & intelligent semantic tags',
      'Structured key-value metadata extraction',
      'Hybrid keyword + semantic vector search',
      'Grounded Ask AI with page citations & excerpts',
      'Background document processing',
      '500 monthly AI queries included',
    ],
  },
  elite: {
    tier: 'elite',
    name: 'Elite Intelligence',
    tagline: 'Advanced AI processing power, 10 GB storage, and biometric vault.',
    priceINR: 499,
    priceDisplay: '₹499',
    billingPeriod: '/ month (incl. GST)',
    badgeLabel: 'ELITE',
    badgeVariant: 'elite',
    includedStorageBytes: 10 * 1024 * 1024 * 1024,
    includedStorageMB: 10240,
    maxBatchFiles: 150,
    maxFileSizeBytes: 51_380_224,
    maxFileSizeMB: 49,
    hasAiFeatures: true,
    hasPriorityProcessing: true,
    monthlyAiAllowance: 2500,
    features: [
      '10 GB massive document vault storage',
      'Maximum 150 PDFs per batch upload',
      'Maximum 49 MB per individual PDF',
      'All Pro features included',
      'Priority background processing queue',
      '2,500 monthly AI queries included',
      'Advanced large-PDF adaptive bisection & splitting',
      'FIDO2 WebAuthn biometric document vault protection',
      'Advanced bulk document management & export',
      'Priority dedicated developer support',
    ],
  },
}

export interface StoragePack {
  id: 'pack_1gb' | 'pack_5gb' | 'pack_10gb'
  name: string
  storageBytes: number
  storageGB: number
  priceINR: number
  priceDisplay: string
  billingPeriod: string
  description: string
}

export const STORAGE_PACKS: Record<string, StoragePack> = {
  pack_1gb: {
    id: 'pack_1gb',
    name: 'Additional 1 GB',
    storageBytes: 1 * 1024 * 1024 * 1024,
    storageGB: 1,
    priceINR: 49,
    priceDisplay: '₹49',
    billingPeriod: '/ month',
    description: '+1 GB extra vault capacity for approximately 200 documents',
  },
  pack_5gb: {
    id: 'pack_5gb',
    name: 'Additional 5 GB',
    storageBytes: 5 * 1024 * 1024 * 1024,
    storageGB: 5,
    priceINR: 199,
    priceDisplay: '₹199',
    billingPeriod: '/ month',
    description: '+5 GB high-capacity storage for approximately 1,000 documents',
  },
  pack_10gb: {
    id: 'pack_10gb',
    name: 'Additional 10 GB',
    storageBytes: 10 * 1024 * 1024 * 1024,
    storageGB: 10,
    priceINR: 349,
    priceDisplay: '₹349',
    billingPeriod: '/ month',
    description: '+10 GB enterprise repository storage for 2,000+ documents',
  },
}

export function formatINR(amount: number): string {
  if (amount === 0) return '₹0'
  return `₹${amount.toLocaleString('en-IN')}`
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const formatted = parseFloat((bytes / Math.pow(k, i)).toFixed(i >= 2 ? 1 : 0))
  return `${formatted} ${sizes[i]}`
}

export function getUserPlanTier(
  user?: { user_metadata?: Record<string, any> | null } | null
): PlanTier {
  if (!user) return 'free'
  const meta = user.user_metadata || {}

  const rawTier = (meta.tier || meta.plan_tier || meta.plan || meta.subscription || '').toLowerCase()
  if (rawTier === 'elite') return 'elite'
  if (rawTier === 'pro' || meta.is_pro === true) return 'pro'
  return 'free'
}

export interface UserEntitlements {
  tier: PlanTier
  plan: PlanConfig
  isPro: boolean
  isElite: boolean
  isPaidPlan: boolean
  hasAiFeatures: boolean
  hasPriorityProcessing: boolean
  hasByok: boolean
  byokConfigured: boolean
  includedStorageBytes: number
  additionalStorageBytes: number
  totalStorageBytes: number
  usedStorageBytes: number
  availableStorageBytes: number
  usagePercent: number
  isWarning80: boolean
  isWarning90: boolean
  isQuotaExceeded: boolean
  monthlyAiAllowance: number
  usedAiCount: number
  remainingAiCount: number
  aiUsagePercent: number
  maxBatchFiles: number
  maxFileSizeBytes: number
  maxFileSizeMB: number
  renewalDate: string | null
  activatedAt: string | null
}

export function calculateUserEntitlements(
  user?: { user_metadata?: Record<string, any> | null } | null,
  usedStorageBytes: number = 0
): UserEntitlements {
  const tier = getUserPlanTier(user)
  const plan = PLAN_CONFIGS[tier]
  const meta = user?.user_metadata || {}

  const additionalStorageBytes = Number(meta.additional_storage_bytes) || 0
  const totalStorageBytes = plan.includedStorageBytes + additionalStorageBytes

  const usedBytes = Math.max(0, usedStorageBytes)
  const availableStorageBytes = Math.max(0, totalStorageBytes - usedBytes)
  const usagePercent = totalStorageBytes > 0 ? Math.min(100, Math.round((usedBytes / totalStorageBytes) * 100)) : 0

  const hasByok = Boolean(meta.byok_gemini_key)
  const effectiveAiEnabled = plan.hasAiFeatures || hasByok

  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const aiUsageMeta = meta.ai_usage || {}
  const usedAiCount = aiUsageMeta.month === currentMonthKey ? Number(aiUsageMeta.count) || 0 : 0
  const monthlyAiAllowance = plan.monthlyAiAllowance
  const remainingAiCount = hasByok ? 999999 : Math.max(0, monthlyAiAllowance - usedAiCount)
  const aiUsagePercent = monthlyAiAllowance > 0 ? Math.min(100, Math.round((usedAiCount / monthlyAiAllowance) * 100)) : 0

  return {
    tier,
    plan,
    isPro: tier === 'pro',
    isElite: tier === 'elite',
    isPaidPlan: tier === 'pro' || tier === 'elite',
    hasAiFeatures: effectiveAiEnabled,
    hasPriorityProcessing: plan.hasPriorityProcessing,
    hasByok,
    byokConfigured: hasByok,
    includedStorageBytes: plan.includedStorageBytes,
    additionalStorageBytes,
    totalStorageBytes,
    usedStorageBytes: usedBytes,
    availableStorageBytes,
    usagePercent,
    isWarning80: usagePercent >= 80 && usagePercent < 90,
    isWarning90: usagePercent >= 90 && usagePercent < 100,
    isQuotaExceeded: usedBytes >= totalStorageBytes,
    monthlyAiAllowance,
    usedAiCount,
    remainingAiCount,
    aiUsagePercent,
    maxBatchFiles: plan.maxBatchFiles,
    maxFileSizeBytes: plan.maxFileSizeBytes,
    maxFileSizeMB: plan.maxFileSizeMB,
    renewalDate: meta.plan_renewal_date || null,
    activatedAt: meta.plan_activated_at || null,
  }
}

export type FeatureKey =
  | 'basic_upload'
  | 'pdf_preview'
  | 'basic_storage'
  | 'ask_ai'
  | 'semantic_search'
  | 'ai_summaries'
  | 'advanced_metadata'
  | 'priority_processing'
  | 'large_pdf_splitting'
  | 'biometric_vault'
  | 'bulk_management'

export interface FeatureDefinition {
  key: FeatureKey
  name: string
  requiredTier: 'free' | 'pro' | 'elite'
  description: string
  badgeLabel?: string
}

export const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  basic_upload: {
    key: 'basic_upload',
    name: 'Basic PDF Upload',
    requiredTier: 'free',
    description: 'Upload up to 5 MB PDF documents',
  },
  pdf_preview: {
    key: 'pdf_preview',
    name: 'PDF Preview & Download',
    requiredTier: 'free',
    description: 'Instant PDF preview and secure download links',
  },
  basic_storage: {
    key: 'basic_storage',
    name: 'Private Document Storage',
    requiredTier: 'free',
    description: 'Private 100 MB vault storage',
  },
  ask_ai: {
    key: 'ask_ai',
    name: 'Ask AI with Grounded Citations',
    requiredTier: 'pro',
    description: 'Direct conversational analysis with exact page citations and excerpts',
    badgeLabel: 'PRO',
  },
  semantic_search: {
    key: 'semantic_search',
    name: 'Hybrid Semantic Search',
    requiredTier: 'pro',
    description: 'Vector embeddings search across document concepts and meanings',
    badgeLabel: 'PRO',
  },
  ai_summaries: {
    key: 'ai_summaries',
    name: 'AI Summaries & Categorization',
    requiredTier: 'pro',
    description: 'Automatic document classification, summaries, and semantic tags',
    badgeLabel: 'PRO',
  },
  advanced_metadata: {
    key: 'advanced_metadata',
    name: 'Structured Metadata Extraction',
    requiredTier: 'pro',
    description: 'Automatic key-value extraction of dates, invoice numbers, and entities',
    badgeLabel: 'PRO',
  },
  priority_processing: {
    key: 'priority_processing',
    name: 'Priority Background Processing',
    requiredTier: 'elite',
    description: 'Skip standard queues with dedicated high-speed vector indexing',
    badgeLabel: 'ELITE',
  },
  large_pdf_splitting: {
    key: 'large_pdf_splitting',
    name: 'Large-PDF Adaptive Splitting',
    requiredTier: 'elite',
    description: 'Adaptive bisection for very large research PDFs preserving page maps',
    badgeLabel: 'ELITE',
  },
  biometric_vault: {
    key: 'biometric_vault',
    name: 'FIDO2 Biometric Hardware Vault',
    requiredTier: 'elite',
    description: 'Hardware-bound WebAuthn biometric passkey encryption for confidential PDFs',
    badgeLabel: 'ELITE',
  },
  bulk_management: {
    key: 'bulk_management',
    name: 'Advanced Bulk Document Management',
    requiredTier: 'elite',
    description: 'High-volume batch uploads (up to 150 PDFs) and bulk processing',
    badgeLabel: 'ELITE',
  },
}

export function isFeatureAccessible(
  featureKey: FeatureKey,
  tier: PlanTier,
  hasByok: boolean = false
): boolean {
  if (hasByok && ['ask_ai', 'semantic_search', 'ai_summaries', 'advanced_metadata'].includes(featureKey)) {
    return true
  }

  const def = FEATURE_DEFINITIONS[featureKey]
  if (!def) return false

  if (def.requiredTier === 'free') return true
  if (def.requiredTier === 'pro') return tier === 'pro' || tier === 'elite'
  if (def.requiredTier === 'elite') return tier === 'elite'

  return false
}

export function getFeatureRequiredTier(featureKey: FeatureKey): 'pro' | 'elite' | null {
  const def = FEATURE_DEFINITIONS[featureKey]
  if (!def || def.requiredTier === 'free') return null
  return def.requiredTier
}

