import React from 'react'
import { Crown, Check, ShieldCheck, Zap, HardDrive, Cpu, FileText } from 'lucide-react'
import { PLAN_CONFIGS, PlanTier } from '@/lib/subscription/plans'

export const dynamic = 'force-dynamic'

export default function AdminPlansPage() {
  const tiers: PlanTier[] = ['free', 'pro', 'elite']

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">Plans & Entitlements Engine</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Centralized reference for plan storage quotas, batch limits, AI allowances, and feature gating.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((t) => {
          const plan = PLAN_CONFIGS[t]
          const isElite = t === 'elite'
          const isPro = t === 'pro'

          return (
            <div
              key={t}
              className={`rounded-2xl p-6 border shadow-2xs space-y-5 flex flex-col justify-between ${
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
                    {plan.name}
                  </span>
                  <span className="text-lg font-black">{plan.priceDisplay}</span>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-[#E5DED1]/30">
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Vault Storage Quota</span>
                    <strong className="font-bold">
                      {plan.includedStorageMB >= 1024 ? `${plan.includedStorageMB / 1024} GB` : `${plan.includedStorageMB} MB`}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Max Files per Batch</span>
                    <strong className="font-bold">{plan.maxBatchFiles} PDFs</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Max Single File Size</span>
                    <strong className="font-bold">{plan.maxFileSizeMB} MB</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="opacity-70">Monthly AI Processing</span>
                    <strong className="font-bold">
                      {plan.monthlyAiAllowance > 0 ? `${plan.monthlyAiAllowance.toLocaleString()} queries` : 'BYOK Only'}
                    </strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E5DED1]/30 space-y-2 text-xs">
                  <div className="font-bold text-[11px] uppercase tracking-wider opacity-80">
                    Included Capabilities
                  </div>
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

              <div className="pt-4 border-t border-[#E5DED1]/30 text-[11px] opacity-60 text-center">
                Governed by: <code>lib/subscription/plans.ts</code>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
