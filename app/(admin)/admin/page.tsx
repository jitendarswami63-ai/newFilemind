import React from 'react'
import Link from 'next/link'
import { getAdminOverviewStats } from '@/lib/admin/data'
import {
  Users,
  Crown,
  FileText,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  UserCheck,
  Globe,
  Layers,
} from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminOverviewPage() {
  const stats = await getAdminOverviewStats()

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFFCF5] border border-[#E5DED1] p-6 rounded-2xl shadow-2xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#9C7D47]/15 border border-[#9C7D47]/30 text-[10px] font-bold text-[#9C7D47] uppercase tracking-wider">
            System Operational
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#292720]">
            Executive Dashboard
          </h1>
          <p className="text-xs text-[#777064]">
            Authoritative platform metrics, user directory, manual subscription access, and CMS controls.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] transition-all shadow-xs"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Manage Users</span>
          </Link>
          <Link
            href="/admin/subscriptions"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] transition-all shadow-2xs"
          >
            <Crown className="h-3.5 w-3.5 text-[#D4AF37]" />
            <span>Grant Access</span>
          </Link>
          <Link
            href="/admin/cms"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] transition-all shadow-2xs"
          >
            <Globe className="h-3.5 w-3.5 text-[#777064]" />
            <span>Edit Website</span>
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#777064] uppercase tracking-wider">
            User Statistics
          </h2>
          <Link href="/admin/users" className="text-xs font-semibold text-[#9C7D47] hover:underline inline-flex items-center gap-1">
            <span>View All Users</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-medium">Total Registered</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#292720]">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.totalUsers}
            </div>
            <div className="text-[11px] text-[#777064] flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-[#10B981]" />
              <span>+{stats.newUsersToday} today • +{stats.newUsersThisMonth} this month</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-medium">Free Tier Users</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#777064]">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.freeUsers}
            </div>
            <div className="text-[11px] text-[#777064]">
              Essential 100 MB quota accounts
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#D4AF37]/30 shadow-2xs space-y-2 bg-gradient-to-br from-[#FFFCF5] to-[#FAF5EC]">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-bold text-[#AA771C]">Pro Intelligence</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#D4AF37]/40 text-[#D4AF37]">
                <Crown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.proUsers}
            </div>
            <div className="text-[11px] text-[#777064]">
              1 GB storage • 500 AI queries
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#1C180A]/30 shadow-2xs space-y-2 bg-gradient-to-br from-[#FFFCF5] to-[#F3EFE5]">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-bold text-[#292720]">Elite Intelligence</span>
              <div className="p-2 rounded-xl bg-[#24262B] text-[#D4AF37] border border-[#3E4149]">
                <Crown className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.eliteUsers}
            </div>
            <div className="text-[11px] text-[#777064]">
              10 GB storage • Priority processing
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-xs font-bold text-[#777064] uppercase tracking-wider">
          Infrastructure & Processing Metrics
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-medium">Documents Stored</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47]">
                <FileText className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.totalDocuments}
            </div>
            <div className="text-[11px] text-[#777064]">
              Total PDFs indexed in storage
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-medium">Vault Storage Used</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47]">
                <HardDrive className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.totalStorageFormatted}
            </div>
            <div className="text-[11px] text-[#777064]">
              Consumed across all vaults
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-medium">Total AI Queries</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47]">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.totalAiQueries}
            </div>
            <div className="text-[11px] text-[#777064]">
              Ask AI synthesis & search runs
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[#777064]">
              <span className="text-xs font-medium">Processing Success</span>
              <div className="p-2 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[#10B981]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-[#292720] tracking-tight">
              {stats.successRate}%
            </div>
            <div className="text-[11px] text-[#777064] flex items-center gap-1">
              <span>{stats.processingSuccessCount} succeeded</span>
              {stats.processingFailedCount > 0 && (
                <span className="text-[#E07A7A]">• {stats.processingFailedCount} failed</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5DED1]">
            <div>
              <h3 className="font-bold text-sm text-[#292720]">Administrative Quick Actions</h3>
              <p className="text-xs text-[#777064]">Direct operations for user, subscription, and website control.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/users"
              className="p-4 rounded-xl border border-[#E5DED1] bg-[#FAF5EC]/50 hover:bg-[#FAF5EC] transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] text-[#9C7D47] group-hover:scale-105 transition-transform">
                  <Users className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-[#292720]">User Directory</span>
              </div>
              <p className="text-[11px] text-[#777064]">Search users by name, email, or UUID, inspect login histories and usage.</p>
            </Link>

            <Link
              href="/admin/subscriptions"
              className="p-4 rounded-xl border border-[#D4AF37]/30 bg-[#FAF5EC]/50 hover:bg-[#FAF5EC] transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#FFFCF5] border border-[#D4AF37]/40 text-[#D4AF37] group-hover:scale-105 transition-transform">
                  <Crown className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-[#292720]">Manual Pro & Elite Grants</span>
              </div>
              <p className="text-[11px] text-[#777064]">Assign 7d, 30d, 90d, 365d, or Lifetime access without charging Razorpay.</p>
            </Link>

            <Link
              href="/admin/cms"
              className="p-4 rounded-xl border border-[#E5DED1] bg-[#FAF5EC]/50 hover:bg-[#FAF5EC] transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] text-[#9C7D47] group-hover:scale-105 transition-transform">
                  <Globe className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-[#292720]">Website CMS Editor</span>
              </div>
              <p className="text-[11px] text-[#777064]">Edit hero copy, features, pricing card copy, and site announcements live.</p>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="p-4 rounded-xl border border-[#E5DED1] bg-[#FAF5EC]/50 hover:bg-[#FAF5EC] transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] text-[#777064] group-hover:scale-105 transition-transform">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="font-bold text-xs text-[#292720]">Audit Action Log</span>
              </div>
              <p className="text-[11px] text-[#777064]">Review immutable records of all manual grants, revocations, and edits.</p>
            </Link>
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xs space-y-4">
          <div className="pb-3 border-b border-[#E5DED1]">
            <h3 className="font-bold text-sm text-[#292720]">Security & Authorizer</h3>
            <p className="text-xs text-[#777064]">Active authorization source.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#777064]">Authority Source</span>
              <p className="font-semibold text-[#292720]">Vercel <code className="text-[#9C7D47]">ADMIN_EMAILS</code></p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#777064]">Access Policy</span>
              <p className="text-[11px] text-[#777064]">Exact email match required with verified Supabase Auth credentials.</p>
            </div>

            <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
              <span className="text-[10px] uppercase font-bold text-[#777064]">Revenue Isolation</span>
              <p className="text-[11px] text-[#777064]">Manual grants are strictly isolated from verified Razorpay transaction revenue.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
