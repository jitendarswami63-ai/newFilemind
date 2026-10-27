'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Loader2, RefreshCw, AlertCircle, Clock, ShieldCheck, Tag, Folder, Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { DocumentStatus } from '@/types'
import { fetchSignedUrlWithCache } from '@/lib/viewer/signed-url-cache'

interface PDFViewerProps {
  documentId: string
  initialStatus: DocumentStatus
  errorMessage?: string | null
  initialCategory?: string | null
  initialTags?: string[] | null
  initialLockedAt?: string | null
  initialPage?: number
  storagePath?: string
}

export function PDFViewer({
  documentId,
  initialStatus,
  errorMessage: initialError,
  initialCategory,
  initialTags,
  initialLockedAt,
  initialPage,
  storagePath,
}: PDFViewerProps) {
  const [status, setStatus] = useState<DocumentStatus>(initialStatus)
  const [errorMessage, setErrorMessage] = useState(initialError)
  const [docCategory, setDocCategory] = useState<string | null>(initialCategory || null)
  const [tags, setTags] = useState<string[]>(initialTags || [])
  const [processingLockedAt, setProcessingLockedAt] = useState<string | null>(initialLockedAt || null)

  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(initialStatus === 'completed')
  const [isExpired, setIsExpired] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Shows "Process Now" / "Retry" after 15 seconds in pending
  const [showPendingRetry, setShowPendingRetry] = useState(false)
  const [isStaleLock, setIsStaleLock] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryMessage, setRetryMessage] = useState<string | null>(null)
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

  const reloadSignedUrl = useCallback(async () => {
    setLoading(true)
    setIsExpired(false)
    setFetchError(null)

    try {
      const url = await fetchSignedUrlWithCache(documentId, storagePath)
      setSignedUrl(url)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFetchError(err.message)
      } else {
        setFetchError('Error loading document.')
      }
    } finally {
      setLoading(false)
    }
  }, [documentId, storagePath])

  // Track 15 seconds spent in pending
  useEffect(() => {
    if (status !== 'pending') {
      return
    }

    const timer = setTimeout(() => {
      setShowPendingRetry(true)
    }, 15000)

    return () => clearTimeout(timer)
  }, [status])

  // Track stale processing lock (>10 minutes)
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

  // Poll for document completion if pending or processing
  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`)
        if (res.ok) {
          const doc = await res.json()
          setStatus(doc.status)
          if (doc.error_message) setErrorMessage(doc.error_message)
          if (doc.doc_category) setDocCategory(doc.doc_category)
          if (doc.tags) setTags(doc.tags)
          if (doc.processing_locked_at) setProcessingLockedAt(doc.processing_locked_at)
          if (doc.status === 'completed') {
            clearInterval(interval)
          }
        }
      } catch {
        // Polling error silently handled
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [documentId, status])

  // Load signed URL when status is or becomes completed
  useEffect(() => {
    let cancelled = false

    if (status === 'completed') {
      const loadViewer = async () => {
        try {
          const url = await fetchSignedUrlWithCache(documentId, storagePath)
          if (!cancelled) {
            setSignedUrl(url)
            setIsExpired(false)
            setFetchError(null)
          }
        } catch (err: unknown) {
          if (!cancelled) {
            setFetchError(err instanceof Error ? err.message : 'Error loading document')
          }
        } finally {
          if (!cancelled) {
            setLoading(false)
          }
        }
      }

      loadViewer()
    }

    return () => {
      cancelled = true
    }
  }, [documentId, status, storagePath])

  // 300 seconds expiry timer for viewer signed URL
  useEffect(() => {
    if (!signedUrl) return
    const timer = setTimeout(() => {
      setIsExpired(true)
    }, 300 * 1000)

    return () => clearTimeout(timer)
  }, [signedUrl])

  // Manual retry handler calling POST /api/documents/[id]/retry
  const handleRetry = async () => {
    setRetrying(true)
    setRetryMessage(null)

    try {
      const res = await fetch(`/api/documents/${documentId}/retry`, {
        method: 'POST',
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || 'Retry failed.')
      }

      setStatus('processing')
      setErrorMessage(null)
      setShowPendingRetry(false)
      setIsStaleLock(false)
      setRetryMessage('Processing scheduled.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Retry failed. Please try again.'
      setRetryMessage(msg)
    } finally {
      setRetrying(false)
    }
  }

  // Pending State
  // Pending State
  if (status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-panel rounded-2xl border border-white/10 p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
        <div className="relative mb-5">
          <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500" />
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-1.5">Document Pending</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          Your document is securely uploaded to private storage and queued for multimodal AI analysis.
        </p>

        {showPendingRetry ? (
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleRetry}
              disabled={retrying}
              size="sm"
              className="gap-2 bg-gradient-to-r from-[#007ba7] to-[#ff2d95] hover:from-[#008dbf] hover:to-[#ff47a5] text-white shadow-lg shadow-[#ff2d95]/20 rounded-xl"
            >
              {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Process Now</span>
            </Button>
            {retryMessage && <span className="text-xs font-semibold text-amber-400">{retryMessage}</span>}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            <span>Waiting for background worker...</span>
          </div>
        )}
      </div>
    )
  }

  // Processing State
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-panel rounded-2xl border border-[#007ba7]/40 p-8 text-center relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/60 to-transparent" />
        <div className="relative mb-5">
          <div className="h-16 w-16 rounded-2xl bg-[#007ba7]/20 border border-[#007ba7]/40 flex items-center justify-center text-[#00d2ff] shadow-[0_0_25px_rgba(0,210,255,0.25)]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00d2ff] opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#007ba7]" />
          </span>
        </div>

        <h3 className="text-xl font-bold text-white mb-1.5">Analyzing document...</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          Gemini multimodal AI is reading pages, generating embeddings, and extracting document intelligence.
        </p>

        {isStaleLock ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-amber-300 max-w-xs font-medium">
              Processing appears stalled (locked for &gt; 10 minutes). You can reclaim the lease and retry.
            </p>
            <Button
              onClick={handleRetry}
              disabled={retrying}
              size="sm"
              variant="secondary"
              className="gap-2 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 rounded-xl"
            >
              {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span>Retry Processing</span>
            </Button>
            {retryMessage && <span className="text-xs text-[#ff5ca8]">{retryMessage}</span>}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#00d2ff]" />
            <span>Polling status every 3 seconds</span>
          </div>
        )}
      </div>
    )
  }

  // Failed State
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-panel rounded-2xl border border-[#ff2d95]/40 p-8 text-center relative overflow-hidden bg-[#160a10]/70 shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#ff2d95]/60 to-transparent" />
        <div className="h-16 w-16 rounded-2xl bg-[#ff2d95]/15 border border-[#ff2d95]/35 text-[#ff5ca8] flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(255,45,149,0.2)]">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-[#ff5ca8] mb-1.5">Analysis failed. Please try again.</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
          {errorMessage || 'An error occurred during AI analysis.'}
        </p>

        <div className="flex flex-col items-center gap-2">
          <Button
            onClick={handleRetry}
            disabled={retrying}
            size="sm"
            className="gap-2 bg-gradient-to-r from-[#007ba7] to-[#ff2d95] hover:from-[#008dbf] hover:to-[#ff47a5] text-white shadow-lg shadow-[#ff2d95]/20 rounded-xl"
          >
            {retrying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            <span>Retry Processing</span>
          </Button>
          {retryMessage && <span className="text-xs text-[#ff5ca8] font-semibold">{retryMessage}</span>}
        </div>
      </div>
    )
  }

  // Loading signed URL for completed document
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] glass-panel rounded-2xl border border-white/10 p-8 shadow-2xl">
        <div className="rounded-full border-2 border-[#007ba7]/25 border-t-[#ff2d95] animate-spin h-9 w-9 mb-4" />
        <span className="text-sm text-slate-300 font-semibold tracking-wide">Securing encrypted session token...</span>
        <span className="text-xs text-slate-500 mt-1">Generating signed URL with Supabase Storage</span>
      </div>
    )
  }

  // Expired State (300s)
  if (isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-panel rounded-2xl border border-amber-500/30 p-8 text-center bg-[#161208]/70 shadow-2xl">
        <div className="h-16 w-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(245,158,11,0.2)]">
          <Clock className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1.5">Session Expired</h3>
        <p className="text-xs sm:text-sm text-slate-300 max-w-sm mb-6 leading-relaxed">
          For your security, private document tokens expire after 5 minutes. Refresh to re-authenticate.
        </p>
        <Button onClick={reloadSignedUrl} size="sm" className="gap-2 rounded-xl bg-gradient-to-r from-[#007ba7] to-[#ff2d95] text-white shadow-md">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Click to reload</span>
        </Button>
      </div>
    )
  }

  // Error State
  if (fetchError || !signedUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] glass-panel rounded-2xl border border-rose-500/30 p-8 text-center bg-[#160a0f]/70 shadow-2xl">
        <AlertCircle className="h-9 w-9 text-rose-400 mb-3" />
        <p className="text-sm font-semibold text-rose-200 max-w-sm mb-5">{fetchError || 'Unable to display PDF.'}</p>
        <Button onClick={reloadSignedUrl} size="sm" variant="secondary" className="rounded-xl">
          Try Again
        </Button>
      </div>
    )
  }

  // Completed State: PDF Workspace Frame with subtle AI Category & Tags
  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-[9999] h-screen w-screen bg-[#0a0a0a] rounded-none border-none overflow-hidden'
          : 'rounded-2xl border border-white/10 glass-panel shadow-2xl overflow-hidden'
      }`}
    >
      {/* Top Meta Bar */}
      <div className="min-h-12 px-5 py-2.5 bg-[#0d0e14]/95 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300 select-none">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-2 font-semibold text-slate-200">
            <ShieldCheck className="h-4 w-4 text-[#00d2ff]" />
            <span>Encrypted Reader View</span>
          </span>

          {/* Subtle Category Badge */}
          {docCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#007ba7]/20 text-[#00d2ff] border border-[#007ba7]/40 shadow-sm">
              <Folder className="h-3 w-3" />
              <span>{docCategory}</span>
            </span>
          )}

          {/* Jumped Page Badge */}
          {initialPage && initialPage > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ff2d95]/20 text-[#ff5ca8] border border-[#ff2d95]/40 shadow-sm">
              <span>Page {initialPage}</span>
            </span>
          )}

          {/* Subtle Tags */}
          {tags && tags.length > 0 && (
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              {tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs text-slate-300 bg-white/5 border border-white/10"
                >
                  <Tag className="h-3 w-3 text-slate-400" />
                  <span>{tag}</span>
                </span>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-slate-400">+{tags.length - 3}</span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">Token valid for 5 min</span>
          
          {/* Full Screen Toggle Button */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 border border-white/15 hover:border-[#00d2ff]/50 active:scale-95 transition-all cursor-pointer shadow-sm"
            title={isFullscreen ? 'Exit Full Screen' : 'View Full Screen'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5 text-[#00d2ff]" />
                <span>Exit Full Screen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5 text-[#00d2ff]" />
                <span>Full Screen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Viewport */}
      <div className={`w-full ${isFullscreen ? 'flex-1 h-[calc(100vh-48px)]' : 'h-[75vh] md:h-[82vh]'} bg-[#0a0a0a]`}>
        <iframe
          src={initialPage && initialPage > 0 ? `${signedUrl}#page=${initialPage}` : signedUrl}
          className="w-full h-full border-none"
          title="PDF Document Viewer"
        />
      </div>
    </div>
  )
}
