'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { navItems } from './nav-items'

export function Sidebar({ user }: { user: { email?: string; user_metadata?: { full_name?: string } } | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayInitial = (displayName.charAt(0) || 'U').toUpperCase()

  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-[#E7E5E0] bg-[#F7F6F3] fixed top-0 left-0 z-30 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-5 border-b border-[#E7E5E0] gap-3">
        <div className="h-8 w-8 rounded-lg overflow-hidden border border-[#E7E5E0] flex items-center justify-center flex-shrink-0 bg-white shadow-xs p-0.5">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={32}
            height={32}
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-sm tracking-tight text-[#242424] leading-tight">
            FileMind
          </span>
          <span className="text-[11px] font-normal text-[#77756F] leading-tight">
            Document Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-5 px-3">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9C9A93]">
            Workspace
          </span>
        </div>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <div key={item.name} className="relative group">
                {item.disabled ? (
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium text-[#9C9A93] cursor-not-allowed opacity-60"
                    title={`${item.name} — Coming soon`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 text-[#9C9A93]" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-medium bg-[#EAE8E3] text-[#77756F] px-1.5 py-0.5 rounded border border-[#D8D6CE]">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#EAE8E3] text-[#242424] font-semibold border-l-2 border-[#315C4C] rounded-r-lg pl-2.5 pr-3'
                        : 'text-[#77756F] hover:text-[#242424] hover:bg-[#EAE8E3]/60 rounded-lg px-3'
                    }`}
                  >
                    <item.icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? 'text-[#315C4C]' : 'text-[#77756F] group-hover:text-[#242424]'
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-[#E7E5E0] bg-[#F2F1ED]">
        <div className="flex items-center justify-between gap-2.5 px-2 py-1.5 rounded-lg">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-full bg-white border border-[#E7E5E0] flex items-center justify-center text-xs font-semibold text-[#242424] flex-shrink-0 shadow-xs">
              {displayInitial}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-[#242424] truncate leading-snug">
                {displayName}
              </span>
              <span className="text-[11px] text-[#77756F] truncate leading-snug" title={user?.email}>
                {user?.email}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-md text-[#77756F] hover:text-red-700 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
