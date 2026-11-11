'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VaultMfaUnlockChallengeProps {
  factorId?: string
  onUnlocked?: () => void
  customMessage?: string
}

export function VaultMfaUnlockChallenge({
  factorId: propFactorId,
  onUnlocked,
  customMessage,
}: VaultMfaUnlockChallengeProps) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resolvingFactor, setResolvingFactor] = useState(!propFactorId)
  const [resolvedFactorId, setResolvedFactorId] = useState<string | null>(propFactorId || null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let isCancelled = false

    const findFactor = async () => {
      if (propFactorId) {
        setResolvedFactorId(propFactorId)
        setResolvingFactor(false)
        return
      }

      try {
        const supabase = createClient()
        const { data } = await supabase.auth.mfa.listFactors()
        const verified = data?.totp?.find((f: any) => f.status === 'verified')

        if (!isCancelled && verified) {
          setResolvedFactorId(verified.id)
        }
      } catch {
      } finally {
        if (!isCancelled) {
          setResolvingFactor(false)
        }
      }
    }

    findFactor()
    return () => {
      isCancelled = true
    }
  }, [propFactorId])

  useEffect(() => {
    if (!resolvingFactor && inputRef.current) {
      inputRef.current.focus()
    }
  }, [resolvingFactor])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = code.trim().replace(/\s+/g, '')

    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the 6-digit code from Google Authenticator.')
      return
    }

    if (!resolvedFactorId) {
      setError('Could not locate verified 2FA factor. Please refresh and try again.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      let verifySuccess = false
      const { error: cvErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: resolvedFactorId,
        code: cleanCode,
      })

      if (!cvErr) {
        verifySuccess = true
      } else {
        const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId: resolvedFactorId,
        })

        if (challengeErr) {
          throw challengeErr
        }

        const { error: verifyErr } = await supabase.auth.mfa.verify({
          factorId: resolvedFactorId,
          challengeId: challengeData.id,
          code: cleanCode,
        })

        if (verifyErr) {
          throw verifyErr
        }
        verifySuccess = true
      }

      if (verifySuccess) {
        await supabase.auth.refreshSession()
        await fetch('/api/auth/mfa/unlock', { method: 'POST' }).catch(() => {})
        router.refresh()
        if (onUnlocked) {
          onUnlocked()
        }
      }
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

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 sm:p-6 w-full max-w-md mx-auto">
      <div className="w-full bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] shadow-sm p-7 sm:p-8 space-y-6 text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] shadow-2xs">
          <Lock className="h-8 w-8 text-[#9C7D47]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold text-[#292720] tracking-tight">
            Private Vault Locked
          </h2>
          <p className="text-xs text-[#777064] leading-relaxed max-w-xs mx-auto">
            {customMessage ||
              'This vault is secured with two-factor authentication. Enter the 6-digit code from Google Authenticator to unlock your documents.'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] flex items-start gap-2.5 text-[#B91C1C] text-xs text-left">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className="space-y-4">
          <div>
            <label htmlFor="vault-unlock-code" className="sr-only">
              6-digit Authenticator Code
            </label>
            <input
              ref={inputRef}
              id="vault-unlock-code"
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
              className="w-full text-center tracking-[0.4em] font-mono text-2xl py-3 px-3 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] focus:outline-hidden focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all text-[#292720] placeholder:text-[#DDD5C7] shadow-2xs"
              disabled={loading || resolvingFactor}
            />
          </div>

          <Button
            type="submit"
            disabled={loading || resolvingFactor || code.length !== 6}
            className="w-full py-2.5 bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Unlocking Vault...
              </>
            ) : (
              <>
                <span>Unlock Vault</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-2 border-t border-[#E5DED1] flex items-center justify-center gap-1.5 text-[11px] text-[#777064]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#1E7E34]" />
          <span>Supabase Auth RFC 6238 TOTP Protection</span>
        </div>
      </div>
    </div>
  )
}
