'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, ChevronLeft, ChevronRight, Crown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { navItems } from './nav-items'
import { useSidebar } from './SidebarContext'
import { ProBadge } from '@/components/ui/ProBadge'
import { useUserPlan, clearLegacyCookies } from '@/lib/subscription/plan'

export function Sidebar({ user }: { user: { email?: string; user_metadata?: Record<string, any> } | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isCollapsed, toggleCollapse } = useSidebar()
  const { isPro } = useUserPlan(user)

  const handleLogout = async () => {
    clearLegacyCookies()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const displayInitial = (displayName.charAt(0) || 'U').toUpperCase()

  return (
    <aside
      className={`hidden md:flex h-screen flex-col border-r border-[#2E3036] bg-[#1B1D21] fixed top-0 left-0 z-30 select-none transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-[#2E3036]">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl border border-[#3E4149] flex items-center justify-center flex-shrink-0 bg-[#24262B] shadow-sm p-1.5">
            <Image
              src="/filemind-ai-pdf-manager-logo.png"
              alt="FileMind AI PDF Manager and Document Search Platform Logo"
              width={28}
              height={28}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 transition-opacity duration-200">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-[#F5F1E9] leading-tight">
                  FileMind
                </span>
                {isPro && <ProBadge variant="gold-pill" size="xs" label="PRO" />}
              </div>
              <span className="text-[11px] font-medium text-[#C5A878] leading-tight">
                {isPro ? 'Pro Intelligence' : 'Document Intelligence'}
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={toggleCollapse}
          className="h-7 w-7 rounded-lg border border-[#2E3036] bg-[#24262B] text-[#A8A49B] hover:text-[#F5F1E9] hover:bg-[#34332F] hover:border-[#C5A878]/40 transition-colors flex items-center justify-center cursor-pointer"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-5 px-3 sidebar-scroll">
        {!isCollapsed && (
          <div className="px-3 mb-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A8A49B]">
              Workspace
            </span>
          </div>
        )}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <div key={item.name} className="relative group">
                {item.disabled ? (
                  <div
                    className={`flex items-center rounded-xl py-2.5 text-xs font-medium text-[#A8A49B]/60 cursor-not-allowed opacity-50 ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                    }`}
                    title={`${item.name} — Coming soon`}
                  >
                    <div className="flex items-center gap-2.5">
                      <item.icon className="h-4 w-4 text-[#A8A49B]" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="text-[10px] font-medium bg-[#24262B] text-[#A8A49B] px-1.5 py-0.5 rounded-full border border-[#2E3036]">
                        Soon
                      </span>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 py-2.5 text-xs font-medium transition-all ${
                      isCollapsed ? 'justify-center px-2 rounded-xl' : 'px-3 rounded-xl'
                    } ${
                      isActive
                        ? 'bg-[#34332F] text-[#F5F1E9] font-semibold border-l-2 border-[#C5A878] shadow-xs'
                        : 'text-[#A8A49B] hover:text-[#F5F1E9] hover:bg-[#24262B]'
                    }`}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={`h-4 w-4 flex-shrink-0 transition-colors ${
                        isActive ? 'text-[#C5A878]' : 'text-[#A8A49B] group-hover:text-[#F5F1E9]'
                      }`}
                    />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-[#2E3036] bg-[#24262B]">
        <div className={`flex items-center justify-between gap-2.5 rounded-xl ${isCollapsed ? 'p-1' : 'px-2 py-1.5'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative h-8 w-8 rounded-full bg-[#34332F] border border-[#C5A878]/30 flex items-center justify-center text-xs font-bold text-[#C5A878] flex-shrink-0 shadow-sm">
              {displayInitial}
              {isPro && isCollapsed && (
                <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA771C] flex items-center justify-center shadow-xs">
                  <Crown className="h-2 w-2 text-[#1C180A] fill-[#1C180A]" />
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#F5F1E9] truncate leading-snug">
                    {displayName}
                  </span>
                  {isPro && <ProBadge variant="gold-pill" size="xs" label="PRO" />}
                </div>
                <span className="text-[11px] text-[#A8A49B] truncate leading-snug" title={user?.email}>
                  {isPro ? 'Pro Intelligence Active' : user?.email}
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-[#A8A49B] hover:text-[#E07A7A] hover:bg-[#2B2D33] transition-colors flex-shrink-0 cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
