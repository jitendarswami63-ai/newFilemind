import React from 'react'
import { Loader2 } from 'lucide-react'
import type { DocumentStatus } from '@/types'

export type { DocumentStatus }

interface StatusBadgeProps {
  status: DocumentStatus
  embeddingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | null
}

export function StatusBadge({ status, embeddingStatus }: StatusBadgeProps) {
  const isIndexingFailed = status === 'completed' && embeddingStatus === 'failed'
  const isIndexingProcessing = status === 'completed' && (embeddingStatus === 'processing' || embeddingStatus === 'pending')

  const configs = {
    pending: {
      label: 'Pending',
      className: 'bg-[#FEF8EC] text-[#B45309] border-[#FDE68A]',
      dotColor: 'bg-[#D97706] animate-pulse',
      isSpinning: false,
    },
    processing: {
      label: 'Analyzing document...',
      className: 'bg-[#FAF5EC] text-[#9C7D47] border-[#E5DED1]',
      dotColor: '',
      isSpinning: true,
    },
    completed: {
      label: 'Ready',
      className: 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]',
      dotColor: 'bg-[#1E7E34]',
      isSpinning: false,
    },
    indexing_processing: {
      label: 'Indexing search...',
      className: 'bg-[#FAF5EC] text-[#856837] border-[#E5DED1]',
      dotColor: '',
      isSpinning: true,
    },
    indexing_failed: {
      label: 'Indexing Failed',
      className: 'bg-[#FEF8EC] text-[#B45309] border-[#FDE68A]',
      dotColor: 'bg-[#D97706]',
      isSpinning: false,
    },
    failed: {
      label: 'Failed',
      className: 'bg-[#FDF2F2] text-[#B91C1C] border-[#F8D7DA]',
      dotColor: 'bg-[#DC2626]',
      isSpinning: false,
    },
  }

  let configKey: keyof typeof configs = status
  if (isIndexingFailed) {
    configKey = 'indexing_failed'
  } else if (isIndexingProcessing) {
    configKey = 'indexing_processing'
  }

  const current = configs[configKey] || configs.pending

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border select-none transition-colors ${current.className}`}
    >
      {current.isSpinning ? (
        <Loader2 className="h-3 w-3 animate-spin text-current" />
      ) : (
        <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${current.dotColor}`} />
      )}
      <span>{current.label}</span>
    </span>
  )
}
