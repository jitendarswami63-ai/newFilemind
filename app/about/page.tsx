import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ShieldCheck, Search, Lock, Cpu, ArrowRight } from 'lucide-react'
import { LandingNavbar } from '@/components/landing/LandingNavbar'

export const metadata: Metadata = {
  title: 'About FileMind – AI PDF Management & Document Intelligence',
  description:
    'Learn about FileMind, our mission to transform document understanding with semantic vector search, and our commitment to hardware-grade biometric encryption.',
  alternates: {
    canonical: 'https://www.filemindhub.xyz/about',
  },
  openGraph: {
    title: 'About FileMind – AI PDF Management & Document Intelligence',
    description:
      'Learn about FileMind, our mission to transform document understanding with semantic vector search, and our commitment to hardware-grade biometric encryption.',
    url: 'https://www.filemindhub.xyz/about',
    siteName: 'FileMind',
    images: ['https://www.filemindhub.xyz/filemind-ai-pdf-manager-logo.png'],
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#292720] flex flex-col selection:bg-[#9C7D47]/20 selection:text-[#292720]">
      <LandingNavbar />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 space-y-16">
        {/* Header */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
            <Cpu className="h-3.5 w-3.5" />
            <span>Our Mission & Technology</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#292720]">
            Empowering People to Understand Complex Documents
          </h1>
          <p className="text-base sm:text-lg text-[#777064] max-w-2xl mx-auto leading-relaxed">
            FileMind is an AI-powered document intelligence platform built for researchers, legal practitioners, students, and engineers who need instant, verifiable answers from extensive PDF files.
          </p>
        </section>

        {/* Pillars Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Search className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#292720]">Semantic Precision</h2>
            <p className="text-xs text-[#777064] leading-relaxed">
              We combine dense vector embeddings with exact keyword BM25 retrieval to locate precise concepts across thousands of pages in milliseconds.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Lock className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#292720]">Hardware Biometric Vault</h2>
            <p className="text-xs text-[#777064] leading-relaxed">
              FIDO2 WebAuthn envelope encryption integrates directly with Windows Hello, Touch ID, and platform authenticators to protect sensitive documents.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h2 className="text-base font-bold text-[#292720]">Zero-Training Guarantee</h2>
            <p className="text-xs text-[#777064] leading-relaxed">
              Your data belongs strictly to you. FileMind enforces complete tenant isolation and never trains external AI models on your private documents.
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="p-8 sm:p-10 rounded-3xl bg-[#F8F4EA] border border-[#E5DED1] space-y-4">
          <h2 className="text-2xl font-bold text-[#292720]">Why We Built FileMind</h2>
          <p className="text-sm text-[#777064] leading-relaxed">
            Traditional document management systems rely on file names, folder hierarchies, and rigid search filters. When dealing with complex contracts, academic papers, and technical specifications, finding the right sentence with verifiable page citations was a tedious, manual chore.
          </p>
          <p className="text-sm text-[#777064] leading-relaxed">
            FileMind bridges the gap between deep vector search and real-time conversational AI. Every answer returned is anchored to explicit page numbers and source excerpts, giving you total transparency and eliminating hallucinations.
          </p>
          <div className="pt-4 flex flex-wrap items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#9C7D47] text-[#FFFCF5] font-semibold text-xs hover:bg-[#856837] transition-colors shadow-xs"
            >
              <span>Get Started Free</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFFCF5] border border-[#E5DED1] text-[#292720] font-semibold text-xs hover:bg-[#FAF5EC] transition-colors"
            >
              <span>Contact Us</span>
            </Link>
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
