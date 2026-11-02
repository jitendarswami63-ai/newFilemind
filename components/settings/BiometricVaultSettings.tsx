'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Fingerprint,
  ShieldCheck,
  ShieldAlert,
  Laptop,
  Trash2,
  Plus,
  Loader2,
  Lock,
  AlertCircle,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BiometricEnrollmentModal } from '@/components/auth/BiometricEnrollmentModal'
import { platformAuthenticatorIsAvailable, browserSupportsWebAuthn } from '@simplewebauthn/browser'

interface BiometricCredentialItem {
  id: string
  credential_id: string
  device_name: string
  authenticator_type: string
  aaguid: string
  created_at: string
  last_used_at: string | null
}

export function BiometricVaultSettings() {
  const [credentials, setCredentials] = useState<BiometricCredentialItem[]>([])
  const [loading, setLoading] = useState(true)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [relocking, setRelocking] = useState(false)
  const [relockSuccess, setRelockSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadCredentials = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/webauthn/credentials')
      if (res.ok) {
        const data = await res.json()
        setCredentials(data.credentials || [])
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isCancelled = false

    const init = async () => {
      try {
        const hasWebAuthn = browserSupportsWebAuthn()
        const hasPlatform = await platformAuthenticatorIsAvailable()
        if (!isCancelled) {
          setSupported(hasWebAuthn && hasPlatform)
        }
      } catch {
        if (!isCancelled) {
          setSupported(false)
        }
      }

      try {
        const res = await fetch('/api/auth/webauthn/credentials')
        if (res.ok && !isCancelled) {
          const data = await res.json()
          setCredentials(data.credentials || [])
        }
      } catch {
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    init()

    return () => {
      isCancelled = true
    }
  }, [])

  const handleDelete = async (credentialId: string, deviceName: string) => {
    if (!confirm(`Revoke and remove biometric credential for "${deviceName}"?`)) return

    setDeletingId(credentialId)
    setError(null)
    try {
      const res = await fetch(`/api/auth/webauthn/credentials?credentialId=${encodeURIComponent(credentialId)}&id=${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to remove biometric credential')
      }
      setCredentials((prev) => prev.filter((c) => c.credential_id !== credentialId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error revoking credential')
    } finally {
      setDeletingId(null)
    }
  }

  const handleRelockAll = async () => {
    setRelocking(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/webauthn/leases/revoke', {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Failed to revoke active leases')
      setRelockSuccess(true)
      setTimeout(() => setRelockSuccess(false), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to relock documents')
    } finally {
      setRelocking(false)
    }
  }

  return (
    <>
      <Card className="border-[#E5DED1] rounded-2xl relative overflow-hidden bg-[#FFFCF5] shadow-2xs">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#292720]">
                  Biometric Secure Vault (Windows Hello / Platform Authenticator)
                </CardTitle>
                <CardDescription className="text-xs text-[#777064]">
                  Hardware-bound WebAuthn encryption & document-level security.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRelockAll}
                disabled={relocking}
                className="text-xs font-semibold rounded-xl flex items-center gap-1.5"
                title="Immediately expire all active 15-minute biometric decryption leases"
              >
                {relocking ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : relockSuccess ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#1E7E34]" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-[#777064]" />
                )}
                <span>{relockSuccess ? 'All Relocked' : 'Relock All Now'}</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setShowEnrollModal(true)}
                className="text-xs font-semibold rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Enroll Device</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {supported === false && (
            <div className="p-3.5 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-xs text-[#B45309] flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B45309]" />
              <div>
                <span className="font-semibold block mb-0.5">Platform Authenticator Unavailable</span>
                <span>
                  Your current browser or operating system does not support platform authenticators (Windows Hello, Touch ID, or device PIN). You may still manage existing keys or use a supported browser like Chrome, Edge, or Safari.
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-xs text-[#B91C1C] flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B91C1C]" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-6 flex items-center justify-center text-[#777064] gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#9C7D47]" />
              <span className="text-xs">Loading biometric credentials...</span>
            </div>
          ) : credentials.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#F8F4EA] border border-[#E5DED1] text-center space-y-2">
              <div className="h-10 w-10 rounded-2xl bg-[#FAF5EC] text-[#9C7D47] flex items-center justify-center mx-auto border border-[#E5DED1]">
                <KeyRound className="h-5 w-5" />
              </div>
              <p className="text-xs font-semibold text-[#292720]">No Biometric Authenticators Registered</p>
              <p className="text-xs text-[#777064] max-w-sm mx-auto">
                Enroll this PC or laptop with Windows Hello or your device fingerprint to enable envelope encryption on individual PDF files.
              </p>
              <Button
                size="sm"
                onClick={() => setShowEnrollModal(true)}
                className="text-xs font-semibold rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] mt-2"
              >
                Enroll This Device Now
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-[#E5DED1] rounded-2xl border border-[#E5DED1] overflow-hidden bg-[#FFFCF5]">
              {credentials.map((cred) => (
                <div
                  key={cred.credential_id}
                  className="p-4 flex items-center justify-between gap-4 bg-[#FFFCF5] hover:bg-[#FAF5EC] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] flex-shrink-0">
                      <Laptop className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#292720] truncate">
                          {cred.device_name}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                          Active
                        </span>
                      </div>
                      <span className="text-[11px] text-[#777064] block truncate font-mono">
                        Enrolled {new Date(cred.created_at).toLocaleDateString()}
                        {cred.last_used_at
                          ? ` • Last used ${new Date(cred.last_used_at).toLocaleDateString()}`
                          : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(cred.credential_id, cred.device_name)}
                    disabled={deletingId === cred.credential_id}
                    className="p-2 text-[#777064] hover:text-[#B91C1C] rounded-xl hover:bg-[#FDF2F2] transition-colors flex-shrink-0 cursor-pointer"
                    title="Revoke and delete this authenticator"
                  >
                    {deletingId === cred.credential_id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#B91C1C]" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] text-xs text-[#777064] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#1E7E34]" />
              <span>AES-256-GCM Envelope Encryption with HKDF Key Derivation Active</span>
            </div>
            <span className="text-[11px] font-mono text-[#777064]">FIDO2 L3 Bound</span>
          </div>
        </CardContent>
      </Card>

      <BiometricEnrollmentModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onSuccess={loadCredentials}
      />
    </>
  )
}
