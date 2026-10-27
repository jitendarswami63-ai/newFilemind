'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  RotateCcw,
  X,
  Layers,
  Plus,
  Trash2,
  FileText,
} from 'lucide-react'
import {
  MAX_FILE_SIZE_MB,
  MAX_BATCH_FILES,
} from '@/lib/constants'
import { formatFileSize } from '@/lib/utils'
import { BatchUploadManager, BatchFileItem } from '@/lib/upload/batch-upload-manager'

interface UploadZoneProps {
  onUploadComplete?: (documentId: string) => void
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [items, setItems] = useState<BatchFileItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [batchNotice, setBatchNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [manager] = useState(() => new BatchUploadManager())

  useEffect(() => {
    const unsubscribe = manager.subscribe((updatedItems) => {
      setItems(updatedItems)
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

  // Notify parent & global listener on document completions
  const completedIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    items.forEach((item) => {
      if (item.status === 'completed' && item.documentId && !completedIdsRef.current.has(item.documentId)) {
        completedIdsRef.current.add(item.documentId)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('filemind:documents-updated', { detail: { documentId: item.documentId } }))
        }
        if (onUploadComplete) {
          onUploadComplete(item.documentId)
        }
      }
    })
  }, [items, onUploadComplete])

  // Batch Statistics
  const { totalCount, completedCount, failedCount, activeCount, overallProgress } = useMemo(() => {
    const total = items.length
    if (total === 0) {
      return { totalCount: 0, completedCount: 0, failedCount: 0, activeCount: 0, overallProgress: 0 }
    }

    let progressSum = 0
    let completed = 0
    let failed = 0
    let active = 0

    items.forEach((i) => {
      switch (i.status) {
        case 'completed':
          completed++
          progressSum += 100
          break
        case 'failed':
          failed++
          progressSum += 100
          break
        case 'secured':
          active++
          progressSum += 90
          break
        case 'processing':
          active++
          progressSum += 95
          break
        case 'confirming':
          active++
          progressSum += 88
          break
        case 'uploading':
          active++
          progressSum += i.uploadProgress
          break
        case 'preparing':
          active++
          progressSum += 15
          break
        case 'validating':
          active++
          progressSum += 5
          break
        case 'queued':
        default:
          progressSum += 0
          break
      }
    })

    const overall = Math.min(100, Math.round(progressSum / total))
    return {
      totalCount: total,
      completedCount: completed,
      failedCount: failed,
      activeCount: active,
      overallProgress: overall,
    }
  }, [items])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enqueueFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      enqueueFiles(Array.from(e.target.files))
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const enqueueFiles = (rawFiles: File[]) => {
    setBatchNotice(null)
    const pdfFiles = rawFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )

    if (pdfFiles.length === 0) {
      setBatchNotice('No standard PDF files selected. Please select PDF documents.')
      return
    }

    if (rawFiles.length > pdfFiles.length) {
      setBatchNotice(`Ignored ${rawFiles.length - pdfFiles.length} non-PDF files.`)
    }

    const result = manager.addFiles(pdfFiles)
    if (result.message) {
      setBatchNotice(result.message)
    }
  }

  const renderStatusBadge = (item: BatchFileItem) => {
    switch (item.status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-400 font-mono">
            Queued
          </span>
        )
      case 'validating':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#007ba7]/20 border border-[#00d2ff]/30 text-[11px] text-[#00d2ff] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#00d2ff]" />
            Verifying
          </span>
        )
      case 'preparing':
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#007ba7]/20 border border-[#00d2ff]/40 text-[11px] text-[#00d2ff] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#00d2ff]" />
            Uploading {item.uploadProgress}%
          </span>
        )
      case 'confirming':
      case 'secured':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Secured
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff2d95]/20 border border-[#ff2d95]/40 text-[11px] text-[#ff5ca8] font-medium animate-pulse">
            <Loader2 className="h-3 w-3 animate-spin text-[#ff2d95]" />
            AI Indexing...
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[11px] text-emerald-300 font-medium">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            Ready
          </span>
        )
      case 'failed':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#ff2d95]/25 border border-[#ff2d95]/50 text-[11px] text-[#ff5ca8] font-medium"
            title={item.error || 'Upload failed'}
          >
            <AlertCircle className="h-3 w-3 text-[#ff2d95]" />
            Failed
          </span>
        )
    }
  }

  return (
    <div className="w-full space-y-4">
      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="application/pdf"
        multiple
        className="hidden"
      />

      {/* Primary Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF documents"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
          items.length > 0 ? 'p-6 sm:p-7' : 'p-9 sm:p-12 md:p-14'
        } flex flex-col items-center justify-center text-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007ba7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] ${
          isDragOver
            ? 'border-[#ff2d95] bg-gradient-to-b from-[#1f0f1b]/95 to-[#130a12]/95 scale-[1.01] shadow-[0_0_40px_-5px_rgba(255,45,149,0.35)]'
            : 'border-white/20 bg-gradient-to-b from-[#0f121d]/90 via-[#0b0d14]/90 to-[#08090f]/90 hover:border-[#00d2ff]/70 hover:from-[#0e1422]/90 hover:to-[#0f111c]/90 shadow-[0_4px_30px_rgba(0,0,0,0.6)]'
        }`}
      >
        <div className="absolute inset-0 bg-radial-gradient from-[#007ba7]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-3.5 max-w-lg">
          <div
            className={`relative rounded-2xl flex items-center justify-center transition-all duration-300 ${
              items.length > 0 ? 'h-12 w-12' : 'h-18 w-18 sm:h-20 sm:w-20 rounded-3xl'
            } ${
              isDragOver
                ? 'bg-[#ff2d95]/25 text-[#ff2d95] scale-110 shadow-[0_0_35px_rgba(255,45,149,0.4)] border border-[#ff2d95]/60'
                : 'bg-gradient-to-br from-[#007ba7]/30 via-[#00d2ff]/15 to-[#ff2d95]/20 border border-[#00d2ff]/40 text-[#00d2ff] shadow-[0_0_30px_rgba(0,210,255,0.25)] group-hover:scale-105 group-hover:border-[#00d2ff] group-hover:shadow-[0_0_40px_rgba(0,210,255,0.4)]'
            }`}
          >
            {items.length > 0 ? (
              <Plus className="h-6 w-6" />
            ) : (
              <UploadCloud className="h-9 w-9 sm:h-10 sm:w-10" />
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-base sm:text-lg font-bold text-white tracking-tight">
              {isDragOver
                ? 'Drop PDF documents to add to batch'
                : items.length > 0
                ? 'Drop more PDF files to expand batch'
                : 'Drag and drop PDF files here'}
            </p>

            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-slate-400">or</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] hover:bg-white/10 border border-white/15 text-xs font-semibold text-slate-200 group-hover:border-[#00d2ff]/50 group-hover:text-white transition-all shadow-sm">
                <FileCheck className="h-3.5 w-3.5 text-[#00d2ff]" />
                <span>{items.length > 0 ? 'Select more files' : 'Browse files'}</span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-white/[0.08] w-full text-xs">
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-slate-300 font-medium">
              PDF up to {MAX_FILE_SIZE_MB} MB
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#00d2ff] font-medium flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Up to {MAX_BATCH_FILES} files / batch
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Direct Storage Vault
            </span>
          </div>
        </div>
      </div>

      {/* Batch Feedback Notice */}
      {batchNotice && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#ff2d95]/15 border border-[#ff2d95]/30 text-xs text-[#ff5ca8]">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {batchNotice}
          </span>
          <button
            onClick={() => setBatchNotice(null)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Active Batch Manifest Dashboard */}
      {items.length > 0 && (
        <div className="rounded-2xl bg-[#0d1017]/95 border border-white/15 overflow-hidden shadow-2xl backdrop-blur-md">
          {/* Header Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Batch Queue</span>
                  <span className="text-xs font-mono font-normal text-slate-400">
                    ({completedCount}/{totalCount} processed • {overallProgress}%)
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Max 4 concurrent uploads • Max 2 AI indexing jobs • Direct vault isolation
              </p>
            </div>

            {/* Global Batch Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => manager.retryAllFailed()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff2d95]/20 hover:bg-[#ff2d95]/30 border border-[#ff2d95]/40 text-xs font-semibold text-[#ff5ca8] transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry Failed ({failedCount})</span>
                </button>
              )}

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={() => manager.clearCompleted()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Clear Completed</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => manager.cancelAll()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Dismiss Batch</span>
              </button>
            </div>
          </div>

          {/* Master Progress Bar */}
          <div className="px-4 sm:px-5 py-3 border-b border-white/5 bg-black/20">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-slate-300">
                {activeCount > 0
                  ? `Active transfers & analysis in progress (${activeCount} active)`
                  : completedCount === totalCount
                  ? 'All documents processed successfully'
                  : 'Batch idle'}
              </span>
              <span className="font-mono text-[#00d2ff] font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden border border-white/10 shadow-inner">
              <div
                className="bg-gradient-to-r from-[#007ba7] via-[#00d2ff] to-[#ff2d95] h-full transition-all duration-300 rounded-full shadow-[0_0_12px_rgba(0,210,255,0.5)]"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* Scrollable File List */}
          <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-white/[0.06] p-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl hover:bg-white/[0.02] transition-colors gap-3"
              >
                {/* Left: Icon & File Meta */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-lg bg-[#007ba7]/15 border border-[#00d2ff]/30 flex items-center justify-center flex-shrink-0 text-[#00d2ff]">
                    <FileText className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono">{formatFileSize(item.size)}</span>
                      {item.error && (
                        <>
                          <span>•</span>
                          <span className="text-[#ff5ca8] truncate max-w-[220px] sm:max-w-xs" title={item.error}>
                            {item.error}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Active Upload Progress Line */}
                    {item.status === 'uploading' && (
                      <div className="w-full bg-white/10 rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className="bg-[#00d2ff] h-full transition-all duration-200"
                          style={{ width: `${item.uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Status Pill & Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderStatusBadge(item)}

                  {item.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => manager.retryItem(item.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-[#00d2ff] hover:bg-white/10 transition-colors cursor-pointer"
                      title="Retry upload"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => manager.cancelItem(item.id)}
                    className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    title="Remove item"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
