import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { verifyVaultAccess } from '@/lib/auth/vault-mfa'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()

  const auth = await verifyVaultAccess(supabase)
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error, code: auth.code, mfaRequired: auth.code === 'MFA_REQUIRED' },
      { status: auth.status }
    )
  }

  const user = auth.user!

  const { searchParams } = new URL(request.url)
  const isPaginated = searchParams.has('page') || searchParams.has('limit')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(250, Math.max(1, parseInt(searchParams.get('limit') || (isPaginated ? '24' : '200'), 10)))
  const statusFilter = searchParams.get('status')
  const from = (page - 1) * limit
  const to = from + limit - 1

  let query = supabase
    .from('documents')
    .select(
      'id, filename, mime_type, file_size, original_file_size, storage_path, status, doc_category, tags, page_count, is_locked, locked_at, error_message, embedding_status, created_at, updated_at',
      { count: isPaginated ? 'exact' : undefined }
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'locked') {
      query = query.eq('is_locked', true)
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  let { data: documents, error, count } = await query.range(from, to)

  if (error && (error.code === '42703' || error.message?.includes('is_locked') || error.message?.includes('original_file_size'))) {
    let fallbackQuery = supabase
      .from('documents')
      .select(
        'id, filename, mime_type, file_size, storage_path, status, doc_category, tags, page_count, error_message, embedding_status, created_at, updated_at',
        { count: isPaginated ? 'exact' : undefined }
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'locked') {
        fallbackQuery = fallbackQuery.eq('is_locked', true)
      } else {
        fallbackQuery = fallbackQuery.eq('status', statusFilter)
      }
    }

    const fallback = await fallbackQuery.range(from, to)
    documents = fallback.data?.map((d) => ({ ...d, original_file_size: null, is_locked: false, locked_at: null })) ?? null
    error = fallback.error
    count = fallback.count
  }

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }

  if (isPaginated) {
    return NextResponse.json({
      documents: documents || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  }

  return NextResponse.json(documents || [])
}
