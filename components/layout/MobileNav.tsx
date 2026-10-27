'use client'

import React, { useState, useEffect, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { navItems } from './nav-items'

const emptySubscribe = () => () => {}

export function MobileNav({ user }: { user: { email?: string; user_metadata?: { full_name?: string } } | null }) {
  const [open, setOpen] = useState(false)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false)
  const pathname = usePathname()
  const [prevPathname, setPrevPathname] = useState(pathname)
  const router = useRouter()
  const supabase = createClient()

  // Auto-close drawer on route change during render
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayInitial = (displayName.charAt(0) || 'U').toUpperCase()

  const drawerContent = open && mounted ? (
    createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex justify-end"
        onClick={() => setOpen(false)}
      >
        <div
          className="h-full w-[290px] max-w-[85vw] border-l border-white/[0.1] p-5 shadow-2xl flex flex-col justify-between bg-[#08090f]"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/[0.08] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl overflow-hidden border border-[#00d2ff]/40 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#007ba7]/30 to-[#ff2d95]/20">
                  <Image
                    src="/logo.png"
                    alt="FileMind Logo"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#00d2ff] bg-clip-text text-transparent">
                  FileMind
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white cursor-pointer rounded-lg hover:bg-white/5"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return item.disabled ? (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium text-slate-500 opacity-60"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-[#007ba7]/25 to-[#ff2d95]/15 text-white border border-[#00d2ff]/35 shadow-[0_0_15px_-3px_rgba(0,210,255,0.25)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-[#00d2ff]' : 'text-slate-400'}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-white/[0.08] pt-4">
            <div className="flex items-center gap-3 mb-4 p-2 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#007ba7] to-[#ff2d95] flex items-center justify-center text-xs font-bold text-white flex-shrink-0 shadow-md shadow-[#ff2d95]/30">
                {displayInitial}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white truncate">
                  {displayName}
                </span>
                <span className="text-[11px] text-slate-400 font-medium truncate">
                  {user?.email}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="min-h-[44px] flex w-full items-center justify-center gap-2 rounded-xl bg-[#ff2d95]/10 hover:bg-[#ff2d95]/20 text-[#ff5ca8] text-xs font-bold border border-[#ff2d95]/30 transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    )
  ) : null

  return (
    <div className="md:hidden flex items-center justify-between border-b border-white/[0.08] bg-[#08090f]/95 backdrop-blur-2xl px-4 py-3 sticky top-0 z-40 w-full shadow-md">
      {/* Brand logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-xl overflow-hidden border border-[#00d2ff]/40 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#007ba7]/30 to-[#ff2d95]/20 shadow-[0_0_12px_rgba(0,210,255,0.2)]">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={34}
            height={34}
            className="h-full w-full object-cover"
          />
        </div>
        <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#00d2ff] bg-clip-text text-transparent">
          FileMind
        </span>
      </Link>

      {/* Hamburger Toggle (min 44x44px touch target) */}
      <button
        onClick={() => setOpen(!open)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-300 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
        aria-label="Toggle Navigation Menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Slide-in Drawer Portal */}
      {drawerContent}
    </div>
  )
}

