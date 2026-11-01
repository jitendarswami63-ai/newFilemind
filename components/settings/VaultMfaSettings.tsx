'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import {
  ShieldCheck,
  Shield,
  Smartphone,
  Lock,
  Unlock,
  Loader2,
  Info,
  X,
} from 'lucide-react'
import { VaultMfaEnrollmentModal } from '@/components/auth/VaultMfaEnrollmentModal'
import { VaultMfaDisableModal } from '@/components/auth/VaultMfaDisableModal'
import { VaultMfaUnlockChallenge } from '@/components/auth/VaultMfaUnlockChallenge'

interface MfaStatusState {
  isEnrolled: boolean
  currentLevel: 'aal1' | 'aal2'
  nextLevel: 'aal1' | 'aal2'
  factorId?: string
  friendlyName?: string
  verifiedAt?: string
}

export function VaultMfaSettings() {
  const router = useRouter()
  const [status, setStatus] = useState<MfaStatusState | null>(null)
  const [loading, setLoading] = useState(true)
  const [lockingVault, setLockingVault] = useState(false)
  const [showEnrollModal, setShowEnrollModal] = useState(false)
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleLockVault = async () => {
    setLockingVault(true)
    try {
      const res = await fetch('/api/auth/mfa/lock', { method: 'POST' })
      if (!res.ok) {
        throw new Error('Failed to lock vault')
      }
      setRefreshTrigger((c) => c + 1)
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to lock vault')
    } finally {
      setLockingVault(false)
    }
  }

  useEffect(() => {
    let isCancelled = false

    const loadStatus = async () => {
      try {
        const res = await fetch('/api/auth/mfa/status')
        if (res.ok) {
          const data = await res.json()
          if (!isCancelled) {
            setStatus(data)
          }
        }
      } catch {
      } finally {
        if (!isCancelled) {
          setLoading(false)
        }
      }
    }

    loadStatus()

    return () => {
      isCancelled = true
    }
  }, [refreshTrigger])

  return (
    <>
      <Card className="border-[#E5DED1] rounded-2xl relative overflow-hidden bg-[#FFFCF5] shadow-2xs">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-[#292720]">
                  Private Vault Two-Factor Authentication
                </CardTitle>
                <CardDescription className="text-xs text-[#777064]">
                  Secure your private documents with Google Authenticator (RFC 6238 TOTP).
                </CardDescription>
              </div>
            </div>

            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#777064]" />
            ) : status?.isEnrolled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-semibold text-[#1E7E34]">
                <span className="h-2 w-2 rounded-full bg-[#1E7E34]" />
                <span>2FA Enabled</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F4EA] border border-[#E5DED1] text-xs font-semibold text-[#777064]">
                <span className="h-2 w-2 rounded-full bg-[#777064]" />
                <span>Not Configured</span>
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
                    Authentication Factor
                  </span>
                  {status?.isEnrolled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1E7E34]" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5EC] text-[#777064] border border-[#E5DED1]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#777064]" />
                      Disabled
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[#292720]">
                  <Smartphone className="h-4 w-4 text-[#9C7D47]" />
                  <span>Google Authenticator (TOTP)</span>
                </div>
                <p className="text-xs text-[#777064] pt-0.5 leading-relaxed">
                  Time-based one-time passwords generated directly on your mobile device.
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5DED1]">
                {status?.isEnrolled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableModal(true)}
                    className="w-full text-xs font-semibold text-[#B91C1C] hover:text-[#991B1B] hover:bg-[#FDF2F2] border-[#F8D7DA]"
                  >
                    Disable Google Authenticator
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setShowEnrollModal(true)}
                    className="w-full text-xs font-semibold bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5]"
                  >
                    Enable Google Authenticator
                  </Button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1] flex flex-col justify-between space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="block text-[11px] font-bold text-[#777064] uppercase tracking-wider">
                    Assurance Level (AAL)
                  </span>
                  {status?.currentLevel === 'aal2' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#1E7E34]" />
                      AAL2 Verified
                    </span>
                  ) : status?.isEnrolled ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF8EC] text-[#B45309] border border-[#FDE68A]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#B45309]" />
                      AAL1 Locked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FAF5EC] text-[#777064] border border-[#E5DED1]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#777064]" />
                      Standard
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-[#292720]">
                  {status?.currentLevel === 'aal2' ? (
                    <>
                      <Unlock className="h-4 w-4 text-[#1E7E34]" />
                      <span className="text-[#1E7E34]">AAL2 Verified (Vault Unlocked)</span>
                    </>
                  ) : status?.isEnrolled ? (
                    <>
                      <Lock className="h-4 w-4 text-[#B45309]" />
                      <span className="text-[#B45309]">AAL1 (Vault Locked)</span>
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 text-[#777064]" />
                      <span className="text-[#777064]">AAL1 (Standard)</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#777064] pt-0.5 leading-relaxed">
                  {status?.isEnrolled
                    ? status?.currentLevel === 'aal2'
                      ? 'All document downloads, uploads, and AI queries are currently unlocked.'
                      : 'All document downloads, uploads, and queries require AAL2.'
                    : 'Enable 2FA to require hardware-bound codes for document access.'}
                </p>
              </div>

              <div className="pt-2 border-t border-[#E5DED1]">
                {status?.isEnrolled ? (
                  status?.currentLevel === 'aal2' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLockVault}
                      disabled={lockingVault}
                      className="w-full text-xs font-semibold text-[#B45309] hover:text-[#92400E] hover:bg-[#FEF8EC] border-[#FDE68A]"
                    >
                      {lockingVault ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                          Locking Vault...
                        </>
                      ) : (
                        <>
                          <Lock className="h-3.5 w-3.5 mr-1.5 text-[#B45309]" />
                          Lock Vault (Disable AAL2)
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setShowUnlockModal(true)}
                      className="w-full text-xs font-semibold bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5]"
                    >
                      <Unlock className="h-3.5 w-3.5 mr-1.5" />
                      Unlock Vault (Enable AAL2)
                    </Button>
                  )
                ) : (
                  <Button
                    size="sm"
                    disabled
                    variant="outline"
                    className="w-full text-xs font-semibold text-[#777064] border-[#E5DED1] cursor-not-allowed opacity-50"
                  >
                    Requires 2FA Setup
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-start gap-2.5 text-xs text-[#777064] leading-relaxed">
            <Info className="h-4 w-4 text-[#9C7D47] flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-[#292720]">Security Architecture Notice: </span>
              Google Authenticator TOTP factors are cryptographically verified using Supabase Auth. Backup recovery codes are not currently provisioned; make sure your authenticator app is synced with your Google account to avoid loss of vault access.
            </div>
          </div>
        </CardContent>
      </Card>

      <VaultMfaEnrollmentModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        onSuccess={() => {
          setRefreshTrigger((c) => c + 1)
          router.refresh()
        }}
      />

      {status?.factorId && (
        <VaultMfaDisableModal
          isOpen={showDisableModal}
          factorId={status.factorId}
          onClose={() => setShowDisableModal(false)}
          onSuccess={() => {
            setRefreshTrigger((c) => c + 1)
            router.refresh()
          }}
        />
      )}

      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1D21]/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md">
            <button
              onClick={() => setShowUnlockModal(false)}
              className="absolute top-4 right-4 z-10 p-1 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <VaultMfaUnlockChallenge
              factorId={status?.factorId}
              onUnlocked={() => {
                setShowUnlockModal(false)
                setRefreshTrigger((c) => c + 1)
                router.refresh()
              }}
            />
          </div>
        </div>
      )}
    </>
  )
}
