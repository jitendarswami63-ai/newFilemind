'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, ArrowRight } from 'lucide-react'

interface LandingNavbarProps {
  user?: { email?: string } | null
}

export function LandingNavbar({ user }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Security', href: '#security' },
    { name: 'Pricing', href: '#pricing' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full bg-[#F3EFE5]/90 backdrop-blur-md border-b border-[#E5DED1] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 select-none">
          <div className="h-9 w-9 rounded-xl border border-[#D8D0C2] flex items-center justify-center flex-shrink-0 bg-[#FFFCF5] shadow-xs p-1.5">
            <Image
              src="/logo.png"
              alt="FileMind AI-Powered PDF Search Logo"
              width={26}
              height={26}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-[#292720] leading-none">
              FileMind
            </span>
            <span className="text-[10px] font-semibold text-[#9C7D47] uppercase tracking-wider mt-0.5">
              Document Intelligence
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-[#777064] hover:text-[#292720] transition-colors"
            >
              {link.name}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-3.5 py-1.5 text-sm font-medium text-[#292720] hover:text-[#9C7D47] transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-lg shadow-xs transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3.5 py-1.5 text-sm font-medium text-[#292720] hover:text-[#9C7D47] transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup?next=/dashboard"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-lg shadow-xs border border-[#856837] transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-lg text-[#292720] hover:bg-[#EAE4D6] transition-colors cursor-pointer"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E5DED1] bg-[#FFFCF5] px-4 pt-3 pb-5 space-y-3 shadow-md animate-in fade-in-50 duration-150">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#292720] hover:bg-[#F3EFE5] rounded-md transition-colors"
              >
                {link.name}
              </a>
            ))}
          </nav>
          <div className="pt-3 border-t border-[#E5DED1] flex flex-col gap-2">
            {user ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-[#292720] hover:bg-[#F3EFE5] rounded-lg transition-colors border border-[#E5DED1]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-lg shadow-xs transition-colors"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2 text-sm font-medium text-[#292720] hover:bg-[#F3EFE5] rounded-lg transition-colors border border-[#E5DED1]"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup?next=/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] rounded-lg shadow-xs border border-[#856837] transition-colors"
                >
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
