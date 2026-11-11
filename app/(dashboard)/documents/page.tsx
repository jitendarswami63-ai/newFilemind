import React from 'react'
import type { Metadata } from 'next'
import { createClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { DocumentList } from '@/components/documents/DocumentList'
import { UploadZone } from '@/components/documents/UploadZone'
import { VaultMfaUnlockChallenge } from '@/components/auth/VaultMfaUnlockChallenge'
import { FileText, ShieldCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: 'Documents',
}

export default async function DocumentsPage() {
  const [supabase, user] = await Promise.all([
    createClient(),
    getAuthenticatedUser(),
  ])
  const auth = await verifyVaultAccess(supabase, user)

  if (auth.code === 'MFA_REQUIRED') {
    return (
      <div className="space-y-8 sm:space-y-9 w-full max-w-6xl mx-auto">
        <VaultMfaUnlockChallenge factorId={auth.factorId} />
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-9 w-full max-w-6xl mx-auto">
      <div className="relative overflow-hidden rounded-2xl bg-[#FFFCF5] border border-[#E5DED1] p-6 sm:p-7 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#292720] flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-[#FAF5EC] border border-[#E5DED1] flex items-center justify-center text-[#9C7D47]">
                <FileText className="h-6 w-6" />
              </div>
              <span>My Documents</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#777064] mt-1.5">
              Manage, inspect, and organize your private PDF documents.
            </p>
          </div>

          {auth.mfaEnrolled && auth.currentLevel === 'aal2' ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FAF5EC] border border-[#E5DED1] text-xs font-semibold text-[#9C7D47] self-start sm:self-auto">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Vault 2FA (AAL2) Verified</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EBF7EE] border border-[#C3E6CB] text-xs font-semibold text-[#1E7E34] self-start sm:self-auto">
              <span className="h-2 w-2 rounded-full bg-[#1E7E34]" />
              <span>Vault Encrypted</span>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3.5 w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[#C5A878]" />
          <h2 className="text-base sm:text-lg font-bold text-[#292720] tracking-tight">
            Upload New Document
          </h2>
        </div>
        <UploadZone />
      </div>

      <div className="space-y-4 w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-[#C5A878]" />
          <h2 className="text-base sm:text-lg font-bold text-[#292720] tracking-tight">
            Document Vault
          </h2>
        </div>
        <DocumentList />
      </div>
    </div>
  )
}
