import { NextResponse } from 'next/server'
import { verifyAdminApi } from '@/lib/admin/auth'
import {
  getCMSSection,
  saveCMSDraft,
  publishCMSContent,
  discardCMSDraft,
  CMSData,
} from '@/lib/admin/cms'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const data = await getCMSSection('global')
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch CMS content' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const auth = await verifyAdminApi()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const { action, draft } = body

    if (action === 'save_draft') {
      if (!draft) {
        return NextResponse.json({ error: 'Draft content is required' }, { status: 400 })
      }
      await saveCMSDraft(draft as CMSData, {
        id: auth.admin.user.id,
        email: auth.admin.email,
      })
      return NextResponse.json({ success: true, message: 'Draft saved successfully' })
    }

    if (action === 'publish') {
      const result = await publishCMSContent(
        {
          id: auth.admin.user.id,
          email: auth.admin.email,
        },
        'global',
        draft as CMSData | undefined
      )
      return NextResponse.json({
        success: true,
        message: 'Content published to live website',
        publishedAt: result.publishedAt,
      })
    }

    if (action === 'discard_draft') {
      await discardCMSDraft({
        id: auth.admin.user.id,
        email: auth.admin.email,
      })
      return NextResponse.json({ success: true, message: 'Draft reverted to published state' })
    }

    return NextResponse.json({ error: 'Invalid CMS action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to execute CMS action' },
      { status: 500 }
    )
  }
}
