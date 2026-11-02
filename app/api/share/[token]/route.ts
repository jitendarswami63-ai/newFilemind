import { NextRequest, NextResponse } from 'next/server'
import { validatePublicShareToken } from '@/lib/sharing/share-service'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params
    const forwardedFor = request.headers.get('x-forwarded-for') || '127.0.0.1'
    const clientIp = forwardedFor.split(',')[0].trim()

    const validation = await validatePublicShareToken(token, clientIp)

    if (!validation.valid || !validation.share || !validation.document) {
      if (validation.reason === 'RATE_LIMITED') {
        return NextResponse.json(
          { error: 'Too many requests. Please try again in a few minutes.', reason: 'RATE_LIMITED' },
          { status: 429 }
        )
      }
      if (validation.reason === 'REVOKED') {
        return NextResponse.json(
          { error: 'This share link has been revoked by the owner.', reason: 'REVOKED' },
          { status: 410 }
        )
      }
      if (validation.reason === 'EXPIRED') {
        return NextResponse.json(
          { error: 'This share link has expired.', reason: 'EXPIRED' },
          { status: 410 }
        )
      }
      return NextResponse.json(
        { error: 'Share link not found or invalid.', reason: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      valid: true,
      document: {
        id: validation.document.id,
        filename: validation.document.filename,
        fileSize: validation.document.file_size,
        mimeType: validation.document.mime_type,
        createdAt: validation.document.created_at,
      },
      share: {
        allowDownload: validation.share.allow_download,
        expiresAt: validation.share.expires_at,
      },
    })
  } catch (error: unknown) {
    console.error('[Public Share Metadata API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to validate share link' },
      { status: 500 }
    )
  }
}
