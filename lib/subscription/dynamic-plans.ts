import 'server-only'
import {
  PLAN_CONFIGS,
  STORAGE_PACKS,
  PlanConfig,
  PlanTier,
  StoragePack,
} from './plans'
import { getAdminClient } from '@/lib/admin/data'

export interface LivePlanConfigsResult {
  plans: Record<PlanTier, PlanConfig>
  storagePacks: Record<string, StoragePack>
  isCustom: boolean
  updatedAt?: string
  updatedBy?: string
}

let memoryCache: {
  result: LivePlanConfigsResult
  cachedAt: number
} | null = null

const CACHE_TTL_MS = 8000

function formatINRDisplay(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function normalizePlan(base: PlanConfig, override?: Partial<PlanConfig>): PlanConfig {
  if (!override) return base

  const priceINR = typeof override.priceINR === 'number' && override.priceINR >= 0 ? override.priceINR : base.priceINR
  const includedStorageMB = typeof override.includedStorageMB === 'number' && override.includedStorageMB > 0 ? override.includedStorageMB : base.includedStorageMB
  const maxFileSizeMB = typeof override.maxFileSizeMB === 'number' && override.maxFileSizeMB > 0 ? override.maxFileSizeMB : base.maxFileSizeMB
  const maxBatchFiles = typeof override.maxBatchFiles === 'number' && override.maxBatchFiles > 0 ? override.maxBatchFiles : base.maxBatchFiles
  const monthlyAiAllowance = typeof override.monthlyAiAllowance === 'number' && override.monthlyAiAllowance >= 0 ? override.monthlyAiAllowance : base.monthlyAiAllowance
  const features = Array.isArray(override.features) && override.features.length > 0 ? override.features.filter((f) => typeof f === 'string' && f.trim().length > 0) : base.features

  return {
    ...base,
    name: override.name && override.name.trim() ? override.name.trim() : base.name,
    tagline: override.tagline && override.tagline.trim() ? override.tagline.trim() : base.tagline,
    priceINR,
    priceDisplay: override.priceDisplay && override.priceDisplay.trim() ? override.priceDisplay.trim() : formatINRDisplay(priceINR),
    billingPeriod: override.billingPeriod && override.billingPeriod.trim() ? override.billingPeriod.trim() : base.billingPeriod,
    badgeLabel: override.badgeLabel && override.badgeLabel.trim() ? override.badgeLabel.trim() : base.badgeLabel,
    badgeVariant: override.badgeVariant || base.badgeVariant,
    includedStorageMB,
    includedStorageBytes: includedStorageMB * 1024 * 1024,
    maxBatchFiles,
    maxFileSizeMB,
    maxFileSizeBytes: maxFileSizeMB * 1024 * 1024,
    hasAiFeatures: typeof override.hasAiFeatures === 'boolean' ? override.hasAiFeatures : base.hasAiFeatures,
    hasPriorityProcessing: typeof override.hasPriorityProcessing === 'boolean' ? override.hasPriorityProcessing : base.hasPriorityProcessing,
    monthlyAiAllowance,
    features,
  }
}

function normalizeStoragePack(base: StoragePack, override?: Partial<StoragePack>): StoragePack {
  if (!override) return base

  const priceINR = typeof override.priceINR === 'number' && override.priceINR >= 0 ? override.priceINR : base.priceINR
  const storageGB = typeof override.storageGB === 'number' && override.storageGB > 0 ? override.storageGB : base.storageGB

  return {
    ...base,
    name: override.name && override.name.trim() ? override.name.trim() : base.name,
    storageGB,
    storageBytes: storageGB * 1024 * 1024 * 1024,
    priceINR,
    priceDisplay: override.priceDisplay && override.priceDisplay.trim() ? override.priceDisplay.trim() : formatINRDisplay(priceINR),
    description: override.description && override.description.trim() ? override.description.trim() : base.description,
  }
}

async function findPrimaryAdminUser(adminClient: ReturnType<typeof getAdminClient>) {
  const allowlistEnv = process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || 'jitendarswami63@gmail.com'
  const allowedList = allowlistEnv.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)

  const { data, error } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (error || !data?.users) return null

  for (const email of allowedList) {
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found
  }

  return data.users[0] || null
}

export async function getLivePlanConfigs(forceRefresh = false): Promise<LivePlanConfigsResult> {
  const now = Date.now()
  if (!forceRefresh && memoryCache && now - memoryCache.cachedAt < CACHE_TTL_MS) {
    return memoryCache.result
  }

  try {
    const adminClient = getAdminClient()

    try {
      const { data: dbData } = await adminClient
        .from('website_content')
        .select('published_content, updated_at, updated_by')
        .eq('id', 'pricing_plans')
        .maybeSingle()

      if (dbData?.published_content?.plans) {
        const rawPlans = dbData.published_content.plans
        const rawPacks = dbData.published_content.storagePacks || {}

        const mergedPlans: Record<PlanTier, PlanConfig> = {
          free: normalizePlan(PLAN_CONFIGS.free, rawPlans.free),
          pro: normalizePlan(PLAN_CONFIGS.pro, rawPlans.pro),
          elite: normalizePlan(PLAN_CONFIGS.elite, rawPlans.elite),
        }

        const mergedPacks: Record<string, StoragePack> = {
          pack_1gb: normalizeStoragePack(STORAGE_PACKS.pack_1gb, rawPacks.pack_1gb),
          pack_5gb: normalizeStoragePack(STORAGE_PACKS.pack_5gb, rawPacks.pack_5gb),
          pack_10gb: normalizeStoragePack(STORAGE_PACKS.pack_10gb, rawPacks.pack_10gb),
        }

        const result: LivePlanConfigsResult = {
          plans: mergedPlans,
          storagePacks: mergedPacks,
          isCustom: true,
          updatedAt: dbData.updated_at,
          updatedBy: dbData.updated_by,
        }

        memoryCache = { result, cachedAt: now }
        return result
      }
    } catch {}

    const adminUser = await findPrimaryAdminUser(adminClient)
    const customPlans = adminUser?.user_metadata?.custom_plans
    const customPacks = adminUser?.user_metadata?.custom_storage_packs

    if (customPlans) {
      const mergedPlans: Record<PlanTier, PlanConfig> = {
        free: normalizePlan(PLAN_CONFIGS.free, customPlans.free),
        pro: normalizePlan(PLAN_CONFIGS.pro, customPlans.pro),
        elite: normalizePlan(PLAN_CONFIGS.elite, customPlans.elite),
      }

      const mergedPacks: Record<string, StoragePack> = {
        pack_1gb: normalizeStoragePack(STORAGE_PACKS.pack_1gb, customPacks?.pack_1gb),
        pack_5gb: normalizeStoragePack(STORAGE_PACKS.pack_5gb, customPacks?.pack_5gb),
        pack_10gb: normalizeStoragePack(STORAGE_PACKS.pack_10gb, customPacks?.pack_10gb),
      }

      const result: LivePlanConfigsResult = {
        plans: mergedPlans,
        storagePacks: mergedPacks,
        isCustom: true,
        updatedAt: adminUser?.user_metadata?.custom_plans_updated_at,
        updatedBy: adminUser?.email,
      }

      memoryCache = { result, cachedAt: now }
      return result
    }
  } catch {}

  const defaultResult: LivePlanConfigsResult = {
    plans: {
      free: { ...PLAN_CONFIGS.free },
      pro: { ...PLAN_CONFIGS.pro },
      elite: { ...PLAN_CONFIGS.elite },
    },
    storagePacks: {
      pack_1gb: { ...STORAGE_PACKS.pack_1gb },
      pack_5gb: { ...STORAGE_PACKS.pack_5gb },
      pack_10gb: { ...STORAGE_PACKS.pack_10gb },
    },
    isCustom: false,
  }

  memoryCache = { result: defaultResult, cachedAt: now }
  return defaultResult
}

export async function saveLivePlanConfigs(
  plansOverride: Record<PlanTier, Partial<PlanConfig>>,
  storagePacksOverride?: Record<string, Partial<StoragePack>>,
  adminEmail?: string
): Promise<LivePlanConfigsResult> {
  const adminClient = getAdminClient()
  const adminUser = await findPrimaryAdminUser(adminClient)

  if (!adminUser) {
    throw new Error('No system administrator account found to persist dynamic plan configuration.')
  }

  const existingResult = await getLivePlanConfigs(true)

  const mergedPlans: Record<PlanTier, PlanConfig> = {
    free: normalizePlan(existingResult.plans.free, plansOverride.free),
    pro: normalizePlan(existingResult.plans.pro, plansOverride.pro),
    elite: normalizePlan(existingResult.plans.elite, plansOverride.elite),
  }

  const mergedPacks: Record<string, StoragePack> = {
    pack_1gb: normalizeStoragePack(existingResult.storagePacks.pack_1gb, storagePacksOverride?.pack_1gb),
    pack_5gb: normalizeStoragePack(existingResult.storagePacks.pack_5gb, storagePacksOverride?.pack_5gb),
    pack_10gb: normalizeStoragePack(existingResult.storagePacks.pack_10gb, storagePacksOverride?.pack_10gb),
  }

  const nowIso = new Date().toISOString()
  const authorEmail = adminEmail || adminUser.email || 'Admin'

  try {
    await adminClient.from('website_content').upsert(
      {
        id: 'pricing_plans',
        published_content: {
          plans: mergedPlans,
          storagePacks: mergedPacks,
        },
        draft_content: {
          plans: mergedPlans,
          storagePacks: mergedPacks,
        },
        updated_at: nowIso,
        updated_by: authorEmail,
      },
      { onConflict: 'id' }
    )
  } catch {}

  const currentMetadata = adminUser.user_metadata || {}
  const updatePayload = {
    ...currentMetadata,
    custom_plans: mergedPlans,
    custom_storage_packs: mergedPacks,
    custom_plans_updated_at: nowIso,
    custom_plans_updated_by: authorEmail,
  }

  const { error } = await adminClient.auth.admin.updateUserById(adminUser.id, {
    user_metadata: updatePayload,
  })

  if (error) {
    throw new Error(`Failed to persist dynamic plan configuration: ${error.message}`)
  }

  const updatedResult: LivePlanConfigsResult = {
    plans: mergedPlans,
    storagePacks: mergedPacks,
    isCustom: true,
    updatedAt: nowIso,
    updatedBy: authorEmail,
  }

  memoryCache = { result: updatedResult, cachedAt: Date.now() }
  return updatedResult
}

export async function resetLivePlanConfigs(adminEmail?: string): Promise<LivePlanConfigsResult> {
  const adminClient = getAdminClient()
  const adminUser = await findPrimaryAdminUser(adminClient)

  if (adminUser) {
    try {
      await adminClient.from('website_content').delete().eq('id', 'pricing_plans')
    } catch {}

    const meta = { ...(adminUser.user_metadata || {}) }
    delete meta.custom_plans
    delete meta.custom_storage_packs
    delete meta.custom_plans_updated_at
    delete meta.custom_plans_updated_by

    await adminClient.auth.admin.updateUserById(adminUser.id, {
      user_metadata: meta,
    })
  }

  memoryCache = null
  return getLivePlanConfigs(true)
}
