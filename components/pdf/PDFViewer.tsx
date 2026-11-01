'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, AlertCircle, Clock, ShieldCheck, Tag, Folder, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BiometricUnlockChallenge } from '@/components/auth/BiometricUnlockChallenge'
import type { DocumentStatus } from '@/types'
import { fetchSignedUrlWithCache } from '@/lib/viewer/signed-url-cache'

interface PDFViewerProps {
  documentId: string
  initialStatus: DocumentStatus
  initialEmbeddingStatus?: string | null
  errorMessage?: string | null
  initialCategory?: string | null
  initialTags?: string[] | null
  initialLockedAt?: string | null
  initialPage?: number
  storagePath?: string
  isLocked?: boolean
}

export function PDFViewer({
  documentId,
  initialStatus,
  initialEmbeddingStatus,
  errorMessage: initialError,
  initialCategory,
  initialTags,
  initialLockedAt,
  initialPage,
  storagePath,
  isLocked = false,
}: PDFViewerProps) {
  const [status, setStatus] = useState<DocumentStatus>(initialStatus)
  const [embeddingStatus, setEmbeddingStatus] = useState<string | null>(initialEmbeddingStatus || null)
  const [errorMessage, setErrorMessage] = useState(initialError)
  const [docCategory, setDocCategory] = useState<string | null>(initialCategory || null)
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [processingLockedAt, setProcessingLockedAt] = useState<string | null>(initialLockedAt || null)

  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(initialStatus === 'completed')
  const [isExpired, setIsExpired] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [showPendingRetry, setShowPendingRetry] = useState(false)
  const [isStaleLock, setIsStaleLock] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
  const [reindexing, setReindexing] = useState(false)
  const [reindexMessage, setReindexMessage] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen((prev) => !prev)
      })
    } else {
      document.exitFullscreen().catch(() => {
        setIsFullscreen(false)
      })
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  useEffect(() => {
    return () => {
      if (signedUrl && signedUrl.startsWith('blob:')) {
        URL.revokeObjectURL(signedUrl)
      }
    }
  }, [signedUrl])

  const reloadSignedUrl = useCallback(async () => {
    setLoading(true)
    setIsExpired(false)
    setFetchError(null)

    try {
      if (isLocked) {
        const testRes = await fetch(`/api/documents/${documentId}/view`, { method: 'HEAD' })
        if (testRes.status === 403) {
          setIsExpired(true)
          setLoading(false)
          return
        }
        setSignedUrl(`/api/documents/${documentId}/view?t=${Date.now()}`)
      } else {
        const url = await fetchSignedUrlWithCache(documentId, storagePath)
        setSignedUrl(url)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFetchError(err.message)
      } else {
        setFetchError('Error loading document.')
      }
    } finally {
      setLoading(false)
    }
  }, [documentId, storagePath, isLocked])

  useEffect(() => {
    if (status !== 'pending') {
      return
    }

    const timer = setTimeout(() => {
      setShowPendingRetry(true)
    }, 15000)

    return () => clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (status !== 'processing' || !processingLockedAt) {
      return
    }

    const checkStale = () => {
      const lockTime = new Date(processingLockedAt).getTime()
      setIsStaleLock(Date.now() - lockTime > 10 * 60 * 1000)
    }

    checkStale()
    const timer = setInterval(checkStale, 10000)
    return () => clearInterval(timer)
  }, [status, processingLockedAt])

  useEffect(() => {
    if (status === 'completed') {
      const timer = setTimeout(() => {
        reloadSignedUrl()
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [status, reloadSignedUrl])

  useEffect(() => {
    if (status === 'completed' || status === 'failed') {
      return
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.status && data.status !== status) {
          setStatus(data.status)
          if (data.embedding_status) setEmbeddingStatus(data.embedding_status)
          if (data.error_message) setErrorMessage(data.error_message)
          if (data.doc_category) setDocCategory(data.doc_category)
          if (data.tags) setTags(data.tags)
          if (data.processing_locked_at) setProcessingLockedAt(data.processing_locked_at)
        }
      } catch {}
    }, 3000)

    return () => clearInterval(interval)
  }, [status, documentId])

  const handleRetry = async () => {
    setRetrying(true)
    setRetryMessage(null)

    try {
      const res = await fetch(`/api/documents/${documentId}/process`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to trigger processing')
      }

      setStatus('processing')
      setShowPendingRetry(false)
      setIsStaleLock(false)
      setRetryMessage('Processing initiated successfully...')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRetryMessage(err.message)
      } else {
        setRetryMessage('Failed to retry processing.')
      }
    } finally {
      setRetrying(false)
    }
  }

  const handleReindex = async () => {
    setReindexing(true)
    setReindexMessage(null)

    try {
      const res = await fetch(`/api/documents/${documentId}/reindex`, {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to reindex document')
      }

      setEmbeddingStatus('processing')
      setReindexMessage('Reindexing started...')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setReindexMessage(err.message)
      } else {
        setReindexMessage('Failed to trigger reindexing.')
      }
    } finally {
      setReindexing(false)
    }
  }

  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] p-8 text-center relative overflow-hidden shadow-2xs">
        <div className="relative mb-5">
          <div className="h-14 w-14 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] flex items-center justify-center text-[#B45309]">
            <Clock className="h-7 w-7 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A878] opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#9C7D47]" />
          </span>
        </div>

        <h3 className="text-lg font-bold text-[#292720] mb-1.5">Document Pending</h3>
        <p className="text-xs sm:text-sm text-[#777064] max-w-md mb-6 leading-relaxed">
          Your document is securely uploaded to private storage and queued for AI analysis.
        </p>

        {showPendingRetry ? (
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              size="sm"
              variant="primary"
              className="gap-2 rounded-xl"
            >
              {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Process Now</span>
            </Button>
            {retryMessage && <span className="text-xs font-medium text-[#B45309]">{retryMessage}</span>}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-medium text-[#777064]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9C7D47]" />
            <span>Waiting for background worker...</span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] p-8 text-center relative overflow-hidden shadow-2xs">
        <div className="relative mb-5">
          <div className="h-14 w-14 rounded-2xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A878] opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#9C7D47]" />
          </span>
        </div>

        <h3 className="text-lg font-bold text-[#292720] mb-1.5">Analyzing document...</h3>
        <p className="text-xs sm:text-sm text-[#777064] max-w-md mb-6 leading-relaxed">
          AI is extracting text, synthesizing metadata, and building vector index.
        </p>

        {isStaleLock ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-[#B45309] max-w-xs font-medium">
              Processing appears stalled (locked for &gt; 10 minutes). You can reclaim the lease and retry.
            </p>
            <Button
              onClick={handleRetry}
              disabled={retrying}
              size="sm"
              variant="secondary"
              className="gap-2 border-[#FDE68A] text-[#B45309] hover:bg-[#FEF8EC] rounded-xl"
            >
              {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Retry Processing</span>
            </Button>
            {retryMessage && <span className="text-xs text-[#B91C1C] font-medium">{retryMessage}</span>}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-medium text-[#777064]">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#9C7D47]" />
            <span>Polling status every 3 seconds</span>
          </div>
        )}
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#FDF2F2] rounded-2xl border border-[#F8D7DA] p-8 text-center relative overflow-hidden shadow-2xs">
        <div className="h-14 w-14 rounded-2xl bg-[#FFFCF5] border border-[#F8D7DA] text-[#B91C1C] flex items-center justify-center mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-[#292720] mb-1.5">Analysis failed. Please try again.</h3>
        <p className="text-xs sm:text-sm text-[#B91C1C] max-w-md mb-6 leading-relaxed">
          {errorMessage || 'An error occurred during AI analysis.'}
        </p>

        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleRetry}
            disabled={retrying}
            size="sm"
            variant="primary"
            className="gap-2 rounded-xl"
          >
            {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>Retry Processing</span>
          </Button>
          {retryMessage && <span className="text-xs text-[#9C7D47] font-medium">{retryMessage}</span>}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] bg-[#FFFCF5] rounded-2xl border border-[#E5DED1] p-8 shadow-2xs">
        <div className="rounded-full border-2 border-[#E5DED1] border-t-[#9C7D47] animate-spin h-8 w-8 mb-4" />
        <span className="text-sm text-[#292720] font-medium tracking-wide">Securing encrypted session token...</span>
        <span className="text-xs text-[#777064] mt-1">Generating signed URL with Supabase Storage</span>
      </div>
    )
  }

  if (isExpired) {
    if (isLocked) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
          <BiometricUnlockChallenge
            documentId={documentId}
            onUnlocked={() => {
              setIsExpired(false)
              reloadSignedUrl()
            }}
          />
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-[#FEF8EC] rounded-2xl border border-[#FDE68A] p-8 text-center shadow-2xs">
        <div className="h-14 w-14 rounded-2xl bg-[#FFFCF5] border border-[#FDE68A] text-[#B45309] flex items-center justify-center mb-4">
          <Clock className="h-7 w-7" />
        </div>
        <h3 className="text-lg font-bold text-[#292720] mb-1.5">Session Expired</h3>
        <p className="text-xs sm:text-sm text-[#777064] max-w-sm mb-6 leading-relaxed">
          For your security, private document tokens expire after 5 minutes. Refresh to re-authenticate.
        </p>
        <Button onClick={reloadSignedUrl} size="sm" variant="primary" className="gap-2 rounded-xl">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Click to reload</span>
        </Button>
      </div>
    )
  }

  if (fetchError || !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] rounded-2xl border border-[#F8D7DA] p-8 text-center bg-[#FDF2F2] shadow-2xs">
        <AlertCircle className="h-9 w-9 text-[#B91C1C] mb-3" />
        <p className="text-sm font-semibold text-[#B91C1C] max-w-sm mb-5">{fetchError || 'Unable to display PDF.'}</p>
        <Button onClick={reloadSignedUrl} size="sm" variant="secondary" className="rounded-xl">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] h-screen w-screen bg-[#F3EFE5] rounded-none border-none overflow-hidden'
          : 'rounded-2xl border border-[#E5DED1] bg-[#FFFCF5] shadow-2xs overflow-hidden'
      }`}
    >
      <div className="min-h-12 px-5 py-2.5 bg-[#FFFCF5] border-b border-[#E5DED1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#777064] select-none">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-2 font-medium text-[#292720]">
            <ShieldCheck className="h-4 w-4 text-[#9C7D47]" />
            <span>Encrypted Reader View</span>
          </span>

          {docCategory && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAF5EC] text-[#777064] border border-[#E5DED1]">
              <Folder className="h-3 w-3 text-[#777064]" />
              <span>{docCategory}</span>
            </span>
          )}

          {initialPage && initialPage > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAF5EC] text-[#9C7D47] border border-[#E5DED1]">
              <span>Page {initialPage}</span>
            </span>
          )}

          {tags && tags.length > 0 && (
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-[#777064] bg-[#FAF5EC] border border-[#E5DED1]"
                >
                  <Tag className="h-3 w-3 text-[#777064]" />
                  <span>{tag}</span>
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-[#777064]">+{tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-[#777064] hidden sm:inline">
            {isLocked ? 'Biometric lease active (15 min)' : 'Token valid for 5 min'}
          </span>

          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#292720] hover:bg-[#FAF5EC] bg-[#FFFCF5] border border-[#E5DED1] active:scale-95 transition-colors cursor-pointer shadow-2xs"
            title={isFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-[#777064]" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-[#777064]" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {status === 'completed' && embeddingStatus === 'failed' && (
        <div className="px-5 py-2.5 bg-[#FEF8EC] border-b border-[#FDE68A] flex flex-wrap items-center justify-between gap-3 text-xs text-[#B45309]">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-[#B45309] shrink-0" />
            <span>Document text was extracted, but search indexing failed. AI search and Ask AI are unavailable for this document.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleReindex}
              disabled={reindexing}
              size="sm"
              variant="secondary"
              className="h-7 text-xs gap-1.5 border-[#FDE68A] text-[#B45309] hover:bg-[#FEF8EC] rounded-lg bg-[#FFFCF5]"
            >
              {reindexing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              <span>Retry Indexing</span>
            </Button>
            {reindexMessage && <span className="text-[11px] text-[#B45309]">{reindexMessage}</span>}
          </div>
        </div>
      )}

      <div className={`w-full ${isFullscreen ? 'flex-1 h-[calc(100vh-48px)]' : 'h-[75vh] md:h-[82vh]'} bg-[#F3EFE5]`}>
        <iframe
          src={initialPage && initialPage > 0 ? `${signedUrl}#page=${initialPage}` : signedUrl}
          className="w-full h-full border-none"
          title="PDF Document Viewer"
        />
      </div>
    </div>
  )
}
