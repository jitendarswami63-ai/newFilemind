import * as React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4 relative overflow-hidden selection:bg-[#ff2d95] selection:text-white">
      {/* Background Micro-Grid Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:28px_28px] opacity-40 pointer-events-none" />

      {/* Background Futuristic Dual Neon Lighting */}
      <div className="absolute -top-32 -left-32 w-[420px] h-[420px] bg-gradient-to-br from-[#007ba7]/30 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[420px] h-[420px] bg-gradient-to-tl from-[#ff2d95]/25 to-transparent rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-[#00d2ff]/5 via-transparent to-[#ff2d95]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  )
}
