'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Trash2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TopBarProps {
  documentId: string
  filename: string
}

export function TopBar({ documentId, filename }: TopBarProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/download?type=download`)
      if (!res.ok) throw new Error('Download failed')
      const data = await res.json()

      const a = document.createElement('a')
      a.href = data.signedUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      alert('Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this document?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      router.push('/documents')
      router.refresh()
    } catch {
      alert('Delete failed. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-white/10 bg-gradient-to-r from-[#0d1017]/95 via-[#0f121d]/95 to-[#120f18]/95 backdrop-blur-2xl px-5 py-3.5 mb-6 rounded-2xl shadow-xl w-full">
      {/* Left: Back Link & Filename */}
      <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[60%] sm:max-w-[70%]">
        <Link
          href="/documents"
          className="min-h-[38px] px-3 flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] rounded-xl border border-white/10 hover:border-[#00d2ff]/50 transition-all flex-shrink-0 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Documents</span>
        </Link>
        <span className="h-5 w-px bg-white/10 flex-shrink-0 hidden sm:inline-block" />
        <h2 className="text-sm sm:text-base font-bold text-white truncate tracking-tight" title={filename}>
          {filename}
        </h2>
      </div>

      {/* Right: Actions Toolbar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleDownload}
          disabled={downloading}
          className="text-xs font-semibold rounded-xl"
          title="Download original PDF"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Download</span>
        </Button>

        {/* Disabled Phase 1 placeholder: Ask This Document */}
        <div className="relative group">
          <Button
            variant="outline"
            size="sm"
            disabled
            className="text-xs opacity-50 cursor-not-allowed border-dashed rounded-xl"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#ff2d95]" />
            <span className="hidden md:inline">Ask AI</span>
          </Button>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#0e111a] border border-white/10 text-slate-200 text-[11px] py-1.5 px-3 rounded-xl shadow-2xl pointer-events-none whitespace-nowrap z-50">
            Ask Document (Phase 1 preview) — Coming soon
          </div>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-semibold rounded-xl"
          title="Delete document"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>
    </div>
  )
}
