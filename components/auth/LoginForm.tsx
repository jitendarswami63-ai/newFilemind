'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card'
import { Loader2, AlertCircle, CheckCircle2, Mail } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { GoogleSignInButton } from './GoogleSignInButton'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

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

    router.push('/dashboard')
    router.refresh()
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address to resend verification.')
      return
    }

    setResending(true)
    setError(null)
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

      setResendSuccess(`Verification link has been resent to ${email}. Please check your inbox.`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email.')
    } finally {
      setResending(false)
    }
  }

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
          Welcome to{' '}
          <span className="bg-gradient-to-r from-white via-slate-100 to-[#00d2ff] bg-clip-text text-transparent">
            FileMind
          </span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
          Sign in to access your secure document intelligence vault.
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

      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4 pt-0">
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
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="flex h-11 w-full rounded-xl border border-white/15 bg-black/60 px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d2ff] focus:ring-2 focus:ring-[#007ba7]/40 transition-all duration-200 shadow-inner"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#ff2d95]/10 border border-[#ff2d95]/30 text-[#ff5ca8] text-xs shadow-[0_0_15px_rgba(255,45,149,0.15)]">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              {showResend && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="mt-1 flex items-center gap-1.5 text-xs text-[#00d2ff] hover:text-[#38bdf8] font-semibold underline underline-offset-2 cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {resending ? 'Sending...' : 'Resend verification email'}
                </button>
              )}
            </div>
          )}

          {resendSuccess && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <span>{resendSuccess}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-4 pt-2 pb-6">
          <Button
            className="w-full h-11 text-sm font-bold shadow-lg"
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

          <div className="text-center text-xs text-slate-300 font-medium">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-bold text-[#ff2d95] hover:text-[#ff5ca8] underline underline-offset-4"
            >
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
