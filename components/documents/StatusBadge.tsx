import React from 'react'
import { Loader2 } from 'lucide-react'
import type { DocumentStatus } from '@/types'

export type { DocumentStatus }

interface StatusBadgeProps {
  status: DocumentStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const configs = {
    pending: {
      label: 'Pending',
      className: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
      dotColor: 'bg-amber-400 animate-pulse',
    },
    processing: {
      label: 'Analyzing document...',
      className: 'bg-[#007ba7]/15 text-[#00d2ff] border-[#007ba7]/30',
      dotColor: '',
    },
    completed: {
      label: 'Ready',
      className: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
      dotColor: 'bg-emerald-400',
    },
    failed: {
      label: 'Failed',
      className: 'bg-[#ff2d95]/15 text-[#ff5ca8] border-[#ff2d95]/30',
      dotColor: 'bg-[#ff2d95]',
    },
  }

  const config = configs[status] || configs.pending

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border select-none ${config.className}`}
    >
      {status === 'processing' ? (
        <Loader2 className="w-3 h-3 animate-spin text-[#00d2ff]" />
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
      )}
      {config.label}
    </span>
  )
}
