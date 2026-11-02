import { NextRequest } from 'next/server'
import { validatePublicShareToken } from '@/lib/sharing/share-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const { searchParams } = new URL(request.url)
    const isDownload = searchParams.get('download') === 'true'

    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const clientIp = forwardedFor.split(',')[0].trim()

    const validation = await validatePublicShareToken(token, clientIp)

    if (!validation.valid || !validation.share || !validation.document) {
      if (validation.reason === 'RATE_LIMITED') {
        return new Response('Too many requests. Please try again shortly.', { status: 429 })
      }
      if (validation.reason === 'REVOKED') {
        return new Response('This share link has been revoked.', { status: 410 })
      }
      if (validation.reason === 'EXPIRED') {
        return new Response('This share link has expired.', { status: 410 })
      }
      return new Response('Document share not found.', { status: 404 })
    }

    const { share, document: doc } = validation

    // Enforce download permission server-side
    if (isDownload && !share.allow_download) {
      return new Response(
        JSON.stringify({ error: 'Downloads are disabled for this shared document.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return new Response('Server storage configuration error.', { status: 500 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: fileData, error: downloadError } = await admin.storage
      .from('documents')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      console.error('[Public Share Content API] Storage download error:', downloadError)
      return new Response('Unable to load document content from storage.', { status: 500 })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const dispositionType = isDownload ? 'attachment' : 'inline'
    const safeFilename = doc.filename.replace(/["\r\n]/g, '_')

    return new Response(new Uint8Array(arrayBuffer), {
      status: 200,
      headers: {
        'Content-Type': doc.mime_type || 'application/pdf',
        'Content-Disposition': `${dispositionType}; filename="${safeFilename}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error: unknown) {
    console.error('[Public Share Content API] Unexpected error:', error)
    return new Response('Internal server error loading shared document.', { status: 500 })
  }
}
