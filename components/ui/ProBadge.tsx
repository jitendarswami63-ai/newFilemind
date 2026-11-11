'use client'

import React from 'react'
import { Crown, Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'

interface ProBadgeProps {
  variant?: 'gold-pill' | 'dark-chip' | 'minimal' | 'banner' | 'elite-pill'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showIcon?: boolean
  label?: string
  className?: string
  tooltip?: string
}

export function ProBadge({
  variant = 'gold-pill',
  size = 'sm',
  showIcon = true,
  label = 'PRO',
  className = '',
  tooltip,
}: ProBadgeProps) {
  const sizeClasses = {
    xs: 'px-2 py-0.5 text-[9px] gap-1',
    sm: 'px-2.5 py-0.5 text-[10px] gap-1.5',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-4 py-1.5 text-sm gap-2',
  }[size]

  if (variant === 'elite-pill') {
    return (
      <span
        title={tooltip || 'Elite Intelligence Member — Maximum 10 GB Storage & Priority AI Engine'}
        className={`inline-flex items-center rounded-full font-black tracking-widest uppercase bg-[#18191D] border border-[#D4AF37] shadow-[0_0_12px_rgba(212,175,55,0.45)] select-none transition-transform hover:scale-105 cursor-default ${sizeClasses} ${className}`}
      >
        {showIcon && (
          <Crown
            className={`fill-[#F6E27A] text-[#D4AF37] ${
              size === 'xs' ? 'h-2.5 w-2.5' : size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
            }`}
          />
        )}
        <span className="bg-gradient-to-r from-[#F6E27A] via-[#D4AF37] to-[#F3E5AB] bg-clip-text text-transparent font-black">
          {label || 'ELITE'}
        </span>
      </span>
    )
  }

  if (variant === 'dark-chip') {
    return (
      <span
        title={tooltip || 'Pro Intelligence Member — Unlimited AI Document Intelligence'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2A261D] border border-[#C5A878]/60 text-[#F5E6C8] font-bold tracking-wide shadow-xs transition-transform hover:scale-[1.02] cursor-default ${
          size === 'xs' ? 'text-[9px]' : size === 'sm' ? 'text-[10px]' : 'text-xs'
        } ${className}`}
      >
        {showIcon && <Crown className="h-3 w-3 text-[#E6C875] fill-[#E6C875]" />}
        <span className="uppercase tracking-wider">{label}</span>
      </span>
    )
  }

  if (variant === 'minimal') {
    return (
      <span
        title={tooltip || 'Pro Intelligence Member'}
        className={`inline-flex items-center gap-1 font-extrabold text-[#AA771C] ${
          size === 'xs' ? 'text-[10px]' : 'text-xs'
        } ${className}`}
      >
        {showIcon && <Crown className="h-3 w-3 fill-[#AA771C] text-[#8C6212]" />}
        <span>{label}</span>
      </span>
    )
  }

  if (variant === 'banner') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-[#2D281E] via-[#1B1D21] to-[#252015] border border-[#D4AF37]/40 shadow-lg text-[#F5F1E9] ${className}`}
      >
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-[#AA771C] via-[#D4AF37] to-[#F3E5AB] p-[1px] shadow-sm flex-shrink-0">
              <div className="h-full w-full rounded-[11px] bg-[#1B1D21] flex items-center justify-center text-[#F3E5AB]">
                <Crown className="h-5 w-5 fill-[#F3E5AB] text-[#D4AF37]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold tracking-tight text-[#F5F1E9]">
                  Pro Intelligence Member
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#AA771C] text-[#1C180A] text-[10px] font-black uppercase tracking-wider shadow-xs">
                  <Sparkles className="h-2.5 w-2.5 fill-[#1C180A]" />
                  Active
                </span>
              </div>
              <p className="text-xs text-[#C5A878] mt-0.5">
                Unlimited AI analysis • Gemini 3.8 + NVIDIA NIM Fast Lane • WebAuthn Vault
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#2A261D] border border-[#C5A878]/30 text-xs font-semibold text-[#F5E6C8]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#E6C875]" />
              <span>Verified Pro Tier</span>
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Default: gold-pill (luxury gold metallic badge for Pro)
  return (
    <span
      title={tooltip || 'Pro Intelligence Member — Unlimited AI Document Intelligence'}
      className={`inline-flex items-center rounded-full font-black tracking-wider uppercase text-[#1C180A] bg-gradient-to-r from-[#D4AF37] via-[#F6E27A] to-[#AA771C] border border-[#E5C158] shadow-[0_0_10px_rgba(212,175,55,0.35)] select-none transition-transform hover:scale-105 cursor-default ${sizeClasses} ${className}`}
    >
      {showIcon && (
        <Crown
          className={`fill-[#1C180A] text-[#1C180A] ${
            size === 'xs' ? 'h-2.5 w-2.5' : size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
          }`}
        />
      )}
      <span>{label}</span>
    </span>
  )
}
