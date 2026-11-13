import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDF_MAGIC_BYTES, ALLOWED_MIME_TYPE } from '@/lib/constants'
import { processDocument } from '@/lib/ai/processor'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { getServerUserEntitlements } from '@/lib/subscription/plan-server'
import { formatBytes } from '@/lib/subscription/plans'
import { sanitizeFilename } from '@/lib/validation/filename'
import { storageService } from '@/lib/storage/storage-service'
import { PDFDocument } from 'pdf-lib'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }
  const user = auth.user!

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const providedDocId = formData.get('documentId') as string | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.type !== ALLOWED_MIME_TYPE && !file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const fileBuffer = Buffer.from(arrayBuffer)
  const fileSize = fileBuffer.length

  if (fileSize < 4) {
    return NextResponse.json({ error: 'File is too small to be a valid PDF.' }, { status: 400 })
  }

  const isPdf =
    fileBuffer[0] === PDF_MAGIC_BYTES[0] &&
    fileBuffer[1] === PDF_MAGIC_BYTES[1] &&
    fileBuffer[2] === PDF_MAGIC_BYTES[2] &&
    fileBuffer[3] === PDF_MAGIC_BYTES[3]

  if (!isPdf) {
    return NextResponse.json({ error: 'The uploaded file is not a valid PDF.' }, { status: 400 })
  }

  const entitlements = await getServerUserEntitlements(user.id, user.user_metadata)

  if (fileSize > entitlements.maxFileSizeBytes) {
    return NextResponse.json(
      {
        error: `File size (${formatBytes(fileSize)}) exceeds the ${entitlements.maxFileSizeMB} MB limit for ${entitlements.plan.name}. Upgrade your plan to upload larger files.`,
        code: 'FILE_SIZE_LIMIT_EXCEEDED',
      },
      { status: 400 }
    )
  }

  if (entitlements.usedStorageBytes + fileSize > entitlements.totalStorageBytes) {
    return NextResponse.json(
      {
        error: `Storage quota exceeded (${formatBytes(entitlements.totalStorageBytes)} limit, ${formatBytes(entitlements.availableStorageBytes)} remaining).`,
        code: 'STORAGE_QUOTA_EXCEEDED',
      },
      { status: 403 }
    )
  }

  const documentId = providedDocId || crypto.randomUUID()
  const sanitized = sanitizeFilename(file.name || 'document.pdf')
  const storagePath = `${user.id}/${documentId}/${sanitized}`

  // Upload directly from server to Cloudflare R2 (bypasses browser CORS completely!)
  let uploadResult: { success: boolean; provider: 'r2' | 'supabase' }
  try {
    uploadResult = await storageService.uploadBuffer(storagePath, fileBuffer, 'application/pdf')
  } catch (storageErr) {
    console.error('[UploadAPI] Storage upload failed:', storageErr)
    return NextResponse.json({ error: 'Failed to upload document to storage.' }, { status: 500 })
  }

  const storageProvider = uploadResult.provider

  // Register in Supabase Database
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_document_with_quota', {
    p_id: documentId,
    p_user_id: user.id,
    p_filename: sanitized,
    p_storage_path: storagePath,
    p_file_size: fileSize,
  })

  if (rpcError) {
    const { data: alreadyCreated } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (alreadyCreated) {
      return NextResponse.json({ success: true, documentId: alreadyCreated.id, alreadyConfirmed: true })
    }

    await storageService.deleteFile(storagePath, storageProvider)
    return NextResponse.json({ error: 'Database document creation failed.' }, { status: 500 })
  }

  const resultStatus = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0].result : rpcData

  if (resultStatus === 'rate_limited') {
    await storageService.deleteFile(storagePath, storageProvider)
    return NextResponse.json({ error: 'Upload rate limit reached. Try again later.' }, { status: 429 })
  }

  if (resultStatus === 'storage_quota_exceeded') {
    await storageService.deleteFile(storagePath, storageProvider)
    return NextResponse.json(
      { error: `Storage quota exceeded (${formatBytes(entitlements.totalStorageBytes)} limit).` },
      { status: 403 }
    )
  }

  if (storageProvider === 'r2') {
    await supabase
      .from('documents')
      .update({ storage_provider: 'r2' })
      .eq('id', documentId)
  }

  if (!entitlements.hasAiFeatures) {
    after(async () => {
      try {
        const admin = createSupabaseAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        let pageCount = 1
        try {
          const pdfDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
          pageCount = pdfDoc.getPageCount()
        } catch {}

        await admin
          .from('documents')
          .update({
            status: 'completed',
            page_count: pageCount,
            storage_provider: storageProvider,
            doc_category: 'Standard Document',
            tags: ['Free Tier'],
            extracted_data: { notice: 'Free Tier storage - AI document understanding available on Pro & Elite' },
          })
          .eq('id', documentId)
      } catch (freeErr) {
        console.warn('[UploadAPI] Error setting completed status for free user doc:', freeErr)
      }
    })
    return NextResponse.json({ success: true, documentId, plan: 'free' })
  }

  // Trigger background AI processing pipeline (Gemini / NVIDIA NIM)
  after(async () => {
    await processDocument(documentId)
  })

  return NextResponse.json({
    success: true,
    documentId,
    storagePath,
    storageProvider,
    plan: entitlements.tier,
  })
}
