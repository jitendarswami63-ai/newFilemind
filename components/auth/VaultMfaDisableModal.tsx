'use client'

import React, { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertTriangle, AlertCircle, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VaultMfaDisableModalProps {
  isOpen: boolean
  factorId: string
  onClose: () => void
  onSuccess: () => void
}

export function VaultMfaDisableModal({
  isOpen,
  factorId,
  onClose,
  onSuccess,
}: VaultMfaDisableModalProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClose = () => {
    setCode('')
    setError(null)
    onClose()
  }

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = code.trim().replace(/\s+/g, '')

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the current 6-digit code from Google Authenticator to confirm.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
        factorId,
      })

      if (challengeErr) {
        throw challengeErr
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: cleanCode,
      })

      if (verifyErr) {
        throw verifyErr
      }

      const { error: unenrollErr } = await supabase.auth.mfa.unenroll({
        factorId,
      })

      if (unenrollErr) {
        throw unenrollErr
      }

      await supabase.auth.refreshSession()

      onSuccess()
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (
        msg.toLowerCase().includes('invalid totp') ||
        msg.toLowerCase().includes('invalid code') ||
        msg.toLowerCase().includes('invalid')
      ) {
        setError(
          'Invalid TOTP code entered. Please ensure your device clock is set to "Automatic" and try the current code.'
        )
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1D21]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] shadow-2xl p-6 sm:p-7 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#FEF8EC] border border-[#FDE68A] flex items-center justify-center text-[#B45309] shadow-2xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#292720] tracking-tight">
                Disable Two-Factor Auth
              </h3>
              <p className="text-xs text-[#777064] mt-0.5">
                Security confirmation required
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs text-[#777064] leading-relaxed">
          Disabling two-factor authentication lowers your Private Vault protection. To confirm your identity, enter the current 6-digit code from Google Authenticator.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-start gap-2.5 text-[#B91C1C] text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleDisable} className="space-y-4">
          <div>
            <label
              htmlFor="disable-totp-code"
              className="block text-xs font-semibold text-[#292720] mb-1"
            >
              Current Authenticator Code
            </label>
            <input
              ref={inputRef}
              autoFocus
              id="disable-totp-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '')
                setCode(val)
                if (error) setError(null)
              }}
              className="w-full text-center tracking-[0.4em] font-mono text-xl py-2.5 px-3 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] focus:outline-hidden focus:border-[#B45309] focus:ring-2 focus:ring-[#FDE68A]/50 transition-all text-[#292720] placeholder:text-[#DDD5C7]"
              disabled={loading}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1 bg-[#B91C1C] hover:bg-[#991B1B] text-[#FFFCF5]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Verifying...
                </>
              ) : (
                'Disable 2FA'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
