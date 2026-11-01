import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'
import { User, Shield, Sparkles, Database, Lock } from 'lucide-react'
import { VaultMfaSettings } from '@/components/settings/VaultMfaSettings'
import { BiometricVaultSettings } from '@/components/settings/BiometricVaultSettings'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.full_name || 'Not provided'
  const email = user?.email || 'N/A'

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      <div className="border-b border-[#E5DED1] pb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#292720] flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] shadow-2xs">
            <User className="h-5 w-5" />
          </div>
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#777064] mt-1.5">
          Review your account profile, identity tokens, and infrastructure security parameters.
        </p>
      </div>

      <Card className="border-[#E5DED1] rounded-2xl relative overflow-hidden bg-[#FFFCF5] shadow-2xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[#292720]">Account Information</CardTitle>
              <CardDescription className="text-xs text-[#777064]">Authenticated user identity and security details.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-colors">
              <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider mb-1.5">
                Full Name
              </span>
              <span className="text-sm font-semibold text-[#292720]">{displayName}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-colors">
              <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider mb-1.5">
                Email Address
              </span>
              <span className="text-sm font-semibold text-[#292720]">{email}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-colors">
              <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider mb-1.5">
                User ID
              </span>
              <span className="text-xs font-mono text-[#777064] break-all select-all">{user?.id}</span>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-colors flex flex-col justify-between">
              <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider mb-1.5">
                Security Profile
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-semibold text-[#1E7E34] w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                </span>
                <Shield className="h-3.5 w-3.5" />
                <span>Row-Level Security Active</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <VaultMfaSettings />

      <BiometricVaultSettings />

      <Card className="border-[#E5DED1] rounded-2xl relative overflow-hidden bg-[#FFFCF5] shadow-2xs">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[#292720]">Architecture Capabilities</CardTitle>
              <CardDescription className="text-xs text-[#777064]">
                Core system infrastructure and operational feature status.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3.5">
            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-all flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47] flex-shrink-0 mt-0.5 shadow-2xs">
                <Database className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#292720]">Document Processing & Vector Indexing</h4>
                  <span className="text-[10px] bg-[#EBF7EE] text-[#1E7E34] px-2 py-0.5 rounded-full border border-[#C3E6CB] font-semibold uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xs text-[#777064] leading-relaxed">
                  Asynchronous processing queue with text extraction, segmentation, and pgvector embeddings via Gemini.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-all flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47] flex-shrink-0 mt-0.5 shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#292720]">RAG & Conversational Intelligence</h4>
                  <span className="text-[10px] bg-[#EBF7EE] text-[#1E7E34] px-2 py-0.5 rounded-full border border-[#C3E6CB] font-semibold uppercase tracking-wider">
                    Active
                  </span>
                </div>
                <p className="text-xs text-[#777064] leading-relaxed">
                  Conversational Q&A across documents using verified citations, hybrid search, and persistent history.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] hover:border-[#C5A878] transition-all flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#777064] flex-shrink-0 mt-0.5 shadow-2xs">
                <Lock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#292720]">Multi-tenant Teams & Quota Controls</h4>
                  <span className="text-[10px] bg-[#FAF5EC] text-[#9C7D47] px-2 py-0.5 rounded-full border border-[#E5DED1] font-semibold uppercase tracking-wider">
                    Tiered
                  </span>
                </div>
                <p className="text-xs text-[#777064] leading-relaxed">
                  Per-user workspace isolation, storage quotas, and security boundary enforcement.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
