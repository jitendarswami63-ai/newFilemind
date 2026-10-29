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
        className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-xs flex justify-end"
        onClick={() => setOpen(false)}
      >
        <div
          className="h-full w-[290px] max-w-[85vw] border-l border-[#E7E5E0] p-5 shadow-xl flex flex-col justify-between bg-[#F7F6F3]"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            {/* Drawer Header */}
            <div className="flex justify-between items-center pb-4 border-b border-[#E7E5E0] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg overflow-hidden border border-[#E7E5E0] flex items-center justify-center flex-shrink-0 bg-white shadow-xs p-0.5">
                  <Image
                    src="/logo.png"
                    alt="FileMind Logo"
                    width={32}
                    height={32}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-semibold text-base tracking-tight text-[#242424]">
                  FileMind
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#77756F] hover:text-[#242424] cursor-pointer rounded-lg hover:bg-[#EAE8E3]/60"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return item.disabled ? (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#9C9A93] opacity-60"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-medium bg-[#EAE8E3] text-[#77756F] px-1.5 py-0.5 rounded border border-[#D8D6CE]">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EAE8E3] text-[#242424] font-semibold border-l-2 border-[#315C4C]'
                        : 'text-[#77756F] hover:text-[#242424] hover:bg-[#EAE8E3]/60'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-[#315C4C]' : 'text-[#77756F]'}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-[#E7E5E0] pt-3">
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-lg bg-[#F2F1ED] border border-[#E7E5E0]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-white border border-[#E7E5E0] flex items-center justify-center text-xs font-semibold text-[#242424] flex-shrink-0 shadow-xs">
                  {displayInitial}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium text-[#242424] truncate leading-snug">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-[#77756F] truncate leading-snug">
                    {user?.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-[#77756F] hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )
  ) : null

  return (
    <div className="md:hidden flex items-center justify-between border-b border-[#E7E5E0] bg-white px-4 py-3 sticky top-0 z-40 w-full shadow-xs">
      {/* Brand logo */}
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg overflow-hidden border border-[#E7E5E0] flex items-center justify-center flex-shrink-0 bg-white shadow-xs p-0.5">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={32}
            height={32}
            className="h-full w-full object-contain"
          />
        </div>
        <span className="font-semibold text-base tracking-tight text-[#242424]">
          FileMind
        </span>
      </Link>

      {/* Hamburger Toggle (min 44x44px touch target) */}
      <button
        onClick={() => setOpen(!open)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#242424] hover:bg-[#F2F1ED] active:scale-95 transition-all cursor-pointer"
        aria-label="Toggle Navigation Menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Slide-in Drawer Portal */}
      {drawerContent}
    </div>
  )
}

