import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Lock, EyeOff, FileText } from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

export const metadata: Metadata = {
  title: 'Privacy Policy – FileMind Document Privacy & Data Protection',
  description:
    'Learn how FileMind protects your documents with AES-256 encryption, zero model training on user files, and hardware-isolated WebAuthn biometric security.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/privacy',
  },
  openGraph: {
    title: 'Privacy Policy – FileMind Document Privacy & Data Protection',
    description:
      'Learn how FileMind protects your documents with AES-256 encryption and a strict zero AI model training policy.',
    url: 'https://www.filemindhub.xyz/privacy',
    siteName: 'FileMind',
    images: ['https://www.filemindhub.xyz/filemind-ai-pdf-manager-logo.png'],
  },
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <LandingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-12">
        <section className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Privacy & Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#292720]">
            FileMind Privacy Policy
          </h1>
          <p className="text-xs text-[#777064]">
            Last updated: November 2, 2026 • Effective immediately
          </p>
        </section>

        {/* Highlights */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-2">
            <EyeOff className="h-5 w-5 text-[#9C7D47]" />
            <h2 className="text-sm font-bold text-[#292720]">Zero AI Training</h2>
            <p className="text-xs text-[#777064]">
              We never use your uploaded PDFs or AI queries to train external or foundational AI models.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-2">
            <Lock className="h-5 w-5 text-[#9C7D47]" />
            <h2 className="text-sm font-bold text-[#292720]">Hardware Biometrics</h2>
            <p className="text-xs text-[#777064]">
              Raw biometric data never leaves your device. Only public keys and cryptographic signatures are verified.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-2">
            <FileText className="h-5 w-5 text-[#9C7D47]" />
            <h2 className="text-sm font-bold text-[#292720]">You Own Your Data</h2>
            <p className="text-xs text-[#777064]">
              You can permanently delete any document, sharing link, or account credential at any time.
            </p>
          </div>
        </section>

        {/* Legal Text */}
        <section className="prose prose-sm max-w-none text-[#777064] space-y-8 leading-relaxed">
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">1. Information We Collect</h2>
            <p>
              When you register for FileMind, we collect your email address, authentication credentials, and account profile details. When you upload PDF files, we store the file in private object storage and compute vector embeddings solely to enable semantic search and document understanding for your account.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">2. How We Protect Your Documents</h2>
            <p>
              All files are encrypted in transit using TLS 1.3 and encrypted at rest with AES-256. Individual documents protected by the Biometric Secure Vault utilize envelope encryption with HKDF key derivation, requiring FIDO2 WebAuthn hardware authentication before any ephemeral decryption lease is issued.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">3. Strict Zero-Training Commitment</h2>
            <p>
              Your trust is paramount. FileMind explicitly guarantees that neither your uploaded PDFs nor your conversational queries are shared with third-party model providers to train or fine-tune public language models. Document processing is ephemeral and scoped strictly to your session.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">4. Document Sharing & Public Links</h2>
            <p>
              When you choose to share a document via public link or restricted sharing, you retain complete ownership. You can configure expiration timers, toggle download permissions, or revoke sharing access immediately from your document dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">5. Your Rights (GDPR & CCPA)</h2>
            <p>
              Under applicable data protection regulations including GDPR and CCPA, you have the right to access, rectify, export, or delete your personal information and documents at any time. Deleting a document purges both the underlying PDF and all associated vector embeddings from our index.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold text-[#292720]">6. Contact Our Data Protection Team</h2>
            <p>
              If you have any questions or requests regarding this Privacy Policy, please contact our data privacy officer at{' '}
              <a href="mailto:privacy@filemindhub.xyz" className="text-[#9C7D47] underline underline-offset-2">
                privacy@filemindhub.xyz
              </a>.
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
            <Link href="/terms" className="hover:text-[#292720]">Terms of Service</Link>
          </div>
          <div>© {new Date().getFullYear()} FileMind. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
