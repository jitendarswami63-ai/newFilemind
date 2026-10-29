import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#EAE8E3] text-[#242424] border-[#D8D6CE]',
    secondary: 'bg-[#F2F1ED] text-[#57564F] border-[#E2E0D8]',
    success: 'bg-[#EBF2EE] text-[#2A5443] border-[#D4E3DB]',
    warning: 'bg-[#FEF7EC] text-[#8C5E1E] border-[#F5E2C4]',
    danger: 'bg-[#FDF0EE] text-[#9C3A33] border-[#F5D6D2]',
    outline: 'bg-transparent text-[#77756F] border-[#E7E5E0]',
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium select-none transition-colors ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
