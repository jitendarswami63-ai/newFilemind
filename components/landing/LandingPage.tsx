'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  FileText,
  Search,
  Sparkles,
  Shield,
  ShieldCheck,
  Lock,
  ArrowRight,
  CheckCircle2,
  Zap,
  Volume2,
  Database,
  Layers,
  Check,
  Fingerprint,
  FileCheck,
  ChevronDown,
  Share2,
  ExternalLink,
} from 'lucide-react'
import { LandingNavbar } from './LandingNavbar'
import { createClient } from '@/lib/supabase/client'

interface LandingPageProps {
  user?: { email?: string } | null
}

export function LandingPage({ user: initialUser }: LandingPageProps) {
  const [user, setUser] = useState(initialUser)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  useEffect(() => {
    if (initialUser) return
    let isMounted = true
    try {
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        if (isMounted && data?.user) setUser(data.user)
      }).catch(() => {})
    } catch {}
    return () => {
      isMounted = false
    }
  }, [initialUser])

  return (
    <div className="min-h-screen bg-[#F3EFE5] text-[#292720] flex flex-col selection:bg-[#C5A878]/30 selection:text-[#292720]">
      <LandingNavbar user={user} />

      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
          <div className="ambient-glow" aria-hidden="true" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D8D0C2] bg-[#FFFCF5] text-xs font-semibold text-[#9C7D47] shadow-xs mb-8">
                <Sparkles className="h-3.5 w-3.5" />
                <span>AI Document Management • AI PDF Search Platform</span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#292720] leading-[1.1] mb-6">
                Your Documents. <span className="text-[#9C7D47]">Understood with AI.</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#777064] leading-relaxed mb-10 max-w-2xl mx-auto">
                Transform how your documents are understood with AI. FileMind is an AI PDF manager that organizes your files, answers complex questions with page-accurate citations, and ensures your private documents are understood, indexed, and protected with hardware-grade biometric vault encryption.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-14">
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  aria-label="Get started free with FileMind AI document manager"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl shadow-sm border border-[#856837] transition-all cursor-pointer"
                >
                  <span>{user ? 'Go to Workspace' : 'Get Started Free'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={user ? '/dashboard' : '/login'}
                  aria-label="Sign in to your FileMind account"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#FAF5EC] rounded-xl border border-[#E5DED1] hover:border-[#DDD5C7] shadow-xs transition-all cursor-pointer"
                >
                  <span>{user ? 'Open Workspace' : 'Sign In to Workspace'}</span>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto pt-4 border-t border-[#E5DED1]/70 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#292720]">49 MB / File</div>
                    <div className="text-[11px] text-[#777064]">Up to 150 Bulk PDFs</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                    <Search className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#292720]">Hybrid Retrieval</div>
                    <div className="text-[11px] text-[#777064]">Dense Vector + BM25</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#292720]">Exact Citations</div>
                    <div className="text-[11px] text-[#777064]">Zero Hallucinations</div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                    <Fingerprint className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#292720]">Private Vault</div>
                    <div className="text-[11px] text-[#777064]">FIDO2 Biometric MFA</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-16 max-w-5xl mx-auto">
              <div className="rounded-2xl border border-[#D8D0C2] bg-[#FFFCF5] shadow-xl overflow-hidden">
                <div className="h-10 bg-[#1B1D21] border-b border-[#2E3036] px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[#E5DED1]/30" />
                    <div className="h-3 w-3 rounded-full bg-[#E5DED1]/30" />
                    <div className="h-3 w-3 rounded-full bg-[#E5DED1]/30" />
                  </div>
                  <div className="text-[11px] font-mono font-medium text-[#A8A49B]">
                    filemindhub.xyz/workspace/intelligence
                  </div>
                  <div className="w-12" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px]">
                  <div className="hidden md:flex md:col-span-3 bg-[#1B1D21] p-4 flex-col justify-between border-r border-[#2E3036]">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5 px-2 py-1">
                        <div className="h-6 w-6 rounded-md bg-[#24262B] p-1 border border-[#3E4149]">
                          <Image src="/filemind-ai-pdf-manager-logo.png" alt="FileMind Document Workspace Icon" width={16} height={16} className="h-full w-full object-contain" priority fetchPriority="high" />
                        </div>
                        <span className="text-xs font-bold text-[#F5F1E9]">FileMind</span>
                      </div>

                      <div className="space-y-1">
                        <div className="px-2.5 py-1.5 rounded-lg bg-[#34332F] text-xs font-semibold text-[#F5F1E9] flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Layers className="h-3.5 w-3.5 text-[#C5A878]" />
                            <span>Dashboard</span>
                          </span>
                          <span className="text-[10px] text-[#A8A49B]">7</span>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#A8A49B] flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5" />
                          <span>Documents</span>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#A8A49B] flex items-center gap-2">
                          <Search className="h-3.5 w-3.5" />
                          <span>Search</span>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#A8A49B] flex items-center gap-2">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Ask AI</span>
                        </div>
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#C5A878] flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5" />
                          <span>Private Vault</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[#2E3036] text-[11px] text-[#A8A49B]">
                      <div className="flex justify-between mb-1">
                        <span>Vault Storage</span>
                        <span className="text-[#F5F1E9] font-medium">20.1 MB</span>
                      </div>
                      <div className="w-full bg-[#2E3036] h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#C5A878] h-full w-[41%]" />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-9 bg-[#F3EFE5] p-5 sm:p-6 flex flex-col justify-between gap-6">
                    <div className="space-y-4">
                      <div className="bg-[#FFFCF5] rounded-xl border border-[#E5DED1] p-3 shadow-2xs flex items-center gap-3">
                        <Search className="h-4 w-4 text-[#9C7D47]" />
                        <span className="text-xs sm:text-sm font-medium text-[#292720]">
                          What are the key liability terms and compliance deadlines in the Q3 Agreement?
                        </span>
                        <span className="ml-auto hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47] rounded">
                          Ask AI ↵
                        </span>
                      </div>

                      <div className="bg-[#FFFCF5] rounded-xl border border-[#E5DED1] p-4 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-[#9C7D47]" />
                            <span className="text-xs font-bold text-[#292720] uppercase tracking-wider">
                              Grounded AI Synthesis
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#DCFCE7]">
                            98.6% Confidence
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#292720] leading-relaxed">
                          Under Section 8.3 of the Master Services Agreement, aggregate liability is strictly capped at 12 months of trailing fees. The mandatory SOC2 audit verification deadline is scheduled for November 15, 2026.
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF5EC] border border-[#E5DED1] text-[#777064]">
                            <FileCheck className="h-3 w-3 text-[#9C7D47]" />
                            <span>Master_Services_Agreement_2026.pdf (Page 14)</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#FAF5EC] border border-[#E5DED1] text-[#777064]">
                            <FileCheck className="h-3 w-3 text-[#9C7D47]" />
                            <span>Q3_Financial_Audit_Report.pdf (Page 22)</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-[#9C7D47] bg-[#FAF5EC] border border-[#E5DED1] ml-auto">
                            <Volume2 className="h-3 w-3" />
                            <span>Listen (0:42)</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="bg-[#FFFCF5] p-3 rounded-xl border border-[#E5DED1] shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center flex-shrink-0 text-[#9C7D47]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#292720] truncate">
                              Master_Services_Agreement_2026.pdf
                            </div>
                            <div className="text-[10px] text-[#777064]">18 pages • 4.2 MB</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                          Ready
                        </span>
                      </div>

                      <div className="bg-[#FFFCF5] p-3 rounded-xl border border-[#E5DED1] shadow-2xs flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center flex-shrink-0 text-[#9C7D47]">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[#292720] truncate">
                              Q3_Financial_Audit_Report.pdf
                            </div>
                            <div className="text-[10px] text-[#777064]">42 pages • 12.8 MB</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-[#15803D] bg-[#F0FDF4] px-1.5 py-0.5 rounded border border-[#DCFCE7]">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 border-t border-[#E5DED1] bg-[#FFFCF5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                Platform Capabilities
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#292720] tracking-tight mt-2 mb-4">
                Designed for simple, fast, and accurate document work
              </h2>
              <p className="text-base sm:text-lg text-[#777064]">
                Built for students, analysts, researchers, and professionals who need verifiable answers without guessing.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Smart Keyword & Topic Search
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Find exact passages in seconds. FileMind combines AI understanding with exact keyword search to pinpoint any clause, figure, or topic across all your PDFs.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Verified Page References
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Get reliable answers backed by your files. The AI checks your documents first and shows you clickable page citations so you can confirm facts directly.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Biometric Private Vault
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Protect confidential documents behind your device fingerprint, Windows Hello, or PIN. Encrypted files remain completely secure and private to you.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Large PDF Support (49 MB / 150 Files)
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Upload documents up to 49 MB each. Add single files or batch upload up to 150 PDFs at once with automatic indexing and organization.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Volume2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Voice Questions & Spoken Audio
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Ask questions hands-free with microphone speech input, and listen to natural spoken summaries of your documents with high-clarity voice playback.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Complete Data Privacy
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Your documents are strictly private. We never sell your data or use your files to train public AI models. Only you can view your workspace.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="py-20 border-t border-[#E5DED1] bg-[#F3EFE5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                Three-Step Workflow
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#292720] tracking-tight mt-2 mb-4">
                From dense PDFs to instant intelligence
              </h2>
              <p className="text-base sm:text-lg text-[#777064]">
                Upload documents once and interrogate them forever with precision grounding.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-[#FFFCF5] p-6 rounded-xl border border-[#E5DED1] shadow-xs relative">
                <div className="text-3xl font-extrabold text-[#C5A878] mb-3">01</div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Ingest & Sanitize
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Upload single documents or batches up to 49 MB. FileMind compresses storage safely while strictly preserving digital signatures and metadata integrity.
                </p>
              </div>

              <div className="bg-[#FFFCF5] p-6 rounded-xl border border-[#E5DED1] shadow-xs relative">
                <div className="text-3xl font-extrabold text-[#C5A878] mb-3">02</div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Neural Chunking & Vectorization
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Documents are split into semantic chunks, indexed with 768-dimensional embeddings, and tagged by category taxonomy for instant retrieval.
                </p>
              </div>

              <div className="bg-[#FFFCF5] p-6 rounded-xl border border-[#E5DED1] shadow-xs relative">
                <div className="text-3xl font-extrabold text-[#C5A878] mb-3">03</div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Synthesize & Verify Citations
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Query across all files or chat with individual documents. Click any citation to view the exact page and highlight in the native PDF viewer.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="security" className="py-20 border-t border-[#E5DED1] bg-[#FFFCF5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-[#1B1D21] rounded-2xl border border-[#2E3036] p-8 md:p-12 text-[#F5F1E9] shadow-xl">
              <div className="max-w-3xl mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#3E4149] bg-[#24262B] text-xs font-semibold text-[#C5A878] mb-4">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Enterprise Security Architecture</span>
                </div>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#F5F1E9]">
                  Cryptographic privacy for confidential research
                </h2>
                <p className="text-sm sm:text-base text-[#A8A49B] mt-3 leading-relaxed">
                  Every document processed by FileMind is isolated at the database, storage, and cryptographic layer. You maintain complete sovereignty over your data.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl bg-[#24262B] border border-[#2E3036]">
                  <Lock className="h-5 w-5 text-[#C5A878] mb-2.5" />
                  <h3 className="text-sm font-bold text-[#F5F1E9] mb-1">Envelope Encryption</h3>
                  <p className="text-xs text-[#A8A49B] leading-relaxed">
                    AES-256 GCM authenticated encryption with per-document keys and cryptographic AAD contextual binding.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#24262B] border border-[#2E3036]">
                  <Fingerprint className="h-5 w-5 text-[#C5A878] mb-2.5" />
                  <h3 className="text-sm font-bold text-[#F5F1E9] mb-1">WebAuthn Biometrics</h3>
                  <p className="text-xs text-[#A8A49B] leading-relaxed">
                    Hardware-backed passkeys require TouchID, FaceID, or security keys under the{' '}
                    <a
                      href="https://fidoalliance.org/fido2/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#C5A878] underline hover:text-[#E8DCC4] inline-flex items-center gap-0.5"
                    >
                      FIDO2 standard <ExternalLink className="h-2.5 w-2.5" />
                    </a>{' '}
                    to establish 15-minute decryption leases.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#24262B] border border-[#2E3036]">
                  <Shield className="h-5 w-5 text-[#C5A878] mb-2.5" />
                  <h3 className="text-sm font-bold text-[#F5F1E9] mb-1">TOTP MFA Assurance</h3>
                  <p className="text-xs text-[#A8A49B] leading-relaxed">
                    Google Authenticator MFA enforces AAL2 verification for all private vault uploads, queries, and downloads.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#24262B] border border-[#2E3036]">
                  <Database className="h-5 w-5 text-[#C5A878] mb-2.5" />
                  <h3 className="text-sm font-bold text-[#F5F1E9] mb-1">Row-Level Security</h3>
                  <p className="text-xs text-[#A8A49B] leading-relaxed">
                    PostgreSQL RLS policies strictly prevent cross-tenant data leakage across all vector and metadata tables.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 border-t border-[#E5DED1] bg-[#F3EFE5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                Transparent Pricing
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#292720] tracking-tight mt-2 mb-4">
                Choose the plan that fits your research needs
              </h2>
              <p className="text-base sm:text-lg text-[#777064]">
                Start free today. Upgrade when you need unlimited document volume and enterprise-level vault security.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              <div className="bg-[#FFFCF5] p-7 rounded-xl border border-[#E5DED1] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#292720]">Starter</h3>
                  <p className="text-xs text-[#777064] mt-1 mb-4">For individuals, researchers, and students.</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-[#292720]">$0</span>
                    <span className="text-xs text-[#777064]">/ forever</span>
                  </div>
                  <ul className="space-y-3 text-xs text-[#292720] mb-8">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Up to 150 documents indexed</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>49 MB per-file upload limit</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Hybrid Semantic + Keyword Search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Grounded Ask AI synthesis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Standard PDF viewer & citations</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  aria-label="Start with FileMind Free Tier"
                  className="w-full text-center py-2.5 text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] rounded-lg transition-colors cursor-pointer"
                >
                  {user ? 'Open Free Tier' : 'Start with Free Tier'}
                </Link>
              </div>

              <div className="bg-[#FFFCF5] p-7 rounded-xl border-2 border-[#9C7D47] shadow-md flex flex-col justify-between relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#9C7D47] text-[10px] font-bold text-[#FFFCF5] uppercase tracking-wider shadow-xs">
                  Most Popular
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#292720]">Pro Intelligence</h3>
                  <p className="text-xs text-[#777064] mt-1 mb-4">For legal, finance, and technical professionals.</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-[#292720]">$24</span>
                    <span className="text-xs text-[#777064]">/ month</span>
                  </div>
                  <ul className="space-y-3 text-xs text-[#292720] mb-8">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span className="font-semibold">Unlimited document library</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Dual-Engine AI (Gemini + NVIDIA NIM)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>FIDO2 WebAuthn Biometric Secure Vault</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Deepgram Speech-to-Text & Neural Audio</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Priority background processing queue</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  aria-label="Start free trial for FileMind Pro intelligence plan"
                  className="w-full text-center py-2.5 text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] border border-[#856837] rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {user ? 'Open Pro Workspace' : 'Start Free Pro Trial'}
                </Link>
              </div>

              <div className="bg-[#FFFCF5] p-7 rounded-xl border border-[#E5DED1] shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#292720]">Enterprise</h3>
                  <p className="text-xs text-[#777064] mt-1 mb-4">For organizations with compliance & SSO needs.</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-extrabold text-[#292720]">$89</span>
                    <span className="text-xs text-[#777064]">/ seat / month</span>
                  </div>
                  <ul className="space-y-3 text-xs text-[#292720] mb-8">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Dedicated isolated vector partition</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>SSO / SAML authentication</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Audit logging & compliance exports</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>Custom ingestion limits & dedicated SLA</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#9C7D47] flex-shrink-0" />
                      <span>24/7 dedicated engineering support</span>
                    </li>
                  </ul>
                </div>
                <Link
                  href="/contact"
                  aria-label="Contact our enterprise team for dedicated solutions"
                  className="w-full text-center py-2.5 text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] rounded-lg transition-colors cursor-pointer"
                >
                  Contact Enterprise Team
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="py-20 border-t border-[#E5DED1] bg-[#FAF5EC]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <span className="text-xs font-bold text-[#9C7D47] uppercase tracking-wider">
                Frequently Asked Questions
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#292720] tracking-tight mt-2 mb-3">
                Everything you need to know about FileMind
              </h2>
              <p className="text-base text-[#777064]">
                Answers to common questions about AI search, document security, file formats, and sharing.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: 'What is FileMind and how does it help manage PDFs?',
                  a: 'FileMind is an AI PDF manager and document search platform that helps you organize, search, and understand complex documents. You can search across your entire PDF library at once, ask questions in plain English, and receive immediate answers backed by exact page citations.',
                },
                {
                  q: 'How does AI semantic search find answers inside documents?',
                  a: 'FileMind reads every page and indexes both the conceptual meaning and the exact keywords. When you search or ask a question, FileMind matches the most relevant passages in milliseconds, even if your question uses different phrasing than the document text.',
                },
                {
                  q: 'Are my uploaded documents private and secure?',
                  a: 'Yes. Your documents are stored in private cloud storage with strict user isolation. We never sell your data or use your files to train public AI models. You can also lock sensitive PDFs in your Biometric Secure Vault, which encrypts them with AES-256-GCM encryption that only your device fingerprint, Windows Hello, or PIN can decrypt.',
                },
                {
                  q: 'How do exact page citations work?',
                  a: 'Every AI response includes clickable citations that point to the exact page number where the information was found. Clicking a citation opens our built-in viewer directly to that page, allowing you to verify every fact in seconds.',
                },
                {
                  q: 'Can I share PDFs with other people?',
                  a: 'Yes. FileMind provides two sharing modes: Anyone with the link (a secure public link with optional expiration dates and download controls) and Restricted Sharing (sharing with specific registered users by email address).',
                },
                {
                  q: 'What file sizes and formats does FileMind support?',
                  a: 'FileMind is optimized for PDF documents up to 49 MB per file. You can upload single files or batch upload up to 150 documents at once with automatic text processing and vector indexing.',
                },
                {
                  q: 'How does the AI assistant guarantee answer accuracy?',
                  a: 'FileMind uses grounded document retrieval. The AI only uses information found directly inside your uploaded PDF files. If a fact is not mentioned in your documents, FileMind clearly tells you instead of guessing.',
                },
                {
                  q: 'Can I export or download my documents at any time?',
                  a: 'Yes. You can download original PDFs directly from your dashboard or viewer anytime. When sharing links, you choose whether visitors can download the raw file or view it securely in the browser.',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E5DED1] bg-[#FFFCF5] p-5 shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between text-left gap-4 font-bold text-base text-[#292720] cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-[#9C7D47] flex-shrink-0 transition-transform ${
                        openFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openFaq === idx && (
                    <p className="mt-3 text-sm text-[#777064] leading-relaxed border-t border-[#E5DED1]/60 pt-3">
                      {item.a}
                    </p>
                  )}
                  {openFaq !== idx && (
                    <p className="mt-2 text-sm text-[#777064] leading-relaxed line-clamp-2">
                      {item.a}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 border-t border-[#E5DED1] bg-[#FFFCF5]">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-[#D8D0C2] bg-[#FAF5EC] p-8 sm:p-12 text-center">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#292720] tracking-tight mb-3">
                Ready to transform how you work with documents?
              </h2>
              <p className="text-sm sm:text-base text-[#777064] max-w-xl mx-auto mb-8">
                Join researchers, legal professionals, and analysts turning complex PDFs into instant, verified intelligence.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={user ? '/dashboard' : '/signup'}
                  aria-label="Create a free FileMind account"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl shadow-xs border border-[#856837] transition-all cursor-pointer"
                >
                  <span>{user ? 'Launch Dashboard' : 'Create Free Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={user ? '/dashboard' : '/login'}
                  aria-label="Sign in to your member workspace"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#F3EFE5] rounded-xl border border-[#E5DED1] transition-all cursor-pointer"
                >
                  <span>{user ? 'Browse Private Vault' : 'Member Workspace'}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5DED1] bg-[#F3EFE5] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl border border-[#D8D0C2] flex items-center justify-center bg-[#FFFCF5] p-1.5 shadow-2xs">
                <Image
                  src="/filemind-ai-pdf-manager-logo.png"
                  alt="FileMind AI PDF Manager and Document Search Platform Logo"
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#292720]">FileMind</span>
                <span className="text-[10px] text-[#777064]">Document Intelligence</span>
              </div>
            </div>

            <nav aria-label="Footer Navigation" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#777064]">
              <a href="#features" className="hover:text-[#292720] transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-[#292720] transition-colors">How It Works</a>
              <a href="#security" className="hover:text-[#292720] transition-colors">Security</a>
              <a href="#pricing" className="hover:text-[#292720] transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-[#292720] transition-colors">FAQ</a>
              <Link href="/about" className="hover:text-[#292720] transition-colors font-medium">About FileMind</Link>
              <Link href="/contact" className="hover:text-[#292720] transition-colors font-medium">Contact Us</Link>
              <Link href="/privacy" className="hover:text-[#292720] transition-colors font-medium">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-[#292720] transition-colors font-medium">Terms of Service</Link>
              <Link href="/login" className="hover:text-[#292720] transition-colors">Account Login</Link>
              <Link href="/signup" className="hover:text-[#292720] transition-colors">Register New Account</Link>
            </nav>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-y border-[#E5DED1]/70 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 text-[#777064]">
              <span className="font-semibold text-[#292720] text-xs">Share:</span>
              <a
                href="https://twitter.com/intent/tweet?text=Explore%20FileMind%20%E2%80%94%20AI%20Document%20Intelligence%20and%20Biometric%20Vault&url=https%3A%2F%2Fwww.filemindhub.xyz"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share FileMind on X"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#D8D0C2] bg-[#FAF5EC] hover:bg-[#FFFCF5] text-xs font-medium text-[#292720] transition-colors"
              >
                <Share2 className="h-3 w-3 text-[#9C7D47]" />
                <span>Share on X</span>
              </a>
              <a
                href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fwww.filemindhub.xyz"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share FileMind on LinkedIn"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md border border-[#D8D0C2] bg-[#FAF5EC] hover:bg-[#FFFCF5] text-xs font-medium text-[#292720] transition-colors"
              >
                <Share2 className="h-3 w-3 text-[#0A66C2]" />
                <span>Share on LinkedIn</span>
              </a>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#777064]">
              <span className="font-semibold text-[#292720]">Resources:</span>
              <a
                href="https://github.com/jitendarswami63-ai/newFilemind"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FileMind GitHub Repository"
                className="hover:text-[#292720] inline-flex items-center gap-1 transition-colors"
              >
                <span>GitHub</span>
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://twitter.com/FileMindAI"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="FileMind on X"
                className="hover:text-[#292720] inline-flex items-center gap-1 transition-colors"
              >
                <span>Twitter / X</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="border-t border-[#E5DED1]/70 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#777064]">
            <p className="max-w-2xl text-center sm:text-left text-[11px] leading-relaxed">
              Hardware-bound WebAuthn encryption and zero-training document privacy. Your private files are stored securely with strict row-level isolation and are never used to train external AI models. For support or enterprise inquiries, reach out to <a href="mailto:contact@filemindhub.xyz" className="text-[#9C7D47] underline underline-offset-2 hover:text-[#7A5F32]">contact@filemindhub.xyz</a>.
            </p>
            <p className="text-[11px] whitespace-nowrap text-center sm:text-right">
              © {new Date().getFullYear()} FileMind Technologies Inc. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
