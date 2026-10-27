import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#007ba7]/20 text-[#38bdf8] border-[#007ba7]/40 shadow-[0_0_10px_rgba(0,123,167,0.15)]',
    secondary: 'bg-[#12141e] text-slate-200 border-white/15',
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    danger: 'bg-[#ff2d95]/15 text-[#ff5ca8] border-[#ff2d95]/35 shadow-[0_0_10px_rgba(255,45,149,0.15)]',
    outline: 'bg-transparent text-slate-300 border-white/15',
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold select-none transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
