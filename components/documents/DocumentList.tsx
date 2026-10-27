'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { DocumentCard } from './DocumentCard'
import type { DocumentItem, PaginationMeta, FilterStatus } from '@/types'
import {
  FileQuestion,
  UploadCloud,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'

export function DocumentList() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState<number>(1)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const limit = 12

  useEffect(() => {
    let ignore = false

    const run = async () => {
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        })

        if (statusFilter !== 'all') {
          queryParams.set('status', statusFilter)
        }

        const response = await fetch(`/api/documents?${queryParams.toString()}`)
        if (!response.ok) {
          throw new Error('Failed to load documents.')
        }

        const data = await response.json()
        if (ignore) return

        if (data && typeof data === 'object' && Array.isArray(data.documents)) {
          setDocuments(data.documents)
          setPagination(data.pagination || null)
          setError(null)
        } else if (Array.isArray(data)) {
          // Backward compatibility fallback
          setDocuments(data)
          setPagination({
            page: 1,
            limit: data.length,
            totalCount: data.length,
            totalPages: 1,
            hasMore: false,
          })
          setError(null)
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'An error occurred loading documents.')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      ignore = true
    }
  }, [page, statusFilter, limit])

  const handleManualRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (statusFilter !== 'all') {
        queryParams.set('status', statusFilter)
      }

      const response = await fetch(`/api/documents?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to load documents.')
      }

      const data = await response.json()
      if (data && typeof data === 'object' && Array.isArray(data.documents)) {
        setDocuments(data.documents)
        setPagination(data.pagination || null)
      } else if (Array.isArray(data)) {
        setDocuments(data)
        setPagination({
          page: 1,
          limit: data.length,
          totalCount: data.length,
          totalPages: 1,
          hasMore: false,
        })
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred loading documents.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, limit])

  // Reactive listener: when UploadZone completes a document or batch, refresh quietly without full spinner
  useEffect(() => {
    const handleDocumentUpdate = () => {
      handleManualRefresh()
    }

    window.addEventListener('filemind:documents-updated', handleDocumentUpdate)
    return () => {
      window.removeEventListener('filemind:documents-updated', handleDocumentUpdate)
    }
  }, [handleManualRefresh])

  const handleDeleted = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    if (pagination) {
      setPagination((prev) =>
        prev
          ? {
              ...prev,
              totalCount: Math.max(0, prev.totalCount - 1),
            }
          : null
      )
    }
  }

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && (!pagination || newPage <= pagination.totalPages)) {
      setLoading(true)
      setPage(newPage)
      window.scrollTo({ top: 300, behavior: 'smooth' })
    }
  }

  const handleFilterChange = (newFilter: FilterStatus) => {
    setLoading(true)
    setStatusFilter(newFilter)
    setPage(1)
  }

  return (
    <div className="space-y-5 w-full">
      {/* Control Bar: Status Filter Chips & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#0c0f17]/90 border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 px-2">
            <Filter className="h-3 w-3 text-slate-400" />
            <span>Filter:</span>
          </span>

          {(
            [
              { key: 'all', label: 'All Vault' },
              { key: 'ready', label: 'Ready' },
              { key: 'processing', label: 'Processing' },
              { key: 'failed', label: 'Failed' },
            ] as const
          ).map((item) => {
            const isActive = statusFilter === item.key
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleFilterChange(item.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-[#007ba7]/40 to-[#ff2d95]/30 text-white border border-[#00d2ff]/60 shadow-[0_0_15px_-3px_rgba(0,210,255,0.4)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
          {pagination && (
            <span className="text-xs font-mono text-slate-400">
              {pagination.totalCount} {pagination.totalCount === 1 ? 'document' : 'documents'}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-[#00d2ff]/40 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Refresh document vault"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#00d2ff] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Skeleton Shimmer Loading State */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-44 rounded-2xl glass-panel p-5 flex flex-col justify-between border border-white/10 relative overflow-hidden"
            >
              <div className="flex justify-between items-start">
                <div className="h-11 w-11 rounded-xl skeleton-shimmer border border-white/5" />
                <div className="h-6 w-20 rounded-full skeleton-shimmer" />
              </div>
              <div className="space-y-2.5 my-auto">
                <div className="h-4 w-4/5 rounded-md skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded-md skeleton-shimmer" />
              </div>
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="h-3 w-20 rounded skeleton-shimmer" />
                <div className="h-4 w-4 rounded-full skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="flex flex-col items-center justify-center p-8 glass-panel rounded-2xl border border-[#ff2d95]/40 text-center gap-3 bg-[#160b12]/60 shadow-[0_0_30px_rgba(255,45,149,0.12)]">
          <p className="text-sm font-semibold text-[#ff5ca8]">{error}</p>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-xl border border-white/15 hover:border-[#00d2ff]/40 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#00d2ff]" />
            <span>Retry loading</span>
          </button>
        </div>
      ) : documents.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-16 px-6 glass-panel rounded-2xl border border-dashed border-white/15 text-center select-none relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/30 to-transparent" />
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#007ba7]/25 to-[#ff2d95]/25 border border-white/15 text-[#00d2ff] flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(0,210,255,0.15)] ring-1 ring-[#00d2ff]/30">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-100">
            {statusFilter !== 'all'
              ? `No ${statusFilter} documents found`
              : 'No documents in your vault'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1.5 mb-6 leading-relaxed">
            {statusFilter !== 'all'
              ? `There are currently no documents with "${statusFilter}" status.`
              : 'Upload PDF documents using the dropzone above to securely view, index, search, and extract intelligence.'}
          </p>
          {statusFilter === 'all' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-[#ff5ca8]">
              <UploadCloud className="h-4 w-4 text-[#00d2ff]" />
              <span>Use the upload zone above to get started</span>
            </div>
          )}
        </div>
      ) : (
        /* Document Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <p className="text-xs text-slate-400 font-mono">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} documents
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-slate-300 transition-all cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono font-bold text-white">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={!pagination.hasMore && pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10 text-slate-300 transition-all cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
