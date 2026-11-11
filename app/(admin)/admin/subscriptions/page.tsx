'use client'

import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
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
} from 'lucide-react'

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

  const [grants, setGrants] = useState<GrantRecord[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [showGrantModal, setShowGrantModal] = useState(Boolean(prefillEmail))

  // Form State
  const [targetEmail, setTargetEmail] = useState(prefillEmail)
  const [tier, setTier] = useState<'pro' | 'elite'>('pro')
  const [durationDays, setDurationDays] = useState<string>('30')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchGrants()
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
      // Handled silently
    } finally {
      setIsLoading(false)
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">
              Manual Subscription Management
            </h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Grant or revoke Pro & Elite tiers for VIP users, partners, and internal testers without billing.
          </p>
        </div>

        <button
          onClick={() => setShowGrantModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-[#FFFCF5] shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>Grant Plan Access</span>
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

      {/* Grant Modal */}
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
                className="text-xs text-[#777064] hover:text-[#292720] font-bold"
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

              <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#777064] space-y-1">
                <p>
                  <strong>Note:</strong> This assigns plan entitlements directly without touching Razorpay or generating fake billing invoices.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#D8D0C2] bg-white hover:bg-[#FAF5EC] text-xs font-semibold text-[#777064]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-white shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Granting...' : 'Confirm Grant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grants Table */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#E5DED1] flex items-center justify-between">
          <span className="text-xs font-bold text-[#292720]">Active & Historic Access Grants ({total})</span>
          <button
            onClick={fetchGrants}
            className="text-[11px] font-semibold text-[#9C7D47] hover:underline"
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
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E07A7A]/40 bg-white hover:bg-[#FAF5EC] text-[11px] font-semibold text-[#991B1B] transition-colors"
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
    </div>
  )
}
