'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Crown,
  FileText,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  UserCheck,
  UserX,
  Receipt,
  CreditCard,
  Copy,
  Check,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import type { AdminUserDetail } from '@/lib/admin/types'
import { PaymentDetailsModal, PaymentItem } from '@/components/settings/PaymentDetailsModal'
import { formatINR } from '@/lib/subscription/plans'

export default function AdminUserDetailPage() {
  const routeParams = useParams()
  const id = typeof routeParams?.id === 'string' ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : ''
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<PaymentItem | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const handleCopy = (text: string, field: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  useEffect(() => {
    let ignore = false
    if (!id) return

    fetch(`/api/admin/users/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (ignore) return
        if (data && !data.error) {
          setUser(data)
        } else {
          setMessage({ text: data?.error || 'User not found', type: 'error' })
        }
      })
      .catch(() => {
        if (ignore) return
        setMessage({ text: 'Failed to load user details', type: 'error' })
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [id])

  const reloadData = async () => {
    if (!id) return
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      const data = await res.json()
      if (data && !data.error) {
        setUser(data)
      }
    } catch {}
  }

  const handleToggleSuspend = async () => {
    if (!user) return
    const action = user.isSuspended ? 'reactivate' : 'suspend'
    const confirmPrompt = user.isSuspended
      ? `Reactivate account for ${user.email}? The user will regain access to workspace and documents.`
      : `Suspend account for ${user.email}? The user will be barred from uploading or querying documents.`

    if (!confirm(confirmPrompt)) return

    setIsUpdatingStatus(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isSuspended: !user.isSuspended,
          reason: `Admin manual action via Control Center (${action})`,
        }),
      })
      const result = await res.json()
      if (result.success) {
        setMessage({
          text: user.isSuspended ? 'Account reactivated successfully' : 'Account suspended successfully',
          type: 'success',
        })
        await reloadData()
      } else {
        setMessage({ text: result.error || 'Failed to update account status', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Error updating account status', type: 'error' })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="h-8 w-8 text-[#9C7D47] animate-spin" />
        <p className="text-xs text-[#777064]">Loading user profile...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-12 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-[#EAB308] mx-auto" />
        <h2 className="text-base font-bold text-[#292720]">User Not Found</h2>
        <p className="text-xs text-[#777064]">This user ID does not exist in the authentication system.</p>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#9C7D47] text-xs font-bold text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to User Directory</span>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/users"
            className="h-9 w-9 rounded-xl border border-[#D8D0C2] bg-[#FFFCF5] hover:bg-[#FAF5EC] flex items-center justify-center text-[#777064] hover:text-[#292720] transition-colors"
            title="Back to directory"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">{user.fullName}</h1>
              {user.isSuspended ? (
                <span className="px-2 py-0.5 rounded-full bg-[#E07A7A]/15 text-[#991B1B] text-[10px] font-bold">
                  Suspended
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46] text-[10px] font-bold">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-[#777064] mt-0.5">{user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/admin/subscriptions?grantEmail=${encodeURIComponent(user.email)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FFFCF5] hover:bg-[#FAF5EC] border border-[#D8D0C2] text-xs font-semibold text-[#292720] transition-colors shadow-2xs"
          >
            <Crown className="h-3.5 w-3.5 text-[#9C7D47]" />
            <span>Grant Plan</span>
          </Link>

          <button
            onClick={handleToggleSuspend}
            disabled={isUpdatingStatus}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs ${
              user.isSuspended
                ? 'bg-[#10B981] hover:bg-[#059669] text-white'
                : 'bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E07A7A]/40 text-[#991B1B]'
            }`}
          >
            {isUpdatingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : user.isSuspended ? (
              <UserCheck className="h-3.5 w-3.5" />
            ) : (
              <UserX className="h-3.5 w-3.5 text-[#E07A7A]" />
            )}
            <span>{user.isSuspended ? 'Reactivate Account' : 'Suspend Account'}</span>
          </button>
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Active Plan</span>
            <Crown className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">{user.planName || 'Free Tier'}</div>
          <div className="text-[11px] text-[#777064]">
            {user.manualGrant ? `Manual Grant (${user.manualGrant.durationDays ? user.manualGrant.durationDays + 'd' : 'Lifetime'})` : 'Standard Organic Entitlement'}
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Vault Storage</span>
            <HardDrive className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">{user.storageFormatted || '0 B'}</div>
          <div className="text-[11px] text-[#777064]">
            Quota: <span className="font-bold text-[#292720]">{user.storageLimitFormatted || '100 MB'}</span>
          </div>
          {Boolean(user.additionalStorageBytes) && (
            <div className="text-[10px] font-bold text-[#10B981] pt-0.5 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 flex-shrink-0" />
              <span>+{user.additionalStorageFormatted} Add-on active ({user.includedStorageFormatted || '10 GB'} base)</span>
            </div>
          )}
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Documents Vault</span>
            <FileText className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">{user.documentsCount ?? 0} Files</div>
          <div className="text-[11px] text-[#777064]">AI Queries: {user.aiUsageCount ?? 0} used</div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Email Verification</span>
            <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">
            {user.emailConfirmed ? 'Verified' : 'Unconfirmed'}
          </div>
          <div className="text-[11px] text-[#777064]">
            Registered: {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
            <User className="h-4 w-4 text-[#9C7D47]" />
            Security & Profile Details
          </h2>

          <div className="space-y-2 text-xs divide-y divide-[#E5DED1]">
            <div className="pt-2 flex justify-between">
              <span className="text-[#777064]">User UUID:</span>
              <code className="text-[#292720] font-mono text-[11px]">{user.id}</code>
            </div>

            <div className="pt-2 flex justify-between">
              <span className="text-[#777064]">Primary Email:</span>
              <span className="font-semibold text-[#292720]">{user.email}</span>
            </div>

            <div className="pt-2 flex justify-between">
              <span className="text-[#777064]">Last Sign In:</span>
              <span className="text-[#292720]">
                {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Never logged in'}
              </span>
            </div>

            <div className="pt-2 flex justify-between">
              <span className="text-[#777064]">Biometric Vault Setup:</span>
              <span className="font-semibold text-[#292720]">
                {user.metadata?.has_mfa_configured ? 'Enabled (WebAuthn Passkey)' : 'Not Configured'}
              </span>
            </div>

            <div className="pt-2 flex justify-between">
              <span className="text-[#777064]">BYOK Gemini API Key:</span>
              <span className="font-semibold text-[#292720]">
                {user.metadata?.byok_gemini_key ? 'Connected & Verified' : 'None'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#9C7D47]" />
              Uploaded Documents ({(user.documents || []).length})
            </h2>
          </div>

          {(user.documents || []).length === 0 ? (
            <p className="text-xs text-[#777064] py-6 text-center">No documents uploaded by this user.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(user.documents || []).map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-bold text-[#292720] block truncate">
                      {doc.title || doc.file_name}
                    </span>
                    <span className="text-[10px] text-[#777064] block">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-[#D8D0C2] text-[10px] font-semibold text-[#777064] whitespace-nowrap">
                    {doc.processing_status || 'indexed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E5DED1]">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[#9C7D47]" />
            <h2 className="text-sm font-bold text-[#292720]">
              Customer Invoices & Payment Transactions ({(user.billingHistory || []).length})
            </h2>
          </div>
          {(user.billingHistory || []).length > 0 && (
            <span className="text-[11px] text-[#777064]">
              Click &quot;View Invoice&quot; to inspect full breakdown and generate PDF receipt
            </span>
          )}
        </div>

        {(user.billingHistory || []).length === 0 ? (
          <div className="p-8 text-center bg-[#FAF5EC] rounded-xl border border-dashed border-[#E5DED1]">
            <CreditCard className="h-6 w-6 text-[#777064] mx-auto mb-2 opacity-50" />
            <p className="text-xs font-semibold text-[#292720]">No billing transactions recorded</p>
            <p className="text-[11px] text-[#777064] mt-0.5">This user has not completed any paid checkout orders yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#E5DED1] text-[#777064]">
                  <th className="py-2.5 font-semibold">Date & Time</th>
                  <th className="py-2.5 font-semibold">Purchased Item</th>
                  <th className="py-2.5 font-semibold">Category</th>
                  <th className="py-2.5 font-semibold">Amount</th>
                  <th className="py-2.5 font-semibold">Payment ID</th>
                  <th className="py-2.5 font-semibold">Order ID</th>
                  <th className="py-2.5 font-semibold">Status</th>
                  <th className="py-2.5 font-semibold text-right pr-2">Tax Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DED1]/60">
                {(user.billingHistory || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#FAF5EC] transition-colors">
                    <td className="py-3 text-[#777064] whitespace-nowrap">
                      {item.date ? new Date(item.date).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : 'N/A'}
                    </td>
                    <td className="py-3 font-bold text-[#292720] whitespace-nowrap">
                      {item.packName || item.planName || (item.type === 'subscription' ? 'Plan Subscription' : 'Storage Pack')}
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5EC] border border-[#E5DED1] text-[#777064]">
                        {item.type === 'subscription' ? 'Subscription' : 'Vault Storage Add-on'}
                      </span>
                    </td>
                    <td className="py-3 font-extrabold text-[#292720] whitespace-nowrap">
                      {formatINR(Number(item.amountINR || item.priceINR) || 0)}
                    </td>
                    <td className="py-3 font-mono text-[11px] text-[#9C7D47] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span>{item.paymentId || 'N/A'}</span>
                        {item.paymentId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.paymentId || '', `pay_${idx}`)}
                            title="Copy payment ID"
                            className="p-1 hover:text-[#292720] cursor-pointer"
                          >
                            {copiedField === `pay_${idx}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-[#777064] whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <span>{item.orderId || 'N/A'}</span>
                        {item.orderId && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item.orderId || '', `ord_${idx}`)}
                            title="Copy order reference"
                            className="p-1 hover:text-[#292720] cursor-pointer"
                          >
                            {copiedField === `ord_${idx}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 opacity-60" />}
                          </button>
                        )}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                        <Check className="h-2.5 w-2.5" />
                        <span className="capitalize">{item.status || 'Paid'}</span>
                      </span>
                    </td>
                    <td className="py-3 text-right pr-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedInvoice(item)}
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

      {(user.purchasedStoragePacks || []).length > 0 && (
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E5DED1]">
            <HardDrive className="h-4 w-4 text-[#9C7D47]" />
            <h2 className="text-sm font-bold text-[#292720]">Active Vault Storage Add-on Packs</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(user.purchasedStoragePacks || []).map((pack, pIdx) => (
              <div key={pIdx} className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#292720]">{pack.packName || 'Storage Pack'}</span>
                  <span className="font-extrabold text-[#9C7D47]">{formatINR(Number(pack.priceINR) || 49)}</span>
                </div>
                <div className="text-[11px] text-[#10B981] font-semibold flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  <span>+{user.additionalStorageFormatted || '1 GB'} Quota Added to Vault</span>
                </div>
                <div className="text-[10px] text-[#777064] pt-1 border-t border-[#E5DED1]/60 flex justify-between">
                  <span>Purchased:</span>
                  <span>{pack.purchasedAt ? new Date(pack.purchasedAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedInvoice && (
        <PaymentDetailsModal
          payment={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          userEmail={user.email}
          userName={user.fullName}
        />
      )}
    </div>
  )
}
