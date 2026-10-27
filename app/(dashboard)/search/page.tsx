'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Loader2, FileText, ArrowRight, Sparkles, AlertCircle, FileSearch } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { SearchResultItem } from '@/types'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [, startTransition] = useTransition()

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
      {/* Header */}
      <div className="border-b border-white/10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#007ba7]/10 border border-[#007ba7]/25 text-[11px] font-semibold text-[#00d2ff] mb-3 tracking-wider uppercase">
          <Sparkles className="h-3 w-3 text-[#ff2d95]" />
          <span>Neural + Lexical RRF Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#007ba7]/25 to-[#ff2d95]/25 border border-[#007ba7]/40 flex items-center justify-center text-[#00d2ff] shadow-[0_0_20px_rgba(0,210,255,0.2)]">
            <Search className="h-5 w-5" />
          </div>
          <span>Hybrid Document Search</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
          Instant semantic and exact keyword retrieval across all your indexed documents.
        </p>
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearch} className="relative flex flex-col sm:flex-row items-stretch gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#00d2ff] transition-colors">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by topic, semantics, or exact code (e.g. invoice, total amount, contractual terms)..."
            className="w-full h-14 bg-[#0d0e14]/90 border border-white/15 rounded-2xl pl-12 pr-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#00d2ff]/80 focus:ring-2 focus:ring-[#007ba7]/40 focus:shadow-[0_0_25px_rgba(0,210,255,0.2)] transition-all shadow-inner"
            autoFocus
          />
        </div>
        <Button
          type="submit"
          disabled={loading || !query.trim()}
          className="h-14 px-7 text-sm font-bold flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#007ba7] to-[#ff2d95] hover:from-[#008dbf] hover:to-[#ff47a5] text-white shadow-lg shadow-[#ff2d95]/20 hover:shadow-[0_0_30px_rgba(255,45,149,0.35)] transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Search className="h-4 w-4" />}
          <span>Search Vault</span>
        </Button>
      </form>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#ff2d95]/10 border border-[#ff2d95]/30 text-[#ff5ca8] text-sm shadow-[0_0_25px_rgba(255,45,149,0.15)]">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Results Section */}
      <div className="space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3.5 glass-panel rounded-2xl border border-white/10">
            <div className="h-12 w-12 rounded-2xl bg-[#007ba7]/15 border border-[#007ba7]/30 flex items-center justify-center text-[#00d2ff]">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="text-sm font-semibold text-slate-200">Running hybrid semantic & lexical search...</p>
            <span className="text-xs text-slate-400">Reciprocal Rank Fusion (RRF) in progress</span>
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 px-6 glass-panel rounded-2xl border border-dashed border-white/15 text-center relative overflow-hidden">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-[#007ba7]/20 to-[#ff2d95]/20 border border-white/10 flex items-center justify-center text-slate-400 mb-4 shadow-lg shadow-black/40">
              <FileSearch className="h-8 w-8 text-[#00d2ff]" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-100">No matching chunks found</h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mt-1.5 leading-relaxed">
              Try adjusting your query, searching for broader terms or specific identifiers, or verify that your uploaded documents have finished indexing.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="font-medium text-slate-300">
                Found <strong className="text-white font-bold">{results.length}</strong> matching {results.length === 1 ? 'passage' : 'passages'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-[#ff5ca8] bg-[#ff2d95]/10 border border-[#ff2d95]/25 shadow-[0_0_15px_rgba(255,45,149,0.15)]">
                <Sparkles className="h-3 w-3 text-[#ff2d95]" />
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
                    <div className="p-5 rounded-2xl border border-white/10 bg-[#0d0e14]/90 hover:bg-[#121422] hover:border-[#00d2ff]/40 transition-all duration-200 shadow-lg hover:shadow-[0_0_30px_rgba(0,210,255,0.15)] relative overflow-hidden">
                      {/* Top Accent Hover Sheen */}
                      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/60 to-[#ff2d95]/60 opacity-0 group-hover:opacity-100 transition-opacity" />

                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-[#007ba7]/15 border border-[#007ba7]/30 flex items-center justify-center text-[#00d2ff] flex-shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <span className="text-sm sm:text-base font-bold text-slate-100 truncate group-hover:text-[#00d2ff] transition-colors">
                            {result.filename}
                          </span>
                          {result.doc_category && (
                            <span className="text-[10px] font-semibold bg-white/5 text-slate-300 px-2.5 py-0.5 rounded-full border border-white/10 flex-shrink-0">
                              {result.doc_category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs font-bold text-[#00d2ff] bg-[#007ba7]/20 border border-[#007ba7]/40 px-2.5 py-1 rounded-lg">
                            {pageLabel}
                          </span>
                          {otherPages.length > 0 && (
                            <span
                              className="text-[10px] font-medium text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg"
                              title={`Also matches on page(s): ${otherPages.join(', ')}`}
                            >
                              +{otherPages.length} {otherPages.length === 1 ? 'page' : 'pages'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-black/60 border border-white/5 group-hover:border-white/10 transition-colors">
                        <p className="text-xs sm:text-[13px] text-slate-200 line-clamp-3 leading-relaxed font-mono">
                          {result.snippet}
                        </p>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-xs text-slate-400">
                        <span className="font-mono text-[11px] text-slate-400">
                          Score: <span className="text-slate-200 font-semibold">{result.score}</span>
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-[#ff5ca8] font-bold group-hover:translate-x-1 transition-transform">
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
