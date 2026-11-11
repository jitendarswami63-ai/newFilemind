import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { Check, ShieldCheck, Zap, Crown, ArrowRight, HardDrive, Sparkles } from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { RazorpayCheckoutButton } from '@/components/checkout/RazorpayCheckoutButton'
import { createClient } from '@/lib/supabase/server'
import { getServerUserTier } from '@/lib/subscription/plan-server'
import { PLAN_CONFIGS, STORAGE_PACKS, formatINR } from '@/lib/subscription/plans'
import { ProBadge } from '@/components/ui/ProBadge'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Upgrade Plan & Storage – Razorpay Secure Checkout | FileMind',
  description:
    'Complete your FileMind Pro, Elite, or Extra Storage order securely with Razorpay Standard Web Checkout. Supports UPI, Cards, NetBanking, and Wallets.',
}

interface CheckoutPageProps {
  searchParams: Promise<{ plan?: string; pack?: string }>
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const currentTier = await getServerUserTier(user)

  const requestedPackId = params.pack && STORAGE_PACKS[params.pack] ? params.pack : null
  const isStoragePack = Boolean(requestedPackId)
  const selectedPack = requestedPackId ? STORAGE_PACKS[requestedPackId] : null

  const selectedTier = params.plan === 'elite' ? 'elite' : 'pro'
  const selectedPlan = PLAN_CONFIGS[selectedTier]

  const title = isStoragePack
    ? `Purchase ${selectedPack?.name}`
    : `Upgrade to ${selectedPlan.name}`

  const priceDisplay = isStoragePack
    ? selectedPack?.priceDisplay
    : selectedPlan.priceDisplay

  const billingPeriod = isStoragePack
    ? selectedPack?.billingPeriod
    : selectedPlan.billingPeriod

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <LandingNavbar user={user} />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
            <Zap className="h-3.5 w-3.5" />
            <span>Razorpay Secure Payment Gateway</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#292720]">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-[#777064] max-w-xl mx-auto">
            {isStoragePack
              ? 'Instant vault capacity upgrade. Combines cumulatively with your active plan storage.'
              : 'Unlock premium AI document analysis, dual-engine intelligence, and expanded storage with instant Razorpay checkout.'}
          </p>
        </section>

        {!isStoragePack && (
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/checkout?plan=pro"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedTier === 'pro'
                  ? 'bg-[#9C7D47] text-[#FFFCF5] shadow-xs'
                  : 'bg-[#FFFCF5] text-[#292720] border border-[#E5DED1] hover:bg-[#FAF5EC]'
              }`}
            >
              Pro Intelligence (₹249)
            </Link>
            <Link
              href="/checkout?plan=elite"
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                selectedTier === 'elite'
                  ? 'bg-[#1B1D21] text-[#F5F1E9] border border-[#D4AF37] shadow-xs'
                  : 'bg-[#FFFCF5] text-[#292720] border border-[#E5DED1] hover:bg-[#FAF5EC]'
              }`}
            >
              Elite Intelligence (₹499)
            </Link>
          </div>
        )}

        {currentTier === selectedTier && !isStoragePack && (
          <div className="p-5 rounded-2xl bg-[#FAF5EC] border border-[#D4AF37]/50 text-[#292720] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA771C] flex items-center justify-center text-[#1C180A]">
                <Crown className="h-5 w-5 fill-[#1C180A]" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#292720] flex items-center gap-2">
                  <span>{selectedPlan.name} is Currently Active</span>
                  <ProBadge variant="gold-pill" size="xs" label="ACTIVE" />
                </div>
                <p className="text-xs text-[#777064]">
                  Your account is already on this tier. Need more space? You can add standalone storage below.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs"
            >
              <span>Go to Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <div className="p-7 rounded-2xl bg-[#FFFCF5] border-2 border-[#9C7D47] shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                  {isStoragePack ? 'Storage Add-on' : 'Selected Plan'}
                </span>
                <h2 className="text-2xl font-extrabold text-[#292720] mt-1">
                  {isStoragePack ? selectedPack?.name : selectedPlan.name}
                </h2>
                <p className="text-xs text-[#777064] mt-0.5">
                  Monthly recurring • Cancel anytime
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-[#292720]">{priceDisplay}</div>
                <div className="text-[11px] text-[#777064]">{billingPeriod}</div>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-[#292720] pt-4 border-t border-[#E5DED1]">
              {isStoragePack ? (
                <>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span className="font-semibold">{selectedPack?.description}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Instant quota activation upon payment verification</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Cumulative with Free (100MB), Pro (1GB) or Elite (10GB)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>Zero document deletion on plan changes</span>
                  </li>
                </>
              ) : (
                selectedPlan.features.slice(0, 6).map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5">
                    <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))
              )}
            </ul>

            <div className="pt-4 border-t border-[#E5DED1]">
              <RazorpayCheckoutButton
                planTier={!isStoragePack ? selectedTier : undefined}
                packId={isStoragePack ? (requestedPackId as any) : undefined}
                amount={isStoragePack ? selectedPack?.priceINR : selectedPlan.priceINR}
                currency="INR"
                planName={isStoragePack ? selectedPack?.name : selectedPlan.name}
                userName={user?.user_metadata?.full_name}
                userEmail={user?.email}
                buttonText={`Pay ${priceDisplay} with Razorpay`}
                className="w-full text-center py-3 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] border border-[#856837] rounded-xl shadow-xs transition-colors cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#292720]">
                    100% Secure Checkout
                  </h3>
                  <p className="text-xs text-[#777064]">
                    Powered by Razorpay Payments
                  </p>
                </div>
              </div>
              <p className="text-xs text-[#777064] leading-relaxed">
                Transactions are processed over 256-bit SSL encrypted channels with PCI-DSS Level 1 compliance. Your card and banking credentials are never stored on our servers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-3">
              <h3 className="text-xs font-bold text-[#292720] uppercase tracking-wider">
                Supported Payment Options
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-[#777064]">
                <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]">
                  💳 Credit & Debit Cards
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]">
                  📱 UPI (GPay, PhonePe, Paytm)
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]">
                  🏦 NetBanking (50+ Banks)
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]">
                  👛 Wallets & PayLater
                </div>
              </div>
            </div>

            <div className="text-center text-xs text-[#777064]">
              Need help or custom invoice?{' '}
              <a
                href="mailto:contact@filemindhub.xyz"
                className="text-[#9C7D47] font-semibold underline underline-offset-2"
              >
                contact@filemindhub.xyz
              </a>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-[#E5DED1] bg-[#F3EFE5] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777064]">
          <div className="flex items-center gap-2">
            <Image
              src="/filemind-ai-pdf-manager-logo.png"
              alt="FileMind Logo"
              width={20}
              height={20}
              className="object-contain"
            />
            <span className="font-semibold text-[#292720]">FileMind Technologies</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#292720]">Home</Link>
            <Link href="/contact" className="hover:text-[#292720]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#292720]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#292720]">Terms of Service</Link>
          </div>
          <div>© {new Date().getFullYear()} FileMind. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
