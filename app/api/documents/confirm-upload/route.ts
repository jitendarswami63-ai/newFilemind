import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PDF_MAGIC_BYTES } from '@/lib/constants'
import { processDocument } from '@/lib/ai/processor'
import { processUniversalFile } from '@/lib/files/processing-engine'
import { detectFileFormat, isDangerousFile, validateMagicBytes } from '@/lib/files/file-types'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'
import { getServerUserEntitlements } from '@/lib/subscription/plan-server'
import { formatBytes } from '@/lib/subscription/plans'
import { PDFDocument } from 'pdf-lib'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { storageService } from '@/lib/storage/storage-service'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

interface ConfirmUploadBody {
  documentId?: string
  storagePath?: string
  fileSize?: number
  skipImmediateProcessing?: boolean
}

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

  let body: ConfirmUploadBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { documentId, storagePath } = body
  if (!documentId || !storagePath) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  const segments = storagePath.split('/')
  if (segments.length !== 3 || segments[0] !== user.id || segments[1] !== documentId) {
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 400 })
  }

  const { data: existingDoc } = await supabase
    .from('documents')
    .select('id, status')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingDoc) {
    return NextResponse.json({ success: true, documentId: existingDoc.id, alreadyConfirmed: true })
  }

  const headResult = await storageService.headObject(storagePath)

  if (!headResult) {
    return NextResponse.json({ error: 'Upload not found in storage. Please try again.' }, { status: 400 })
  }

  const actualSize = headResult.size
  const storageProvider = headResult.provider

  const entitlements = await getServerUserEntitlements(user.id, user.user_metadata)

  if (actualSize > entitlements.maxFileSizeBytes) {
    await storageService.deleteFile(storagePath, storageProvider)
    return NextResponse.json(
      {
        error: `File size (${formatBytes(actualSize)}) exceeds the ${entitlements.maxFileSizeMB} MB limit for ${entitlements.plan.name}. Upgrade your plan to upload larger files.`,
        code: 'FILE_SIZE_LIMIT_EXCEEDED',
      },
      { status: 400 }
    )
  }

  if (entitlements.usedStorageBytes + actualSize > entitlements.totalStorageBytes) {
    await storageService.deleteFile(storagePath, storageProvider)
    return NextResponse.json(
      {
        error: `Storage quota exceeded (${formatBytes(entitlements.totalStorageBytes)} limit, ${formatBytes(entitlements.availableStorageBytes)} remaining). Please delete old documents or purchase additional storage.`,
        code: 'STORAGE_QUOTA_EXCEEDED',
      },
      { status: 403 }
    )
  }

  const sanitizedFilename = segments[2]
  const detectedFormat = detectFileFormat(sanitizedFilename)

  try {
    const magicBuffer = await storageService.getByteRange(storagePath, 0, 15, storageProvider)
    const bytes = new Uint8Array(magicBuffer)

    const dangerCheck = isDangerousFile(sanitizedFilename, bytes)
    if (dangerCheck.dangerous) {
      await storageService.deleteFile(storagePath, storageProvider)
      return NextResponse.json({ error: dangerCheck.reason || 'Dangerous payload rejected.' }, { status: 400 })
    }

    if (detectedFormat.magicBytes && detectedFormat.magicBytes.length > 0) {
      const isValid = validateMagicBytes(detectedFormat, bytes)
      if (!isValid) {
        await storageService.deleteFile(storagePath, storageProvider)
        return NextResponse.json(
          { error: `The uploaded file does not match the valid signature for ${detectedFormat.label}.` },
          { status: 400 }
        )
      }
    }
  } catch {
    await storageService.deleteFile(storagePath, storageProvider)
    return NextResponse.json({ error: 'Upload validation failed. Please try again.' }, { status: 400 })
  }

  if (storageProvider === 'r2') {
    const { error: insertError } = await supabase
      .from('documents')
      .insert({
        id: documentId,
        user_id: user.id,
        filename: sanitizedFilename,
        storage_path: storagePath,
        storage_provider: 'r2',
        file_size: actualSize,
        mime_type: detectedFormat.mimeType,
        doc_category: detectedFormat.category,
        status: 'pending',
      })

    if (insertError) {
      if (insertError.code === '42703' || insertError.message?.includes('storage_provider')) {
        const { error: retryError } = await supabase
          .from('documents')
          .insert({
            id: documentId,
            user_id: user.id,
            filename: sanitizedFilename,
            storage_path: storagePath,
            file_size: actualSize,
            mime_type: detectedFormat.mimeType,
            doc_category: detectedFormat.category,
            status: 'pending',
          })

        if (retryError) {
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
      } else {
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
    }
  } else {
    const { data: rpcData, error: rpcError } = await supabase.rpc('create_document_with_quota', {
      p_id: documentId,
      p_user_id: user.id,
      p_filename: sanitizedFilename,
      p_storage_path: storagePath,
      p_file_size: actualSize,
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
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }

    const resultStatus = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0].result : rpcData

    if (resultStatus === 'rate_limited') {
      await storageService.deleteFile(storagePath, storageProvider)
      return NextResponse.json({ error: 'Upload rate limit reached. Try again later.' }, { status: 429 })
    }

    if (resultStatus === 'storage_quota_exceeded') {
      await storageService.deleteFile(storagePath, storageProvider)
      return NextResponse.json(
        { error: `Storage quota exceeded (${formatBytes(entitlements.totalStorageBytes)} limit). Please delete old documents or upgrade your storage.` },
        { status: 403 }
      )
    }
  }

  if (!entitlements.hasAiFeatures) {
    after(async () => {
      try {
        const admin = createSupabaseAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { buffer: fileBuf } = await storageService.downloadBuffer(storagePath, storageProvider)
        let pageCount = 1
        if (fileBuf) {
          try {
            const pdfDoc = await PDFDocument.load(fileBuf, { ignoreEncryption: true })
            pageCount = pdfDoc.getPageCount()
          } catch {}
        }

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
        console.warn('[ConfirmUpload] Error setting completed status for free user doc:', freeErr)
      }
    })
    return NextResponse.json({ success: true, documentId, plan: 'free' })
  }

  const skipImmediate = body.skipImmediateProcessing
  if (!skipImmediate) {
    after(async () => {
      await processUniversalFile(documentId)
    })
  }

  return NextResponse.json({ success: true, documentId, plan: entitlements.tier })
}
