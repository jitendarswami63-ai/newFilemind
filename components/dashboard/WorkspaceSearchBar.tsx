'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Sparkles, CornerDownLeft } from 'lucide-react'

const SUGGESTED_QUERIES = [
  'Summarize core topics and conclusions',
  'What obligations, dates, or rules are outlined?',
  'List key financial figures or metrics',
]

export function WorkspaceSearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const handleAsk = (textToSubmit?: string) => {
    const q = (textToSubmit || query).trim()
    if (!q) return
    router.push(`/ask?q=${encodeURIComponent(q)}`)
  }

  const handleSearch = () => {
    const q = query.trim()
    if (!q) return
    router.push(`/search?q=${encodeURIComponent(q)}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAsk()
    }
  }

  return (
    <div className="w-full space-y-3">
      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] focus-within:border-[#9C7D47] focus-within:ring-2 focus-within:ring-[#C5A878]/25 transition-all shadow-2xs hover:border-[#DDD5C7] overflow-hidden p-2 gap-2">
        <div className="relative flex-1 flex items-center min-w-0 pl-2.5">
          <Search className="h-4 w-4 text-[#777064] flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents, or search topics..."
            className="w-full bg-transparent border-none pl-3 pr-2 py-2 text-sm text-[#292720] placeholder-[#777064]/70 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 justify-end px-1 sm:px-0">
          <button
            type="button"
            onClick={handleSearch}
            disabled={!query.trim()}
            className="px-3.5 py-2 text-xs font-semibold text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hidden sm:inline-flex items-center gap-1.5"
            title="Keyword & hybrid search"
          >
            <span>Search</span>
          </button>

          <button
            type="button"
            onClick={() => handleAsk()}
            disabled={!query.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 flex-shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Ask AI</span>
            <CornerDownLeft className="h-3 w-3 opacity-80 hidden sm:inline" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-[#777064] flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[#9C7D47]" />
          <span>Try:</span>
        </span>
        {SUGGESTED_QUERIES.map((sq, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleAsk(sq)}
            className="text-[11px] text-[#777064] bg-[#FFFCF5] border border-[#E5DED1] hover:border-[#C5A878] hover:text-[#9C7D47] hover:bg-[#FAF5EC] px-3 py-1 rounded-full transition-all cursor-pointer shadow-2xs"
          >
            {sq}
          </button>
        ))}
      </div>
    </div>
  )
}
