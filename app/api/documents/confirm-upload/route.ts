import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MAX_FILE_SIZE_BYTES, PDF_MAGIC_BYTES } from '@/lib/constants'
import { processDocument } from '@/lib/ai/processor'
import { isSameOrigin } from '@/lib/validation/origin'

export const maxDuration = 60

interface ConfirmUploadBody {
  documentId?: string
  storagePath?: string
  fileSize?: number
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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

  // 4. Verify Storage object exists
  const folderPath = `${user.id}/${documentId}`
  const { data: listData, error: listError } = await supabase.storage
    .from('documents')
    .list(folderPath)

  const sanitizedFilename = segments[2]
  const matchedFile = listData?.find((f) => f.name === sanitizedFilename)

  if (listError || !matchedFile) {
    return NextResponse.json({ error: 'Upload not found in storage. Please try again.' }, { status: 400 })
  }

  // 5. Verify actual file size from Storage metadata
  const actualSize = matchedFile.metadata?.size || 0
  if (actualSize > MAX_FILE_SIZE_BYTES) {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json({ error: 'File must be under 49 MB.' }, { status: 400 })
  }

  // 6. Magic bytes check via HTTP Range request
  const { data: sessionData } = await supabase.auth.getSession()
  const userJwt = sessionData.session?.access_token

  if (userJwt) {
    const storageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/documents/${storagePath}`
    try {
      const rangeRes = await fetch(storageUrl, {
        headers: {
          Authorization: `Bearer ${userJwt}`,
          Range: 'bytes=0-3',
        },
      })
      const buffer = await rangeRes.arrayBuffer()
      const bytes = new Uint8Array(buffer)

      const isPdf =
        bytes.length >= 4 &&
        bytes[0] === PDF_MAGIC_BYTES[0] &&
        bytes[1] === PDF_MAGIC_BYTES[1] &&
        bytes[2] === PDF_MAGIC_BYTES[2] &&
        bytes[3] === PDF_MAGIC_BYTES[3]

      if (!isPdf) {
        await supabase.storage.from('documents').remove([storagePath])
        return NextResponse.json({ error: 'The uploaded file is not a valid PDF.' }, { status: 400 })
      }
    } catch {
      await supabase.storage.from('documents').remove([storagePath])
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 400 })
    }
  }

  // 7. Create document record via create_document_with_quota
  const { data: rpcData, error: rpcError } = await supabase.rpc('create_document_with_quota', {
    p_id: documentId,
    p_user_id: user.id,
    p_filename: sanitizedFilename,
    p_storage_path: storagePath,
    p_file_size: actualSize,
  })

  if (rpcError) {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const resultStatus = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0].result : rpcData

  if (resultStatus === 'rate_limited') {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json({ error: 'Upload limit reached. Try again later.' }, { status: 429 })
  }

  if (resultStatus === 'storage_quota_exceeded') {
    await supabase.storage.from('documents').remove([storagePath])
    return NextResponse.json({ error: 'Storage quota exceeded (2 GB limit). Please delete old documents.' }, { status: 403 })
  }

  // Best-effort background processing trigger via Next.js 16 after()
  // In bulk mode, skipImmediateProcessing allows client/worker queue to throttle processing to 2 concurrent jobs
  const skipImmediate = (body as unknown as { skipImmediateProcessing?: boolean }).skipImmediateProcessing
  if (!skipImmediate) {
    after(async () => {
      await processDocument(documentId)
    })
  }

  return NextResponse.json({ success: true, documentId })
}
