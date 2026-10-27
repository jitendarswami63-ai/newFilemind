import React from 'react'
import { DocumentList } from '@/components/documents/DocumentList'
import { UploadZone } from '@/components/documents/UploadZone'
import { FileText } from 'lucide-react'

export default function DocumentsPage() {
  return (
    <div className="space-y-8 sm:space-y-9 w-full max-w-6xl mx-auto">
      {/* Workspace Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0d1017] via-[#10131d] to-[#150f1b] border border-white/10 p-6 sm:p-7 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-[#00d2ff]/60 to-transparent" />
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-br from-[#007ba7]/30 to-[#ff2d95]/20 border border-[#00d2ff]/40 flex items-center justify-center text-[#00d2ff] shadow-[0_0_15px_rgba(0,210,255,0.2)]">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <span>My Documents</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1.5">
              Manage, inspect, and organize your private PDF documents.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-semibold text-emerald-400 self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <span>Vault Encrypted</span>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="space-y-3.5 w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Upload New Document
          </h2>
        </div>
        <UploadZone />
      </div>

      {/* Document Library Grid */}
      <div className="space-y-4 w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[#ff2d95] shadow-[0_0_8px_#ff2d95]" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Document Vault
          </h2>
        </div>
        <DocumentList />
      </div>
    </div>
  )
}
