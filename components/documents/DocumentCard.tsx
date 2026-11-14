'use client'

import React, { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { StatusBadge } from './StatusBadge'
import type { DocumentItem } from '@/types'
import { formatDate, formatFileSize } from '@/lib/utils'
import { FileText, ArrowUpRight, Trash2, Loader2, Zap, Lock, Share2 } from 'lucide-react'
import { prefetchSignedUrl } from '@/lib/viewer/signed-url-cache'
import { getFileIconForFilename } from '@/lib/files/file-icons'

const ShareModal = dynamic(
  () => import('@/components/documents/ShareModal').then((m) => m.ShareModal),
  { ssr: false }
)

interface DocumentCardProps {
  document: DocumentItem
  onDeleted?: (id: string) => void
}

export const DocumentCard = React.memo(function DocumentCard({ document, onDeleted }: DocumentCardProps) {
  const [deleting, setDeleting] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (!document.storage_path || document.is_locked) return
    hoverTimerRef.current = setTimeout(() => {
      prefetchSignedUrl(document.id, document.storage_path!)
    }, 250)
  }, [document.id, document.storage_path, document.is_locked])

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
      className="group relative flex flex-col justify-between rounded-2xl p-5 bg-[#FFFCF5] border border-[#E5DED1] hover:border-[#C5A878] hover:shadow-sm transition-all duration-200 overflow-hidden shadow-2xs"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-3.5">
          {(() => {
            const theme = getFileIconForFilename(document.filename)
            const Icon = theme.icon
            return (
              <div className={`h-10 w-10 rounded-xl ${theme.bgColor} border ${theme.borderColor} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all shadow-2xs ${theme.textColor}`}>
                <Icon className="h-5 w-5 transition-colors" />
              </div>
            )
          })()}

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <StatusBadge status={document.status} />

            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowShareModal(true)
              }}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-[#777064] hover:text-[#9C7D47] hover:bg-[#FAF5EC] transition-colors cursor-pointer"
              title="Share document"
              aria-label="Share document"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleDelete}
              disabled={deleting}
              className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-[#777064] hover:text-[#B91C1C] hover:bg-[#FDF2F2] transition-colors cursor-pointer"
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

        <h3
          className="text-sm sm:text-base font-bold text-[#292720] group-hover:text-[#9C7D47] transition-colors line-clamp-2 mb-1.5 leading-snug"
          title={document.filename}
        >
          {document.filename}
        </h3>

        {(document.is_locked || document.doc_category || (document.tags && document.tags.length > 0) || (isOptimized && savingsPercent >= 1)) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            {document.is_locked && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF8EC] text-[#B45309] border border-[#FDE68A] shadow-2xs">
                <Lock className="h-3 w-3 text-[#B45309]" />
                <span>Biometric Locked</span>
              </span>
            )}
            {isOptimized && savingsPercent >= 1 && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB] shadow-2xs"
                title={`Original: ${formatFileSize(document.original_file_size!)}`}
              >
                <Zap className="h-3 w-3 text-[#1E7E34]" />
                <span>Optimized — {savingsPercent}% smaller</span>
              </span>
            )}
            {document.doc_category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#FAF5EC] text-[#9C7D47] border border-[#E5DED1]">
                {document.doc_category}
              </span>
            )}
            {document.tags &&
              document.tags.slice(0, 2).map((t, idx) => (
                <span key={idx} className="text-[11px] text-[#777064] font-medium">
                  #{t}
                </span>
              ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3.5 border-t border-[#E5DED1] text-xs text-[#777064] mt-4 font-medium">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#777064] bg-[#FAF5EC] px-2 py-0.5 rounded-md border border-[#E5DED1] text-[11px]">
            {formatFileSize(document.file_size)}
          </span>
          <span className="text-[#DDD5C7]">•</span>
          <span>{formatDate(document.created_at)}</span>
        </div>

        <span className="h-7 w-7 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#777064] group-hover:text-[#9C7D47] group-hover:bg-[#F8F4EA] transition-all">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>

      {showShareModal && (
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          documentId={document.id}
          filename={document.filename}
        />
      )}
    </Link>
  )
})
