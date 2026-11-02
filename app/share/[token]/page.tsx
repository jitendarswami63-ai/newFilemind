'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import {
  FileText,
  Download,
  ShieldCheck,
  AlertCircle,
  Clock,
  Ban,
} from 'lucide-react'

interface ShareDocMetadata {
  id: string
  filename: string
  fileSize: number | null
  mimeType: string | null
  createdAt: string
}

interface ShareSettings {
  allowDownload: boolean
  expiresAt: string | null
}

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function PublicSharePage() {
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : ''

  const [loading, setLoading] = useState(true)
  const [errorReason, setErrorReason] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [doc, setDoc] = useState<ShareDocMetadata | null>(null)
  const [share, setShare] = useState<ShareSettings | null>(null)

  useEffect(() => {
    if (!token) return

    async function loadSharedDocument() {
      setLoading(true)
      try {
        const res = await fetch(`/api/share/${token}`)
        const data = await res.json()

        if (!res.ok || !data.valid) {
          setErrorReason(data.reason || 'UNKNOWN')
          setErrorMessage(data.error || 'This shared document is no longer accessible.')
          return
        }

        setDoc(data.document)
        setShare(data.share)
      } catch {
        setErrorReason('NETWORK_ERROR')
        setErrorMessage('Failed to connect to FileMind server. Please check your internet connection.')
      } finally {
        setLoading(false)
      }
    }

    loadSharedDocument()
  }, [token])

  const contentUrl = `/api/share/${token}/content`
  const downloadUrl = `/api/share/${token}/content?download=true`

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF5EC] p-4">
        <div className="flex flex-col items-center bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-8 max-w-sm w-full shadow-sm text-center">
          <div className="rounded-full border-2 border-[#E5DED1] border-t-[#9C7D47] animate-spin h-9 w-9 mb-4" />
          <h2 className="text-sm font-semibold text-[#292720]">Loading shared document...</h2>
          <p className="text-xs text-[#777064] mt-1">Verifying secure link authorization</p>
        </div>
      </div>
    )
  }

  if (errorReason || !doc) {
    let icon = <AlertCircle className="h-9 w-9 text-[#B91C1C]" />
    let title = 'Document Not Found'
    let description = errorMessage || 'The requested document link is invalid or does not exist.'

    if (errorReason === 'EXPIRED') {
      icon = <Clock className="h-9 w-9 text-[#B45309]" />
      title = 'Link Expired'
      description = 'This document link has expired and is no longer accessible.'
    } else if (errorReason === 'REVOKED') {
      icon = <Ban className="h-9 w-9 text-[#B91C1C]" />
      title = 'Access Revoked'
      description = 'The document owner has revoked access to this public share link.'
    } else if (errorReason === 'RATE_LIMITED') {
      icon = <Clock className="h-9 w-9 text-[#B45309]" />
      title = 'Rate Limit Exceeded'
      description = 'Too many requests. Please wait a few moments and refresh the page.'
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FAF5EC] p-4">
        <div className="flex flex-col items-center bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-8 max-w-md w-full shadow-sm text-center">
          <div className="mb-4">{icon}</div>
          <h2 className="text-lg font-bold text-[#292720] mb-2">{title}</h2>
          <p className="text-xs sm:text-sm text-[#777064] leading-relaxed mb-6">{description}</p>
          <div className="flex items-center gap-2 text-[11px] text-[#777064] bg-[#FAF5EC] px-3 py-1.5 rounded-full border border-[#E5DED1]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#9C7D47]" />
            <span>Secured with FileMind Private Vault Protection</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#FAF5EC]">
      {/* Top Header */}
      <header className="h-14 border-b border-[#E5DED1] bg-[#FFFCF5] px-4 sm:px-6 flex items-center justify-between shadow-2xs z-10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center flex-shrink-0">
            <FileText className="h-4 w-4 text-[#9C7D47]" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold text-[#292720] truncate" title={doc.filename}>
              {doc.filename}
            </h1>
            <div className="flex items-center gap-2 text-[10px] text-[#777064]">
              {doc.fileSize && <span>{formatBytes(doc.fileSize)}</span>}
              <span>•</span>
              <span className="flex items-center gap-1 text-[#9C7D47]">
                <ShieldCheck className="h-3 w-3" />
                <span>Public Share</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {share?.allowDownload ? (
            <a
              href={downloadUrl}
              download={doc.filename}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#9C7D47] text-white hover:bg-[#866A3B] transition-all text-xs font-semibold shadow-2xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </a>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-[#777064] bg-[#FAF5EC] border border-[#E5DED1] px-2.5 py-1 rounded-full"
              title="The owner has disabled downloads for this link"
            >
              <span>View-Only</span>
            </span>
          )}
        </div>
      </header>

      {/* Embedded PDF Viewer */}
      <main className="flex-1 w-full p-2 sm:p-4 overflow-hidden">
        <div className="h-full w-full rounded-xl border border-[#E5DED1] bg-[#292720]/5 shadow-inner overflow-hidden">
          <iframe
            src={`${contentUrl}#toolbar=0`}
            className="w-full h-full border-none"
            title={doc.filename}
          />
        </div>
      </main>
    </div>
  )
}
