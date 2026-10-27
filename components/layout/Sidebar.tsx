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
    <aside className="hidden md:flex h-screen w-64 flex-col border-r border-white/[0.08] bg-[#08090f]/95 backdrop-blur-2xl fixed top-0 left-0 z-30 select-none shadow-[4px_0_24px_rgba(0,0,0,0.7)]">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-white/[0.08] gap-3 bg-white/[0.01]">
        <div className="h-10 w-10 rounded-xl overflow-hidden shadow-[0_0_18px_rgba(0,210,255,0.25)] border border-[#00d2ff]/40 flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#007ba7]/30 to-[#ff2d95]/20">
          <Image
            src="/logo.png"
            alt="FileMind Logo"
            width={38}
            height={38}
            className="h-full w-full object-cover"
            priority
          />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#00d2ff] bg-clip-text text-transparent">
            FileMind
          </span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[#00d2ff]">
            Document AI
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-3.5">
        <div className="px-3 mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Workspace
          </span>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <div key={item.name} className="relative group">
                {item.disabled ? (
                  <div
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 cursor-not-allowed opacity-60 hover:bg-white/[0.02]"
                    title={`${item.name} — Coming soon`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4 text-slate-500" />
                      <span>{item.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/5">
                      Soon
                    </span>
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#007ba7]/25 via-[#007ba7]/15 to-[#ff2d95]/15 text-white border border-[#00d2ff]/35 shadow-[0_0_15px_-3px_rgba(0,210,255,0.25)]'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                    }`}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-gradient-to-b from-[#00d2ff] to-[#ff2d95] rounded-r-full shadow-[0_0_8px_#00d2ff]" />
                    )}
                    <item.icon
                      className={`h-4 w-4 transition-colors ${
                        isActive ? 'text-[#00d2ff]' : 'text-slate-400 group-hover:text-slate-200'
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
      <div className="p-4 border-t border-white/[0.08] bg-black/60">
        <div className="flex items-center gap-3 p-2 rounded-xl mb-2 bg-white/[0.02] border border-white/5">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#007ba7] to-[#ff2d95] flex items-center justify-center text-xs font-bold text-white shadow-md shadow-[#ff2d95]/30 flex-shrink-0">
            {displayInitial}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-white truncate">
              {displayName}
            </span>
            <span className="text-[11px] text-slate-400 font-medium truncate" title={user?.email}>
              {user?.email}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-300 hover:text-[#ff5ca8] hover:bg-[#ff2d95]/15 border border-white/5 hover:border-[#ff2d95]/30 transition-all duration-150 cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
