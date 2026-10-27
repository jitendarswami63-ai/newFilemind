import * as React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ className = '', hover = false, ...props }: CardProps) {
  return (
    <div
      className={`glass-panel rounded-2xl overflow-hidden border border-white/10 ${
        hover ? 'glass-panel-hover' : ''
      } ${className}`}
      {...props}
    />
  )
}

export function CardHeader({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 p-5 md:p-6 ${className}`} {...props} />
}

export function CardTitle({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`font-semibold text-slate-100 leading-tight tracking-tight ${className}`} {...props} />
}

export function CardDescription({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs md:text-sm text-slate-400 leading-relaxed ${className}`} {...props} />
}

export function CardContent({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-5 md:p-6 pt-0 ${className}`} {...props} />
}

export function CardFooter({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center p-5 md:p-6 pt-0 border-t border-white/5 ${className}`} {...props} />
}
