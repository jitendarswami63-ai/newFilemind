import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Shield, MessageSquare, Clock, Globe } from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

export const metadata: Metadata = {
  title: 'Contact FileMind – Customer Support & Enterprise Inquiries',
  description:
    'Get in touch with FileMind support, security teams, and business inquiries. Reach us at support@filemindhub.xyz for help with your account or biometric vault.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/contact',
  },
  openGraph: {
    title: 'Contact FileMind – Customer Support & Enterprise Inquiries',
    description:
      'Get in touch with FileMind support, security teams, and business inquiries. Reach us at support@filemindhub.xyz.',
    url: 'https://www.filemindhub.xyz/contact',
    siteName: 'FileMind',
    images: ['https://www.filemindhub.xyz/filemind-ai-pdf-manager-logo.png'],
  },
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <LandingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-12">
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Support & Communications</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#292720]">
            We&apos;re Here to Help
          </h1>
          <p className="text-base sm:text-lg text-[#777064] max-w-2xl mx-auto leading-relaxed">
            Have questions about AI semantic search, hardware-backed biometric vaults, or enterprise document security? Contact our team.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Support */}
          <div className="p-8 rounded-3xl bg-[#FFFCF5] border border-[#E5DED1] space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[#292720]">Customer Support</h2>
            <p className="text-xs sm:text-sm text-[#777064] leading-relaxed">
              Need assistance with your documents, PDF parsing, or account settings? Our technical support desk is available Monday through Friday.
            </p>
            <div className="pt-2">
              <a
                href="mailto:support@filemindhub.xyz"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#9C7D47] hover:underline"
              >
                <span>support@filemindhub.xyz</span>
              </a>
            </div>
          </div>

          {/* Security & Vulnerabilities */}
          <div className="p-8 rounded-3xl bg-[#FFFCF5] border border-[#E5DED1] space-y-4 shadow-xs">
            <div className="h-12 w-12 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Shield className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-[#292720]">Security & Privacy</h2>
            <p className="text-xs sm:text-sm text-[#777064] leading-relaxed">
              For vulnerability disclosures, compliance audits, or questions regarding FIDO2 WebAuthn encryption policies.
            </p>
            <div className="pt-2">
              <a
                href="mailto:security@filemindhub.xyz"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#9C7D47] hover:underline"
              >
                <span>security@filemindhub.xyz</span>
              </a>
            </div>
          </div>
        </section>

        {/* Operating Hours & Commitments */}
        <section className="p-8 rounded-3xl bg-[#F8F4EA] border border-[#E5DED1] space-y-4">
          <h2 className="text-lg font-bold text-[#292720]">Our Service Level Commitments</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[#777064]">
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
              <span>Typical email response within 24 business hours</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-[#9C7D47] flex-shrink-0" />
              <span>Global coverage across US and EU time zones</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5DED1] bg-[#F3EFE5] py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777064]">
          <div className="flex items-center gap-2">
            <Image
              src="/filemind-ai-pdf-manager-logo.png"
              alt="FileMind AI PDF Manager and Document Search Platform Logo"
              width={20}
              height={20}
              className="object-contain"
            />
            <span className="font-semibold text-[#292720]">FileMind Technologies</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#292720]">Home</Link>
            <Link href="/about" className="hover:text-[#292720]">About</Link>
            <Link href="/privacy" className="hover:text-[#292720]">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#292720]">Terms of Service</Link>
          </div>
          <div>© {new Date().getFullYear()} FileMind. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
