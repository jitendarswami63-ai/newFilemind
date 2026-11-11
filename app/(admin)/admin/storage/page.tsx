import React from 'react'
import { HardDrive, Server, FileText, Database, ShieldCheck, AlertCircle } from 'lucide-react'
import { getAdminOverviewStats } from '@/lib/admin/data'
import { PLAN_CONFIGS, formatBytes } from '@/lib/subscription/plans'

export const dynamic = 'force-dynamic'

export default async function AdminStoragePage() {
  const stats = await getAdminOverviewStats()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">Vault Storage & Storage Quotas</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Monitor encrypted PDF file storage consumption, R2 / Supabase private bucket quotas, and top consumers.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Total Consumed Storage</span>
            <HardDrive className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.totalStorageFormatted}</div>
          <div className="text-[11px] text-[#777064]">Across {stats.totalDocuments} indexed PDFs</div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Total Uploaded Documents</span>
            <FileText className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.totalDocuments}</div>
          <div className="text-[11px] text-[#777064]">Average size: {stats.totalDocuments > 0 ? formatBytes(Math.round(stats.totalStorageBytes / stats.totalDocuments)) : '0 B'}</div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Cloud Storage Bucket</span>
            <Database className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-base font-bold text-[#292720]">Supabase / Cloudflare</div>
          <div className="text-[11px] text-[#10B981] font-semibold">● Private Bucket RLS Active</div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Processing Pipeline</span>
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.successRate}%</div>
          <div className="text-[11px] text-[#777064]">{stats.processingSuccessCount} succeeded, {stats.processingFailedCount} failed</div>
        </div>
      </div>

      {/* Storage Quotas Reference */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
          <Server className="h-4 w-4 text-[#9C7D47]" />
          Storage Quotas per Subscription Tier
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2">
            <div className="flex justify-between items-center font-bold text-[#292720]">
              <span>Free Plan</span>
              <span className="text-[#9C7D47]">100 MB Limit</span>
            </div>
            <p className="text-[11px] text-[#777064]">
              Max 10 PDFs per batch upload, 5 MB maximum individual PDF size.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2">
            <div className="flex justify-between items-center font-bold text-[#292720]">
              <span>Pro Plan</span>
              <span className="text-[#9C7D47]">1 GB Limit</span>
            </div>
            <p className="text-[11px] text-[#777064]">
              Max 100 PDFs per batch upload, 25 MB maximum individual PDF size.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-2">
            <div className="flex justify-between items-center font-bold text-[#292720]">
              <span>Elite Plan</span>
              <span className="text-[#9C7D47]">10 GB Limit</span>
            </div>
            <p className="text-[11px] text-[#777064]">
              Max 150 PDFs per batch upload, 49 MB maximum individual PDF size.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
