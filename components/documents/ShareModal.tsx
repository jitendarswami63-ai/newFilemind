'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Globe,
  Users,
  Copy,
  Check,
  Download,
  Clock,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DocumentShare } from '@/lib/sharing/share-service'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  filename: string
}

export function ShareModal({ isOpen, onClose, documentId, filename }: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'public' | 'restricted'>('public')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Public share state
  const [publicShare, setPublicShare] = useState<DocumentShare | null>(null)
  const [publicShareUrl, setPublicShareUrl] = useState<string | null>(null)
  const [publicAllowDownload, setPublicAllowDownload] = useState(true)
  const [publicExpiryHours, setPublicExpiryHours] = useState<number | null>(null)
  const [creatingPublic, setCreatingPublic] = useState(false)
  const [copied, setCopied] = useState(false)

  // Restricted share state
  const [restrictedShares, setRestrictedShares] = useState<DocumentShare[]>([])
  const [recipientEmail, setRecipientEmail] = useState('')
  const [restrictedAllowDownload, setRestrictedAllowDownload] = useState(true)
  const [restrictedExpiryHours, setRestrictedExpiryHours] = useState<number | null>(null)
  const [addingRecipient, setAddingRecipient] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    async function loadShares() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/documents/${documentId}/shares`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load document shares')
        }

        setPublicShare(data.publicShare)
        setRestrictedShares(data.restrictedShares || [])

        if (data.publicShare) {
          setPublicAllowDownload(Boolean(data.publicShare.allow_download))
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading shares')
      } finally {
        setLoading(false)
      }
    }

    loadShares()
  }, [isOpen, documentId])

  if (!isOpen) return null

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }

  const handleCreatePublicShare = async () => {
    setCreatingPublic(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'public',
          allowDownload: publicAllowDownload,
          expiresInHours: publicExpiryHours,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate public share link')
      }

      setPublicShare(data.share)
      setPublicShareUrl(data.shareUrl)
      showSuccess('Public link generated successfully!')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate link')
    } finally {
      setCreatingPublic(false)
    }
  }

  const handleRevokePublicShare = async () => {
    if (!publicShare) return
    if (!window.confirm('Are you sure you want to revoke this public link? Anyone with the link will immediately lose access.')) {
      return
    }

    setCreatingPublic(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/shares?shareId=${publicShare.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke public share')
      }

      setPublicShare(null)
      setPublicShareUrl(null)
      showSuccess('Public share link revoked.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke link')
    } finally {
      setCreatingPublic(false)
    }
  }

  const handleAddRecipient = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = recipientEmail.trim()
    if (!email) return

    setAddingRecipient(true)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'restricted',
          recipientEmail: email,
          allowDownload: restrictedAllowDownload,
          expiresInHours: restrictedExpiryHours,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to share with user')
      }

      setRestrictedShares((prev) => [data.share, ...prev.filter((s) => s.recipient_email !== email)])
      setRecipientEmail('')
      showSuccess(`Shared with ${email} successfully!`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to share with recipient')
    } finally {
      setAddingRecipient(false)
    }
  }

  const handleRevokeRecipient = async (shareId: string, email: string | null) => {
    if (!window.confirm(`Revoke access for ${email || 'this user'}?`)) {
      return
    }

    setRevokingId(shareId)
    setError(null)
    try {
      const res = await fetch(`/api/documents/${documentId}/shares?shareId=${shareId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to revoke recipient access')
      }

      setRestrictedShares((prev) => prev.filter((s) => s.id !== shareId))
      showSuccess('Access revoked successfully.')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to revoke access')
    } finally {
      setRevokingId(null)
    }
  }

  const handleCopyLink = () => {
    if (!publicShareUrl) return
    navigator.clipboard.writeText(publicShareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    showSuccess('Link copied to clipboard!')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E5DED1] flex items-center justify-between bg-[#FAF5EC]/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4 text-[#9C7D47]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-[#292720] truncate" title={filename}>
                Share &ldquo;{filename}&rdquo;
              </h2>
              <p className="text-[11px] text-[#777064]">Configure access permissions & links</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#E5DED1]/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-[#E5DED1] px-5 bg-[#FAF5EC]/30">
          <button
            onClick={() => setActiveTab('public')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all mr-6 ${
              activeTab === 'public'
                ? 'border-[#9C7D47] text-[#9C7D47]'
                : 'border-transparent text-[#777064] hover:text-[#292720]'
            }`}
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Anyone with the link</span>
            {publicShare && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="Active link" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('restricted')}
            className={`flex items-center gap-2 py-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'restricted'
                ? 'border-[#9C7D47] text-[#9C7D47]'
                : 'border-transparent text-[#777064] hover:text-[#292720]'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Restricted users</span>
            {restrictedShares.length > 0 && (
              <span className="text-[10px] bg-[#FAF5EC] text-[#9C7D47] px-1.5 py-0.2 rounded-full border border-[#E5DED1]">
                {restrictedShares.length}
              </span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#B91C1C] text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#777064]">
              <Loader2 className="h-6 w-6 animate-spin text-[#9C7D47] mb-2" />
              <span className="text-xs">Loading sharing settings...</span>
            </div>
          ) : activeTab === 'public' ? (
            /* TAB 1: ANYONE WITH THE LINK */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs text-[#777064] leading-relaxed">
                Anyone with this link can view this document without signing in. The original PDF remains securely protected in private storage.
              </div>

              {publicShare ? (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Public Link is Active
                    </span>
                    <button
                      onClick={handleRevokePublicShare}
                      disabled={creatingPublic}
                      className="text-[#B91C1C] hover:underline font-medium text-xs cursor-pointer"
                    >
                      Revoke Link
                    </button>
                  </div>

                  {publicShareUrl ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={publicShareUrl}
                        className="flex-1 bg-white border border-[#E5DED1] rounded-xl px-3 py-2 text-xs text-[#292720] font-mono select-all focus:outline-none focus:ring-1 focus:ring-[#9C7D47]"
                      />
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleCopyLink}
                        className="gap-1.5 rounded-xl flex-shrink-0 h-9"
                      >
                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={handleCreatePublicShare}
                      disabled={creatingPublic}
                      className="w-full gap-2 rounded-xl"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Refresh / Reveal Public Link</span>
                    </Button>
                  )}

                  <div className="pt-2 border-t border-[#E5DED1] space-y-2 text-xs text-[#777064]">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Download className="h-3.5 w-3.5 text-[#9C7D47]" />
                        <span>Allow viewers to download PDF</span>
                      </span>
                      <span className="font-semibold text-[#292720]">
                        {publicShare.allow_download ? 'Enabled' : 'Disabled (View-Only)'}
                      </span>
                    </div>

                    {publicShare.expires_at && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-[#9C7D47]" />
                          <span>Expires:</span>
                        </span>
                        <span>{new Date(publicShare.expires_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-xs text-[#292720] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={publicAllowDownload}
                        onChange={(e) => setPublicAllowDownload(e.target.checked)}
                        className="rounded border-[#E5DED1] text-[#9C7D47] focus:ring-[#9C7D47]"
                      />
                      <span>Allow recipients to download the original PDF</span>
                    </label>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#292720] flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#9C7D47]" />
                        <span>Link Expiration</span>
                      </label>
                      <select
                        value={publicExpiryHours ?? ''}
                        onChange={(e) =>
                          setPublicExpiryHours(e.target.value ? parseInt(e.target.value, 10) : null)
                        }
                        className="w-full bg-white border border-[#E5DED1] rounded-xl px-3 py-2 text-xs text-[#292720] focus:outline-none focus:ring-1 focus:ring-[#9C7D47]"
                      >
                        <option value="">Never expire</option>
                        <option value="1">1 Hour</option>
                        <option value="24">24 Hours</option>
                        <option value="168">7 Days</option>
                        <option value="720">30 Days</option>
                      </select>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCreatePublicShare}
                    disabled={creatingPublic}
                    className="w-full gap-2 rounded-xl h-10 shadow-sm"
                  >
                    {creatingPublic ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Globe className="h-4 w-4" />
                    )}
                    <span>Generate Public Share Link</span>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: RESTRICTED USERS */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs text-[#777064] leading-relaxed">
                Only specific registered FileMind accounts with matching email addresses can access this document. Authentication is enforced on every access request.
              </div>

              {/* Add recipient form */}
              <form onSubmit={handleAddRecipient} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="recipient@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    required
                    className="flex-1 bg-white border border-[#E5DED1] rounded-xl px-3 py-2 text-xs text-[#292720] focus:outline-none focus:ring-1 focus:ring-[#9C7D47]"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    disabled={addingRecipient || !recipientEmail.trim()}
                    className="gap-1.5 rounded-xl h-9 flex-shrink-0"
                  >
                    {addingRecipient ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <UserPlus className="h-3.5 w-3.5" />
                    )}
                    <span>Invite</span>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[#292720]">
                    <input
                      type="checkbox"
                      checked={restrictedAllowDownload}
                      onChange={(e) => setRestrictedAllowDownload(e.target.checked)}
                      className="rounded border-[#E5DED1] text-[#9C7D47] focus:ring-[#9C7D47]"
                    />
                    <span>Allow downloads</span>
                  </label>

                  <select
                    value={restrictedExpiryHours ?? ''}
                    onChange={(e) =>
                      setRestrictedExpiryHours(e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                    className="bg-white border border-[#E5DED1] rounded-lg px-2 py-1 text-[11px] text-[#777064] focus:outline-none"
                  >
                    <option value="">Never expire</option>
                    <option value="24">24 Hours</option>
                    <option value="168">7 Days</option>
                    <option value="720">30 Days</option>
                  </select>
                </div>
              </form>

              {/* Invited recipients list */}
              <div className="pt-2 border-t border-[#E5DED1]">
                <h4 className="text-xs font-semibold text-[#292720] mb-2">
                  Authorized Users ({restrictedShares.length})
                </h4>

                {restrictedShares.length === 0 ? (
                  <p className="text-xs text-[#777064] py-3 text-center italic">
                    No users have been granted restricted access yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {restrictedShares.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-[#E5DED1] text-xs"
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="font-semibold text-[#292720] truncate">
                            {share.recipient_email}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-[#777064] mt-0.5">
                            <span>{share.allow_download ? 'Can download' : 'View-only'}</span>
                            {share.expires_at && (
                              <>
                                <span>•</span>
                                <span>Expires {new Date(share.expires_at).toLocaleDateString()}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeRecipient(share.id, share.recipient_email)}
                          disabled={revokingId === share.id}
                          className="p-1 rounded text-[#777064] hover:text-[#B91C1C] hover:bg-[#FDF2F2] transition-colors"
                          title="Revoke access"
                        >
                          {revokingId === share.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#B91C1C]" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E5DED1] bg-[#FAF5EC]/30 flex items-center justify-between text-xs text-[#777064]">
          <span className="flex items-center gap-1.5 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#9C7D47]" />
            <span>Server-side authorization enforced</span>
          </span>
          <Button variant="secondary" size="sm" onClick={onClose} className="rounded-xl">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
