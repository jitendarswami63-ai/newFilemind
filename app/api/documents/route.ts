import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const isPaginated = searchParams.has('page') || searchParams.has('limit')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(250, Math.max(1, parseInt(searchParams.get('limit') || (isPaginated ? '24' : '200'), 10)))
  const statusFilter = searchParams.get('status')
  const from = (page - 1) * limit
  const to = from + limit - 1

  // Explicitly select only safe fields. Never project processing_token.
  let query = supabase
    .from('documents')
    .select(
      'id, filename, mime_type, file_size, original_file_size, storage_path, status, doc_category, tags, page_count, error_message, created_at, updated_at',
      { count: isPaginated ? 'exact' : undefined }
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  let { data: documents, error, count } = await query.range(from, to)

  // Graceful fallback if original_file_size column has not been added to DB yet
  if (error && (error.code === '42703' || error.message?.includes('original_file_size'))) {
    let fallbackQuery = supabase
      .from('documents')
      .select(
        'id, filename, mime_type, file_size, storage_path, status, doc_category, tags, page_count, error_message, created_at, updated_at',
        { count: isPaginated ? 'exact' : undefined }
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      fallbackQuery = fallbackQuery.eq('status', statusFilter)
    }

    const fallback = await fallbackQuery.range(from, to)
    documents = fallback.data?.map((d) => ({ ...d, original_file_size: null })) ?? null
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
