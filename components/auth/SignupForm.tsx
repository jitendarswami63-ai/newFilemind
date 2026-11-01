'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Loader2, AlertCircle, CheckCircle2, Mail, ArrowLeft, KeyRound } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { GoogleSignInButton } from './GoogleSignInButton'

export function SignupForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [pendingVerification, setPendingVerification] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const nextParam = searchParams.get('next')
  const destination = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') && !nextParam.startsWith('/\\')
    ? nextParam
    : '/'

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      setLoading(false)
      return
    }

    const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
    if (destination !== '/') {
      callbackUrl.searchParams.set('next', destination)
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: callbackUrl.toString(),
      },
    })

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        setError('An account with this email already exists. Please sign in instead.')
      } else {
        setError(signUpError.message)
      }
      setLoading(false)
      return
    }

    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('An account with this email already exists. Please go to the login page to sign in.')
      setLoading(false)
      return
    }

    if (!data.session) {
      setPendingVerification(true)
      setLoading(false)
      return
    }

    router.push(destination)
    router.refresh()
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification code sent to your email.')
      return
    }

    setVerifyingOtp(true)
    setError(null)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode.trim(),
        type: 'signup',
      })

      if (verifyError) {
        throw verifyError
      }

      if (data.session) {
        router.push(destination)
        router.refresh()
      } else {
        router.push(nextParam ? `/login?message=verified&next=${encodeURIComponent(nextParam)}` : '/login?message=verified')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid or expired verification code. Please try again.')
      setVerifyingOtp(false)
    }
  }

  const handleResendOtp = async () => {
    setResending(true)
    setError(null)
    setResendSuccess(null)

    try {
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`)
      if (destination !== '/') {
        callbackUrl.searchParams.set('next', destination)
      }

      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: callbackUrl.toString(),
        },
      })

      if (resendError) {
        throw resendError
      }

      setResendSuccess(`A fresh verification code has been sent to ${email}.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification code.')
    } finally {
      setResending(false)
    }
  }

  if (pendingVerification) {
    return (
      <Card className="relative overflow-hidden w-full border-[#E5DED1] shadow-sm bg-[#FFFCF5] rounded-2xl">
        <CardHeader className="text-center pb-4 pt-6">
          <div className="mx-auto h-12 w-12 rounded-2xl overflow-hidden border border-[#E5DED1] flex items-center justify-center mb-3.5 bg-[#FAF5EC] text-[#9C7D47] shadow-2xs">
            <Mail className="h-6 w-6 text-[#9C7D47]" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-[#292720]">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-[#777064] text-xs sm:text-sm font-normal max-w-sm mx-auto mt-1">
            We sent a 6-digit verification code and confirmation link to{' '}
            <span className="text-[#9C7D47] font-semibold">{email}</span>.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleVerifyOtp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="otpCode" className="text-xs font-semibold uppercase tracking-wider text-[#777064]">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-[#777064]" />
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  required
                  autoFocus
                  className="flex h-14 w-full rounded-xl border border-[#E5DED1] bg-[#FFFCF5] pl-11 pr-4 py-2 text-center text-2xl font-mono font-bold tracking-[0.4em] text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="text-xs text-[#777064] text-center font-medium">
                You can also simply click the verification link sent to your email.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#B91C1C] text-xs">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resendSuccess && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#EBF7EE] border border-[#C3E6CB] text-[#1E7E34] text-xs shadow-2xs">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#1E7E34]" />
                <span>{resendSuccess}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
            <Button
              className="w-full h-11 text-sm font-semibold shadow-xs bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5]"
              type="submit"
              disabled={verifyingOtp || otpCode.length < 6}
            >
              {verifyingOtp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying code...
                </>
              ) : (
                'Verify & Enter Workspace'
              )}
            </Button>

            <div className="flex items-center justify-between w-full text-xs text-[#777064] font-normal pt-2 border-t border-[#E5DED1]">
              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false)
                  setError(null)
                }}
                className="flex items-center gap-1.5 hover:text-[#292720] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Change email</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="text-[#9C7D47] hover:underline font-semibold transition-colors cursor-pointer"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
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
          Create Account
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-[#777064] font-normal mt-1">
          Get started with your private FileMind intelligence vault.
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

      <form onSubmit={handleSignup}>
        <CardContent className="space-y-3.5 pt-0">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-[#777064]">
              Full Name (Optional)
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Jitendar Swami"
              className="flex h-11 w-full rounded-xl border border-[#E5DED1] bg-[#FFFCF5] px-4 py-2 text-sm text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

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
              Password (min. 8 characters)
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="flex h-11 w-full rounded-xl border border-[#E5DED1] bg-[#FFFCF5] px-4 py-2 text-sm text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-[#777064]">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="flex h-11 w-full rounded-xl border border-[#E5DED1] bg-[#FFFCF5] px-4 py-2 text-sm text-[#292720] placeholder:text-[#DDD5C7] focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#B91C1C] text-xs">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-3 pb-6">
          <Button
            className="w-full h-11 text-sm font-semibold shadow-xs bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5]"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>

          <div className="text-center text-xs text-[#777064] font-normal">
            Already have an account?{' '}
            <Link
              href={nextParam ? `/login?next=${encodeURIComponent(nextParam)}` : '/login'}
              className="font-medium text-[#9C7D47] hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
