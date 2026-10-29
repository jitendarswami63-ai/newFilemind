import React from 'react'

export function LoadingSpinner({
  className = 'h-6 w-6',
  label = 'Loading...',
}: {
  className?: string
  label?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 p-4 select-none" role="status">
      <div
        className={`rounded-full border-2 border-slate-200 border-t-[#315C4C] animate-spin ${className}`}
      />
      {label && <span className="text-xs text-[#77756F] font-medium tracking-wide">{label}</span>}
      <span className="sr-only">{label}</span>
    </div>
  )
}
