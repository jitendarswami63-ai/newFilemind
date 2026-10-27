import React from 'react'

export function LoadingSpinner({
  className = 'h-6 w-6',
  label = 'Loading...',
}: {
  className?: string
  label?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 select-none" role="status">
      <div
        className={`rounded-full border-2 border-[#007ba7]/25 border-t-[#ff2d95] animate-spin ${className}`}
      />
      {label && <span className="text-xs text-slate-400 font-medium tracking-wide">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  )
}
