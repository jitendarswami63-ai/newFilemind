import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isSameOrigin } from '@/lib/validation/origin'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ownership check
  let { data: doc, error } = await supabase
    .from('documents')
    .select('id, filename, mime_type, file_size, original_file_size, storage_path, status, doc_category, tags, page_count, error_message, processing_locked_at, created_at, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  // Graceful fallback if original_file_size column has not been added to DB yet
  if (error && (error.code === '42703' || error.message?.includes('original_file_size'))) {
    const fallback = await supabase
      .from('documents')
      .select('id, filename, mime_type, file_size, storage_path, status, doc_category, tags, page_count, error_message, processing_locked_at, created_at, updated_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    doc = fallback.data ? { ...fallback.data, original_file_size: null } : null
    error = fallback.error
  }

  if (error || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json(doc)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch storage_path for deletion
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // 1. Delete Storage object
  if (doc.storage_path) {
    await supabase.storage.from('documents').remove([doc.storage_path])
  }

  // 2. Delete DB record
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (deleteError) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
