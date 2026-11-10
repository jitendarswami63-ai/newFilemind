import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import Script from 'next/script'
import { Check, ShieldCheck, Zap } from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { RazorpayCheckoutButton } from '@/components/checkout/RazorpayCheckoutButton'

export const metadata: Metadata = {
  title: 'Upgrade to FileMind Pro – Razorpay Secure Checkout',
  description:
    'Complete your FileMind subscription securely using Razorpay Standard Checkout. Supports UPI, Cards, NetBanking, and Wallets.',
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <LandingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-10">
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
            <Zap className="h-3.5 w-3.5" />
            <span>Razorpay Secure Payment Gateway</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#292720]">
            Complete Your Upgrade
          </h1>
          <p className="text-sm sm:text-base text-[#777064] max-w-xl mx-auto">
            Get unlimited AI document analysis, FIDO2 biometric encryption, and fast vector indexing with Razorpay Standard Web Checkout.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Order Summary Card */}
          <div className="p-7 rounded-2xl bg-[#FFFCF5] border-2 border-[#9C7D47] shadow-sm space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                  Selected Plan
                </span>
                <h2 className="text-2xl font-extrabold text-[#292720] mt-1">
                  Pro Intelligence
                </h2>
                <p className="text-xs text-[#777064] mt-0.5">
                  Monthly billing • Cancel anytime
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-[#292720]">₹499</div>
                <div className="text-[11px] text-[#777064]">/ month (incl. GST)</div>
              </div>
            </div>

            <ul className="space-y-3 text-xs text-[#292720] pt-4 border-t border-[#E5DED1]">
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                <span className="font-medium">Unlimited document uploads & questions</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                <span>Dual AI engine: Gemini 3.8 + NVIDIA NIM</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                <span>Hardware-bound biometric WebAuthn vault</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                <span>Deepgram neural voice playback</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
                <span>Priority processing queue</span>
              </li>
            </ul>

            <div className="pt-4 border-t border-[#E5DED1]">
              <RazorpayCheckoutButton
                amount={499}
                currency="INR"
                planName="Pro Intelligence"
                buttonText="Pay ₹499 with Razorpay"
                className="w-full text-center py-3 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] border border-[#856837] rounded-xl shadow-xs transition-colors cursor-pointer"
              />
            </div>
          </div>

          {/* Security & Supported Methods */}
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
                <div className="p-2 rounded-lg bg-[#FAF5EC] border border-[#E5DED1]">
                  💳 Credit & Debit Cards
                </div>
                <div className="p-2 rounded-lg bg-[#FAF5EC] border border-[#E5DED1]">
                  📱 UPI (GPay, PhonePe, Paytm)
                </div>
                <div className="p-2 rounded-lg bg-[#FAF5EC] border border-[#E5DED1]">
                  🏦 NetBanking (50+ Banks)
                </div>
                <div className="p-2 rounded-lg bg-[#FAF5EC] border border-[#E5DED1]">
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
