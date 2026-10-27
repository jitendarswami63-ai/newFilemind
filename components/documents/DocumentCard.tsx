'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import type { DocumentItem } from '@/types'
import { formatDate, formatFileSize } from '@/lib/utils'
import { FileText, ArrowUpRight, Trash2, Loader2, Zap } from 'lucide-react'
import { prefetchSignedUrl } from '@/lib/viewer/signed-url-cache'

interface DocumentCardProps {
  document: DocumentItem
  onDeleted?: (id: string) => void
}

export function DocumentCard({ document, onDeleted }: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (!document.storage_path) return
    hoverTimerRef.current = setTimeout(() => {
      prefetchSignedUrl(document.id, document.storage_path!)
    }, 250)
  }, [document.id, document.storage_path])

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
  }, [])

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`Delete "${document.filename}" permanently?`)) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      onDeleted?.(document.id)
    } catch {
      alert('Deletion failed. Please try again.')
      setDeleting(false)
    }
  }

  const isOptimized =
    typeof document.original_file_size === 'number' &&
    typeof document.file_size === 'number' &&
    document.file_size < document.original_file_size

  const savingsPercent = isOptimized
    ? Math.round(
        ((document.original_file_size! - document.file_size!) /
          document.original_file_size!) *
          100
      )
    : 0

  return (
    <Link
      href={`/documents/${document.id}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative flex flex-col justify-between rounded-2xl p-5 bg-[#0e1119]/90 border border-white/10 hover:border-[#00d2ff]/50 hover:bg-[#121622] hover:shadow-[0_8px_30px_rgba(0,123,167,0.2)] transition-all duration-300 overflow-hidden"
    >
      {/* Top accent glow line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/30 to-transparent group-hover:via-[#00d2ff] transition-all" />

      <div>
        {/* Header: PDF Icon + Status + Delete */}
        <div className="flex items-start justify-between gap-2 mb-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#007ba7]/25 to-[#ff2d95]/20 border border-[#007ba7]/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-[#00d2ff]/60 transition-all shadow-[0_0_15px_rgba(0,210,255,0.15)]">
            <FileText className="h-5 w-5 text-[#00d2ff] group-hover:text-[#ff2d95] transition-colors" />
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge status={document.status} />

            {/* Quick Delete button */}
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-[#ff5ca8] hover:bg-[#ff2d95]/15 transition-all duration-150 cursor-pointer"
              title="Delete document"
              aria-label="Delete document"
            >
              {deleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Filename with tooltip */}
        <h3
          className="text-sm sm:text-base font-bold text-slate-100 group-hover:text-[#00d2ff] transition-colors line-clamp-2 mb-1.5 leading-snug"
          title={document.filename}
        >
          {document.filename}
        </h3>

        {/* Subtle Category, Tags & Optimization Indicator */}
        {(document.doc_category || (document.tags && document.tags.length > 0) || (isOptimized && savingsPercent >= 1)) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {isOptimized && savingsPercent >= 1 && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm"
                title={`Original: ${formatFileSize(document.original_file_size!)}`}
              >
                <Zap className="h-3 w-3" />
                <span>Optimized — {savingsPercent}% smaller</span>
              </span>
            )}
            {document.doc_category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-[#007ba7]/20 text-[#38bdf8] border border-[#007ba7]/40">
                {document.doc_category}
              </span>
            )}
            {document.tags &&
              document.tags.slice(0, 2).map((t, idx) => (
                <span key={idx} className="text-[11px] text-slate-400 font-medium">
                  #{t}
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Footer Meta */}
      <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.08] text-xs text-slate-300 mt-4 font-medium">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-mono text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 text-[11px]">
            {formatFileSize(document.file_size)}
          </span>
          <span className="text-slate-600">•</span>
          <span>{formatDate(document.created_at)}</span>
        </div>

        <span className="h-7 w-7 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-[#007ba7]/25 group-hover:border-[#00d2ff]/40 transition-all">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  )
}
