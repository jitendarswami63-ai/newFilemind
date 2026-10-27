import { createClient } from '@/lib/supabase/server'
import { FileText, Database, ArrowRight, Sparkles, Clock, ShieldCheck } from 'lucide-react'
import { UploadZone } from '@/components/documents/UploadZone'
import { StatusBadge, DocumentStatus } from '@/components/documents/StatusBadge'
import { formatDate, formatFileSize } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: documents } = await supabase
    .from('documents')
    .select('id, filename, file_size, status, created_at')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  const totalDocuments = documents?.length || 0
  const totalStorageBytes = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0
  const recentDocs = documents?.slice(0, 5) || []

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  return (
    <div className="space-y-8 sm:space-y-9 w-full max-w-6xl mx-auto">
      {/* Premium Welcome / Header Section with refined composition & dual glow */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1017] via-[#10131d] to-[#150f1b] border border-white/10 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        {/* Visible, refined dual ambient glow */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-[#ff2d95]/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-gradient-to-tr from-[#007ba7]/25 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        {/* Ultra-fine top gradient line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/60 via-[#ff2d95]/50 to-transparent" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-[#007ba7]/20 to-[#ff2d95]/20 border border-[#00d2ff]/30 text-xs font-semibold text-[#00d2ff] shadow-[0_0_15px_-3px_rgba(0,210,255,0.3)]">
              <Sparkles className="h-3.5 w-3.5 text-[#ff2d95]" />
              <span>Workspace Intelligence Active</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-white via-slate-100 to-[#00d2ff] bg-clip-text text-transparent">
                {displayName}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 pt-0.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>{formattedDate}</span>
            </p>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end gap-2.5">
            <div className="px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-md text-left sm:text-right shadow-inner">
              <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Security Tier</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 sm:justify-end mt-0.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Phase 0 Verified
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards — High-Impact Distinct Cards */}
      <div className="grid gap-4.5 sm:gap-5 grid-cols-1 md:grid-cols-3 w-full">
        {/* Total Documents Card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0e1119] border border-white/10 hover:border-[#00d2ff]/50 transition-all duration-300 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] group">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/80 to-transparent" />
          
          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Documents
            </span>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#007ba7]/20 border border-[#007ba7]/40 flex items-center justify-center text-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.2)] group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-3">
            {totalDocuments}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08] text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d2ff] shadow-[0_0_6px_#00d2ff]" />
            <span>Stored securely in private vault</span>
          </div>
        </div>

        {/* Storage Used Card */}
        <div className="relative overflow-hidden rounded-2xl bg-[#120f18] border border-white/10 hover:border-[#ff2d95]/50 transition-all duration-300 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] group">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2d95]/80 to-transparent" />

          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Storage Used
            </span>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-[#ff2d95]/20 border border-[#ff2d95]/40 flex items-center justify-center text-[#ff2d95] shadow-[0_0_15px_rgba(255,45,149,0.2)] group-hover:scale-105 transition-transform">
              <Database className="h-5 w-5" />
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-3">
            {formatFileSize(totalStorageBytes)}
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08] text-xs text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff2d95] shadow-[0_0_6px_#ff2d95]" />
            <span>49 MB per-file upload limit</span>
          </div>
        </div>

        {/* Storage Isolation Status */}
        <div className="relative overflow-hidden rounded-2xl bg-[#0d1414] border border-white/10 hover:border-emerald-500/50 transition-all duration-300 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] group">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/80 to-transparent" />

          <div className="flex items-center justify-between gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Storage Isolation
            </span>
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none mb-3">
            RLS Active
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-white/[0.08] text-xs text-emerald-400 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Row-Level Security & advisory locks</span>
          </div>
        </div>
      </div>

      {/* Dynamic Upload Zone */}
      <div className="space-y-3.5 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Upload Document
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10">
            PDF documents only
          </span>
        </div>
        <UploadZone />
      </div>

      {/* Recent Documents Feed */}
      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-[#ff2d95] shadow-[0_0_8px_#ff2d95]" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Recent Documents</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/[0.06] text-slate-300 border border-white/10">
              {totalDocuments}
            </span>
          </div>
          {totalDocuments > 0 && (
            <Link
              href="/documents"
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] hover:bg-[#ff2d95]/15 border border-white/10 hover:border-[#ff2d95]/40 text-xs font-semibold text-slate-300 hover:text-[#ff5ca8] flex items-center gap-1.5 transition-all"
            >
              <span>View all documents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="p-10 sm:p-14 text-center rounded-2xl bg-[#0e1017]/80 border-2 border-dashed border-white/15 text-slate-400 flex flex-col items-center justify-center">
            <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mb-3">
              <FileText className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-200">No documents in your vault yet</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs">Upload your first PDF document using the dropzone above to begin.</p>
          </div>
        ) : (
          <div className="space-y-2.5 w-full">
            {recentDocs.map((doc) => (
              <Link
                key={doc.id}
                href={`/documents/${doc.id}`}
                className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl bg-[#0d1017]/90 hover:bg-[#121622] border border-white/10 hover:border-[#007ba7]/50 hover:shadow-[0_4px_20px_rgba(0,123,167,0.15)] transition-all duration-200 group"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-4">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#007ba7]/25 to-[#ff2d95]/20 border border-[#007ba7]/35 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-[#00d2ff]/60 transition-all">
                    <FileText className="h-5 w-5 text-[#00d2ff] group-hover:text-[#ff2d95] transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-[#00d2ff] transition-colors truncate" title={doc.filename}>
                      {doc.filename}
                    </p>
                    <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-1">
                      <span className="font-mono text-slate-300 bg-white/[0.05] px-2 py-0.5 rounded text-[11px] font-medium border border-white/5">
                        {formatFileSize(doc.file_size)}
                      </span>
                      <span className="text-slate-600 hidden sm:inline">•</span>
                      <span className="hidden sm:inline text-slate-400">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <StatusBadge status={doc.status as DocumentStatus} />
                  <div className="h-8 w-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-[#007ba7]/25 group-hover:border-[#00d2ff]/40 transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
