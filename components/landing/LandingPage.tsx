import React from 'react'
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
} from 'lucide-react'
import { LandingNavbar } from './LandingNavbar'

interface LandingPageProps {
  user?: { email?: string } | null
}

export function LandingPage({ user }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#F3EFE5] text-[#292720] flex flex-col selection:bg-[#C5A878]/30 selection:text-[#292720]">
      <LandingNavbar user={user} />

      <main className="flex-1">
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
                Transform dense, complex PDF libraries into conversational knowledge. FileMind is an AI document management platform and semantic document search engine that acts as your AI-powered PDF assistant with sub-second hybrid retrieval, exact page citations, and military-grade biometric vault encryption.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-14">
                <Link
                  href={user ? '/dashboard' : '/signup?next=/dashboard'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl shadow-sm border border-[#856837] transition-all cursor-pointer"
                >
                  <span>{user ? 'Get Started' : 'Get Started Free'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={user ? '/dashboard' : '/login'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#FAF5EC] rounded-xl border border-[#E5DED1] hover:border-[#DDD5C7] shadow-xs transition-all cursor-pointer"
                >
                  <span>{user ? 'View My Documents' : 'Sign In to Workspace'}</span>
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
                          <Image src="/logo.png" alt="FileMind AI Document Management Logo" width={16} height={16} className="h-full w-full object-contain" />
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
                Engineered for rigorous document workflows
              </h2>
              <p className="text-base sm:text-lg text-[#777064]">
                Built for researchers, analysts, and legal teams who need an AI-powered PDF assistant with verifiable precision—not hallucinations.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Search className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Hybrid Vector & Keyword Search
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Fuses 768-dimensional dense semantic vectors with full-text keyword indexing to surface needle-in-a-haystack clauses in milliseconds across massive libraries.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Dual-Engine Grounded Synthesis
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Leverages an automated cascade between Google Gemini and NVIDIA NIM. Every answer is bound strictly to source context with clickable page citations.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  FIDO2 Biometric Secure Vault
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Protect sensitive contracts behind hardware-level biometric passkeys and TOTP MFA. Cryptographic envelope encryption keeps locked documents impenetrable.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Layers className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Large PDF Pipeline (49 MB / 150 Files)
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Ingest large institutional PDFs with native segmentation and automatic metadata extraction. Process up to 150 documents in parallel queues safely.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <Volume2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Neural Audio & Voice Input
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Interrogate documents hands-free with real-time speech-to-text recording, and listen to synthesized AI summaries with Deepgram neural audio playback.
                </p>
              </div>

              <div className="p-6 rounded-xl border border-[#E5DED1] bg-[#F3EFE5] hover:border-[#C5A878] transition-all">
                <div className="h-10 w-10 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-[#292720] mb-2">
                  Zero Model Training & Total Isolation
                </h3>
                <p className="text-sm text-[#777064] leading-relaxed">
                  Your proprietary files are never used to train public foundation models. Strict Row-Level Security (RLS) guarantees complete tenant isolation.
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
                    Hardware-backed passkeys require TouchID, FaceID, or security keys to establish 15-minute decryption leases.
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
                  href={user ? '/dashboard' : '/signup?next=/dashboard'}
                  className="w-full text-center py-2.5 text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] rounded-lg transition-colors cursor-pointer"
                >
                  {user ? 'Get Started' : 'Get Started Free'}
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
                  href={user ? '/dashboard' : '/signup?next=/dashboard'}
                  className="w-full text-center py-2.5 text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] border border-[#856837] rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {user ? 'Get Started' : 'Start Free Pro Trial'}
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
                  href={user ? '/dashboard' : '/signup?next=/dashboard'}
                  className="w-full text-center py-2.5 text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] rounded-lg transition-colors cursor-pointer"
                >
                  Contact Enterprise Team
                </Link>
              </div>
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
                  href={user ? '/dashboard' : '/signup?next=/dashboard'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl shadow-xs border border-[#856837] transition-all cursor-pointer"
                >
                  <span>{user ? 'Get Started' : 'Get Started Free'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href={user ? '/dashboard' : '/login'}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#F3EFE5] rounded-xl border border-[#E5DED1] transition-all cursor-pointer"
                >
                  <span>{user ? 'My Workspace' : 'Sign In to Workspace'}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5DED1] bg-[#F3EFE5] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg border border-[#D8D0C2] flex items-center justify-center bg-[#FFFCF5] p-1 shadow-2xs">
                <Image src="/logo.png" alt="FileMind Document Intelligence Platform Logo" width={22} height={22} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-[#292720]">FileMind</span>
                <span className="text-[10px] text-[#777064]">Document Intelligence</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-[#777064]">
              <a href="#features" className="hover:text-[#292720] transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-[#292720] transition-colors">How It Works</a>
              <a href="#security" className="hover:text-[#292720] transition-colors">Security</a>
              <a href="#pricing" className="hover:text-[#292720] transition-colors">Pricing</a>
              <Link href="/login" className="hover:text-[#292720] transition-colors">Sign In</Link>
              <Link href="/signup" className="hover:text-[#292720] transition-colors">Sign Up</Link>
            </div>

            <div className="text-xs text-[#777064]">
              © {new Date().getFullYear()} FileMind. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
