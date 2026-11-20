'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Crown,
  Plus,
  Shield,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Loader2,
  User,
  Trash2,
  Receipt,
  CreditCard,
  Search,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
  HardDrive,
} from 'lucide-react'
import type { AdminPaymentTransaction } from '@/lib/admin/types'
import { PaymentDetailsModal } from '@/components/settings/PaymentDetailsModal'
import { formatINR } from '@/lib/subscription/plans'

interface GrantRecord {
  id: string
  user_id: string
  user_email: string
  granted_by_email: string
  tier: 'pro' | 'elite'
  duration_days: number | null
  starts_at: string
  expires_at: string | null
  reason: string
  status: 'active' | 'revoked' | 'expired'
  created_at: string
}

export default function AdminSubscriptionsPage() {
  const searchParams = useSearchParams()
  const prefillEmail = searchParams.get('grantEmail') || ''

  const [activeTab, setActiveTab] = useState<'payments' | 'grants'>('payments')
  const [grants, setGrants] = useState<GrantRecord[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showGrantModal, setShowGrantModal] = useState(Boolean(prefillEmail))

  const [payments, setPayments] = useState<AdminPaymentTransaction[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const [targetEmail, setTargetEmail] = useState(prefillEmail)
  const [tier, setTier] = useState<'pro' | 'elite'>('pro')
  const [durationDays, setDurationDays] = useState<string>('30')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchGrants()
    fetchPayments()
  }, [])

  const fetchGrants = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions')
      const data = await res.json()
      if (data && !data.error) {
        setGrants(data.grants || [])
        setTotal(data.total || 0)
      }
    } catch {
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPayments = async () => {
    setLoadingPayments(true)
    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()
      if (data?.success && Array.isArray(data?.payments)) {
        setPayments(data.payments)
      }
    } catch {
    } finally {
      setLoadingPayments(false)
    }
  }

  const handleCopy = (text: string, field: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleGrantSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetEmail.trim()) {
      setMessage({ text: 'Please enter target user email', type: 'error' })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const days = durationDays === 'lifetime' ? null : parseInt(durationDays, 10)
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEmail: targetEmail.trim(),
          tier,
          durationDays: days,
          reason: reason.trim() || 'Manual administrative access grant',
        }),
      })

      const result = await res.json()
      if (result.success) {
        setMessage({ text: result.message, type: 'success' })
        setShowGrantModal(false)
        setTargetEmail('')
        setReason('')
        await fetchGrants()
      } else {
        setMessage({ text: result.error || 'Failed to grant subscription', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Error submitting grant', type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async (grant: GrantRecord) => {
    if (!confirm(`Revoke ${grant.tier.toUpperCase()} access for ${grant.user_email}?`)) {
      return
    }

    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: grant.user_id,
          targetUserEmail: grant.user_email,
          grantId: grant.id,
          reason: 'Revoked by admin via subscriptions manager',
        }),
      })

      const result = await res.json()
      if (result.success) {
        setMessage({ text: 'Access revoked successfully', type: 'success' })
        await fetchGrants()
      } else {
        setMessage({ text: result.error || 'Failed to revoke access', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Error revoking access', type: 'error' })
    }
  }

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments
    const q = searchQuery.toLowerCase().trim()
    return payments.filter((p) =>
      p.userEmail.toLowerCase().includes(q) ||
      p.userName.toLowerCase().includes(q) ||
      (p.paymentId && p.paymentId.toLowerCase().includes(q)) ||
      (p.orderId && p.orderId.toLowerCase().includes(q)) ||
      (p.packName && p.packName.toLowerCase().includes(q)) ||
      (p.planName && p.planName.toLowerCase().includes(q))
    )
  }, [payments, searchQuery])

  const totalRevenue = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amountINR) || 0), 0)
  }, [payments])

  const storagePackCount = useMemo(() => {
    return payments.filter((p) => p.type === 'storage_pack' || p.packId).length
  }, [payments])

  const subscriptionCount = useMemo(() => {
    return payments.filter((p) => p.type === 'subscription' || p.planTier).length
  }, [payments])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">
              Subscriptions, Invoices & Access Grants
            </h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Track user payments, view official payment receipts, and manage VIP customer entitlements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrantModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-[#FFFCF5] shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Grant Plan Access</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-[#E5DED1] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('payments')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'payments'
              ? 'bg-[#9C7D47] text-[#FFFCF5] shadow-xs'
              : 'bg-[#FAF5EC] text-[#777064] hover:text-[#292720] hover:bg-[#F3EFE5]'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Customer Payments & Invoices</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {payments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('grants')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'grants'
              ? 'bg-[#9C7D47] text-[#FFFCF5] shadow-xs'
              : 'bg-[#FAF5EC] text-[#777064] hover:text-[#292720] hover:bg-[#F3EFE5]'
          }`}
        >
          <Crown className="h-4 w-4" />
          <span>Manual VIP Access Grants</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
            {grants.length}
          </span>
        </button>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-[#10B981]/10 text-[#065F46] border border-[#10B981]/30'
              : 'bg-[#E07A7A]/15 text-[#991B1B] border border-[#E07A7A]/30'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="opacity-60 hover:opacity-100 font-bold">
            ✕
          </button>
        </div>
      )}

      {showGrantModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5DED1]">
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-[#9C7D47]" />
                <h2 className="text-sm font-bold text-[#292720]">Grant Pro / Elite Plan Access</h2>
              </div>
              <button
                onClick={() => setShowGrantModal(false)}
                className="text-xs text-[#777064] hover:text-[#292720] font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#777064]">User Email Address</label>
                <input
                  type="email"
                  required
                  value={targetEmail}
                  onChange={(e) => setTargetEmail(e.target.value)}
                  placeholder="e.g. user@example.com"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-[#777064]">Subscription Tier</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as any)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  >
                    <option value="pro">Pro Intelligence (₹249)</option>
                    <option value="elite">Elite Intelligence (₹499)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#777064]">Access Duration</label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                  >
                    <option value="7">7 Days (Trial)</option>
                    <option value="30">30 Days (1 Month)</option>
                    <option value="90">90 Days (Quarter)</option>
                    <option value="365">365 Days (1 Year)</option>
                    <option value="lifetime">Lifetime (No Expiry)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#777064]">Reason / Note</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. VIP partner, academic grant, beta tester"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#777064]">
                <p>
                  <strong>Note:</strong> This assigns plan entitlements directly without touching Razorpay or generating fake billing invoices.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8D0C2] bg-white hover:bg-[#FAF5EC] text-xs font-semibold text-[#777064] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-white shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Granting...' : 'Confirm Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'payments' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[#777064]">
                <span className="text-xs font-semibold">Total Revenue</span>
                <CreditCard className="h-4 w-4 text-[#9C7D47]" />
              </div>
              <div className="text-xl font-extrabold text-[#292720]">{formatINR(totalRevenue)}</div>
              <div className="text-[11px] text-[#777064]">Gross lifetime checkout orders</div>
            </div>

            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[#777064]">
                <span className="text-xs font-semibold">Total Transactions</span>
                <Receipt className="h-4 w-4 text-[#9C7D47]" />
              </div>
              <div className="text-xl font-extrabold text-[#292720]">{payments.length}</div>
              <div className="text-[11px] text-[#777064]">Verified completed payments</div>
            </div>

            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[#777064]">
                <span className="text-xs font-semibold">Storage Add-ons</span>
                <HardDrive className="h-4 w-4 text-[#9C7D47]" />
              </div>
              <div className="text-xl font-extrabold text-[#292720]">{storagePackCount}</div>
              <div className="text-[11px] text-[#777064]">Vault expansion packs sold</div>
            </div>

            <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-[#777064]">
                <span className="text-xs font-semibold">Subscriptions</span>
                <Crown className="h-4 w-4 text-[#9C7D47]" />
              </div>
              <div className="text-xl font-extrabold text-[#292720]">{subscriptionCount}</div>
              <div className="text-[11px] text-[#777064]">Paid recurring plan activations</div>
            </div>
          </div>

          <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E5DED1] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-[#9C7D47]" />
                <span className="text-xs font-bold text-[#292720]">
                  All Customer Invoices & Completed Payments ({filteredPayments.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#777064]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email, payment ID, item..."
                    className="text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none w-56 sm:w-64"
                  />
                </div>
                <button
                  onClick={fetchPayments}
                  className="text-[11px] font-semibold text-[#9C7D47] hover:underline cursor-pointer"
                >
                  Refresh
                </button>
              </div>
            </div>

            {loadingPayments ? (
              <div className="p-12 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-6 w-6 text-[#9C7D47] animate-spin" />
                <p className="text-xs text-[#777064]">Loading payments & invoices...</p>
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Receipt className="h-8 w-8 text-[#A8A49B] mx-auto" />
                <p className="text-xs font-bold text-[#292720]">No payments found</p>
                <p className="text-xs text-[#777064]">
                  {searchQuery ? 'Try clearing your search query.' : 'No customer purchases recorded yet.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF5EC] border-b border-[#E5DED1] text-[#777064] font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Purchased Item</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Payment ID</th>
                      <th className="py-3 px-4">Order ID</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5DED1]">
                    {filteredPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-[#FAF5EC]/40 transition-colors">
                        <td className="py-3 px-4 text-[#777064] whitespace-nowrap">
                          {p.date ? new Date(p.date).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : 'N/A'}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <Link
                            href={`/admin/users/${p.userId}`}
                            className="font-bold text-[#292720] hover:text-[#9C7D47] hover:underline block"
                          >
                            {p.userName}
                          </Link>
                          <span className="text-[11px] text-[#777064] block">{p.userEmail}</span>
                        </td>

                        <td className="py-3 px-4 font-bold text-[#292720] whitespace-nowrap">
                          {p.packName || p.planName || (p.type === 'subscription' ? 'Plan Subscription' : 'Storage Pack')}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5EC] border border-[#E5DED1] text-[#777064]">
                            {p.type === 'subscription' ? 'Subscription' : 'Vault Storage'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-extrabold text-[#292720] whitespace-nowrap">
                          {formatINR(Number(p.amountINR) || 0)}
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-[#9C7D47] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span>{p.paymentId || 'N/A'}</span>
                            {p.paymentId && (
                              <button
                                type="button"
                                onClick={() => handleCopy(p.paymentId || '', `p_${idx}`)}
                                title="Copy Payment ID"
                                className="p-1 hover:text-[#292720] cursor-pointer"
                              >
                                {copiedField === `p_${idx}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
                              </button>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-[11px] text-[#777064] whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <span>{p.orderId || 'N/A'}</span>
                            {p.orderId && (
                              <button
                                type="button"
                                onClick={() => handleCopy(p.orderId || '', `o_${idx}`)}
                                title="Copy Order ID"
                                className="p-1 hover:text-[#292720] cursor-pointer"
                              >
                                {copiedField === `o_${idx}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
                              </button>
                            )}
                          </span>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46] text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                            <span className="capitalize">{p.status || 'Paid'}</span>
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedInvoice(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-2xs transition-colors cursor-pointer"
                          >
                            <Receipt className="h-3 w-3" />
                            <span>View Invoice</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-[#E5DED1] flex items-center justify-between">
            <span className="text-xs font-bold text-[#292720]">Active & Historic Access Grants ({total})</span>
            <button
              onClick={fetchGrants}
              className="text-[11px] font-semibold text-[#9C7D47] hover:underline cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 text-[#9C7D47] animate-spin" />
              <p className="text-xs text-[#777064]">Loading subscription grants...</p>
            </div>
          ) : grants.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Crown className="h-8 w-8 text-[#A8A49B] mx-auto" />
              <p className="text-xs font-bold text-[#292720]">No manual grants recorded</p>
              <p className="text-xs text-[#777064]">Click &ldquo;Grant Plan Access&rdquo; to manually upgrade a user.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF5EC] border-b border-[#E5DED1] text-[#777064] font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Target User</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Duration / Expiry</th>
                    <th className="py-3 px-4">Reason</th>
                    <th className="py-3 px-4">Granted By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5DED1]">
                  {grants.map((g) => (
                    <tr key={g.id} className="hover:bg-[#FAF5EC]/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-[#292720]">{g.user_email}</td>

                      <td className="py-3 px-4">
                        {g.tier === 'elite' ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#1B1D21] text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-bold">
                            Elite
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-[#9C7D47]/15 text-[#9C7D47] border border-[#9C7D47]/30 text-[10px] font-bold">
                            Pro
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#777064]">
                        {g.expires_at ? new Date(g.expires_at).toLocaleDateString() : 'Lifetime'}
                      </td>

                      <td className="py-3 px-4 text-[#777064]">{g.reason || 'Manual grant'}</td>

                      <td className="py-3 px-4 text-[#777064]">{g.granted_by_email}</td>

                      <td className="py-3 px-4">
                        {g.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46] text-[10px] font-bold">
                            <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E07A7A]/15 text-[#991B1B] text-[10px] font-bold">
                            <XCircle className="h-3 w-3 text-[#E07A7A]" />
                            {g.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {g.status === 'active' && (
                          <button
                            onClick={() => handleRevoke(g)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E07A7A]/40 bg-white hover:bg-[#FAF5EC] text-[11px] font-semibold text-[#991B1B] transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3 text-[#E07A7A]" />
                            <span>Revoke</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedInvoice && (
        <PaymentDetailsModal
          payment={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          userEmail={selectedInvoice.userEmail}
          userName={selectedInvoice.userName}
        />
      )}
    </div>
  )
}
