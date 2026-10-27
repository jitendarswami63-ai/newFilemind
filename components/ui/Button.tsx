import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00d2ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]'

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
    }

    const variantStyles = {
      primary:
        'bg-gradient-to-r from-[#007ba7] via-[#008dbf] to-[#ff2d95] text-white hover:from-[#008dbf] hover:to-[#ff47a5] shadow-lg shadow-[#ff2d95]/20 hover:shadow-[#ff2d95]/35 border border-white/15 hover:border-white/30 hover:scale-[1.01]',
      secondary:
        'bg-[#12141e] hover:bg-[#1a1d2c] text-slate-200 border border-white/10 hover:border-[#00d2ff]/40 hover:text-white shadow-sm hover:shadow-[0_0_15px_rgba(0,210,255,0.15)]',
      outline:
        'bg-transparent hover:bg-[#007ba7]/15 text-slate-300 border border-[#007ba7]/40 hover:border-[#00d2ff]/70 hover:text-white',
      ghost:
        'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white',
      danger:
        'bg-[#ff2d95]/10 hover:bg-[#ff2d95]/20 text-[#ff5ca8] border border-[#ff2d95]/30 hover:border-[#ff2d95]/60 hover:shadow-[0_0_15px_rgba(255,45,149,0.25)]',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'
