'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  User,
  Shield,
  Crown,
  FileText,
  HardDrive,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  UserCheck,
  UserX,
  CreditCard,
  Lock,
} from 'lucide-react'
import type { AdminUserDetail } from '@/lib/admin/types'

export default function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [user, setUser] = useState<AdminUserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    fetchDetail()
  }, [id])

  const fetchDetail = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      const data = await res.json()
      if (data && !data.error) {
        setUser(data)
      } else {
        setMessage({ text: data.error || 'User not found', type: 'error' })
      }
    } catch {
      setMessage({ text: 'Failed to load user details', type: 'error' })
    } finally {
      setIsLoading(false)
    }
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
        await fetchDetail()
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
      {/* Header with Back Button */}
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

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Active Plan</span>
            <Crown className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">{user.planName}</div>
          <div className="text-[11px] text-[#777064]">
            {user.manualGrant ? `Manual Grant (${user.manualGrant.durationDays ? user.manualGrant.durationDays + 'd' : 'Lifetime'})` : 'Standard Organic Entitlement'}
          </div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Vault Storage</span>
            <HardDrive className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">{user.storageFormatted}</div>
          <div className="text-[11px] text-[#777064]">Quota: {user.storageLimitFormatted}</div>
        </div>

        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 space-y-1 shadow-2xs">
          <div className="flex items-center justify-between text-[#777064]">
            <span className="text-xs font-semibold">Documents Vault</span>
            <FileText className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="text-lg font-extrabold text-[#292720]">{user.documentsCount} Files</div>
          <div className="text-[11px] text-[#777064]">AI Queries: {user.aiUsageCount} used</div>
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
            Registered: {new Date(user.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Account Info Details Card */}
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

        {/* Uploaded Documents List */}
        <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#292720] flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#9C7D47]" />
              Uploaded PDF Documents ({user.documents.length})
            </h2>
          </div>

          {user.documents.length === 0 ? (
            <p className="text-xs text-[#777064] py-6 text-center">No documents uploaded by this user.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {user.documents.map((doc) => (
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
    </div>
  )
}
