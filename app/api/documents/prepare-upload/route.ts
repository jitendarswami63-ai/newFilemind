import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sanitizeFilename } from '@/lib/validation/filename'
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPE } from '@/lib/constants'
import { isSameOrigin } from '@/lib/validation/origin'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'

export const dynamic = 'force-dynamic'

interface PrepareUploadBody {
  filename?: string
  fileSize?: number
  mimeType?: string
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

  let body: PrepareUploadBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { filename, fileSize, mimeType } = body
  if (mimeType !== ALLOWED_MIME_TYPE) {
    return NextResponse.json({ error: 'Only PDF files are supported.' }, { status: 400 })
  }
  if (typeof fileSize !== 'number' || fileSize <= 0 || fileSize > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File must be under 49 MB.' }, { status: 400 })
  }
  if (typeof filename !== 'string' || !filename) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const sanitized = sanitizeFilename(filename)
  const documentId = crypto.randomUUID()
  const storagePath = `${user.id}/${documentId}/${sanitized}`

  return NextResponse.json({ documentId, storagePath })
}
