'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
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

  // Verification state
  const [pendingVerification, setPendingVerification] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

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

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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

    // Crucial check: Supabase returns identities: [] when the email is ALREADY REGISTERED!
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('An account with this email already exists. Please go to the login page to sign in.')
      setLoading(false)
      return
    }

    // Check if email confirmation is required (session is null)
    if (!data.session) {
      setPendingVerification(true)
      setLoading(false)
      return
    }

    // If session was granted immediately (auto-confirm)
    router.push('/dashboard')
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
        router.push('/dashboard')
        router.refresh()
      } else {
        router.push('/login?message=verified')
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
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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

  // --- Render Verification Screen if Email Confirmation Pending ---
  if (pendingVerification) {
    return (
      <Card className="relative overflow-hidden w-full border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.8)] bg-gradient-to-b from-[#0f111a]/95 via-[#0b0c13]/95 to-[#08090e]/95 backdrop-blur-2xl rounded-2xl">
        {/* Top accent glow line */}
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/80 to-transparent" />

        <CardHeader className="text-center pb-4 pt-6">
          <div className="mx-auto h-14 w-14 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(0,210,255,0.25)] border border-[#00d2ff]/40 flex items-center justify-center mb-3.5 bg-gradient-to-br from-[#007ba7]/30 to-[#ff2d95]/20">
            <Mail className="h-7 w-7 text-[#00d2ff]" />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Verify Your Email
          </CardTitle>
          <CardDescription className="text-slate-300 text-xs sm:text-sm font-medium max-w-sm mx-auto mt-1">
            We sent a 6-digit verification code and confirmation link to{' '}
            <span className="text-[#ff2d95] font-bold">{email}</span>.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleVerifyOtp}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="otpCode" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                6-Digit Verification Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  id="otpCode"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  required
                  autoFocus
                  className="flex h-14 w-full rounded-xl border border-white/20 bg-black/70 pl-11 pr-4 py-2 text-center text-2xl font-mono font-bold tracking-[0.4em] text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#007ba7]/40 transition-all shadow-inner"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <p className="text-xs text-slate-400 text-center font-medium">
                You can also simply click the verification link sent to your email.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#ff2d95]/10 border border-[#ff2d95]/30 text-[#ff5ca8] text-xs shadow-[0_0_15px_rgba(255,45,149,0.15)]">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {resendSuccess && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span>{resendSuccess}</span>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
            <Button
              className="w-full h-11 text-sm font-bold shadow-lg"
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

            <div className="flex items-center justify-between w-full text-xs text-slate-300 font-medium pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setPendingVerification(false)
                  setError(null)
                }}
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Change email</span>
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="text-[#00d2ff] hover:text-[#38bdf8] font-bold underline underline-offset-2 transition-colors cursor-pointer"
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </CardFooter>
        </form>
      </Card>
    )
  }

  // --- Default Sign-Up Screen ---
  return (
    <Card className="relative overflow-hidden w-full border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.8)] bg-gradient-to-b from-[#0f111a]/95 via-[#0b0c13]/95 to-[#08090e]/95 backdrop-blur-2xl rounded-2xl">
      {/* Top accent glow line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/80 to-transparent" />

      <CardHeader className="text-center pb-4 pt-6">
        <div className="mx-auto h-14 w-14 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(0,210,255,0.25)] border border-[#00d2ff]/40 flex items-center justify-center mb-3.5 bg-gradient-to-br from-[#007ba7]/30 to-[#ff2d95]/20">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={56}
            height={56}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-white">
          Create Account
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
          Get started with your private FileMind intelligence vault.
        </CardDescription>
      </CardHeader>

      <div className="px-6 pt-1">
        {/* Google OAuth Button */}
        <GoogleSignInButton
          text="Continue with Google"
          onError={(msg) => setError(msg)}
        />

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#0c0e18] px-3.5 py-0.5 rounded-full border border-white/10 text-slate-400 font-semibold tracking-wider text-[10px]">
              Or continue with email
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSignup}>
        <CardContent className="space-y-3.5 pt-0">
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Full Name (Optional)
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Jitendar Swami"
              className="flex h-11 w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#007ba7]/40 transition-all duration-200 shadow-inner"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="flex h-11 w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#007ba7]/40 transition-all duration-200 shadow-inner"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password (min. 8 characters)
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="flex h-11 w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#007ba7]/40 transition-all duration-200 shadow-inner"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="flex h-11 w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#007ba7]/40 transition-all duration-200 shadow-inner"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-[#ff2d95]/10 border border-[#ff2d95]/30 text-[#ff5ca8] text-xs shadow-[0_0_15px_rgba(255,45,149,0.15)] animate-shake">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-3 pb-6">
          <Button
            className="w-full h-11 text-sm font-bold shadow-lg"
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

          <div className="text-center text-xs text-slate-300 font-medium">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-bold text-[#ff2d95] hover:text-[#ff5ca8] underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
