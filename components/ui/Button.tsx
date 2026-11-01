import * as React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A878]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3EFE5] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:scale-[0.98]'

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-5 text-sm gap-2.5',
    }

    const variantStyles = {
      primary:
        'bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] shadow-xs border border-[#856837]',
      secondary:
        'bg-[#FFFCF5] hover:bg-[#F3EFE5] text-[#292720] border border-[#E5DED1] shadow-2xs hover:border-[#DDD5C7]',
      outline:
        'bg-transparent hover:bg-[#FAF5EC] text-[#292720] hover:text-[#9C7D47] border border-[#E5DED1] hover:border-[#C5A878]/60',
      ghost:
        'bg-transparent hover:bg-[#EAE4D6]/70 text-[#777064] hover:text-[#292720]',
      danger:
        'bg-[#FDF2F2] hover:bg-[#FCE8E8] text-[#B91C1C] border border-[#F8D7DA] hover:border-[#F5C2C7]',
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
