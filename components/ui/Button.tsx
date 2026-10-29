import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315C4C]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F7F6F3] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]'

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-5 text-sm gap-2.5',
    }

    const variantStyles = {
      primary:
        'bg-[#315C4C] hover:bg-[#26493C] text-white shadow-sm border border-[#26493C]',
      secondary:
        'bg-white hover:bg-[#F2F1ED] text-[#242424] border border-[#E7E5E0] shadow-sm hover:border-[#D4D1C9]',
      outline:
        'bg-transparent hover:bg-[#F2F1ED] text-[#242424] border border-[#E7E5E0] hover:border-[#D4D1C9]',
      ghost:
        'bg-transparent hover:bg-[#EAE8E3]/60 text-[#77756F] hover:text-[#242424]',
      danger:
        'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300',
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
