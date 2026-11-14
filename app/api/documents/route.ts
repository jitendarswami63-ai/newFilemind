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
  const categoryFilter = searchParams.get('category')?.toLowerCase()
  const searchQuery = searchParams.get('q')?.trim()
  const sortBy = searchParams.get('sort') || 'created_at'
  const sortOrder = searchParams.get('order') === 'asc' ? true : false

  const from = (page - 1) * limit
  const to = from + limit - 1

  const sortColumn = ['filename', 'file_size', 'created_at'].includes(sortBy)
    ? sortBy
    : 'created_at'

  const needCount = isPaginated && searchParams.get('count') !== 'false'

  let query = supabase
    .from('documents')
    .select(
      'id, filename, mime_type, file_size, original_file_size, storage_path, status, doc_category, tags, page_count, is_locked, locked_at, error_message, embedding_status, created_at, updated_at',
      { count: needCount ? 'exact' : undefined }
    )
    .eq('user_id', user.id)
    .order(sortColumn, { ascending: sortOrder })

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'locked') {
      query = query.eq('is_locked', true)
    } else {
      query = query.eq('status', statusFilter)
    }
  }

  if (categoryFilter && categoryFilter !== 'all') {
    if (categoryFilter === 'pdfs') {
      query = query.or('mime_type.eq.application/pdf,filename.ilike.%.pdf')
    } else if (categoryFilter === 'documents') {
      query = query.or('doc_category.ilike.document%,filename.ilike.%.docx,filename.ilike.%.doc,filename.ilike.%.txt,filename.ilike.%.md,filename.ilike.%.rtf,filename.ilike.%.odt,filename.ilike.%.epub')
    } else if (categoryFilter === 'images') {
      query = query.or('doc_category.ilike.image%,mime_type.ilike.image/%,filename.ilike.%.jpg,filename.ilike.%.jpeg,filename.ilike.%.png,filename.ilike.%.webp,filename.ilike.%.gif,filename.ilike.%.svg,filename.ilike.%.bmp,filename.ilike.%.tiff,filename.ilike.%.heic')
    } else if (categoryFilter === 'spreadsheets') {
      query = query.or('doc_category.ilike.spreadsheet%,filename.ilike.%.xlsx,filename.ilike.%.xls,filename.ilike.%.csv,filename.ilike.%.ods')
    } else if (categoryFilter === 'presentations') {
      query = query.or('doc_category.ilike.presentation%,filename.ilike.%.pptx,filename.ilike.%.ppt,filename.ilike.%.odp')
    } else if (categoryFilter === 'videos') {
      query = query.or('doc_category.ilike.video%,mime_type.ilike.video/%,filename.ilike.%.mp4,filename.ilike.%.mov,filename.ilike.%.avi,filename.ilike.%.webm,filename.ilike.%.mkv')
    } else if (categoryFilter === 'audio') {
      query = query.or('doc_category.ilike.audio%,mime_type.ilike.audio/%,filename.ilike.%.mp3,filename.ilike.%.wav,filename.ilike.%.aac,filename.ilike.%.m4a,filename.ilike.%.flac,filename.ilike.%.ogg')
    } else if (categoryFilter === 'archives') {
      query = query.or('doc_category.ilike.archive%,filename.ilike.%.zip,filename.ilike.%.tar,filename.ilike.%.gz,filename.ilike.%.rar,filename.ilike.%.7z')
    } else if (categoryFilter === 'code') {
      query = query.or('doc_category.ilike.code%,filename.ilike.%.json,filename.ilike.%.js,filename.ilike.%.ts,filename.ilike.%.jsx,filename.ilike.%.tsx,filename.ilike.%.py,filename.ilike.%.html,filename.ilike.%.css,filename.ilike.%.sql,filename.ilike.%.yaml,filename.ilike.%.toml')
    } else if (categoryFilter === 'other') {
      query = query.or('doc_category.ilike.other%,doc_category.is.null')
    }
  }

  if (searchQuery) {
    query = query.ilike('filename', `%${searchQuery}%`)
  }

  let { data: documents, error, count } = await query.range(from, to)

  if (error && (error.code === '42703' || error.message?.includes('is_locked') || error.message?.includes('original_file_size'))) {
    let fallbackQuery = supabase
      .from('documents')
      .select(
        'id, filename, mime_type, file_size, storage_path, status, doc_category, tags, page_count, error_message, embedding_status, created_at, updated_at',
        { count: needCount ? 'exact' : undefined }
      )
      .eq('user_id', user.id)
      .order(sortColumn, { ascending: sortOrder })

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'locked') {
        fallbackQuery = fallbackQuery.eq('is_locked', true)
      } else {
        fallbackQuery = fallbackQuery.eq('status', statusFilter)
      }
    }

    if (searchQuery) {
      fallbackQuery = fallbackQuery.ilike('filename', `%${searchQuery}%`)
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
      pagination: needCount
        ? {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          }
        : undefined,
    })
  }

  return NextResponse.json(documents || [])
}
