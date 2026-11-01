'use client'

import React, { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Loader2, AlertCircle, CheckCircle2, Mail, Lock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { GoogleSignInButton } from './GoogleSignInButton'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials')
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const mfaInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const nextParam = searchParams.get('next')
  const destination = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')
    ? nextParam
    : '/'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setShowResend(false)
    setResendSuccess(null)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      const msg = signInError.message.toLowerCase()
      if (msg.includes('email not confirmed')) {
        setError('Your email is not verified yet. Please check your inbox for the confirmation link.')
        setShowResend(true)
      } else if (msg.includes('fetch failed') || msg.includes('network') || msg.includes('failed to fetch')) {
        setError('Unable to reach authentication server. Please ensure your Supabase project is active/unpaused.')
      } else {
        setError('Invalid email or password. Please try again.')
      }
      setLoading(false)
      return
    }

    if (data?.user && !data.user.email_confirmed_at && !data.user.confirmed_at) {
      setError('Please verify your email before logging in. Check your inbox for the confirmation link.')
      setShowResend(true)
      setLoading(false)
      return
    }

    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    if (aalData && aalData.nextLevel === 'aal2' && aalData.currentLevel !== 'aal2') {
      const { data: factorsData } = await supabase.auth.mfa.listFactors()
      const verifiedTotp = factorsData?.totp?.find((f) => f.status === 'verified')
      if (verifiedTotp) {
        setMfaFactorId(verifiedTotp.id)
        setStep('mfa')
        setLoading(false)
        setTimeout(() => mfaInputRef.current?.focus(), 50)
        return
      }
    }

    router.push(destination)
    router.refresh()
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mfaFactorId) return
    const cleanCode = mfaCode.trim().replace(/\s+/g, '')
    if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
      setError('Please enter the 6-digit verification code from Google Authenticator.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let verifySuccess = false
      const { error: cvErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: mfaFactorId,
        code: cleanCode,
      })

      if (!cvErr) {
        verifySuccess = true
      } else {
        const { data: challengeData, error: challengeErr } = await supabase.auth.mfa.challenge({
          factorId: mfaFactorId,
        })
        if (challengeErr) throw challengeErr

        const { error: verifyErr } = await supabase.auth.mfa.verify({
          factorId: mfaFactorId,
          challengeId: challengeData.id,
          code: cleanCode,
        })
        if (verifyErr) throw verifyErr
        verifySuccess = true
      }

      if (verifySuccess) {
        await supabase.auth.refreshSession()
        await fetch('/api/auth/mfa/unlock', { method: 'POST' }).catch(() => {})
        router.push(destination)
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('invalid totp') || msg.toLowerCase().includes('invalid code') || msg.toLowerCase().includes('invalid')) {
        setError('Invalid TOTP code. Please make sure your device clock is set to "Automatic" and try again.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) return
    setResending(true)
    setError(null)
    setResendSuccess(null)

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (resendError) {
      setError(resendError.message)
    } else {
      setResendSuccess('Verification email resent successfully. Please check your inbox.')
    }
    setResending(false)
  }

  const handleBackToCredentials = async () => {
    setStep('credentials')
    setMfaCode('')
    setError(null)
    await supabase.auth.signOut().catch(() => {})
  }

  if (step === 'mfa') {
    return (
      <Card className="relative overflow-hidden w-full border-[#E5DED1] shadow-sm bg-[#FFFCF5] rounded-2xl">
        <CardHeader className="text-center pb-3 pt-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center mb-3 text-[#9C7D47] shadow-2xs">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-[#292720]">
            Two-Factor Authentication
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-[#777064] font-normal mt-1 max-w-xs mx-auto">
            Your account is protected with Google Authenticator. Enter your 6-digit code to continue.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleMfaVerify}>
          <CardContent className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="mfa-code" className="sr-only">
                6-digit Authenticator Code
              </label>
              <input
                ref={mfaInputRef}
                id="mfa-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="000000"
                required
                className="w-full text-center tracking-[0.4em] font-mono text-2xl py-2.5 px-3 rounded-xl border border-[#E5DED1] bg-[#FFFCF5] text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
                value={mfaCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  setMfaCode(val)
                  if (error) setError(null)
                }}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#B91C1C] text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
            <Button
              className="w-full h-11 text-sm font-semibold shadow-xs bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5]"
              type="submit"
              disabled={loading || mfaCode.length !== 6}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify & Access Vault'
              )}
            </Button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 text-xs text-[#777064] hover:text-[#292720] transition-colors py-1 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Cancel and return to sign in</span>
            </button>
          </CardFooter>
        </form>
      </Card>
    )
  }

  return (
    <Card className="relative overflow-hidden w-full border-[#E5DED1] shadow-sm bg-[#FFFCF5] rounded-2xl">
      <CardHeader className="text-center pb-4 pt-6">
        <div className="mx-auto h-12 w-12 rounded-xl overflow-hidden border border-[#E5DED1] flex items-center justify-center mb-3.5 bg-[#FFFCF5] shadow-2xs p-1">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={48}
            height={48}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-[#292720]">
          Welcome to FileMind
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[#777064] font-normal mt-1">
          Sign in to access your secure document intelligence vault.
        </CardDescription>
      </CardHeader>

      <div className="px-6 pt-1">
        <GoogleSignInButton
          text="Continue with Google"
          next={nextParam || undefined}
          onError={(msg) => setError(msg)}
        />

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E5DED1]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#FFFCF5] px-3.5 py-0.5 rounded-full border border-[#E5DED1] text-[#777064] font-medium tracking-wider text-[10px]">
              Or continue with email
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4 pt-0">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[#777064]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="flex h-11 w-full rounded-xl border border-[#E5DED1] bg-[#FFFCF5] px-4 py-2 text-sm text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[#777064]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="flex h-11 w-full rounded-xl border border-[#E5DED1] bg-[#FFFCF5] px-4 py-2 text-sm text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#B91C1C] text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="mt-1 flex items-center gap-1.5 text-xs text-[#9C7D47] hover:underline font-medium cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#EBF7EE] border border-[#C3E6CB] text-[#1E7E34] text-xs shadow-2xs">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#1E7E34]" />
              <span>{resendSuccess}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2 pb-6">
          <Button
            className="w-full h-11 text-sm font-semibold shadow-xs bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5]"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>

          <div className="text-center text-xs text-[#777064] font-normal">
            Don&apos;t have an account?{' '}
            <Link
              href={nextParam ? `/signup?next=${encodeURIComponent(nextParam)}` : '/signup'}
              className="font-medium text-[#9C7D47] hover:underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
