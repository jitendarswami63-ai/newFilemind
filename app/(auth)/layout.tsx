import * as React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F3EFE5] text-[#292720] p-4 relative overflow-hidden selection:bg-[#C5A878]/30 selection:text-[#292720]">
      <div className="ambient-glow" aria-hidden="true" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(197,168,120,0.12)_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
