import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { FileText, Database, ArrowRight, ShieldCheck, Crown, Sparkles } from 'lucide-react'
import { UploadZone } from '@/components/documents/UploadZone'
import { StatusBadge, DocumentStatus } from '@/components/documents/StatusBadge'
import { WorkspaceSearchBar } from '@/components/dashboard/WorkspaceSearchBar'
import { formatDate, formatFileSize } from '@/lib/utils'
import { ProBadge } from '@/components/ui/ProBadge'
import { isServerUserPro, getServerUserTier } from '@/lib/subscription/plan-server'
import { PLAN_CONFIGS } from '@/lib/subscription/plans'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Vault Dashboard',
}

export default async function DashboardPage() {
  const [supabase, user] = await Promise.all([
    createClient(),
    getAuthenticatedUser(),
  ])

  const { data: documents } = await supabase
    .from('documents')
    .select('id, filename, file_size, status, created_at')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  const totalDocuments = documents?.length || 0
  const totalStorageBytes = documents?.reduce((acc, doc) => acc + (doc.file_size || 0), 0) || 0
  const recentDocs = documents?.slice(0, 6) || []

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const tier = await getServerUserTier(user)
  const isPro = tier === 'pro' || tier === 'elite'
  const isElite = tier === 'elite'
  const currentPlan = PLAN_CONFIGS[tier] || PLAN_CONFIGS.free

  return (
    <div className="space-y-8 w-full max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#E5DED1] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#292720]">
              Your workspace
            </h1>
            {isElite ? (
              <Link href="/settings" title="Elite Intelligence Member">
                <span className="text-[10px] bg-gradient-to-r from-[#D4AF37] to-[#AA771C] text-[#1C180A] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-xs">
                  ELITE ACTIVE
                </span>
              </Link>
            ) : isPro ? (
              <Link href="/settings" title="Pro Intelligence Member">
                <ProBadge variant="gold-pill" size="sm" label="PRO ACTIVE" />
              </Link>
            ) : null}
          </div>
          <p className="text-xs sm:text-sm text-[#777064] mt-1">
            {isElite
              ? 'Elite Intelligence Active • High-priority queue, 10 GB vault, and hardware biometric protection.'
              : isPro
              ? 'Pro Intelligence Active • Unlimited AI document synthesis, dual AI engines, and hardware-bound biometric vault.'
              : 'Free Tier Active • Upload PDFs, private storage vault, and keyword indexing.'}
          </p>
        </div>
        <div className="text-xs text-[#777064] flex items-center gap-2 self-start sm:self-auto font-medium bg-[#FFFCF5] border border-[#E5DED1] px-3 py-1.5 rounded-full shadow-2xs">
          <span className={`h-1.5 w-1.5 rounded-full ${isPro ? 'bg-[#D4AF37]' : 'bg-[#C5A878]'}`} />
          <span>{displayName}</span>
          <span>•</span>
          <span>{formattedDate}</span>
          {isPro && (
            <>
              <span>•</span>
              <span className="font-bold text-[#AA771C]">Pro Member</span>
            </>
          )}
        </div>
      </div>

      {isPro && <ProBadge variant="banner" />}

      <div className="space-y-2">
        <WorkspaceSearchBar />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs flex flex-col justify-between hover:border-[#DDD5C7] hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-[#777064] mb-3">
            <span className="font-semibold text-[#292720]">Total documents</span>
            <div className="h-8 w-8 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-[#292720] mb-1">
            {totalDocuments}
          </div>
          <p className="text-[11px] text-[#777064]">
            {totalDocuments === 1 ? '1 document' : `${totalDocuments} documents`} indexed & searchable
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs flex flex-col justify-between hover:border-[#DDD5C7] hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-[#777064] mb-3">
            <span className="font-semibold text-[#292720]">Storage utilized</span>
            <div className="h-8 w-8 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-[#292720] mb-1">
            {formatFileSize(totalStorageBytes)}
          </div>
          <p className="text-[11px] text-[#777064]">
            {currentPlan.maxFileSizeMB} MB per-file • {currentPlan.name}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs flex flex-col justify-between hover:border-[#DDD5C7] hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-xs text-[#777064] mb-3">
            <span className="font-semibold text-[#292720]">Document privacy</span>
            <div className="h-8 w-8 rounded-xl bg-[#EBF7EE] border border-[#C3E6CB] flex items-center justify-center text-[#1E7E34]">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-[#292720] mb-1">
            Private vault
          </div>
          <div className="flex items-center justify-between text-[11px] text-[#777064]">
            <span>Isolated per-user encryption</span>
            <Link href="/settings" className="text-[#9C7D47] hover:underline font-semibold transition-colors">
              Settings →
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C5A878]" />
              <span>Upload documents</span>
            </h2>
            <span className="text-[11px] font-semibold text-[#9C7D47] bg-[#FAF5EC] px-2.5 py-0.5 rounded-full border border-[#E5DED1]">
              PDF only
            </span>
          </div>
          <UploadZone compact />
        </div>

        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C5A878]" />
                <span>Recent documents</span>
              </h2>
              {totalDocuments > 0 && (
                <span className="text-xs font-mono font-medium text-[#777064] bg-[#FAF5EC] px-2 py-0.5 rounded-full border border-[#E5DED1]">
                  {totalDocuments}
                </span>
              )}
            </div>
            {totalDocuments > 0 && (
              <Link
                href="/documents"
                className="text-xs font-semibold text-[#777064] hover:text-[#9C7D47] transition-colors flex items-center gap-1"
              >
                <span>View all documents</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {recentDocs.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FFFCF5] border border-dashed border-[#DDD5C7] text-[#777064] flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-[#292720]">No documents in your vault yet</p>
              <p className="text-xs text-[#777064] mt-1 max-w-xs">
                Upload your first PDF document using the dropzone to start searching and asking questions.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5DED1] rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] overflow-hidden shadow-2xs">
              {recentDocs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between p-4 hover:bg-[#F8F4EA] transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center flex-shrink-0 text-[#9C7D47] group-hover:scale-105 transition-all">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#292720] group-hover:text-[#9C7D47] transition-colors truncate" title={doc.filename}>
                        {doc.filename}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-[#777064] mt-0.5">
                        <span className="font-mono text-[#777064]">
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span>•</span>
                        <span>
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <StatusBadge status={doc.status as DocumentStatus} />
                    <ArrowRight className="h-4 w-4 text-[#A8A49B] group-hover:text-[#9C7D47] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
