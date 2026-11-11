'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Loader2, FileText, ArrowRight, Sparkles, AlertCircle, FileSearch, Lock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SearchResultItem } from '@/types'
import { useUserPlan } from '@/lib/subscription/plan'
import { useUpgradeModal } from '@/components/subscription/UpgradeModalContext'

export default function SearchPage() {
  const { isPro, entitlements } = useUserPlan()
  const { openUpgradeModal } = useUpgradeModal()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [, startTransition] = useTransition()

  const isSemanticLocked = !isPro && !entitlements?.hasByok

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)
    setSearched(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Search request failed')
      }
      const data = await response.json()
      startTransition(() => {
        setResults(data.results || [])
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred during search')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      <div className="border-b border-[#E5DED1] pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[11px] font-semibold text-[#9C7D47] mb-3 tracking-wider uppercase">
            {isSemanticLocked ? (
              <>
                <Lock className="h-3 w-3 text-[#9C7D47]" />
                <span>Exact Keyword Search (Semantic Vector Search Locked - Pro)</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-[#9C7D47]" />
                <span>Neural + Lexical RRF Engine</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#292720] flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] shadow-2xs">
              <Search className="h-5 w-5" />
            </div>
            <span>Hybrid Document Search</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#777064] mt-1.5">
            Instant semantic and exact keyword retrieval across all your indexed documents.
          </p>
        </div>

        <Link
          href={query.trim() ? `/ask?q=${encodeURIComponent(query.trim())}` : '/ask'}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFFCF5] hover:bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#292720] hover:text-[#9C7D47] hover:border-[#C5A878] transition-all cursor-pointer w-fit shadow-2xs"
        >
          <Sparkles className="h-4 w-4 text-[#9C7D47]" />
          <span>Ask AI with Evidence →</span>
        </Link>
      </div>

      {isSemanticLocked && (
        <div className="p-4 rounded-2xl bg-[#FFFCF5] border border-[#D4AF37]/50 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] flex-shrink-0">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <span className="font-bold text-[#292720] block">Semantic AI Vector Search Locked</span>
              <span className="text-[#777064]">
                Searching by exact keywords. Upgrade to Pro to search concepts, deep meanings, and extracted pages with vector embeddings.
              </span>
            </div>
          </div>
          <button
            onClick={() => openUpgradeModal({ targetTier: 'pro', featureName: 'Hybrid Semantic Search' })}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] shadow-xs cursor-pointer flex-shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#F6E27A]" />
            <span>Unlock Pro (₹249)</span>
          </button>
        </div>
      )}

      <form onSubmit={handleSearch} className="relative flex flex-col sm:flex-row items-stretch gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#777064] group-focus-within:text-[#9C7D47] transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by topic, semantics, or exact code (e.g. invoice, total amount, contractual terms)..."
            className="w-full h-14 bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl pl-12 pr-4 text-sm text-[#292720] placeholder-[#777064]/70 focus:outline-none focus:border-[#9C7D47] focus:ring-2 focus:ring-[#C5A878]/25 transition-all shadow-2xs"
            autoFocus
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-14 px-7 text-sm font-semibold flex items-center justify-center gap-2.5 rounded-2xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs border border-[#856837] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#FFFCF5]" /> : <Search className="h-4 w-4" />}
          <span>Search Vault</span>
        </Button>
      </form>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#FDF2F2] border border-[#F8D7DA] text-[#B91C1C] text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-[#777064] gap-3.5 bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] shadow-2xs">
            <div className="h-12 w-12 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-[#292720]">Running hybrid semantic & lexical search...</p>
            <span className="text-xs text-[#777064]">Reciprocal Rank Fusion (RRF) in progress</span>
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 px-6 bg-[#FFFCF5] rounded-2xl border border-dashed border-[#DDD5C7] text-center relative overflow-hidden shadow-2xs">
            <div className="h-16 w-16 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] mb-4 shadow-2xs">
              <FileSearch className="h-8 w-8 text-[#9C7D47]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-[#292720]">No matching chunks found</h3>
            <p className="text-xs sm:text-sm text-[#777064] max-w-md mt-1.5 leading-relaxed">
              Try adjusting your query, searching for broader terms or specific identifiers, or verify that your uploaded documents have finished indexing.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-[#9C7D47] flex-shrink-0" />
                <span className="text-xs text-[#292720]">
                  Want an AI-synthesized answer with verified citations for &ldquo;<strong>{query}</strong>&rdquo;?
                </span>
              </div>
              <Link
                href={`/ask?q=${encodeURIComponent(query.trim())}`}
                className="px-4 py-2 rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] text-xs font-semibold flex items-center gap-1.5 transition-all w-fit shadow-xs border border-[#856837]"
              >
                <span>Synthesize with Ask AI</span>
                <ArrowRight className="h-3.5 w-3.5 text-[#FFFCF5]" />
              </Link>
            </div>

            <div className="flex items-center justify-between text-xs text-[#777064] px-1">
              <span className="font-medium text-[#777064]">
                Found <strong className="text-[#292720] font-bold">{results.length}</strong> matching {results.length === 1 ? 'passage' : 'passages'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-[#9C7D47] bg-[#FAF5EC] border border-[#E5DED1]">
                <Sparkles className="h-3 w-3 text-[#9C7D47]" />
                Ranked via RRF Fusion
              </span>
            </div>

            <div className="space-y-3.5">
              {results.map((result) => {
                const hasOtherPages = result.matching_pages && result.matching_pages.length > 1
                const otherPages = hasOtherPages
                  ? result.matching_pages!.filter((p) => p !== result.page_start)
                  : []

                const pageLabel =
                  result.page_start === result.page_end
                    ? `Page ${result.page_start}`
                    : `Pages ${result.page_start}–${result.page_end}`

                return (
                  <Link
                    key={result.chunk_id}
                    href={`/documents/${result.document_id}?page=${result.page_start}`}
                    className="block group"
                  >
                    <div className="p-5 rounded-2xl border border-[#E5DED1] bg-[#FFFCF5] hover:bg-[#FAF5EC] hover:border-[#C5A878] hover:shadow-sm transition-all duration-150 shadow-2xs relative overflow-hidden">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-9 w-9 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47] flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="text-sm sm:text-base font-bold text-[#292720] truncate group-hover:text-[#9C7D47] transition-colors">
                            {result.filename}
                          </span>
                          {result.doc_category && (
                            <span className="text-[10px] font-semibold bg-[#FAF5EC] text-[#9C7D47] px-2.5 py-0.5 rounded-full border border-[#E5DED1] flex-shrink-0">
                              {result.doc_category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-semibold text-[#9C7D47] bg-[#FAF5EC] border border-[#E5DED1] px-2.5 py-1 rounded-full">
                            {pageLabel}
                          </span>
                          {otherPages.length > 0 && (
                            <span
                              className="text-[10px] font-medium text-[#777064] bg-[#F8F4EA] border border-[#E5DED1] px-2 py-0.5 rounded-full"
                              title={`Also matches on page(s): ${otherPages.join(', ')}`}
                            >
                              +{otherPages.length} {otherPages.length === 1 ? 'page' : 'pages'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#F8F4EA] border border-[#E5DED1]">
                        <p className="text-xs sm:text-[13px] text-[#292720] line-clamp-3 leading-relaxed font-mono">
                          {result.snippet}
                        </p>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-xs text-[#777064]">
                        <span className="font-mono text-[11px] text-[#777064]">
                          Score: <span className="text-[#292720] font-bold">{result.score}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-[#9C7D47] font-semibold group-hover:translate-x-0.5 transition-transform">
                          <span>Open in Reader</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
