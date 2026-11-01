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
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh.')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, limit])

  useEffect(() => {
    const handleDocumentUpdate = () => {
      handleManualRefresh()
    }

    window.addEventListener('filemind:documents-updated', handleDocumentUpdate)
    return () => {
      window.removeEventListener('filemind:documents-updated', handleDocumentUpdate)
    }
  }, [handleManualRefresh])

  useEffect(() => {
    const hasActiveJobs = documents.some(
      (d) => d.status === 'pending' || d.status === 'processing'
    )
    if (!hasActiveJobs) return

    const timer = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        })
        if (statusFilter !== 'all') {
          queryParams.set('status', statusFilter)
        }
        const response = await fetch(`/api/documents?${queryParams.toString()}`)
        if (!response.ok) return
        const data = await response.json()
        if (data && typeof data === 'object' && Array.isArray(data.documents)) {
          setDocuments(data.documents)
          setPagination(data.pagination || null)
        }
      } catch {}
    }, 3000)

    return () => clearInterval(timer)
  }, [documents, page, statusFilter, limit])

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs text-[#777064] font-semibold flex items-center gap-1 px-2">
            <Filter className="h-3 w-3 text-[#777064]" />
            <span>Filter:</span>
          </span>

          {(
            [
              { key: 'all', label: 'All Vault' },
              { key: 'locked', label: '🔒 Locked' },
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
                    ? 'bg-[#FAF5EC] text-[#9C7D47] border border-[#E5DED1] shadow-2xs'
                    : 'text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] border border-transparent'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
          {pagination && (
            <span className="text-xs font-mono text-[#777064]">
              {pagination.totalCount} {pagination.totalCount === 1 ? 'document' : 'documents'}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#F3EFE5] rounded-xl border border-[#E5DED1] transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="Refresh document vault"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#777064] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-44 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-5 flex flex-col justify-between relative overflow-hidden shadow-2xs"
            >
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-xl bg-[#F8F4EA]" />
                <div className="h-6 w-20 rounded-full bg-[#F8F4EA]" />
              </div>
              <div className="space-y-2.5 my-auto">
                <div className="h-4 w-4/5 rounded-md bg-[#F8F4EA]" />
                <div className="h-3 w-1/2 rounded-md bg-[#F8F4EA]" />
              </div>
              <div className="pt-3 border-t border-[#E5DED1] flex items-center justify-between">
                <div className="h-3 w-20 rounded bg-[#F8F4EA]" />
                <div className="h-4 w-4 rounded-full bg-[#F8F4EA]" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-[#F8D7DA] text-center gap-3 bg-[#FDF2F2]">
          <p className="text-sm font-semibold text-[#B91C1C]">{error}</p>
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#F3EFE5] rounded-xl border border-[#E5DED1] transition-colors cursor-pointer shadow-2xs active:scale-95"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[#777064]" />
            <span>Retry loading</span>
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 bg-[#FFFCF5] rounded-2xl border border-dashed border-[#DDD5C7] text-center select-none relative overflow-hidden shadow-2xs">
          <div className="h-14 w-14 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47] flex items-center justify-center mb-4">
            <FileQuestion className="h-7 w-7 text-[#9C7D47]" />
          </div>
          <h3 className="text-base font-bold text-[#292720]">
            {statusFilter !== 'all'
              ? `No ${statusFilter} documents found`
              : 'No documents in your vault'}
          </h3>
          <p className="text-xs sm:text-sm text-[#777064] max-w-sm mt-1.5 mb-6 leading-relaxed">
            {statusFilter !== 'all'
              ? `There are currently no documents with "${statusFilter}" status.`
              : 'Upload PDF documents using the dropzone above to securely view, index, search, and extract intelligence.'}
          </p>
          {statusFilter === 'all' && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
              <UploadCloud className="h-4 w-4 text-[#9C7D47]" />
              <span>Use the upload zone above to get started</span>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E5DED1]">
          <p className="text-xs text-[#777064] font-mono">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} documents
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFCF5] hover:bg-[#F3EFE5] disabled:opacity-40 disabled:cursor-not-allowed border border-[#E5DED1] text-[#292720] transition-all cursor-pointer shadow-2xs"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-3 py-1 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] text-xs font-mono font-bold text-[#9C7D47]">
              {pagination.page} / {pagination.totalPages}
            </span>

            <button
              type="button"
              disabled={!pagination.hasMore && pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#FFFCF5] hover:bg-[#F3EFE5] disabled:opacity-40 disabled:cursor-not-allowed border border-[#E5DED1] text-[#292720] transition-all cursor-pointer shadow-2xs"
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
