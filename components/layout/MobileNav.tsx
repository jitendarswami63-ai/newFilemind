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

  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

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
    router.push('/')
    router.refresh()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayInitial = (displayName.charAt(0) || 'U').toUpperCase()

  const drawerContent = open && mounted ? (
    createPortal(
      <div
        className="fixed inset-0 z-[9999] bg-[#1B1D21]/70 backdrop-blur-xs flex justify-end"
        onClick={() => setOpen(false)}
      >
        <div
          className="h-full w-[290px] max-w-[85vw] border-l border-[#2E3036] p-5 shadow-2xl flex flex-col justify-between bg-[#1B1D21] text-[#F5F1E9]"
          onClick={(e) => e.stopPropagation()}
        >
          <div>
            <div className="flex justify-between items-center pb-4 border-b border-[#2E3036] mb-5">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl border border-[#3E4149] flex items-center justify-center flex-shrink-0 bg-[#24262B] shadow-sm p-1.5">
                  <Image
                    src="/logo.png"
                    alt="FileMind Logo"
                    width={28}
                    height={28}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-[#F5F1E9]">
                    FileMind
                  </span>
                  <span className="text-[10px] font-medium text-[#C5A878]">
                    Document Intelligence
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#A8A49B] hover:text-[#F5F1E9] cursor-pointer rounded-xl hover:bg-[#24262B]"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return item.disabled ? (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium text-[#A8A49B]/50 opacity-60"
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 text-[#A8A49B]" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-medium bg-[#24262B] text-[#A8A49B] px-1.5 py-0.5 rounded-full border border-[#2E3036]">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#34332F] text-[#F5F1E9] font-semibold border-l-2 border-[#C5A878] shadow-xs'
                        : 'text-[#A8A49B] hover:text-[#F5F1E9] hover:bg-[#24262B]'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-[#C5A878]' : 'text-[#A8A49B]'}`} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-[#2E3036] pt-3">
            <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[#24262B] border border-[#2E3036]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 rounded-full bg-[#34332F] border border-[#C5A878]/30 flex items-center justify-center text-xs font-bold text-[#C5A878] flex-shrink-0 shadow-sm">
                  {displayInitial}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-[#F5F1E9] truncate leading-snug">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-[#A8A49B] truncate leading-snug">
                    {user?.email}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-[#A8A49B] hover:text-[#E07A7A] hover:bg-[#2B2D33] transition-colors cursor-pointer"
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
    <div className="md:hidden flex items-center justify-between border-b border-[#E5DED1] bg-[#FFFCF5] px-4 py-3 sticky top-0 z-40 w-full shadow-xs">
      <Link href="/dashboard" className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl border border-[#DDD5C7] flex items-center justify-center flex-shrink-0 bg-[#F8F4EA] shadow-2xs p-1">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={28}
            height={28}
            className="h-full w-full object-contain"
          />
        </div>
        <span className="font-bold text-base tracking-tight text-[#292720]">
          FileMind
        </span>
      </Link>

      <button
        onClick={() => setOpen(!open)}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[#292720] hover:bg-[#F3EFE5] active:scale-95 transition-all cursor-pointer"
        aria-label="Toggle Navigation Menu"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {drawerContent}
    </div>
  )
}
