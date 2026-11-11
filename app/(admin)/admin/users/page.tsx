'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Search,
  Filter,
  Shield,
  Crown,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCheck,
  UserX,
} from 'lucide-react'
import type { AdminUserListItem } from '@/lib/admin/types'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [tier, setTier] = useState<'all' | 'free' | 'pro' | 'elite'>('all')
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [page, tier, status])

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '15',
        tier,
        status,
        search,
      })
      const res = await fetch(`/api/admin/users?${params.toString()}`)
      const data = await res.json()
      if (data && !data.error) {
        setUsers(data.users || [])
        setTotal(data.total || 0)
        setTotalPages(data.totalPages || 1)
      }
    } catch {
      // Handled silently
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">User Management Directory</h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Browse registered accounts, inspect plan entitlements, manual grants, and account standing.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#777064]">
          Total Registered Users: <strong className="text-[#292720]">{total}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or user UUID..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={tier}
              onChange={(e) => {
                setTier(e.target.value as any)
                setPage(1)
              }}
              className="text-xs px-3 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="free">Free Plan</option>
              <option value="pro">Pro Intelligence</option>
              <option value="elite">Elite Intelligence</option>
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as any)
                setPage(1)
              }}
              className="text-xs px-3 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="suspended">Suspended Accounts</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-[#FFFCF5] shadow-xs transition-colors"
            >
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 text-[#9C7D47] animate-spin" />
            <p className="text-xs text-[#777064]">Loading user records...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-8 w-8 text-[#A8A49B] mx-auto" />
            <p className="text-xs font-bold text-[#292720]">No users found</p>
            <p className="text-xs text-[#777064]">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EC] border-b border-[#E5DED1] text-[#777064] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Plan Tier</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">Last Sign In</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DED1]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF5EC]/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#FAF5EC] border border-[#D8D0C2] flex items-center justify-center font-bold text-xs text-[#9C7D47] flex-shrink-0">
                          {u.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-[#292720] block truncate">
                            {u.fullName}
                          </span>
                          <span className="text-[11px] text-[#777064] block truncate">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {u.tier === 'elite' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#1B1D21] text-[#D4AF37] border border-[#D4AF37]/40 text-[10px] font-bold">
                            <Crown className="h-3 w-3" />
                            Elite
                          </span>
                        ) : u.tier === 'pro' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#9C7D47]/15 text-[#9C7D47] border border-[#9C7D47]/30 text-[10px] font-bold">
                            <Crown className="h-3 w-3" />
                            Pro
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FAF5EC] text-[#777064] border border-[#E5DED1] text-[10px] font-semibold">
                            Free
                          </span>
                        )}

                        {u.isManualGrant && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#24262B] px-1.5 py-0.5 rounded border border-[#3E4149]">
                            Grant
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#777064]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-[#777064]">
                      {u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="py-3 px-4">
                      {u.isSuspended ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E07A7A]/15 text-[#991B1B] text-[10px] font-bold">
                          <XCircle className="h-3 w-3 text-[#E07A7A]" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46] text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3 text-[#10B981]" />
                          Active
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#D8D0C2] bg-white hover:bg-[#FAF5EC] text-[11px] font-semibold text-[#292720] hover:text-[#9C7D47] transition-colors"
                      >
                        <span>Inspect</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-[#E5DED1] bg-[#FAF5EC]">
            <span className="text-xs text-[#777064]">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D8D0C2] bg-white text-xs font-semibold text-[#292720] disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </button>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D8D0C2] bg-white text-xs font-semibold text-[#292720] disabled:opacity-40"
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
