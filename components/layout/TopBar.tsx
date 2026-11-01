'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Download, Trash2, Loader2, Sparkles, Lock, Unlock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface TopBarProps {
  documentId: string
  filename: string
  isLocked?: boolean
  isLeaseActive?: boolean
}

export function TopBar({
  documentId,
  filename,
  isLocked = false,
  isLeaseActive = false,
}: TopBarProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [locking, setLocking] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      if (isLocked) {
        const res = await fetch(`/api/documents/${documentId}/view`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Biometric authorization required to download')
        }
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const res = await fetch(`/api/documents/${documentId}/download?type=download`)
        if (!res.ok) throw new Error('Download failed')
        const data = await res.json()

        const a = document.createElement('a')
        a.href = data.signedUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const handleLockDocument = async () => {
    if (
      !confirm(
        `Lock "${filename}" with Biometrics?\n\nThis will encrypt the PDF with AES-256-GCM. You will need Windows Hello or your device biometric to open it.`
      )
    ) {
      return
    }

    setLocking(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/lock`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (data.error?.includes('biometric credential')) {
          alert('You must enroll a biometric authenticator in Settings before locking documents.')
          router.push('/settings')
          return
        }
        throw new Error(data.error || 'Failed to lock document')
      }
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to lock document')
    } finally {
      setLocking(false)
    }
  }

  const handleRelockDocument = async () => {
    setLocking(true)
    try {
      const res = await fetch('/api/auth/webauthn/leases/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })
      if (!res.ok) throw new Error('Failed to relock document')
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to relock document')
    } finally {
      setLocking(false)
    }
  }

  const handlePermanentUnlock = async () => {
    if (
      !confirm(
        `Permanently unlock "${filename}"?\n\nThis will decrypt the document and return it to standard storage.`
      )
    ) {
      return
    }

    setLocking(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/unlock`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Failed to unlock document')
      }
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to unlock document')
    } finally {
      setLocking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this document?')) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      router.push('/documents')
      router.refresh()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Delete failed. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border border-[#E5DED1] bg-[#FFFCF5] px-5 py-3.5 mb-6 rounded-2xl shadow-2xs w-full">
      <div className="flex items-center gap-3 min-w-0 flex-1 max-w-[60%] sm:max-w-[70%]">
        <Link
          href="/documents"
          className="min-h-[36px] px-3 flex items-center gap-2 text-xs font-semibold text-[#292720] hover:text-[#9C7D47] bg-[#F8F4EA] hover:bg-[#FAF5EC] rounded-xl border border-[#E5DED1] transition-colors flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Documents</span>
        </Link>
        <span className="h-4 w-px bg-[#E5DED1] flex-shrink-0 hidden sm:inline-block" />
        <h2 className="text-sm sm:text-base font-bold text-[#292720] truncate tracking-tight flex items-center gap-2" title={filename}>
          <span>{filename}</span>
          {isLocked && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF8EC] text-[#B45309] border border-[#FDE68A] shadow-2xs flex-shrink-0">
              <Lock className="h-3 w-3 text-[#B45309]" />
              <span>{isLeaseActive ? 'Lease Active' : 'Vault Locked'}</span>
            </span>
          )}
        </h2>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isLocked ? (
          <>
            {isLeaseActive && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRelockDocument}
                disabled={locking}
                className="text-xs font-semibold rounded-xl text-[#B45309] border-[#FDE68A] hover:bg-[#FEF8EC]"
                title="Immediately revoke biometric lease and lock this document"
              >
                {locking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">Relock</span>
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePermanentUnlock}
              disabled={locking}
              className="text-xs font-semibold rounded-xl text-[#777064]"
              title="Permanently remove biometric encryption and restore standard storage"
            >
              {locking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unlock className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Unlock Permanently</span>
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLockDocument}
            disabled={locking}
            className="text-xs font-semibold rounded-xl text-[#9C7D47] border-[#E5DED1] hover:bg-[#FAF5EC]"
            title="Encrypt this PDF with AES-256-GCM and protect with Windows Hello / Biometrics"
          >
            {locking ? <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9C7D47]" /> : <Lock className="h-3.5 w-3.5 text-[#9C7D47]" />}
            <span className="hidden sm:inline">Lock with Biometrics</span>
          </Button>
        )}

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

        <Link
          href={`/ask?documentId=${documentId}&docName=${encodeURIComponent(filename)}`}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs hover:shadow-sm transition-all cursor-pointer"
          title="Ask AI questions grounded in this document"
        >
          <Sparkles className="h-3.5 w-3.5 text-[#FFFCF5]/90" />
          <span className="hidden sm:inline">Ask AI</span>
        </Link>

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
