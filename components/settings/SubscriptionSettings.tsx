'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Crown,
  Sparkles,
  Check,
  ArrowRight,
  ShieldCheck,
  Zap,
  HardDrive,
  Database,
  AlertTriangle,
  AlertCircle,
  Key,
  Calendar,
  Layers,
  History,
  TrendingUp,
  Cpu,
  Loader2,
  Trash2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { ProBadge } from '@/components/ui/ProBadge'
import { useUserPlan } from '@/lib/subscription/plan'
import { PLAN_CONFIGS, STORAGE_PACKS, formatBytes, formatINR } from '@/lib/subscription/plans'
import { RazorpayCheckoutButton } from '@/components/checkout/RazorpayCheckoutButton'

interface SubscriptionSettingsProps {
  initialUser?: {
    id?: string
    email?: string
    user_metadata?: Record<string, any> | null
  } | null
}

export function SubscriptionSettings({ initialUser }: SubscriptionSettingsProps) {
  const { tier, planName, isPro, isElite, entitlements, loading, refreshPlan } = useUserPlan(initialUser)

  const [byokKey, setByokKey] = useState('')
  const [byokSaving, setByokSaving] = useState(false)
  const [byokSuccess, setByokSuccess] = useState<string | null>(null)
  const [byokError, setByokError] = useState<string | null>(null)
  const [hasByok, setHasByok] = useState(Boolean(initialUser?.user_metadata?.byok_gemini_key))

  const [downgrading, setDowngrading] = useState(false)
  const [downgradeMsg, setDowngradeMsg] = useState<string | null>(null)
  const [showDowngradeModal, setShowDowngradeModal] = useState(false)

  const activePlanConfig = PLAN_CONFIGS[tier] || PLAN_CONFIGS.free

  const usedBytes = entitlements?.usedStorageBytes ?? 0
  const totalBytes = entitlements?.totalStorageBytes ?? activePlanConfig.includedStorageBytes
  const usagePercent = entitlements?.usagePercent ?? 0
  const availableBytes = entitlements?.availableStorageBytes ?? (totalBytes - usedBytes)

  const usedAiCount = entitlements?.usedAiCount ?? 0
  const monthlyAiAllowance = entitlements?.monthlyAiAllowance ?? activePlanConfig.monthlyAiAllowance
  const remainingAiCount = entitlements?.remainingAiCount ?? monthlyAiAllowance
  const aiUsagePercent = entitlements?.aiUsagePercent ?? 0

  const renewalDate = entitlements?.renewalDate
    ? new Date(entitlements.renewalDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null

  const billingHistory = Array.isArray(initialUser?.user_metadata?.billing_history)
    ? initialUser.user_metadata.billing_history
    : []

  const purchasedPacks = Array.isArray(initialUser?.user_metadata?.purchased_storage_packs)
    ? initialUser.user_metadata.purchased_storage_packs
    : []

  const handleSaveByok = async () => {
    if (!byokKey.trim() || byokKey.trim().length < 10) {
      setByokError('Please enter a valid Gemini API key')
      return
    }
    setByokSaving(true)
    setByokError(null)
    setByokSuccess(null)

    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_byok', apiKey: byokKey.trim() }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setHasByok(true)
        setByokKey('')
        setByokSuccess('Gemini BYOK key configured! Unlimited AI processing unlocked.')
        refreshPlan()
      } else {
        setByokError(data.error || 'Failed to save BYOK key')
      }
    } catch {
      setByokError('Network error while saving key')
    } finally {
      setByokSaving(false)
    }
  }

  const handleRemoveByok = async () => {
    setByokSaving(true)
    setByokError(null)
    setByokSuccess(null)

    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_byok' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setHasByok(false)
        setByokSuccess('BYOK key removed.')
        refreshPlan()
      } else {
        setByokError(data.error || 'Failed to remove BYOK key')
      }
    } catch {
      setByokError('Network error while removing key')
    } finally {
      setByokSaving(false)
    }
  }

  const handleDowngrade = async () => {
    setDowngrading(true)
    setDowngradeMsg(null)

    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'downgrade_to_free' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDowngradeMsg(data.message)
        setShowDowngradeModal(false)
        refreshPlan()
        window.dispatchEvent(new Event('filemind_plan_changed'))
      } else {
        setDowngradeMsg(data.error || 'Downgrade failed')
      }
    } catch {
      setDowngradeMsg('Network error while requesting downgrade')
    } finally {
      setDowngrading(false)
    }
  }

  return (
    <Card className="border-[#E5DED1] rounded-2xl relative overflow-hidden bg-[#FFFCF5] shadow-2xs space-y-6">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg font-bold text-[#292720] flex items-center gap-2">
                <span>Subscription, Storage & Usage</span>
                {isElite ? (
                  <ProBadge variant="elite-pill" size="xs" label="ELITE ACTIVE" />
                ) : isPro ? (
                  <ProBadge variant="gold-pill" size="xs" label="PRO ACTIVE" />
                ) : (
                  <span className="text-[10px] bg-[#FAF5EC] text-[#777064] px-2.5 py-0.5 rounded-full border border-[#E5DED1] font-bold uppercase tracking-wider">
                    FREE TIER
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-[#777064]">
                Manage your billing tier, quota utilization, and additional storage allocations.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {tier !== 'free' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-semibold text-[#1E7E34]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Active Subscription</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#777064]">
                <span>Standard Account</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Tier Overview & Renewal Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] space-y-1">
            <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
              Current Plan
            </span>
            <div className="text-base font-extrabold text-[#292720]">
              {activePlanConfig.name}
            </div>
            <p className="text-xs text-[#9C7D47] font-semibold">
              {activePlanConfig.priceDisplay} {activePlanConfig.billingPeriod}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] space-y-1">
            <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
              Renewal Date
            </span>
            <div className="text-base font-extrabold text-[#292720]">
              {renewalDate || (tier === 'free' ? 'No Expiry' : 'Active')}
            </div>
            <p className="text-[11px] text-[#777064]">
              {tier === 'free' ? 'Forever Free Tier' : 'Automatic monthly renewal'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] space-y-1">
            <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
              Processing Priority
            </span>
            <div className="text-base font-extrabold text-[#292720]">
              {activePlanConfig.hasPriorityProcessing ? 'High-Priority Queue' : activePlanConfig.hasAiFeatures ? 'Standard AI Queue' : 'Direct Vault Storage'}
            </div>
            <p className="text-[11px] text-[#777064]">
              Max {activePlanConfig.maxFileSizeMB} MB per file • {activePlanConfig.maxBatchFiles} PDFs/batch
            </p>
          </div>
        </div>

        {/* Real-time Storage Usage Meter */}
        <div className="p-5 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-[#9C7D47]" />
              <h4 className="text-sm font-bold text-[#292720]">Vault Storage Quota</h4>
            </div>
            <div className="text-xs font-semibold text-[#292720]">
              <span className="text-[#9C7D47]">{formatBytes(usedBytes)}</span> used of{' '}
              <span className="font-bold">{formatBytes(totalBytes)}</span> ({usagePercent}%)
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-[#E5DED1] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                usagePercent >= 90
                  ? 'bg-rose-500'
                  : usagePercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-[#9C7D47] to-[#C5A878]'
              }`}
              style={{ width: `${Math.min(100, Math.max(3, usagePercent))}%` }}
            />
          </div>

          {/* Storage Warnings */}
          {usagePercent >= 100 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
              <span>Storage quota exceeded. Please delete old documents or purchase an extra storage pack below to resume uploads.</span>
            </div>
          )}
          {usagePercent >= 90 && usagePercent < 100 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-orange-600" />
              <span>Critical storage warning: 90%+ capacity reached. Consider expanding your capacity to prevent interruption.</span>
            </div>
          )}
          {usagePercent >= 80 && usagePercent < 90 && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
              <span>Storage notice: Over 80% capacity utilized ({formatBytes(availableBytes)} remaining).</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-[#777064] pt-1">
            <span>Included Plan Storage: {formatBytes(activePlanConfig.includedStorageBytes)}</span>
            <span>Additional Purchased Storage: {formatBytes(entitlements?.additionalStorageBytes || 0)}</span>
          </div>
        </div>

        {/* AI Usage Allowance Meter */}
        <div className="p-5 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-[#9C7D47]" />
              <h4 className="text-sm font-bold text-[#292720]">Monthly AI Allowance</h4>
              {hasByok && (
                <span className="text-[10px] bg-[#EBF7EE] text-[#1E7E34] px-2 py-0.5 rounded-full font-bold border border-[#C3E6CB]">
                  BYOK Active (Unlimited)
                </span>
              )}
            </div>
            <div className="text-xs font-semibold text-[#292720]">
              {hasByok ? (
                <span className="text-[#1E7E34]">Unlimited with personal Gemini key</span>
              ) : activePlanConfig.hasAiFeatures ? (
                <span>
                  <span className="text-[#9C7D47]">{usedAiCount}</span> / {monthlyAiAllowance} queries used ({aiUsagePercent}%)
                </span>
              ) : (
                <span className="text-[#777064]">Not included on Free Tier (BYOK available)</span>
              )}
            </div>
          </div>

          {!hasByok && activePlanConfig.hasAiFeatures && (
            <>
              <div className="w-full h-2.5 bg-[#E5DED1] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    aiUsagePercent >= 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-[#9C7D47] to-[#C5A878]'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(3, aiUsagePercent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-[#777064]">
                <span>{remainingAiCount} queries remaining this billing cycle</span>
                <span>Dual-Engine: Gemini 3.8 + NVIDIA NIM</span>
              </div>
            </>
          )}
        </div>

        {/* Bring Your Own Key (BYOK) Section for Free users */}
        <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-[#9C7D47]" />
              <h4 className="text-sm font-bold text-[#292720]">Bring Your Own Gemini API Key (BYOK)</h4>
            </div>
            {hasByok && (
              <span className="text-[11px] font-semibold text-[#1E7E34] flex items-center gap-1">
                <Check className="h-3 w-3" /> Configured
              </span>
            )}
          </div>
          <p className="text-xs text-[#777064]">
            Free Tier users can securely connect their Google Gemini API key to unlock full Ask AI, summaries, and semantic search without subscription fees. Keys are encrypted and processed strictly server-side.
          </p>

          {hasByok ? (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]">
              <span className="text-xs font-mono text-[#292720]">••••••••••••••••••••••••• (Encrypted)</span>
              <button
                onClick={handleRemoveByok}
                disabled={byokSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Remove Key</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={byokKey}
                onChange={(e) => setByokKey(e.target.value)}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[#FAF5EC] border border-[#D8D0C2] text-[#292720] focus:outline-none focus:border-[#9C7D47]"
              />
              <button
                onClick={handleSaveByok}
                disabled={byokSaving || !byokKey.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {byokSaving && <Loader2 className="h-3 w-3 animate-spin" />}
                <span>Save Key</span>
              </button>
            </div>
          )}

          {byokSuccess && <p className="text-xs text-emerald-700 font-medium">{byokSuccess}</p>}
          {byokError && <p className="text-xs text-rose-600 font-medium">{byokError}</p>}
        </div>

        {/* Extra Storage Marketplace */}
        <div className="p-5 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#9C7D47] uppercase tracking-wider mb-1">
                <HardDrive className="h-3.5 w-3.5" />
                <span>Extra Storage Marketplace</span>
              </div>
              <h4 className="text-sm font-bold text-[#292720]">Add More Vault Capacity</h4>
              <p className="text-xs text-[#777064]">
                Recurring monthly storage upgrades that combine directly with your active plan quota.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            {Object.values(STORAGE_PACKS).map((pack) => (
              <div
                key={pack.id}
                className="p-4 rounded-xl bg-[#FFFCF5] border border-[#E5DED1] flex flex-col justify-between hover:border-[#9C7D47]/40 transition-colors space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#292720]">{pack.name}</span>
                    <span className="text-xs font-extrabold text-[#9C7D47]">{pack.priceDisplay}</span>
                  </div>
                  <p className="text-[11px] text-[#777064] mt-1">{pack.description}</p>
                </div>

                <RazorpayCheckoutButton
                  packId={pack.id}
                  amount={pack.priceINR}
                  planName={pack.name}
                  buttonText={`Buy ${pack.priceDisplay}/mo`}
                  className="w-full py-2 text-xs font-semibold rounded-lg bg-[#FAF5EC] hover:bg-[#F3EFE5] text-[#292720] border border-[#D8D0C2] transition-colors cursor-pointer text-center"
                  onSuccess={() => refreshPlan()}
                />
              </div>
            ))}
          </div>

          {purchasedPacks.length > 0 && (
            <div className="pt-2 border-t border-[#E5DED1]">
              <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider mb-2">
                Active Storage Add-on Packs ({purchasedPacks.length})
              </span>
              <div className="space-y-1.5">
                {purchasedPacks.map((p: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#FFFCF5] border border-[#E5DED1]">
                    <span className="font-semibold text-[#292720]">{p.packName || 'Storage Pack'}</span>
                    <span className="text-[#9C7D47] font-medium">+{formatBytes(p.storageBytes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upgrade / Downgrade Plan Options */}
        <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-[#292720]">Plan Tier Management</h4>
              <p className="text-xs text-[#777064]">
                Switch plans anytime. Upgrading grants immediate limits; downgrading never deletes your documents.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {tier !== 'pro' && (
              <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#292720]">Pro Intelligence</div>
                  <div className="text-[11px] text-[#777064]">1 GB Storage • Dual AI • ₹249/month</div>
                </div>
                <Link
                  href="/checkout?plan=pro"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs"
                >
                  Switch to Pro
                </Link>
              </div>
            )}

            {tier !== 'elite' && (
              <div className="p-4 rounded-xl bg-[#1B1D21] text-[#F5F1E9] border border-[#3E4149] flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-[#F5F1E9]">Elite Intelligence</div>
                  <div className="text-[11px] text-[#A8A49B]">10 GB Storage • Priority Queue • ₹499/month</div>
                </div>
                <Link
                  href="/checkout?plan=elite"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-[#1B1D21] bg-gradient-to-r from-[#C5A878] to-[#9C7D47] hover:opacity-95 shadow-xs"
                >
                  Switch to Elite
                </Link>
              </div>
            )}

            {tier !== 'free' && (
              <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between col-span-1 sm:col-span-2">
                <div>
                  <div className="text-xs font-bold text-[#292720]">Downgrade to Free Tier</div>
                  <div className="text-[11px] text-[#777064]">All existing documents are safely preserved without deletion.</div>
                </div>
                <button
                  onClick={() => setShowDowngradeModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#777064] hover:text-[#292720] border border-[#D8D0C2] hover:bg-[#FFFCF5] transition-colors cursor-pointer"
                >
                  Switch to Free
                </button>
              </div>
            )}
          </div>

          {downgradeMsg && (
            <p className="text-xs text-emerald-700 font-semibold pt-1">{downgradeMsg}</p>
          )}
        </div>

        {/* Downgrade Confirmation Modal */}
        {showDowngradeModal && (
          <div className="fixed inset-0 z-50 bg-[#1B1D21]/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 flex-shrink-0">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#292720]">Downgrade to Free Tier?</h3>
                  <p className="text-xs text-[#777064]">Confirm plan adjustment</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs text-[#292720] space-y-1.5 leading-relaxed">
                <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Your documents will NOT be deleted.
                </p>
                <p className="text-[#777064]">
                  You will transition to 100 MB included storage and Free Tier limits at the end of the current billing period. FileMind-managed Ask AI will be disabled unless you connect a BYOK Gemini key.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowDowngradeModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#777064] hover:text-[#292720] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDowngrade}
                  disabled={downgrading}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {downgrading && <Loader2 className="h-3 w-3 animate-spin" />}
                  <span>Confirm Downgrade</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Billing & Payment History */}
        <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-3">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#9C7D47]" />
            <h4 className="text-sm font-bold text-[#292720]">Billing & Transaction History</h4>
          </div>

          {billingHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#E5DED1] text-[#777064]">
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Description</th>
                    <th className="py-2 font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Payment ID</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED1]/60">
                  {billingHistory.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-[#FAF5EC]/50 transition-colors">
                      <td className="py-2.5 text-[#777064]">
                        {new Date(item.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-2.5 font-medium text-[#292720]">
                        {item.planName || item.packName || (item.type === 'subscription' ? 'Pro Plan' : 'Storage Pack')}
                      </td>
                      <td className="py-2.5 font-bold text-[#292720]">
                        {formatINR(item.amountINR || 249)}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] text-[#777064]">
                        {item.paymentId || 'N/A'}
                      </td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                          <Check className="h-2.5 w-2.5" />
                          <span>Paid</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#FAF5EC] text-center text-xs text-[#777064]">
              No past transactions recorded yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
