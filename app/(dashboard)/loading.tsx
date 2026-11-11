import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-pulse" aria-busy="true" aria-label="Loading workspace content">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-3 border-b border-[#E5DED1] pb-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[#E5DED1]/70 rounded-xl" />
          <div className="h-4 w-72 bg-[#E5DED1]/40 rounded-lg" />
        </div>
        <div className="h-7 w-36 bg-[#E5DED1]/50 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        <div className="h-32 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-5 space-y-3">
          <div className="h-4 w-28 bg-[#E5DED1]/60 rounded-md" />
          <div className="h-8 w-16 bg-[#E5DED1]/80 rounded-lg" />
          <div className="h-3 w-36 bg-[#E5DED1]/40 rounded-md" />
        </div>
        <div className="h-32 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-5 space-y-3">
          <div className="h-4 w-28 bg-[#E5DED1]/60 rounded-md" />
          <div className="h-8 w-16 bg-[#E5DED1]/80 rounded-lg" />
          <div className="h-3 w-36 bg-[#E5DED1]/40 rounded-md" />
        </div>
        <div className="h-32 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-5 space-y-3">
          <div className="h-4 w-28 bg-[#E5DED1]/60 rounded-md" />
          <div className="h-8 w-16 bg-[#E5DED1]/80 rounded-lg" />
          <div className="h-3 w-36 bg-[#E5DED1]/40 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 h-64 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-6 space-y-4">
          <div className="h-4 w-32 bg-[#E5DED1]/60 rounded-md" />
          <div className="h-40 rounded-xl bg-[#FAF5EC] border border-dashed border-[#E5DED1]" />
        </div>
        <div className="lg:col-span-7 h-64 rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-6 space-y-4">
          <div className="h-4 w-32 bg-[#E5DED1]/60 rounded-md" />
          <div className="space-y-3">
            <div className="h-12 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]" />
            <div className="h-12 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]" />
            <div className="h-12 rounded-xl bg-[#FAF5EC] border border-[#E5DED1]" />
          </div>
        </div>
      </div>
    </div>
  )
}
