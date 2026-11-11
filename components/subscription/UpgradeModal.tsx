'use client'

import React from 'react'
import Link from 'next/link'
import {
  Crown,
  Sparkles,
  Check,
  X,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
} from 'lucide-react'
import { PlanTier, PLAN_CONFIGS } from '@/lib/subscription/plans'
import { RazorpayCheckoutButton } from '@/components/checkout/RazorpayCheckoutButton'

export interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  targetTier?: 'pro' | 'elite'
  featureName?: string
  userEmail?: string
  userName?: string
  onUpgradeSuccess?: () => void
}

export function UpgradeModal({
  isOpen,
  onClose,
  targetTier = 'pro',
  featureName,
  userEmail,
  userName,
  onUpgradeSuccess,
}: UpgradeModalProps) {
  if (!isOpen) return null

  const isElite = targetTier === 'elite'
  const planConfig = PLAN_CONFIGS[targetTier]

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#1B1D21]/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#FFFCF5] border-2 border-[#D4AF37]/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-[#777064] hover:text-[#292720] hover:bg-[#FAF5EC] transition-colors cursor-pointer"
          aria-label="Close upgrade dialog"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47]">
              <Lock className="h-3 w-3" />
              <span>{isElite ? 'Elite Exclusive Feature' : 'Pro Feature Locked'}</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#292720] tracking-tight">
              {isElite ? 'Unlock FileMind Elite' : 'Unlock FileMind Pro'}
            </h3>

            {featureName && (
              <p className="text-xs text-[#9C7D47] font-semibold">
                <span className="text-[#777064]">Required to access:</span> {featureName}
              </p>
            )}

            <p className="text-xs sm:text-sm text-[#777064] leading-relaxed">
              {isElite
                ? 'Elevate your research workflow with priority compute queue, 10 GB vault storage, biometric WebAuthn security, and adaptive large-PDF processing.'
                : 'Accelerate your analysis with full AI document understanding, grounded conversational Ask AI, hybrid vector search, and 1 GB vault capacity.'}
            </p>
          </div>

          <div className="flex items-baseline justify-between p-4 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1]">
            <div>
              <span className="text-xs font-bold text-[#777064] uppercase tracking-wider">
                {planConfig.name}
              </span>
              <div className="text-xs text-[#777064] mt-0.5">Cancel anytime • Instant activation</div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-[#292720]">{planConfig.priceDisplay}</span>
              <span className="text-xs text-[#777064]"> / month</span>
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
              {isElite ? 'Everything in Pro, plus:' : 'Included Benefits:'}
            </span>

            <ul className="space-y-2.5 text-xs text-[#292720]">
              {isElite ? (
                <>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span className="font-semibold">10 GB total vault storage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Up to 150 PDFs per batch upload</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>49 MB individual PDF upload limit</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span className="font-semibold text-[#9C7D47]">Priority background document processing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Advanced large-PDF adaptive splitting</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>FIDO2 WebAuthn biometric document protection</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>2,500 monthly AI queries included</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span className="font-semibold">AI-powered document understanding</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Hybrid semantic and keyword search</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Ask AI with page citations & excerpts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>AI-generated summaries, titles & metadata</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>1 GB high-speed vault storage</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Up to 100 PDFs per batch (25 MB / file)</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          <div className="pt-2 space-y-3">
            <RazorpayCheckoutButton
              planTier={targetTier}
              amount={planConfig.priceINR}
              currency="INR"
              planName={planConfig.name}
              buttonText={isElite ? 'Upgrade to Elite (₹499)' : 'Upgrade to Pro (₹249)'}
              userEmail={userEmail}
              userName={userName}
              onSuccess={() => {
                onUpgradeSuccess?.()
                onClose()
              }}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs cursor-pointer text-center"
            />

            <div className="flex items-center justify-between text-xs text-[#777064] px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1E7E34]" />
                <span>Verified by Razorpay</span>
              </span>
              <Link
                href={`/checkout?plan=${targetTier}`}
                onClick={onClose}
                className="text-[#9C7D47] hover:underline font-semibold"
              >
                View full checkout details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
