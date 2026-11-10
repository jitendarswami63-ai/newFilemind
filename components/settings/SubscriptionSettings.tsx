'use client'

import React from 'react'
import Link from 'next/link'
import { Crown, Sparkles, Check, ArrowRight, ShieldCheck, Zap } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { ProBadge } from '@/components/ui/ProBadge'
import { useUserPlan } from '@/lib/subscription/plan'

interface SubscriptionSettingsProps {
  initialUser?: {
    email?: string
    user_metadata?: Record<string, any> | null
  } | null
}

export function SubscriptionSettings({ initialUser }: SubscriptionSettingsProps) {
  const { isPro } = useUserPlan(initialUser)

  return (
    <Card className="border-[#E5DED1] rounded-2xl relative overflow-hidden bg-[#FFFCF5] shadow-2xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Crown className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[#292720] flex items-center gap-2">
                <span>Subscription & Membership</span>
                {isPro ? (
                  <ProBadge variant="gold-pill" size="xs" label="PRO ACTIVE" />
                ) : (
                  <span className="text-[10px] bg-[#FAF5EC] text-[#777064] px-2 py-0.5 rounded-full border border-[#E5DED1] font-semibold uppercase tracking-wider">
                    Free Tier
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-[#777064]">
                Authoritative subscription status auto-fetched from system records.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-semibold text-[#1E7E34]">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Verified by Payment Gateway</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#777064]">
                <span>Standard Account</span>
              </span>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isPro ? (
          <div className="space-y-4">
            <ProBadge variant="banner" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] space-y-1">
                <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
                  Billing Cycle
                </span>
                <div className="text-sm font-extrabold text-[#292720] flex items-center gap-2">
                  <span>₹50 / month</span>
                  <span className="text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] px-2 py-0.5 rounded-full border border-[#C3E6CB]">
                    Live Verified
                  </span>
                </div>
                <p className="text-[11px] text-[#777064]">
                  Includes all taxes (GST) • Razorpay Standard Checkout
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] space-y-1">
                <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
                  AI Compute Allocation
                </span>
                <div className="text-sm font-extrabold text-[#9C7D47]">
                  Unlimited Queries & High-Priority Queue
                </div>
                <p className="text-[11px] text-[#777064]">
                  Dual-Engine: Gemini 3.8 Flash + NVIDIA NIM Llama 3.3
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2">
              <span className="block text-[11px] font-bold text-[#292720] uppercase tracking-wider">
                Unlocked Pro Privileges
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#292720]">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                  <span>Unlimited document uploads & questions</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                  <span>Dual AI Engine: Gemini 3.8 + NVIDIA NIM</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                  <span>FIDO2 WebAuthn biometric hardware vault</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                  <span>Deepgram neural voice playback & input</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                  <span>Priority server processing queue</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                  <span>Premium Pro Badge across entire platform</span>
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                  <span>Upgrade to Pro Intelligence</span>
                  <ProBadge variant="gold-pill" size="xs" label="PRO" />
                </h4>
                <p className="text-xs text-[#777064] mt-1 max-w-lg">
                  Unlock unlimited document analysis, dual-engine AI (Gemini + NVIDIA NIM), biometric WebAuthn security, and neural voice playback for just ₹50/month.
                </p>
              </div>
              <Link
                href="/checkout"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs transition-colors flex-shrink-0"
              >
                <span>Upgrade to Pro (₹50)</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
