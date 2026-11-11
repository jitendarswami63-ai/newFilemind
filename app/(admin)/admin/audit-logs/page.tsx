'use client'

import React, { useState, useEffect } from 'react'
import {
  FileText,
  Search,
  Filter,
  Shield,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
} from 'lucide-react'

interface AuditLogItem {
  id: string
  admin_id: string
  admin_email: string
  action_type: string
  target_id: string | null
  target_email: string | null
  details: Record<string, any>
  reason: string | null
  created_at: string
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [actionType, setActionType] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [page, actionType])

  const fetchLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(actionType ? { actionType } : {}),
        ...(search ? { search } : {}),
      })
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`)
      const data = await res.json()
      if (data && !data.error) {
        setLogs(data.logs || [])
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
    fetchLogs()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5DED1]">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[#9C7D47]" />
            <h1 className="text-xl font-extrabold text-[#292720] tracking-tight">
              Administrative Audit Logs
            </h1>
          </div>
          <p className="text-xs text-[#777064] mt-1">
            Immutable, append-only security logs recording every administrative action, grant, and setting update.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#777064]">
          Total Logged Actions: <strong className="text-[#292720]">{total}</strong>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-4 shadow-2xs">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#777064]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by admin email, target email, or reason..."
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionType}
              onChange={(e) => {
                setActionType(e.target.value)
                setPage(1)
              }}
              className="text-xs px-3 py-2.5 rounded-xl border border-[#D8D0C2] bg-white text-[#292720] focus:ring-2 focus:ring-[#9C7D47] focus:outline-none"
            >
              <option value="">All Action Types</option>
              <option value="grant_subscription">Grant Subscription</option>
              <option value="revoke_subscription">Revoke Subscription</option>
              <option value="suspend_user">Suspend User</option>
              <option value="reactivate_user">Reactivate User</option>
              <option value="cms.published">CMS Published</option>
              <option value="cms.draft_saved">CMS Draft Saved</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-xs font-bold text-[#FFFCF5] shadow-xs transition-colors"
            >
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table */}
      <div className="bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-6 w-6 text-[#9C7D47] animate-spin" />
            <p className="text-xs text-[#777064]">Loading audit log records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Lock className="h-8 w-8 text-[#A8A49B] mx-auto" />
            <p className="text-xs font-bold text-[#292720]">No audit entries found</p>
            <p className="text-xs text-[#777064]">Administrative operations will automatically appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EC] border-b border-[#E5DED1] text-[#777064] font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Target User</th>
                  <th className="py-3 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DED1]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF5EC]/40 transition-colors">
                    <td className="py-3 px-4 text-[#777064] font-mono text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-[#FAF5EC] border border-[#D8D0C2] font-mono text-[10px] font-bold text-[#9C7D47]">
                        {log.action_type}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-[#292720]">
                      {log.admin_email}
                    </td>

                    <td className="py-3 px-4 text-[#777064]">
                      {log.target_email || 'System / Global'}
                    </td>

                    <td className="py-3 px-4 text-[#777064] max-w-xs truncate">
                      {log.reason || JSON.stringify(log.details || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
