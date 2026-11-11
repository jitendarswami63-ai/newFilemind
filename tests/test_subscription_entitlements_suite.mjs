import assert from 'assert'
import {
  PLAN_CONFIGS,
  STORAGE_PACKS,
  calculateUserEntitlements,
  formatINR,
  formatBytes,
  isFeatureAccessible,
  getFeatureRequiredTier,
  FEATURE_DEFINITIONS,
} from '../lib/subscription/plans.ts'

console.log('Testing FileMind Subscription & Storage Entitlements Suite...\n')

// 1. Verify Public Plans Configuration
console.log('1. Checking Three Public Plans Configuration...')
assert.strictEqual(PLAN_CONFIGS.free.priceINR, 0)
assert.strictEqual(PLAN_CONFIGS.free.includedStorageMB, 100)
assert.strictEqual(PLAN_CONFIGS.free.maxBatchFiles, 10)
assert.strictEqual(PLAN_CONFIGS.free.maxFileSizeMB, 5)
assert.strictEqual(PLAN_CONFIGS.free.hasAiFeatures, false)
assert.strictEqual(PLAN_CONFIGS.free.hasPriorityProcessing, false)
assert.strictEqual(PLAN_CONFIGS.free.monthlyAiAllowance, 0)

assert.strictEqual(PLAN_CONFIGS.pro.priceINR, 249)
assert.strictEqual(PLAN_CONFIGS.pro.includedStorageMB, 1024)
assert.strictEqual(PLAN_CONFIGS.pro.maxBatchFiles, 100)
assert.strictEqual(PLAN_CONFIGS.pro.maxFileSizeMB, 25)
assert.strictEqual(PLAN_CONFIGS.pro.hasAiFeatures, true)
assert.strictEqual(PLAN_CONFIGS.pro.hasPriorityProcessing, false)
assert.strictEqual(PLAN_CONFIGS.pro.monthlyAiAllowance, 500)

assert.strictEqual(PLAN_CONFIGS.elite.priceINR, 499)
assert.strictEqual(PLAN_CONFIGS.elite.includedStorageMB, 10240)
assert.strictEqual(PLAN_CONFIGS.elite.maxBatchFiles, 150)
assert.strictEqual(PLAN_CONFIGS.elite.maxFileSizeMB, 49)
assert.strictEqual(PLAN_CONFIGS.elite.hasAiFeatures, true)
assert.strictEqual(PLAN_CONFIGS.elite.hasPriorityProcessing, true)
assert.strictEqual(PLAN_CONFIGS.elite.monthlyAiAllowance, 2500)
console.log('PASS: Plan configurations verified (Free ₹0, Pro ₹249, Elite ₹499).\n')

// 2. Checking Storage Add-on Marketplace Packs
console.log('2. Checking Extra Storage Marketplace Packs...')
assert.strictEqual(STORAGE_PACKS.pack_1gb.priceINR, 49)
assert.strictEqual(STORAGE_PACKS.pack_1gb.storageGB, 1)

assert.strictEqual(STORAGE_PACKS.pack_5gb.priceINR, 199)
assert.strictEqual(STORAGE_PACKS.pack_5gb.storageGB, 5)

assert.strictEqual(STORAGE_PACKS.pack_10gb.priceINR, 349)
assert.strictEqual(STORAGE_PACKS.pack_10gb.storageGB, 10)
console.log('PASS: Storage marketplace packs verified (1GB ₹49, 5GB ₹199, 10GB ₹349).\n')

// 3. Indian Rupee Formatting
console.log('3. Checking INR Currency Formatting...')
assert.strictEqual(formatINR(0), '₹0')
assert.strictEqual(formatINR(249), '₹249')
assert.strictEqual(formatINR(499), '₹499')
assert.strictEqual(formatINR(1000), '₹1,000')
console.log('PASS: Currency formatters verified.\n')

// 4. Quota Calculation & Threshold Warnings
console.log('4. Checking Cumulative Quota & Warning Thresholds...')
// Free user with 85 MB used out of 100 MB -> 85% warning
const freeUser85 = { user_metadata: { tier: 'free' } }
const ent85 = calculateUserEntitlements(freeUser85, 85 * 1024 * 1024)
assert.strictEqual(ent85.usagePercent, 85)
assert.strictEqual(ent85.isWarning80, true)
assert.strictEqual(ent85.isWarning90, false)
assert.strictEqual(ent85.isQuotaExceeded, false)

// Free user with 92 MB used out of 100 MB -> 92% warning
const ent92 = calculateUserEntitlements(freeUser85, 92 * 1024 * 1024)
assert.strictEqual(ent92.usagePercent, 92)
assert.strictEqual(ent92.isWarning80, false)
assert.strictEqual(ent92.isWarning90, true)
assert.strictEqual(ent92.isQuotaExceeded, false)

// Free user at 100 MB -> Quota exceeded
const ent100 = calculateUserEntitlements(freeUser85, 100 * 1024 * 1024)
assert.strictEqual(ent100.usagePercent, 100)
assert.strictEqual(ent100.isQuotaExceeded, true)

// Free user who purchased 5 GB add-on pack
const freeWith5Gb = {
  user_metadata: {
    tier: 'free',
    additional_storage_bytes: 5 * 1024 * 1024 * 1024,
  },
}
const entWithPack = calculateUserEntitlements(freeWith5Gb, 100 * 1024 * 1024)
// Total storage = 100 MB + 5 GB = 5,473,566,720 bytes
assert.strictEqual(entWithPack.totalStorageBytes, (100 * 1024 * 1024) + (5 * 1024 * 1024 * 1024))
assert.strictEqual(entWithPack.isQuotaExceeded, false)
assert.strictEqual(entWithPack.usagePercent < 5, true)
console.log('PASS: Storage quota and warning thresholds verified.\n')

// 5. Bring Your Own Key (BYOK) Logic
console.log('5. Checking BYOK Gemini Key Entitlement...')
const freeWithByok = {
  user_metadata: {
    tier: 'free',
    byok_gemini_key: 'AIzaSyFakeKeyForTest123',
  },
}
const entByok = calculateUserEntitlements(freeWithByok, 0)
assert.strictEqual(entByok.hasAiFeatures, true)
assert.strictEqual(entByok.hasByok, true)
assert.strictEqual(entByok.remainingAiCount, 999999)
console.log('PASS: BYOK functionality verified for Free Tier.\n')

// 6. Progressive Feature Locking & Visibility Matrix
console.log('6. Checking Progressive Feature Locking & Visibility Matrix...')
assert.strictEqual(getFeatureRequiredTier('ask_ai'), 'pro')
assert.strictEqual(getFeatureRequiredTier('semantic_search'), 'pro')
assert.strictEqual(getFeatureRequiredTier('biometric_vault'), 'elite')
assert.strictEqual(getFeatureRequiredTier('priority_processing'), 'elite')
assert.strictEqual(getFeatureRequiredTier('large_pdf_splitting'), 'elite')

// Free Tier: Pro & Elite features locked (unless BYOK)
assert.strictEqual(isFeatureAccessible('ask_ai', 'free', false), false)
assert.strictEqual(isFeatureAccessible('ask_ai', 'free', true), true)
assert.strictEqual(isFeatureAccessible('semantic_search', 'free', false), false)
assert.strictEqual(isFeatureAccessible('biometric_vault', 'free', false), false)
assert.strictEqual(isFeatureAccessible('priority_processing', 'free', false), false)

// Pro Tier: Free & Pro accessible; Elite locked
assert.strictEqual(isFeatureAccessible('ask_ai', 'pro', false), true)
assert.strictEqual(isFeatureAccessible('semantic_search', 'pro', false), true)
assert.strictEqual(isFeatureAccessible('ai_summaries', 'pro', false), true)
assert.strictEqual(isFeatureAccessible('biometric_vault', 'pro', false), false)
assert.strictEqual(isFeatureAccessible('priority_processing', 'pro', false), false)
assert.strictEqual(isFeatureAccessible('large_pdf_splitting', 'pro', false), false)

// Elite Tier: Everything unlocked
assert.strictEqual(isFeatureAccessible('ask_ai', 'elite', false), true)
assert.strictEqual(isFeatureAccessible('semantic_search', 'elite', false), true)
assert.strictEqual(isFeatureAccessible('biometric_vault', 'elite', false), true)
assert.strictEqual(isFeatureAccessible('priority_processing', 'elite', false), true)
assert.strictEqual(isFeatureAccessible('large_pdf_splitting', 'elite', false), true)
console.log('PASS: Progressive feature locking & tier accessibility matrix verified.\n')

console.log('All FileMind Subscription & Storage Entitlements tests passed successfully!')
