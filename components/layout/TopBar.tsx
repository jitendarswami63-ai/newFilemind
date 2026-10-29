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
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[#E7E5E0] bg-white px-5 py-3 mb-6 rounded-xl shadow-xs w-full">
      {/* Left: Back Link & Filename */}
      <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[60%] sm:max-w-[70%]">
        <Link
          href="/documents"
          className="min-h-[36px] px-3 flex items-center gap-2 text-xs font-medium text-[#242424] hover:text-[#000000] bg-[#F2F1ED] hover:bg-[#EAE8E3] rounded-lg border border-[#E7E5E0] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Documents</span>
        </Link>
        <span className="h-4 w-px bg-[#E7E5E0] flex-shrink-0 hidden sm:inline-block" />
        <h2 className="text-sm sm:text-base font-semibold text-[#242424] truncate tracking-tight" title={filename}>
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
          className="text-xs font-medium rounded-lg"
          title="Download original PDF"
        >
          {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Download</span>
        </Button>

        {/* Ask AI for this document */}
        <Link
          href={`/ask?documentId=${documentId}&docName=${encodeURIComponent(filename)}`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#315C4C] hover:bg-[#26493C] text-white shadow-xs transition-colors cursor-pointer"
          title="Ask AI questions grounded in this document"
        >
          <Sparkles className="h-3.5 w-3.5 text-white/90" />
          <span className="hidden sm:inline">Ask AI</span>
        </Link>

        <Button
          variant="danger"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs font-medium rounded-lg"
          title="Delete document"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          <span className="hidden sm:inline">Delete</span>
        </Button>
      </div>
    </div>
  )
}
