'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Menu,
  X,
  ArrowRight,
  User,
  Sparkles,
  Layers,
  ShieldCheck,
  Crown,
  HelpCircle,
  LayoutDashboard,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ProBadge } from '@/components/ui/ProBadge'
import { useUserPlan } from '@/lib/subscription/plan'

interface LandingNavbarProps {
  user?: { email?: string; user_metadata?: Record<string, any> } | null
}

export function LandingNavbar({ user: initialUser }: LandingNavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [user, setUser] = useState(initialUser)
  const { isPro } = useUserPlan(user)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialUser) return
    let isMounted = true
    try {
      const supabase = createClient()
      supabase.auth.getUser().then((res: any) => {
        if (isMounted && res?.data?.user) setUser(res.data.user)
      }).catch(() => {})
    } catch {}
    return () => {
      isMounted = false
    }
  }, [initialUser])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const menuSections = [
    {
      name: 'Features',
      href: '/#features',
      icon: Sparkles,
      description: 'AI extraction, vector indexing & hybrid search',
    },
    {
      name: 'How It Works',
      href: '/#how-it-works',
      icon: Layers,
      description: 'End-to-end pipeline from upload to synthesis',
    },
    {
      name: 'Security',
      href: '/#security',
      icon: ShieldCheck,
      description: 'FIDO2 biometric encryption & zero-knowledge vault',
    },
    {
      name: 'Pricing',
      href: '/#pricing',
      icon: Crown,
      description: 'Free tier, ₹249 Pro & ₹499 Elite plans',
    },
    {
      name: 'FAQ',
      href: '/#faq',
      icon: HelpCircle,
      description: 'Answers about indexing, storage & compliance',
    },
  ]

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#F3EFE5]/95 backdrop-blur-md border-b border-[#E5DED1] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 select-none">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#D8D0C2] bg-[#FFFCF5] hover:bg-[#FAF5EC] text-[#292720] transition-colors shadow-2xs cursor-pointer select-none active:scale-95"
              title="Open Navigation Menu (☰)"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="h-4 w-4 text-[#9C7D47]" />
              <span className="text-xs font-bold text-[#292720] hidden sm:inline">Menu</span>
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl border border-[#D8D0C2] flex items-center justify-center flex-shrink-0 bg-[#FFFCF5] shadow-xs p-1.5">
                <Image
                  src="/filemind-ai-pdf-manager-logo.png"
                  alt="FileMind AI PDF Manager and Document Search Platform Logo"
                  width={26}
                  height={26}
                  className="h-full w-full object-contain"
                  priority
                  fetchPriority="high"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-[#292720] leading-none">
                  FileMind
                </span>
                <span className="text-[10px] font-semibold text-[#9C7D47] uppercase tracking-wider mt-0.5 hidden xs:inline">
                  Document Intelligence
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {isPro && (
                  <Link href="/settings" title="Pro Intelligence Member" className="hidden sm:inline-block">
                    <ProBadge variant="gold-pill" size="xs" label="PRO" />
                  </Link>
                )}

                <Link
                  href="/profile"
                  className="relative inline-flex items-center justify-center h-8 sm:h-auto px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#292720] hover:text-[#9C7D47] bg-[#FFFCF5] hover:bg-[#FAF5EC] border border-[#D8D0C2] shadow-2xs transition-all hover:border-[#9C7D47]/40 cursor-pointer active:scale-95"
                  title="View and edit your personal profile"
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#9C7D47]" />
                  <span className="hidden sm:inline ml-1.5">Profile</span>
                  {isPro && (
                    <span className="sm:hidden absolute -top-0.5 -right-0.5 flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#9C7D47]"></span>
                    </span>
                  )}
                </Link>

                <Link
                  href="/dashboard"
                  className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-[#292720] hover:text-[#9C7D47] transition-colors hidden md:inline-block"
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl shadow-xs transition-colors"
                >
                  <span>{isPro ? 'Workspace' : 'Open'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  href="/login?next=/profile"
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-[#292720] hover:text-[#9C7D47] bg-[#FFFCF5] hover:bg-[#FAF5EC] border border-[#D8D0C2] shadow-2xs transition-colors"
                  title="Sign in to view your profile"
                >
                  <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#777064]" />
                  <span>Profile</span>
                </Link>

                <Link
                  href="/login"
                  className="hidden sm:inline-block px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-[#292720] hover:text-[#9C7D47] transition-colors"
                >
                  Sign In
                </Link>

                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl shadow-xs border border-[#856837] transition-colors whitespace-nowrap active:scale-95"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5 hidden xs:inline" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-[100] bg-[#1B1D21]/60 backdrop-blur-xs flex justify-start animate-in fade-in duration-150"
          onClick={() => setMenuOpen(false)}
        >
          <div
            ref={drawerRef}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-[340px] max-w-[88vw] bg-[#FFFCF5] border-r border-[#E5DED1] p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200"
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#E5DED1]">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl border border-[#D8D0C2] flex items-center justify-center bg-[#FAF5EC] shadow-2xs p-1.5">
                    <Image
                      src="/filemind-ai-pdf-manager-logo.png"
                      alt="FileMind AI Logo"
                      width={26}
                      height={26}
                      className="h-full w-full object-contain"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-sm tracking-tight text-[#292720] block">
                      FileMind
                    </span>
                    <span className="text-[10px] font-semibold text-[#9C7D47] uppercase tracking-wider block">
                      Navigation & Sections
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-xl text-[#777064] hover:text-[#292720] hover:bg-[#FAF5EC] transition-colors cursor-pointer"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#777064] uppercase tracking-wider px-2 block">
                  Platform Sections
                </span>
                <nav className="space-y-1">
                  {menuSections.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-2xl hover:bg-[#FAF5EC] border border-transparent hover:border-[#E5DED1] transition-all group cursor-pointer"
                      >
                        <div className="h-8 w-8 rounded-xl bg-[#FAF5EC] group-hover:bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] flex-shrink-0 transition-colors mt-0.5">
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-[#292720] group-hover:text-[#9C7D47] transition-colors block">
                            {item.name}
                          </span>
                          <span className="text-[11px] text-[#777064] leading-tight block">
                            {item.description}
                          </span>
                        </div>
                      </a>
                    )
                  })}
                </nav>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#E5DED1]">
                <span className="text-[10px] font-bold text-[#777064] uppercase tracking-wider px-2 block">
                  Account & Workspace
                </span>
                <div className="space-y-1">
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF5EC]/70 hover:bg-[#FAF5EC] border border-[#E5DED1] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-[#FFFCF5] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                        <User className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#292720]">Personal Profile</span>
                    </div>
                    <span className="text-[10px] font-semibold text-[#9C7D47] bg-[#FFFCF5] border border-[#E5DED1] px-2 py-0.5 rounded-full">
                      Onboarding
                    </span>
                  </Link>

                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-[#FAF5EC] border border-transparent hover:border-[#E5DED1] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#777064]">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-xs font-bold text-[#292720]">Workspace Dashboard</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DED1] space-y-3">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1]">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#292720] block truncate">
                        {user.user_metadata?.full_name || 'Active User'}
                      </span>
                      <span className="text-[10px] text-[#777064] block truncate">
                        {user.email}
                      </span>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="text-[11px] font-bold text-[#9C7D47] hover:underline"
                    >
                      Edit
                    </Link>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl transition-colors shadow-2xs"
                  >
                    <span>{isPro ? 'Open Pro Workspace' : 'Open Workspace'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center py-2 text-xs font-bold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] rounded-xl transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="flex-1 text-center py-2 text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-xl transition-colors shadow-2xs"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
