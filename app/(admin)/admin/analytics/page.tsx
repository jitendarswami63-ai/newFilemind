import React from 'react'
import {
  TrendingUp,
  Users,
  CreditCard,
  Crown,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Gift,
  Coins,
  HardDrive,
} from 'lucide-react'
import { getAdminOverviewStats } from '@/lib/admin/data'

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  const stats = await getAdminOverviewStats()

  const freePercentage = stats.totalUsers > 0 ? Math.round((stats.freeUsers / stats.totalUsers) * 100) : 100
  const proPercentage = stats.totalUsers > 0 ? Math.round((stats.proUsers / stats.totalUsers) * 100) : 0
  const elitePercentage = stats.totalUsers > 0 ? Math.round((stats.eliteUsers / stats.totalUsers) * 100) : 0

  const paidProMonthly = stats.paidProUsers * 249
  const paidEliteMonthly = stats.paidEliteUsers * 499

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">Analytics & Platform Growth</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Real-time subscriber metrics, verified revenue, manual complimentary grants, and processing reliability.
          </p>
        </div>
      </div>

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
            <span className="text-xs font-semibold">Verified Monthly Run-Rate</span>
            <CreditCard className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">₹{stats.paidMrr.toLocaleString()}</div>
          <div className="text-[11px] text-[#777064]">
            From {stats.totalPaidSubscribers} paid subscriber &bull; {stats.totalManualGrants} manual grants
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">AI Queries Processed</span>
            <Sparkles className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.totalAiQueries}</div>
          <div className="text-[11px] text-[#777064]">
            {stats.aiMessagesCount} total chat messages &bull; {stats.aiConversationsCount} sessions
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Processing Reliability</span>
            <ShieldCheck className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-black text-[#292720]">{stats.successRate}%</div>
          <div className="text-[11px] text-[#777064]">
            {stats.realSuccessCount} of {stats.realDocumentsCount} production documents succeeded
          </div>
        </div>
      </div>

      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
            <Coins className="h-4 w-4 text-[#9C7D47]" />
            Revenue & Administrative Access Summary
          </h2>
          <p className="text-xs text-[#777064] mt-0.5">
            Clear separation between active paid subscribers, administrative free grants, and marketplace add-on purchases.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <span className="text-[11px] font-bold text-[#777064] uppercase tracking-wider">Paid Subscription MRR</span>
            <div className="text-xl font-extrabold text-[#292720]">₹{stats.paidMrr.toLocaleString()} <span className="text-xs font-normal text-[#777064]">/ mo</span></div>
            <p className="text-[11px] text-[#777064]">From {stats.totalPaidSubscribers} recurring paying user</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <span className="text-[11px] font-bold text-[#9C7D47] uppercase tracking-wider flex items-center gap-1">
              <Gift className="h-3 w-3" />
              Complimentary Free Grants
            </span>
            <div className="text-xl font-extrabold text-[#292720]">{stats.totalManualGrants} Users</div>
            <p className="text-[11px] text-[#777064]">₹{stats.waivedMonthlyValue.toLocaleString()} / mo value granted free</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <span className="text-[11px] font-bold text-[#777064] uppercase tracking-wider flex items-center gap-1">
              <HardDrive className="h-3 w-3" />
              Storage Pack Sales
            </span>
            <div className="text-xl font-extrabold text-[#292720]">₹{stats.oneTimePacksRevenue.toLocaleString()}</div>
            <p className="text-[11px] text-[#777064]">Extra capacity marketplace add-ons</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <span className="text-[11px] font-bold text-[#10B981] uppercase tracking-wider">Total Verified Revenue</span>
            <div className="text-xl font-extrabold text-[#292720]">₹{stats.totalRealRevenue.toLocaleString()}</div>
            <p className="text-[11px] text-[#777064]">All verified Razorpay orders to date</p>
          </div>
        </div>
      </div>

      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-6 shadow-2xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
            <Crown className="h-4 w-4 text-[#9C7D47]" />
            Subscriber Tier Breakdown
          </h2>
          <p className="text-xs text-[#777064] mt-0.5">
            Audited account distribution distinguishing standard free tier, paying subscribers, and administrative manual grants.
          </p>
        </div>

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
            <div className="text-[11px] font-semibold text-[#10B981]">₹0 / month</div>
            <div className="text-[11px] text-[#777064]">Standard 100 MB free quota accounts</div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#9C7D47]">
              <span>Pro Intelligence</span>
              <span>{proPercentage}%</span>
            </div>
            <div className="text-xl font-extrabold text-[#292720]">{stats.proUsers} Users</div>
            <div className="text-[11px] font-semibold text-[#292720]">
              ₹{paidProMonthly.toLocaleString()} / month paid
            </div>
            <div className="text-[11px] text-[#777064]">
              {stats.manualProUsers} Manual Grant (Free) &bull; {stats.paidProUsers} Paid Subscriber
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-[#1B1D21]">
              <span>Elite Intelligence</span>
              <span>{elitePercentage}%</span>
            </div>
            <div className="text-xl font-extrabold text-[#292720]">{stats.eliteUsers} Users</div>
            <div className="text-[11px] font-semibold text-[#292720]">
              ₹{paidEliteMonthly.toLocaleString()} / month paid
            </div>
            <div className="text-[11px] text-[#777064]">
              {stats.manualEliteUsers} Manual Grants (Free) &bull; {stats.paidEliteUsers} Paid Subscriber
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
