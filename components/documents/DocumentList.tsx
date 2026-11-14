'use client'

import React, { useEffect, useState, useCallback, useRef, useTransition } from 'react'
import { DocumentCard } from './DocumentCard'
import type { DocumentItem, PaginationMeta, FilterStatus } from '@/types'
import {
  FileQuestion,
  UploadCloud,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  ArrowUpDown,
  X,
} from 'lucide-react'

export type FileCategoryFilter =
  | 'all'
  | 'documents'
  | 'pdfs'
  | 'images'
  | 'spreadsheets'
  | 'presentations'
  | 'videos'
  | 'audio'
  | 'archives'
  | 'code'
  | 'other'

const CATEGORY_TABS: { key: FileCategoryFilter; label: string }[] = [
  { key: 'all', label: 'All Files' },
  { key: 'documents', label: 'Documents' },
  { key: 'pdfs', label: 'PDFs' },
  { key: 'images', label: 'Images' },
  { key: 'spreadsheets', label: 'Spreadsheets' },
  { key: 'presentations', label: 'Presentations' },
  { key: 'videos', label: 'Videos' },
  { key: 'audio', label: 'Audio' },
  { key: 'archives', label: 'Archives' },
  { key: 'code', label: 'Code' },
  { key: 'other', label: 'Other' },
]

export function DocumentList() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [page, setPage] = useState<number>(1)
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [categoryFilter, setCategoryFilter] = useState<FileCategoryFilter>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [debouncedSearch, setDebouncedSearch] = useState<string>('')
  const [sortBy, setSortBy] = useState<'created_at' | 'filename' | 'file_size'>('created_at')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const limit = 12

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setPage(1)
    }, 250)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const fetchDocuments = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort: sortBy,
        order: sortOrder,
      })

      if (statusFilter !== 'all') {
        queryParams.set('status', statusFilter)
      }
      if (categoryFilter !== 'all') {
        queryParams.set('category', categoryFilter)
      }
      if (debouncedSearch.trim()) {
        queryParams.set('q', debouncedSearch.trim())
      }
      if (isSilent) {
        queryParams.set('count', 'false')
      }

      const response = await fetch(`/api/documents?${queryParams.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to load documents.')
      }

      const data = await response.json()

      if (data && typeof data === 'object' && Array.isArray(data.documents)) {
        setDocuments(data.documents)
        if (data.pagination) {
          setPagination(data.pagination)
        }
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
      if (!isSilent) {
        setError(err instanceof Error ? err.message : 'An error occurred loading documents.')
      }
    } finally {
      if (!isSilent) {
        setLoading(false)
      }
    }
  }, [page, statusFilter, categoryFilter, debouncedSearch, sortBy, sortOrder, limit])

  useEffect(() => {
    let ignore = false
    setLoading(true)

    fetchDocuments(false).then(() => {
      if (ignore) return
    })

    return () => {
      ignore = true
    }
  }, [fetchDocuments])

  const handleManualRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    await fetchDocuments(false)
  }, [fetchDocuments])

  useEffect(() => {
    const handleDocumentUpdate = () => {
      handleManualRefresh()
    }

    window.addEventListener('filemind:documents-updated', handleDocumentUpdate)
    return () => {
      window.removeEventListener('filemind:documents-updated', handleDocumentUpdate)
    }
  }, [handleManualRefresh])

  const fetchRef = useRef(fetchDocuments)
  useEffect(() => {
    fetchRef.current = fetchDocuments
  }, [fetchDocuments])

  const hasActiveJobs = documents.some(
    (d) => d.status === 'pending' || d.status === 'processing'
  )
  const hasActiveJobsRef = useRef(hasActiveJobs)
  useEffect(() => {
    hasActiveJobsRef.current = hasActiveJobs
  }, [hasActiveJobs])

  useEffect(() => {
    if (!hasActiveJobs) return

    const timer = setInterval(() => {
      if (hasActiveJobsRef.current) {
        fetchRef.current(true)
      }
    }, 3000)

    return () => clearInterval(timer)
  }, [hasActiveJobs])

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

  const handleStatusFilterChange = (newFilter: FilterStatus) => {
    startTransition(() => {
      setLoading(true)
      setStatusFilter(newFilter)
      setPage(1)
    })
  }

  const handleCategoryFilterChange = (newCat: FileCategoryFilter) => {
    startTransition(() => {
      setLoading(true)
      setCategoryFilter(newCat)
      setPage(1)
    })
  }

  return (
    <div className="space-y-4 w-full">
      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#E5DED1] scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const isActive = categoryFilter === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleCategoryFilterChange(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#292720] text-[#FFFCF5] shadow-2xs scale-[1.02]'
                  : 'text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] bg-[#FFFCF5] border border-[#E5DED1]'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Control Bar: Search, Status Filter, Sort, Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#777064]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files by name..."
            className="w-full pl-9 pr-8 py-1.5 bg-[#FAF5EC] border border-[#E5DED1] focus:border-[#C5A878] rounded-xl text-xs text-[#292720] placeholder-[#777064] outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-[#777064] hover:text-[#292720]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-xs text-[#777064] font-semibold flex items-center gap-1 px-1 shrink-0">
            <Filter className="h-3 w-3 text-[#777064]" />
            <span>Status:</span>
          </span>

          {(
            [
              { key: 'all', label: 'All' },
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
                onClick={() => handleStatusFilterChange(item.key)}
                className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
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

        {/* Sorting & Counter */}
        <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#FAF5EC] border border-[#E5DED1] rounded-xl px-2.5 py-1">
            <ArrowUpDown className="h-3 w-3 text-[#777064]" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-') as ['created_at' | 'filename' | 'file_size', 'desc' | 'asc']
                setSortBy(sb)
                setSortOrder(so)
                setPage(1)
              }}
              className="bg-transparent text-xs text-[#292720] font-medium outline-none cursor-pointer"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="filename-asc">Name (A–Z)</option>
              <option value="filename-desc">Name (Z–A)</option>
              <option value="file_size-desc">Largest Size</option>
              <option value="file_size-asc">Smallest Size</option>
            </select>
          </div>

          {pagination && (
            <span className="text-xs font-mono text-[#777064] hidden sm:inline">
              {pagination.totalCount} {pagination.totalCount === 1 ? 'file' : 'files'}
            </span>
          )}

          <button
            type="button"
            onClick={handleManualRefresh}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#292720] bg-[#FFFCF5] hover:bg-[#F3EFE5] rounded-xl border border-[#E5DED1] transition-colors cursor-pointer shadow-2xs active:scale-95"
            title="Refresh files"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#777064] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main List Display */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="h-44 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-5 flex flex-col justify-between relative overflow-hidden shadow-2xs animate-pulse"
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
            {searchTerm
              ? `No files matching "${searchTerm}"`
              : categoryFilter !== 'all'
              ? `No ${categoryFilter} files found`
              : statusFilter !== 'all'
              ? `No ${statusFilter} files found`
              : 'No files in your vault'}
          </h3>
          <p className="text-xs sm:text-sm text-[#777064] max-w-sm mt-1.5 mb-6 leading-relaxed">
            {searchTerm
              ? 'Try searching with a different filename or clear the search filter.'
              : categoryFilter !== 'all'
              ? `You haven't uploaded any files in the ${categoryFilter} category yet.`
              : 'Upload files using the universal upload zone above to securely view, index, search, and manage your documents.'}
          </p>
          {categoryFilter === 'all' && statusFilter === 'all' && !searchTerm && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47]">
              <UploadCloud className="h-4 w-4 text-[#9C7D47]" />
              <span>Use the universal upload zone above to get started</span>
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
            {pagination.totalCount} files
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
