import assert from 'node:assert/strict'
import {
  getUserPlanTier,
  calculateUserEntitlements,
  isFeatureAccessible,
  PLAN_CONFIGS,
} from '../lib/subscription/plans.ts'

console.log('Testing FileMind Subscription & Entitlement Suite...\n')

console.log('--- Test Scenario 1: Free User ---')
const freeUser = {
  id: 'usr_free_001',
  email: 'freeuser@example.com',
  user_metadata: {
    tier: 'free',
    is_pro: false,
  },
}
const freeTier = getUserPlanTier(freeUser)
assert.equal(freeTier, 'free', 'Free user tier must be "free"')

const freeEntitlements = calculateUserEntitlements(freeUser, 10 * 1024 * 1024)
assert.equal(freeEntitlements.tier, 'free', 'Entitlements tier must be "free"')
assert.equal(freeEntitlements.isPro, false, 'Free user isPro must be false')
assert.equal(freeEntitlements.isElite, false, 'Free user isElite must be false')
assert.equal(freeEntitlements.isPaidPlan, false, 'Free user isPaidPlan must be false')
assert.equal(freeEntitlements.hasAiFeatures, false, 'Free user hasAiFeatures must be false without BYOK')
assert.equal(freeEntitlements.hasPriorityProcessing, false, 'Free user hasPriorityProcessing must be false')
assert.equal(freeEntitlements.maxFileSizeMB, 5, 'Free user maxFileSizeMB must be 5')
assert.equal(freeEntitlements.maxBatchFiles, 10, 'Free user maxBatchFiles must be 10')
assert.equal(freeEntitlements.monthlyAiAllowance, 0, 'Free user monthlyAiAllowance must be 0')
assert.equal(freeEntitlements.totalStorageBytes, 100 * 1024 * 1024, 'Free user storage must be 100 MB')
assert.equal(isFeatureAccessible('ask_ai', freeTier), false, 'Free user cannot access Ask AI')
assert.equal(isFeatureAccessible('semantic_search', freeTier), false, 'Free user cannot access Semantic Search')
assert.equal(isFeatureAccessible('biometric_vault', freeTier), false, 'Free user cannot access Biometric Vault')
assert.equal(isFeatureAccessible('priority_processing', freeTier), false, 'Free user cannot access Priority Processing')
assert.equal(isFeatureAccessible('basic_upload', freeTier), true, 'Free user can access Basic Upload')
console.log('PASS: Scenario 1 - Free user features and limits correctly restricted.\n')

console.log('--- Test Scenario 2: Manually Assigned Elite User ---')
const manualEliteUser = {
  id: 'usr_elite_manual_002',
  email: 'elite_manual@example.com',
  user_metadata: {
    tier: 'elite',
    plan_tier: 'elite',
    plan: 'elite',
    is_pro: true,
    plan_name: 'Elite Intelligence',
    manual_grant: {
      is_manual: true,
      tier: 'elite',
      granted_by_email: 'admin@filemindhub.xyz',
      granted_at: '2026-11-20T10:00:00Z',
      expires_at: null,
      reason: 'Manual administrative lifetime grant',
    },
  },
}
const manualEliteTier = getUserPlanTier(manualEliteUser)
assert.equal(manualEliteTier, 'elite', 'Manual Elite tier must be "elite"')

const manualEliteEntitlements = calculateUserEntitlements(manualEliteUser, 50 * 1024 * 1024)
assert.equal(manualEliteEntitlements.tier, 'elite', 'Entitlements tier must be "elite"')
assert.equal(manualEliteEntitlements.isPro, true, 'Manual Elite user isPro must be true (superset of Pro)')
assert.equal(manualEliteEntitlements.isElite, true, 'Manual Elite user isElite must be true')
assert.equal(manualEliteEntitlements.isPaidPlan, true, 'Manual Elite user isPaidPlan must be true')
assert.equal(manualEliteEntitlements.hasAiFeatures, true, 'Manual Elite user hasAiFeatures must be true')
assert.equal(manualEliteEntitlements.hasPriorityProcessing, true, 'Manual Elite user hasPriorityProcessing must be true')
assert.equal(manualEliteEntitlements.maxFileSizeMB, 49, 'Manual Elite user maxFileSizeMB must be 49')
assert.equal(manualEliteEntitlements.maxBatchFiles, 150, 'Manual Elite user maxBatchFiles must be 150')
assert.equal(manualEliteEntitlements.monthlyAiAllowance, 2500, 'Manual Elite user monthlyAiAllowance must be 2500')
assert.equal(manualEliteEntitlements.totalStorageBytes, 10 * 1024 * 1024 * 1024, 'Manual Elite storage must be 10 GB')
assert.equal(isFeatureAccessible('ask_ai', manualEliteTier), true, 'Manual Elite user can access Ask AI')
assert.equal(isFeatureAccessible('semantic_search', manualEliteTier), true, 'Manual Elite user can access Semantic Search')
assert.equal(isFeatureAccessible('biometric_vault', manualEliteTier), true, 'Manual Elite user can access Biometric Vault')
assert.equal(isFeatureAccessible('priority_processing', manualEliteTier), true, 'Manual Elite user can access Priority Processing')
assert.equal(isFeatureAccessible('basic_upload', manualEliteTier), true, 'Manual Elite user can access Basic Upload')
console.log('PASS: Scenario 2 - Manually assigned Elite user receives full Elite features and limits.\n')

console.log('--- Test Scenario 3: Paid Elite User ---')
const paidEliteUser = {
  id: 'usr_elite_paid_003',
  email: 'elite_paid@example.com',
  user_metadata: {
    tier: 'elite',
    plan_tier: 'elite',
    plan: 'elite',
    is_pro: true,
    plan_name: 'Elite Intelligence',
    plan_renewal_date: '2026-12-20T10:00:00Z',
    billing_history: [
      {
        id: 'tx_123456789',
        type: 'subscription',
        planTier: 'elite',
        planName: 'Elite Intelligence',
        amountINR: 499,
        paymentId: 'pay_test_123',
        status: 'paid',
      },
    ],
  },
}
const paidEliteTier = getUserPlanTier(paidEliteUser)
assert.equal(paidEliteTier, 'elite', 'Paid Elite tier must be "elite"')

const paidEliteEntitlements = calculateUserEntitlements(paidEliteUser, 200 * 1024 * 1024)
assert.equal(paidEliteEntitlements.tier, 'elite', 'Entitlements tier must be "elite"')
assert.equal(paidEliteEntitlements.isPro, true, 'Paid Elite user isPro must be true')
assert.equal(paidEliteEntitlements.isElite, true, 'Paid Elite user isElite must be true')
assert.equal(paidEliteEntitlements.isPaidPlan, true, 'Paid Elite user isPaidPlan must be true')
assert.equal(paidEliteEntitlements.hasAiFeatures, true, 'Paid Elite user hasAiFeatures must be true')
assert.equal(paidEliteEntitlements.hasPriorityProcessing, true, 'Paid Elite user hasPriorityProcessing must be true')
assert.equal(paidEliteEntitlements.maxFileSizeMB, 49, 'Paid Elite user maxFileSizeMB must be 49')
assert.equal(paidEliteEntitlements.maxBatchFiles, 150, 'Paid Elite user maxBatchFiles must be 150')
assert.equal(paidEliteEntitlements.monthlyAiAllowance, 2500, 'Paid Elite user monthlyAiAllowance must be 2500')
assert.equal(paidEliteEntitlements.totalStorageBytes, 10 * 1024 * 1024 * 1024, 'Paid Elite storage must be 10 GB')
assert.equal(isFeatureAccessible('ask_ai', paidEliteTier), true, 'Paid Elite user can access Ask AI')
assert.equal(isFeatureAccessible('semantic_search', paidEliteTier), true, 'Paid Elite user can access Semantic Search')
assert.equal(isFeatureAccessible('biometric_vault', paidEliteTier), true, 'Paid Elite user can access Biometric Vault')
assert.equal(isFeatureAccessible('priority_processing', paidEliteTier), true, 'Paid Elite user can access Priority Processing')
assert.equal(isFeatureAccessible('basic_upload', paidEliteTier), true, 'Paid Elite user can access Basic Upload')
console.log('PASS: Scenario 3 - Paid Elite user receives full Elite features and limits.\n')

console.log('--- Test Scenario 4: Expired Manual Grant ---')
const expiredManualUser = {
  id: 'usr_elite_expired_004',
  email: 'elite_expired@example.com',
  user_metadata: {
    tier: 'elite',
    manual_grant: {
      is_manual: true,
      tier: 'elite',
      expires_at: '2023-01-01T00:00:00Z',
    },
  },
}
const expiredTier = getUserPlanTier(expiredManualUser)
assert.equal(expiredTier, 'free', 'Expired manual grant must fall back to "free"')
const expiredEntitlements = calculateUserEntitlements(expiredManualUser, 0)
assert.equal(expiredEntitlements.tier, 'free', 'Expired user entitlements must be "free"')
assert.equal(expiredEntitlements.isElite, false, 'Expired user isElite must be false')
assert.equal(expiredEntitlements.isPro, false, 'Expired user isPro must be false')
console.log('PASS: Scenario 4 - Expired manual grant falls back safely to Free Tier.\n')

console.log('ALL SUBSCRIPTION ENTITLEMENT TESTS PASSED SUCCESSFULLY!')
