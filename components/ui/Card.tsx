import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className = '', hover = false, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl overflow-hidden border border-[#E7E5E0] shadow-sm ${
        hover ? 'transition-all duration-150 hover:border-[#D4D1C9] hover:shadow-md' : ''
      } ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-5 md:p-6 ${className}`} {...props} />
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-semibold text-[#242424] leading-tight tracking-tight ${className}`} {...props} />
}

export function CardDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs md:text-sm text-[#77756F] leading-relaxed ${className}`} {...props} />
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 md:p-6 pt-0 ${className}`} {...props} />
}

export function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-5 md:p-6 pt-0 border-t border-[#E7E5E0] ${className}`} {...props} />
}
