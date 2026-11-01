import * as React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'outline'
}

export function Badge({ className = '', variant = 'default', children, ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-[#FAF5EC] text-[#9C7D47] border-[#E5DED1]',
    secondary: 'bg-[#F8F4EA] text-[#777064] border-[#E5DED1]',
    success: 'bg-[#EBF7EE] text-[#1E7E34] border-[#C3E6CB]',
    warning: 'bg-[#FEF8EC] text-[#B45309] border-[#FDE68A]',
    danger: 'bg-[#FDF2F2] text-[#B91C1C] border-[#F8D7DA]',
    outline: 'bg-transparent text-[#777064] border-[#E5DED1]',
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
