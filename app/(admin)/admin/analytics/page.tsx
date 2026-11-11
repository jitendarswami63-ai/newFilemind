import React from 'react'
import {
  TrendingUp,
  Users,
  CreditCard,
  Crown,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  FileCheck,
} from 'lucide-react'
import { getAdminOverviewStats } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const stats = await getAdminOverviewStats()

  const proEstMonthly = stats.proUsers * 249
  const eliteEstMonthly = stats.eliteUsers * 499
  const mrrEst = proEstMonthly + eliteEstMonthly

  const freePercentage = stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 100
  const proPercentage = stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0
  const elitePercentage = stats.totalUsers > 0 ? Math.round((stats.eliteUsers / stats.totalUsers) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">Analytics & Platform Growth</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Real-time subscriber metrics, plan distribution, estimated MRR, and AI query consumption.
          </p>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Total Registered Users</span>
            <Users className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.totalUsers}</div>
          <div className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3" />
            <span>+{stats.newUsersToday} today &bull; +{stats.newUsersThisMonth} this month</span>
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Estimated Monthly Run-Rate</span>
            <CreditCard className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">₹{mrrEst.toLocaleString()}</div>
          <div className="text-[11px] text-[#777064]">
            Based on active {stats.proUsers} Pro + {stats.eliteUsers} Elite
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">AI Queries Processed</span>
            <Sparkles className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.totalAiQueries}</div>
          <div className="text-[11px] text-[#777064]">Semantic search & grounded Q&A</div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Processing Reliability</span>
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.successRate}%</div>
          <div className="text-[11px] text-[#777064]">{stats.totalDocuments} total documents ingested</div>
        </div>
      </div>

      {/* Plan Distribution Breakdown */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xs space-y-5">
        <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
          <Crown className="h-4 w-4 text-[#9C7D47]" />
          Subscriber Tier Breakdown
        </h2>

        {/* Progress Bar */}
        <div className="h-4 w-full bg-[#FAF5EC] rounded-full overflow-hidden flex border border-[#E5DED1]">
          <div
            style={{ width: `${freePercentage}%` }}
            className="bg-[#D8D0C2] transition-all"
            title={`Free: ${stats.freeUsers} (${freePercentage}%)`}
          />
          <div
            style={{ width: `${proPercentage}%` }}
            className="bg-[#9C7D47] transition-all"
            title={`Pro: ${stats.proUsers} (${proPercentage}%)`}
          />
          <div
            style={{ width: `${elitePercentage}%` }}
            className="bg-[#1B1D21] transition-all"
            title={`Elite: ${stats.eliteUsers} (${elitePercentage}%)`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#777064]">
              <span>Free Tier Users</span>
              <span>{freePercentage}%</span>
            </div>
            <div className="text-xl font-extrabold text-[#292720]">{stats.freeUsers} Users</div>
            <div className="text-[11px] text-[#777064]">₹0 / month</div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#9C7D47]">
              <span>Pro Intelligence</span>
              <span>{proPercentage}%</span>
            </div>
            <div className="text-xl font-extrabold text-[#292720]">{stats.proUsers} Users</div>
            <div className="text-[11px] text-[#777064]">₹{proEstMonthly.toLocaleString()} / month</div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#1B1D21]">
              <span>Elite Intelligence</span>
              <span>{elitePercentage}%</span>
            </div>
            <div className="text-xl font-extrabold text-[#292720]">{stats.eliteUsers} Users</div>
            <div className="text-[11px] text-[#777064]">₹{eliteEstMonthly.toLocaleString()} / month</div>
          </div>
        </div>
      </div>
    </div>
  )
}
