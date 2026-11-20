'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin route error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-[#FFFCF5] border border-[#E5DED1] rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <div className="h-12 w-12 mx-auto rounded-xl bg-[#E07A7A]/15 border border-[#E07A7A]/30 flex items-center justify-center text-[#991B1B]">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-base font-bold text-[#292720]">Unable to Load Admin Section</h2>
        <p className="text-xs text-[#777064] leading-relaxed">
          {error?.message || 'An unexpected error occurred while loading this administrative view.'}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#FFFCF5] bg-[#9C7D47] hover:bg-[#856837] transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Try Again</span>
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-[#292720] bg-[#FAF5EC] hover:bg-[#F3EFE5] border border-[#E5DED1] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Control Center</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
