'use client'

import React, { useState, useEffect } from 'react'
import {
  Crown,
  Check,
  Edit3,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  X,
  Loader2,
  Sparkles,
  HardDrive,
  Layers,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'
import { PlanConfig, PlanTier, StoragePack } from '@/lib/subscription/plans'

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Record<PlanTier, PlanConfig> | null>(null)
  const [storagePacks, setStoragePacks] = useState<Record<string, StoragePack> | null>(null)
  const [isCustom, setIsCustom] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [updatedBy, setUpdatedBy] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [editingPlanTier, setEditingPlanTier] = useState<PlanTier | null>(null)
  const [planForm, setPlanForm] = useState<PlanConfig | null>(null)

  const [editingPackId, setEditingPackId] = useState<string | null>(null)
  const [packForm, setPackForm] = useState<StoragePack | null>(null)

  const [showResetConfirm, setShowResetConfirm] = useState(false)

  const fetchPlans = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/plans')
      const data = await res.json()
      if (data && !data.error && data.plans) {
        setPlans(data.plans)
        setStoragePacks(data.storagePacks || null)
        setIsCustom(Boolean(data.isCustom))
        setUpdatedAt(data.updatedAt || null)
        setUpdatedBy(data.updatedBy || null)
      } else {
        setStatusMessage({ text: data?.error || 'Failed to load plans', type: 'error' })
      }
    } catch {
      setStatusMessage({ text: 'Error connecting to admin plans service', type: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const openPlanEditor = (tier: PlanTier) => {
    if (!plans || !plans[tier]) return
    setEditingPlanTier(tier)
    setPlanForm({
      ...plans[tier],
      features: [...plans[tier].features],
    })
    setStatusMessage(null)
  }

  const closePlanEditor = () => {
    setEditingPlanTier(null)
    setPlanForm(null)
  }

  const handlePlanFormChange = (field: keyof PlanConfig, value: any) => {
    if (!planForm) return
    setPlanForm((prev) => {
      if (!prev) return null
      const updated = { ...prev, [field]: value }
      if (field === 'priceINR') {
        const num = Number(value) || 0
        updated.priceINR = num
        updated.priceDisplay = `₹${num}`
      }
      if (field === 'includedStorageMB') {
        const num = Number(value) || 0
        updated.includedStorageMB = num
        updated.includedStorageBytes = num * 1024 * 1024
      }
      if (field === 'maxFileSizeMB') {
        const num = Number(value) || 0
        updated.maxFileSizeMB = num
        updated.maxFileSizeBytes = num * 1024 * 1024
      }
      if (field === 'maxBatchFiles') {
        updated.maxBatchFiles = Number(value) || 1
      }
      if (field === 'monthlyAiAllowance') {
        updated.monthlyAiAllowance = Number(value) || 0
      }
      return updated
    })
  }

  const handleAddFeature = () => {
    if (!planForm) return
    setPlanForm((prev) => {
      if (!prev) return null
      return {
        ...prev,
        features: [...prev.features, ''],
      }
    })
  }

  const handleUpdateFeature = (index: number, text: string) => {
    if (!planForm) return
    setPlanForm((prev) => {
      if (!prev) return null
      const nextFeats = [...prev.features]
      nextFeats[index] = text
      return {
        ...prev,
        features: nextFeats,
      }
    })
  }

  const handleRemoveFeature = (index: number) => {
    if (!planForm) return
    setPlanForm((prev) => {
      if (!prev) return null
      return {
        ...prev,
        features: prev.features.filter((_, i) => i !== index),
      }
    })
  }

  const handleSavePlan = async () => {
    if (!planForm || !editingPlanTier || !plans) return
    setIsSaving(true)
    setStatusMessage(null)

    const cleanedFeatures = planForm.features.map((f) => f.trim()).filter(Boolean)
    const payloadPlan: PlanConfig = {
      ...planForm,
      features: cleanedFeatures.length > 0 ? cleanedFeatures : ['Standard workspace access'],
    }

    const updatedPlans = {
      ...plans,
      [editingPlanTier]: payloadPlan,
    }

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plans: updatedPlans,
          storagePacks: storagePacks || undefined,
        }),
      })

      const data = await res.json()
      if (data && data.success) {
        setPlans(data.plans)
        if (data.storagePacks) setStoragePacks(data.storagePacks)
        setIsCustom(true)
        setUpdatedAt(data.updatedAt)
        setUpdatedBy(data.updatedBy)
        closePlanEditor()
        setStatusMessage({
          text: `Plan "${payloadPlan.name}" updated successfully. Live pricing and descriptions are now synchronized across the website.`,
          type: 'success',
        })
      } else {
        setStatusMessage({ text: data?.error || 'Failed to save plan changes', type: 'error' })
      }
    } catch {
      setStatusMessage({ text: 'Error saving plan changes', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const openPackEditor = (packId: string) => {
    if (!storagePacks || !storagePacks[packId]) return
    setEditingPackId(packId)
    setPackForm({ ...storagePacks[packId] })
    setStatusMessage(null)
  }

  const closePackEditor = () => {
    setEditingPackId(null)
    setPackForm(null)
  }

  const handlePackFormChange = (field: keyof StoragePack, value: any) => {
    if (!packForm) return
    setPackForm((prev) => {
      if (!prev) return null
      const updated = { ...prev, [field]: value }
      if (field === 'priceINR') {
        const num = Number(value) || 0
        updated.priceINR = num
        updated.priceDisplay = `₹${num}`
      }
      if (field === 'storageGB') {
        const num = Number(value) || 0
        updated.storageGB = num
        updated.storageBytes = num * 1024 * 1024 * 1024
      }
      return updated
    })
  }

  const handleSavePack = async () => {
    if (!packForm || !editingPackId || !storagePacks || !plans) return
    setIsSaving(true)
    setStatusMessage(null)

    const updatedPacks = {
      ...storagePacks,
      [editingPackId]: packForm,
    }

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plans,
          storagePacks: updatedPacks,
        }),
      })

      const data = await res.json()
      if (data && data.success) {
        setPlans(data.plans)
        setStoragePacks(data.storagePacks)
        setIsCustom(true)
        setUpdatedAt(data.updatedAt)
        setUpdatedBy(data.updatedBy)
        closePackEditor()
        setStatusMessage({
          text: `Storage pack "${packForm.name}" updated successfully.`,
          type: 'success',
        })
      } else {
        setStatusMessage({ text: data?.error || 'Failed to save storage pack', type: 'error' })
      }
    } catch {
      setStatusMessage({ text: 'Error saving storage pack', type: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetToDefaults = async () => {
    setIsResetting(true)
    setStatusMessage(null)
    try {
      const res = await fetch('/api/admin/plans', { method: 'DELETE' })
      const data = await res.json()
      if (data && data.success) {
        setPlans(data.plans)
        setStoragePacks(data.storagePacks)
        setIsCustom(false)
        setShowResetConfirm(false)
        setStatusMessage({
          text: 'Plans and pricing have been reset to factory defaults.',
          type: 'success',
        })
      } else {
        setStatusMessage({ text: data?.error || 'Failed to reset plans', type: 'error' })
      }
    } catch {
      setStatusMessage({ text: 'Error resetting plans to defaults', type: 'error' })
    } finally {
      setIsResetting(false)
    }
  }

  const tiers: PlanTier[] = ['free', 'pro', 'elite']

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-[#9C7D47] animate-spin" />
        <p className="text-xs text-[#777064]">Loading plans and pricing configuration...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">Plans & Entitlements Engine</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Live dynamic manager for subscription prices, descriptions, included capabilities, storage quotas, and batch limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCustom ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/15 text-[#065F46] border border-[#10B981]/30 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse"></span>
              <span>Live Custom Overrides Active</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EC] text-[#777064] border border-[#E5DED1] text-xs font-medium">
              <span>Factory Default Presets</span>
            </div>
          )}

          <button
            onClick={() => fetchPlans()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFCF5] hover:bg-[#FAF5EC] text-[#292720] border border-[#D8D0C2] transition-colors cursor-pointer"
            title="Refresh plans from database"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>

          {isCustom && (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[#991B1B] bg-[#E07A7A]/15 hover:bg-[#E07A7A]/25 border border-[#E07A7A]/40 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Defaults</span>
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-[#10B981]/10 text-[#065F46] border border-[#10B981]/30'
              : 'bg-[#E07A7A]/15 text-[#991B1B] border border-[#E07A7A]/30'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#10B981]" />
            ) : (
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-[#E07A7A]" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="opacity-60 hover:opacity-100 font-bold ml-3 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {showResetConfirm && (
        <div className="p-4 rounded-xl bg-[#FFF5F5] border border-[#E07A7A]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="font-bold text-[#991B1B]">Confirm Factory Reset</span>
            <p className="text-[#777064]">
              This will remove all custom price and description overrides, returning Free, Pro (₹249), and Elite (₹499) to default.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResetConfirm(false)}
              disabled={isResetting}
              className="px-3 py-1.5 rounded-lg border border-[#D8D0C2] bg-white text-[#292720] hover:bg-[#FAF5EC] font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleResetToDefaults}
              disabled={isResetting}
              className="px-3 py-1.5 rounded-lg bg-[#991B1B] text-white hover:bg-[#7F1D1D] font-bold cursor-pointer inline-flex items-center gap-1.5"
            >
              {isResetting && <Loader2 className="h-3 w-3 animate-spin" />}
              <span>Reset to Defaults</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => {
          const plan = plans?.[t]
          if (!plan) return null

          const isElite = t === 'elite'
          const isPro = t === 'pro'

          return (
            <div
              key={t}
              className={`rounded-2xl p-6 border shadow-2xs space-y-5 flex flex-col justify-between relative transition-all ${
                isElite
                  ? 'bg-[#1B1D21] text-[#F5F1E9] border-[#3E4149]'
                  : isPro
                  ? 'bg-[#FFFCF5] border-[#D4AF37] ring-1 ring-[#D4AF37]/50'
                  : 'bg-[#FFFCF5] border-[#E5DED1]'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      isElite
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                        : isPro
                        ? 'bg-[#9C7D47]/15 text-[#9C7D47]'
                        : 'bg-[#FAF5EC] text-[#777064]'
                    }`}
                  >
                    {plan.badgeLabel || plan.name}
                  </span>
                  <div className="text-right">
                    <span className="text-xl font-black">{plan.priceDisplay}</span>
                    <span className="text-[11px] opacity-70 ml-1">{plan.billingPeriod}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-extrabold">{plan.name}</h3>
                  <p className="text-xs opacity-75 mt-1 leading-relaxed">{plan.tagline}</p>
                </div>

                <div className="space-y-2 text-xs pt-3 border-t border-[#E5DED1]/30">
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Vault Storage Quota</span>
                    <strong className="font-bold">
                      {plan.includedStorageMB >= 1024
                        ? `${plan.includedStorageMB / 1024} GB`
                        : `${plan.includedStorageMB} MB`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Max Files per Batch</span>
                    <strong className="font-bold">{plan.maxBatchFiles} Files</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Max Single File Size</span>
                    <strong className="font-bold">{plan.maxFileSizeMB} MB</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Monthly AI Processing</span>
                    <strong className="font-bold">
                      {plan.monthlyAiAllowance > 0
                        ? `${plan.monthlyAiAllowance.toLocaleString()} queries`
                        : 'BYOK Only'}
                    </strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5DED1]/30 space-y-2 text-xs">
                  <div className="font-bold text-[11px] uppercase tracking-wider opacity-80 flex items-center justify-between">
                    <span>Included Capabilities ({plan.features.length})</span>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <Check
                          className={`h-3.5 w-3.5 flex-shrink-0 mt-0.5 ${
                            isElite ? 'text-[#D4AF37]' : 'text-[#9C7D47]'
                          }`}
                        />
                        <span className="opacity-90 leading-snug">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E5DED1]/30 space-y-2">
                <button
                  type="button"
                  onClick={() => openPlanEditor(t)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${
                    isElite
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#AA771C] text-[#1B1D21] hover:opacity-95'
                      : isPro
                      ? 'bg-[#9C7D47] hover:bg-[#856837] text-white'
                      : 'bg-[#FAF5EC] hover:bg-[#F3EFE5] text-[#292720] border border-[#D8D0C2]'
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Edit {plan.name}</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {storagePacks && (
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5DED1] pb-3">
            <div>
              <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[#9C7D47]" />
                Vault Storage Add-on Packs
              </h2>
              <p className="text-xs text-[#777064] mt-0.5">
                Extra storage packages that customers can purchase from their Settings tab.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.values(storagePacks).map((pack) => (
              <div
                key={pack.id}
                className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#292720]">{pack.name}</span>
                    <span className="text-sm font-extrabold text-[#9C7D47]">{pack.priceDisplay}</span>
                  </div>
                  <p className="text-[11px] text-[#777064] mt-1.5 leading-relaxed">{pack.description}</p>
                  <div className="text-[10px] font-semibold text-[#10B981] mt-2">
                    +{pack.storageGB} GB Storage Quota
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openPackEditor(pack.id)}
                  className="w-full py-1.5 px-3 rounded-lg text-xs font-semibold bg-white hover:bg-[#FFFCF5] text-[#292720] border border-[#D8D0C2] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="h-3 w-3 text-[#9C7D47]" />
                  <span>Edit Storage Pack</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingPlanTier && planForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-[#E5DED1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-[#9C7D47]" />
                <h2 className="text-base font-bold text-[#292720]">
                  Edit Plan: {planForm.name} ({planForm.tier.toUpperCase()})
                </h2>
              </div>
              <button
                onClick={closePlanEditor}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#FAF5EC] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#292720]">Plan Display Name</label>
                  <input
                    type="text"
                    value={planForm.name}
                    onChange={(e) => handlePlanFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#292720]">Price in INR (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={planForm.priceINR}
                    onChange={(e) => handlePlanFormChange('priceINR', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] font-bold focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#777064]">Display: {planForm.priceDisplay}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#292720]">Ribbon Badge Label</label>
                  <input
                    type="text"
                    value={planForm.badgeLabel}
                    onChange={(e) => handlePlanFormChange('badgeLabel', e.target.value)}
                    placeholder="e.g. PRO, RECOMMENDED, BEST VALUE"
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#292720]">Billing Period Label</label>
                  <input
                    type="text"
                    value={planForm.billingPeriod}
                    onChange={(e) => handlePlanFormChange('billingPeriod', e.target.value)}
                    placeholder="/ month"
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#292720]">Marketing Description / Tagline</label>
                <textarea
                  rows={2}
                  value={planForm.tagline}
                  onChange={(e) => handlePlanFormChange('tagline', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none leading-relaxed"
                />
              </div>

              <div className="pt-2 border-t border-[#E5DED1]">
                <span className="font-bold text-[#292720] uppercase tracking-wider text-[11px] block mb-3">
                  Quotas & System Entitlements
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="font-medium text-[#777064] text-[11px]">Vault Storage (MB)</label>
                    <input
                      type="number"
                      min="10"
                      value={planForm.includedStorageMB}
                      onChange={(e) => handlePlanFormChange('includedStorageMB', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D0C2] bg-white text-[#292720] font-semibold"
                    />
                    <span className="text-[10px] text-[#777064]">
                      {planForm.includedStorageMB >= 1024
                        ? `${(planForm.includedStorageMB / 1024).toFixed(1)} GB`
                        : `${planForm.includedStorageMB} MB`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-[#777064] text-[11px]">Max Files / Batch</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxBatchFiles}
                      onChange={(e) => handlePlanFormChange('maxBatchFiles', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D0C2] bg-white text-[#292720] font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-[#777064] text-[11px]">Max File Size (MB)</label>
                    <input
                      type="number"
                      min="1"
                      value={planForm.maxFileSizeMB}
                      onChange={(e) => handlePlanFormChange('maxFileSizeMB', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D0C2] bg-white text-[#292720] font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-[#777064] text-[11px]">Monthly AI Queries</label>
                    <input
                      type="number"
                      min="0"
                      value={planForm.monthlyAiAllowance}
                      onChange={(e) => handlePlanFormChange('monthlyAiAllowance', e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#D8D0C2] bg-white text-[#292720] font-semibold"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E5DED1] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#292720] uppercase tracking-wider text-[11px]">
                    Included Capabilities (Features Bullet List)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#FAF5EC] hover:bg-[#F3EFE5] text-[#9C7D47] border border-[#D8D0C2] cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Capability</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {planForm.features.map((feat, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-[10px] text-[#777064] w-4">{index + 1}.</span>
                      <input
                        type="text"
                        value={feat}
                        onChange={(e) => handleUpdateFeature(index, e.target.value)}
                        placeholder="Feature description..."
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#D8D0C2] bg-white text-[#292720] focus:ring-1 focus:ring-[#9C7D47] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(index)}
                        title="Delete feature"
                        className="p-1.5 text-[#991B1B] hover:bg-[#E07A7A]/15 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-[#E5DED1] bg-[#FAF5EC] rounded-b-2xl flex items-center justify-between gap-3">
              <span className="text-[11px] text-[#777064]">
                Applies immediately to live website and Razorpay checkout orders.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closePlanEditor}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-[#D8D0C2] bg-white text-xs font-semibold text-[#292720] hover:bg-[#FAF5EC] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePlan}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Plan Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPackId && packForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl max-w-md w-full shadow-2xl flex flex-col">
            <div className="p-5 border-b border-[#E5DED1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[#9C7D47]" />
                <h2 className="text-base font-bold text-[#292720]">Edit Storage Pack</h2>
              </div>
              <button
                onClick={closePackEditor}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#FAF5EC] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#292720]">Storage Pack Name</label>
                <input
                  type="text"
                  value={packForm.name}
                  onChange={(e) => handlePackFormChange('name', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#292720]">Price (₹ INR)</label>
                  <input
                    type="number"
                    min="1"
                    value={packForm.priceINR}
                    onChange={(e) => handlePackFormChange('priceINR', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] font-bold focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                  <span className="text-[10px] text-[#777064]">Display: {packForm.priceDisplay}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#292720]">Storage Quota (GB)</label>
                  <input
                    type="number"
                    min="1"
                    value={packForm.storageGB}
                    onChange={(e) => handlePackFormChange('storageGB', e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] font-bold focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#292720]">Description</label>
                <textarea
                  rows={2}
                  value={packForm.description}
                  onChange={(e) => handlePackFormChange('description', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            <div className="p-4 border-t border-[#E5DED1] bg-[#FAF5EC] rounded-b-2xl flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closePackEditor}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl border border-[#D8D0C2] bg-white text-xs font-semibold text-[#292720] hover:bg-[#FAF5EC] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePack}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save Pack Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
