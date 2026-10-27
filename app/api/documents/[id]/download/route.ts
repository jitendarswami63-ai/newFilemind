import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { VIEWER_SIGNED_URL_EXPIRY, DOWNLOAD_SIGNED_URL_EXPIRY } from '@/lib/constants'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'viewer'

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ownership check
  const { data: doc, error } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  const expiry = type === 'download' ? DOWNLOAD_SIGNED_URL_EXPIRY : VIEWER_SIGNED_URL_EXPIRY
  const { data: signedData, error: signError } = await supabase.storage
    .from('documents')
    .createSignedUrl(doc.storage_path, expiry, {
      download: type === 'download',
    })

  if (signError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  const expiresAt = new Date(Date.now() + expiry * 1000).toISOString()

  return NextResponse.json({
    signedUrl: signedData.signedUrl,
    expiresAt,
    storagePath: doc.storage_path,
  })
}
