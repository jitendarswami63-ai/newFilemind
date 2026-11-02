import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { Scale } from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

export const metadata: Metadata = {
  title: 'Terms of Service – FileMind Document Platform Terms',
  description:
    'Review the FileMind Terms of Service governing the use of our AI PDF management, semantic search, document sharing, and biometric security features.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/terms',
  },
  openGraph: {
    title: 'Terms of Service – FileMind Document Platform Terms',
    description:
      'Review the FileMind Terms of Service governing the use of our AI PDF management and semantic search platform.',
    url: 'https://www.filemindhub.xyz/terms',
    siteName: 'FileMind',
    images: ['https://www.filemindhub.xyz/filemind-ai-pdf-manager-logo.png'],
  },
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <LandingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
            <Scale className="h-3.5 w-3.5" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#292720]">
            FileMind Terms of Service
          </h1>
          <p className="text-xs text-[#777064]">
            Last updated: November 2, 2026 • Effective upon account creation
          </p>
        </section>

        <section className="prose prose-sm max-w-none text-[#777064] space-y-8 leading-relaxed">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or creating an account on FileMind (accessible at filemindhub.xyz), you agree to be bound by these Terms of Service. If you do not agree to these terms, you must discontinue using our services immediately.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">2. Document Ownership & Licensing</h2>
            <p>
              You retain 100% intellectual property ownership of all documents, text, and materials you upload to FileMind. You grant FileMind only the narrow, non-exclusive license required to process, compute vector embeddings for, and display your documents as directed by your account actions.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">3. Acceptable Use Policy</h2>
            <p>
              You agree not to use FileMind to store, share, or process unlawful content, malicious code, copyright-infringing materials, or content that violates applicable privacy statutes. FileMind reserves the right to suspend or terminate accounts that breach these standards.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">4. Biometric Encryption & Hardware Keys</h2>
            <p>
              The FileMind Biometric Vault utilizes hardware-bound FIDO2 WebAuthn authentication. You are responsible for maintaining access to your registered platform authenticators (Windows Hello, Touch ID, or hardware security keys). FileMind cannot recover documents if all registered authenticators and cryptographic keys are lost.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">5. Service Availability & Disclaimers</h2>
            <p>
              FileMind is provided on an &quot;as is&quot; and &quot;as available&quot; basis. While we strive for 99.9% uptime and implement industry-standard redundancy, we do not warrant that our service will be uninterrupted or error-free.
            </p>
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
            <Link href="/contact" className="hover:text-[#292720]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#292720]">Privacy Policy</Link>
          </div>
          <div>© {new Date().getFullYear()} FileMind. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
