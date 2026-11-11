'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Crown,
  Globe,
  Layers,
  HardDrive,
  BarChart3,
  FileText,
  ArrowLeft,
  ShieldCheck,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react'

interface AdminSidebarProps {
  adminEmail: string
}

const navItems = [
  {
    name: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    badge: null,
  },
  {
    name: 'Subscriptions & Grants',
    href: '/admin/subscriptions',
    icon: Crown,
    badge: null,
  },
  {
    name: 'Website CMS',
    href: '/admin/cms',
    icon: Globe,
    badge: 'CMS',
  },
  {
    name: 'Plans & Entitlements',
    href: '/admin/plans',
    icon: Layers,
    badge: null,
  },
  {
    name: 'Storage Management',
    href: '/admin/storage',
    icon: HardDrive,
    badge: null,
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    badge: null,
  },
  {
    name: 'Audit Logs',
    href: '/admin/audit-logs',
    icon: FileText,
    badge: null,
  },
]

export function AdminSidebar({ adminEmail }: AdminSidebarProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const NavContent = () => (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2C2E35]">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-[#3E4149] flex items-center justify-center bg-[#24262B] p-1.5 shadow-sm">
              <Image
                src="/filemind-ai-pdf-manager-logo.png"
                alt="FileMind Admin"
                width={26}
                height={26}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-[#F5F1E9]">
                  FileMind
                </span>
                <span className="text-[9px] font-black tracking-wider uppercase px-1.5 py-0.2 rounded-sm bg-[#9C7D47]/30 text-[#D4AF37] border border-[#D4AF37]/40">
                  ADMIN
                </span>
              </div>
              <span className="text-[10px] text-[#A8A49B] block font-medium">
                Control Center
              </span>
            </div>
          </Link>

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#A8A49B] hover:text-[#F5F1E9] hover:bg-[#2A2C32]"
            aria-label="Close admin menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 py-4">
          <div className="px-3 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#7E828E]">
              Administration
            </span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href === '/admin'
                ? pathname === '/admin'
                : pathname === item.href || pathname.startsWith(item.href + '/')
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#31333B] text-[#F5F1E9] font-semibold border-l-2 border-[#D4AF37] shadow-xs'
                      : 'text-[#A8A49B] hover:text-[#F5F1E9] hover:bg-[#25272D]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`h-4 w-4 ${
                        isActive ? 'text-[#D4AF37]' : 'text-[#7E828E]'
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#9C7D47]/20 text-[#D4AF37]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <div className="p-3 border-t border-[#2C2E35] bg-[#1C1E23] space-y-2">
        <div className="p-2.5 rounded-xl bg-[#24262B] border border-[#2E3036]">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
              Verified Admin
            </span>
          </div>
          <p className="text-[11px] font-medium text-[#E5DED1] truncate" title={adminEmail}>
            {adminEmail}
          </p>
        </div>

        <Link
          href="/dashboard"
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-[#24262B] hover:bg-[#2E3036] text-[#A8A49B] hover:text-[#F5F1E9] border border-[#2E3036] text-xs font-semibold transition-all"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Exit to Workspace</span>
        </Link>
      </div>
    </div>
  )

  return (
    <>
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 h-14 bg-[#1B1D21] border-b border-[#2C2E35]">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-[#A8A49B] hover:text-[#F5F1E9] hover:bg-[#24262B]"
          aria-label="Open admin navigation"
        >
          <Menu className="h-5 w-5 text-[#D4AF37]" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-[#F5F1E9]">FileMind</span>
          <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-[#9C7D47]/30 text-[#D4AF37]">
            ADMIN
          </span>
        </div>

        <Link
          href="/dashboard"
          className="text-xs text-[#A8A49B] hover:text-[#F5F1E9] p-2"
          title="Exit to Workspace"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </div>

      <aside className="hidden md:flex flex-col w-64 h-screen fixed top-0 left-0 z-30 bg-[#1B1D21] border-r border-[#2C2E35]">
        <NavContent />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#0B0C0E]/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-72 h-full bg-[#1B1D21] border-r border-[#2C2E35] shadow-2xl"
          >
            <NavContent />
          </div>
        </div>
      )}
    </>
  )
}
