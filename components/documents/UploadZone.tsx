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
  Plus,
  Trash2,
  FileText,
  Lock,
  Crown,
} from 'lucide-react'
import {
  MAX_FILE_SIZE_MB,
  MAX_BATCH_FILES,
} from '@/lib/constants'
import { formatFileSize } from '@/lib/utils'
import { BatchUploadManager, BatchFileItem } from '@/lib/upload/batch-upload-manager'
import { useUserPlan } from '@/lib/subscription/plan'
import { useUpgradeModal } from '@/components/subscription/UpgradeModalContext'
import { PLAN_CONFIGS } from '@/lib/subscription/plans'
import { detectFileFormat, isDangerousFile } from '@/lib/files/file-types'
import { getFileIconForFilename } from '@/lib/files/file-icons'

interface UploadZoneProps {
  onUploadComplete?: (documentId: string) => void
  compact?: boolean
  className?: string
}

export function UploadZone({ onUploadComplete, compact = false, className = '' }: UploadZoneProps) {
  const [items, setItems] = useState<BatchFileItem[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const [batchNotice, setBatchNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [manager] = useState(() => new BatchUploadManager())

  const { tier, isPro, isElite } = useUserPlan()
  const { openUpgradeModal } = useUpgradeModal()

  const currentPlanConfig = PLAN_CONFIGS[tier] || PLAN_CONFIGS.free
  const allowedFileSizeMB = currentPlanConfig.maxFileSizeMB
  const allowedBatchFiles = currentPlanConfig.maxBatchFiles
  const allowedFileSizeBytes = currentPlanConfig.maxFileSizeBytes

  useEffect(() => {
    const unsubscribe = manager.subscribe((updatedItems) => {
      setItems(updatedItems)
    })

    return () => {
      unsubscribe()
    }
  }, [manager])

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
          progressSum += 0
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
      e.target.value = ''
    }
  }

  const enqueueFiles = (newFiles: File[]) => {
    setBatchNotice(null)

    const dangerousList = newFiles.filter((f) => isDangerousFile(f.name).dangerous)
    if (dangerousList.length > 0) {
      setBatchNotice(
        `Security alert: ${dangerousList.length} executable or hazardous file(s) skipped for safety (${dangerousList.map(f => f.name).slice(0, 2).join(', ')}).`
      )
    }

    const safeFiles = newFiles.filter((f) => !isDangerousFile(f.name).dangerous)
    if (safeFiles.length === 0) return

    const oversizeFile = safeFiles.find((f) => f.size > allowedFileSizeBytes)
    if (oversizeFile) {
      const targetTier = tier === 'free' ? 'pro' : 'elite'
      const fileSizeMB = (oversizeFile.size / (1024 * 1024)).toFixed(1)
      setBatchNotice(
        `"${oversizeFile.name}" is ${fileSizeMB} MB, exceeding your ${currentPlanConfig.name} limit (${allowedFileSizeMB} MB).`
      )
      openUpgradeModal({
        targetTier,
        featureName: `${targetTier === 'elite' ? '49 MB' : '25 MB'} File Upload Limit`,
      })
      return
    }

    const remainingSlots = Math.max(0, allowedBatchFiles - items.length)
    if (safeFiles.length > remainingSlots) {
      const targetTier = tier === 'free' ? 'pro' : 'elite'
      setBatchNotice(
        `Your plan limit is ${allowedBatchFiles} files per batch. Upgrade to upload more files simultaneously.`
      )
      if (tier !== 'elite') {
        openUpgradeModal({
          targetTier,
          featureName: `${targetTier === 'elite' ? '150' : '100'} Files Per Batch`,
        })
      }
    }

    const accepted = safeFiles.slice(0, remainingSlots)
    if (accepted.length > 0) {
      manager.addFiles(accepted)
    }
  }

  const renderStatusBadge = (item: BatchFileItem) => {
    switch (item.status) {
      case 'queued':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#777064] font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-[#777064]" />
            Queued
          </span>
        )
      case 'validating':
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#9C7D47] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#9C7D47]" />
            Preparing...
          </span>
        )
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#9C7D47] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#9C7D47]" />
            Uploading {item.uploadProgress}%
          </span>
        )
      case 'confirming':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#856837] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#856837]" />
            Confirming...
          </span>
        )
      case 'secured':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FEF8EC] border border-[#FDE68A] text-[11px] text-[#B45309] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#B45309]" />
            Queued for AI...
          </span>
        )
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-[11px] text-[#9C7D47] font-medium">
            <Loader2 className="h-3 w-3 animate-spin text-[#9C7D47]" />
            AI Analyzing...
          </span>
        )
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-[11px] text-[#1E7E34] font-medium">
            <CheckCircle2 className="h-3 w-3 text-[#1E7E34]" />
            Ready
          </span>
        )
      case 'failed':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FDF2F2] border border-[#F8D7DA] text-[11px] text-[#B91C1C] font-medium"
            title={item.error || 'Upload failed'}
          >
            <AlertCircle className="h-3 w-3 text-[#B91C1C]" />
            Failed
          </span>
        )
    }
  }

  return (
    <div className="w-full space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        className="hidden"
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload documents and files"
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
        className={`group relative overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-200 ${
          compact
            ? 'p-6 sm:p-7'
            : items.length > 0
            ? 'p-6 sm:p-7'
            : 'p-8 sm:p-10'
        } flex flex-col items-center justify-center text-center cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A878]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3EFE5] ${
          isDragOver
            ? 'border-[#9C7D47] bg-[#FAF5EC] shadow-md ring-4 ring-[#C5A878]/15'
            : 'border-[#DDD5C7] bg-[#FFFCF5] hover:border-[#C5A878] hover:bg-[#FAF5EC] shadow-2xs'
        } ${className}`}
      >
        <div className="relative z-10 flex flex-col items-center gap-3.5 max-w-md w-full">
          <div
            className={`rounded-2xl flex items-center justify-center transition-all duration-200 ${
              compact || items.length > 0 ? 'h-11 w-11' : 'h-14 w-14'
            } ${
              isDragOver
                ? 'bg-[#9C7D47] text-[#FFFCF5] shadow-sm scale-105'
                : 'bg-[#FAF5EC] border border-[#E5DED1] text-[#9C7D47] group-hover:scale-105 group-hover:bg-[#F8F4EA]'
            }`}
          >
            {items.length > 0 ? (
              <Plus className="h-5 w-5" />
            ) : (
              <UploadCloud className="h-7 w-7" />
            )}
          </div>

          <div className="space-y-1">
            <p className="text-sm sm:text-base font-bold text-[#292720] tracking-tight">
              {isDragOver
                ? 'Drop files to add to batch'
                : items.length > 0
                ? 'Drop more files to expand batch'
                : 'Drag and drop any files here'}
            </p>
            <p className="text-xs text-[#777064] font-medium">
              or browse to upload from your computer
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FFFCF5] hover:bg-[#F3EFE5] text-[#292720] text-xs font-semibold shadow-2xs border border-[#E5DED1] hover:border-[#C5A878] transition-all cursor-pointer"
          >
            <FileCheck className="h-3.5 w-3.5 text-[#9C7D47]" />
            <span>{items.length > 0 ? 'Add more files' : 'Select files'}</span>
          </button>

          <div className="pt-2 text-[11px] text-[#777064] border-t border-[#E5DED1] w-full space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-1.5 font-semibold text-[#292720]">
              <span>
                Universal files up to {allowedFileSizeMB} MB • Up to {allowedBatchFiles} files
              </span>
              {!isElite && (
                <button
                  type="button"
                  onClick={() =>
                    openUpgradeModal({
                      targetTier: isPro ? 'elite' : 'pro',
                      featureName: isPro ? '49 MB File Upload Limit' : '25 MB File Upload Limit',
                    })
                  }
                  className="inline-flex items-center gap-1 text-[10px] text-[#9C7D47] hover:text-[#856837] underline font-bold cursor-pointer transition-colors"
                >
                  <Lock className="h-2.5 w-2.5" />
                  <span>Unlock {isPro ? '49 MB (Elite)' : '25 MB (Pro)'}</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#777064] leading-normal">
              Documents are automatically processed and indexed for AI search & grounded question answering.
            </p>
          </div>
        </div>
      </div>

      {batchNotice && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#FEF8EC] border border-[#FDE68A] text-xs text-[#B45309]">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {batchNotice}
          </span>
          <button
            onClick={() => setBatchNotice(null)}
            className="text-[#B45309] hover:text-[#292720] p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="rounded-3xl bg-[#FFFCF5] border border-[#E5DED1] overflow-hidden shadow-2xs">
          <div className="p-4 sm:p-5 border-b border-[#E5DED1] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8F4EA]">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-[#C5A878]" />
                <h3 className="text-sm sm:text-base font-bold text-[#292720] tracking-tight flex items-center gap-2">
                  <span>Batch Queue</span>
                  <span className="text-xs font-mono font-normal text-[#777064]">
                    ({completedCount}/{totalCount} processed • {overallProgress}%)
                  </span>
                </h3>
              </div>
              <p className="text-xs text-[#777064]">
                Max 4 concurrent uploads • Max 2 AI indexing jobs • Direct vault isolation
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {failedCount > 0 && (
                <button
                  type="button"
                  onClick={() => manager.retryAllFailed()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FDF2F2] hover:bg-[#FCE8E8] border border-[#F8D7DA] text-xs font-semibold text-[#B91C1C] transition-all cursor-pointer shadow-2xs active:scale-95"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry Failed ({failedCount})</span>
                </button>
              )}

              {completedCount > 0 && (
                <button
                  type="button"
                  onClick={() => manager.clearCompleted()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFCF5] hover:bg-[#F3EFE5] border border-[#E5DED1] text-xs font-medium text-[#292720] transition-all cursor-pointer shadow-2xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#1E7E34]" />
                  <span>Clear Completed</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => manager.cancelAll()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFCF5] hover:bg-[#F3EFE5] border border-[#E5DED1] text-xs font-medium text-[#777064] hover:text-[#292720] transition-all cursor-pointer shadow-2xs"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Dismiss Batch</span>
              </button>
            </div>
          </div>

          <div className="px-4 sm:px-5 py-3 border-b border-[#E5DED1] bg-[#FFFCF5]">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span className="text-[#777064]">
                {activeCount > 0
                  ? `Active transfers & analysis in progress (${activeCount} active)`
                  : failedCount > 0 && completedCount === 0
                  ? `${failedCount} file${failedCount > 1 ? 's' : ''} failed (retry available)`
                  : completedCount === totalCount
                  ? 'All documents processed successfully'
                  : 'Batch idle'}
              </span>
              <span className="font-mono text-[#9C7D47] font-bold">{overallProgress}%</span>
            </div>
            <div className="w-full bg-[#E5DED1] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#9C7D47] h-full transition-all duration-300 rounded-full"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="max-h-72 sm:max-h-80 overflow-y-auto divide-y divide-[#E5DED1] p-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 rounded-2xl hover:bg-[#FAF5EC] transition-colors gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {(() => {
                    const theme = getFileIconForFilename(item.name)
                    const Icon = theme.icon
                    return (
                      <div className={`h-9 w-9 rounded-xl ${theme.bgColor} border ${theme.borderColor} flex items-center justify-center flex-shrink-0 ${theme.textColor}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    )
                  })()}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-[#292720] truncate" title={item.name}>
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-[#777064] mt-0.5">
                      <span className="font-mono text-[#777064]">{formatFileSize(item.size)}</span>
                      {item.error && (
                        <>
                          <span>•</span>
                          <span className="text-[#B91C1C] truncate max-w-[220px] sm:max-w-xs" title={item.error}>
                            {item.error}
                          </span>
                        </>
                      )}
                    </div>

                    {item.status === 'uploading' && (
                      <div className="w-full bg-[#E5DED1] rounded-full h-1 mt-1.5 overflow-hidden">
                        <div
                          className="bg-[#9C7D47] h-full transition-all duration-200"
                          style={{ width: `${item.uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {renderStatusBadge(item)}

                  {item.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => manager.retryItem(item.id)}
                      className="p-1.5 rounded-lg text-[#777064] hover:text-[#9C7D47] hover:bg-[#FAF5EC] transition-colors cursor-pointer"
                      title="Retry upload"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => manager.cancelItem(item.id)}
                    className="p-1.5 rounded-lg text-[#777064] hover:text-[#292720] hover:bg-[#F8F4EA] transition-colors cursor-pointer"
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
