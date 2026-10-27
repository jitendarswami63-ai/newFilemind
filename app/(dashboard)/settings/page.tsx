import React from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/server'
import { User, Shield, Sparkles, Database, Lock } from 'lucide-react'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.full_name || 'Not provided'
  const email = user?.email || 'N/A'

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007ba7]/25 to-[#ff2d95]/25 border border-[#007ba7]/40 flex items-center justify-center text-[#00d2ff] shadow-[0_0_20px_rgba(0,210,255,0.2)]">
            <User className="h-5 w-5" />
          </div>
          <span>Account & Security Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
          Review your account profile, identity tokens, and infrastructure security parameters.
        </p>
      </div>

      {/* Account Profile Card */}
      <Card className="border-white/10 rounded-2xl relative overflow-hidden bg-[#0d0e14]/90 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00d2ff]/80 via-[#007ba7]/40 to-transparent" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#007ba7]/15 border border-[#007ba7]/30 flex items-center justify-center text-[#00d2ff]">
              <User className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">Account Information</CardTitle>
              <CardDescription className="text-xs text-slate-400">Authenticated user identity and security details.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#00d2ff]/30 transition-colors">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Full Name
              </span>
              <span className="text-sm font-semibold text-white">{displayName}</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#00d2ff]/30 transition-colors">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </span>
              <span className="text-sm font-semibold text-white">{email}</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#00d2ff]/30 transition-colors">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                User ID
              </span>
              <span className="text-xs font-mono text-slate-300 break-all select-all">{user?.id}</span>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/30 transition-colors flex flex-col justify-between">
              <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Security Profile
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-400 w-fit">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Shield className="h-3.5 w-3.5" />
                <span>Row-Level Security Active</span>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purely informational / visual Roadmap Preview (Constraint #2) */}
      <Card className="border-white/10 rounded-2xl relative overflow-hidden bg-[#0d0e14]/90 shadow-xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2d95]/80 to-transparent" />
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#007ba7]/20 to-[#ff2d95]/20 border border-[#ff2d95]/30 flex items-center justify-center text-[#ff2d95]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-white">Roadmap Preview (Informational)</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Architecture roadmap and upcoming feature capabilities.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-3.5">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#00d2ff]/30 transition-all flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#007ba7]/15 border border-[#007ba7]/30 text-[#00d2ff] flex-shrink-0 mt-0.5 shadow-sm">
                <Database className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">Phase 1: Document Processing Pipeline</h4>
                  <span className="text-[10px] bg-[#007ba7]/20 text-[#38bdf8] px-2 py-0.5 rounded-full border border-[#007ba7]/40 font-bold uppercase tracking-wider">
                    Upcoming
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Asynchronous processing queue with text extraction, chunking, and embedding generation via pgvector.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-[#ff2d95]/30 transition-all flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-[#ff2d95]/15 border border-[#ff2d95]/30 text-[#ff2d95] flex-shrink-0 mt-0.5 shadow-sm">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">Phase 2: RAG & Chat Intelligence</h4>
                  <span className="text-[10px] bg-[#ff2d95]/20 text-[#ff5ca8] px-2 py-0.5 rounded-full border border-[#ff2d95]/40 font-bold uppercase tracking-wider">
                    Planned
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Conversational Q&A across private documents using grounded citations and hybrid search.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 hover:border-white/20 transition-all flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 flex-shrink-0 mt-0.5 shadow-sm">
                <Lock className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">Phase 3: Multi-tenant Teams & Billing</h4>
                  <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded-full border border-white/10 font-bold uppercase tracking-wider">
                    Future
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Organization management, role-based access control, and usage billing tiers.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
