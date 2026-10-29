import 'server-only'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { STORAGE_BUCKET } from '@/lib/constants'
import { NormalizedMetadataItem } from './schema'

export interface AuthoritativeDocument {
  id: string
  user_id: string
  filename: string
  storage_path: string
  status: string
  processing_attempts: number
  processing_locked_at: string | null
  processing_token: string | null
  doc_category?: string | null
  tags?: string[] | null
  extracted_data?: NormalizedMetadataItem[] | null
  is_scanned?: boolean | null
  embedding_status?: string | null
  embedding_error?: string | null
}

export interface FinalizePayload {
  doc_category: string
  tags: string[]
  metadata: NormalizedMetadataItem[]
  pages: Array<{ page_number: number; text: string }>
  page_count: number
  is_scanned: boolean
}

let cachedServiceClient: SupabaseClient | null = null

export function getServiceRoleClient(): SupabaseClient {
  if (cachedServiceClient) {
    return cachedServiceClient
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }

  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server')
  }

  cachedServiceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return cachedServiceClient
}

export async function getAuthoritativeDocument(
  documentId: string
): Promise<AuthoritativeDocument | null> {
  const client = getServiceRoleClient()

  const { data, error } = await client
    .from('documents')
    .select(
      'id, user_id, filename, storage_path, status, processing_attempts, processing_locked_at, processing_token, doc_category, tags, extracted_data, is_scanned, embedding_status, embedding_error'
    )
    .eq('id', documentId)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    user_id: data.user_id,
    filename: data.filename,
    storage_path: data.storage_path,
    status: data.status,
    processing_attempts: data.processing_attempts,
    processing_locked_at: data.processing_locked_at,
    processing_token: data.processing_token || null,
    doc_category: data.doc_category || null,
    tags: data.tags || null,
    extracted_data: data.extracted_data || null,
    is_scanned: data.is_scanned || null,
    embedding_status: data.embedding_status || null,
    embedding_error: data.embedding_error || null,
  }
}

export async function acquireLock(
  documentId: string,
  authoritativeUserId: string
): Promise<string | null> {
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('acquire_document_processing', {
    p_document_id: documentId,
    p_user_id: authoritativeUserId,
  })

  if (error) {
    return null
  }

  return (data as string) || null
}

export async function finalizeResults(
  documentId: string,
  authoritativeUserId: string,
  token: string,
  payload: FinalizePayload
): Promise<boolean> {
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('finalize_document_processing', {
    p_document_id: documentId,
    p_user_id: authoritativeUserId,
    p_processing_token: token,
    p_doc_category: payload.doc_category,
    p_tags: payload.tags,
    p_metadata: payload.metadata,
    p_pages: payload.pages,
    p_page_count: payload.page_count,
    p_is_scanned: payload.is_scanned,
  })

  if (error) {
    return false
  }

  return Boolean(data)
}

export async function markFailed(
  documentId: string,
  authoritativeUserId: string,
  token: string,
  errorCategory: string
): Promise<boolean> {
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('mark_document_processing_failed', {
    p_document_id: documentId,
    p_user_id: authoritativeUserId,
    p_processing_token: token,
    p_error_category: errorCategory,
  })

  if (error) {
    return false
  }

  return Boolean(data)
}

export async function updateDocumentProcessingStage(
  documentId: string,
  stage: string,
  fencingToken: string
): Promise<boolean> {
  const client = getServiceRoleClient()

  const { error } = await client
    .from('documents')
    .update({
      processing_stage: stage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('processing_token', fencingToken)

  return !error
}

export async function saveSegmentPagesCheckpoint({
  documentId,
  userId,
  fencingToken,
  pages,
  stage,
}: {
  documentId: string
  userId: string
  fencingToken: string
  pages: Array<{ page_number: number; text: string }>
  stage: string
}): Promise<boolean> {
  const client = getServiceRoleClient()

  const { data: doc, error: fenceErr } = await client
    .from('documents')
    .select('id')
    .eq('id', documentId)
    .eq('user_id', userId)
    .eq('processing_token', fencingToken)
    .single()

  if (fenceErr || !doc) {
    console.warn(`[Checkpoint] Fencing token mismatch for doc ${documentId}. Aborting checkpoint.`)
    return false
  }

  if (pages.length > 0) {
    const { error: pageErr } = await client
      .from('document_pages')
      .upsert(
        pages.map((p) => ({
          document_id: documentId,
          page_number: p.page_number,
          extracted_text: p.text,
        })),
        { onConflict: 'document_id,page_number' }
      )

    if (pageErr) {
      console.error(`[Checkpoint] Failed to upsert pages for doc ${documentId}:`, pageErr.message)
      return false
    }
  }

  const { error: stageErr } = await client
    .from('documents')
    .update({
      processing_stage: stage,
      processing_locked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId)
    .eq('processing_token', fencingToken)

  return !stageErr
}

export async function getCompletedPageNumbers(documentId: string): Promise<Set<number>> {
  const client = getServiceRoleClient()
  const completed = new Set<number>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await client
      .from('document_pages')
      .select('page_number')
      .eq('document_id', documentId)
      .range(from, to)

    if (error || !data || data.length === 0) {
      break
    }

    for (const r of data as Array<{ page_number: number }>) {
      completed.add(r.page_number)
    }

    if (data.length < pageSize) {
      break
    }

    from += pageSize
  }

  return completed
}

export async function downloadDocumentBuffer(storagePath: string): Promise<Buffer> {
  const client = getServiceRoleClient()

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .download(storagePath)

  if (error || !data) {
    throw new Error(`Failed to download document from storage: ${error?.message || 'Empty response'}`)
  }

  const arrayBuffer = await data.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export interface PageRecord {
  page_number: number
  extracted_text: string
}

export async function getDocumentPages(documentId: string): Promise<PageRecord[]> {
  const client = getServiceRoleClient()
  const allPages: PageRecord[] = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await client
      .from('document_pages')
      .select('page_number, extracted_text')
      .eq('document_id', documentId)
      .order('page_number', { ascending: true })
      .range(from, to)

    if (error) {
      throw new Error(`Failed to read document pages: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    allPages.push(...(data as PageRecord[]))

    if (data.length < pageSize) {
      break
    }

    from += pageSize
  }

  return allPages
}

export async function acquireIndexingLock(
  documentId: string,
  authoritativeUserId: string
): Promise<string | null> {
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('acquire_document_indexing', {
    p_document_id: documentId,
    p_user_id: authoritativeUserId,
  })

  if (error) {
    return null
  }

  return (data as string) || null
}

export interface ChunkInsertPayload {
  page_start: number
  page_end: number
  chunk_index: number
  content: string
  content_hash: string
  embedding: string
}

export async function finalizeIndexing(
  documentId: string,
  authoritativeUserId: string,
  token: string,
  chunks: ChunkInsertPayload[]
): Promise<boolean> {
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('finalize_document_indexing', {
    p_document_id: documentId,
    p_user_id: authoritativeUserId,
    p_embedding_token: token,
    p_chunks: chunks,
  })

  if (error) {
    console.error(`[DocumentIndex] finalize_document_indexing error:`, error)
    return false
  }

  return Boolean(data)
}

export async function markIndexingFailed(
  documentId: string,
  authoritativeUserId: string,
  token: string,
  errorText: string
): Promise<boolean> {
  const client = getServiceRoleClient()

  const { data, error } = await client.rpc('mark_document_indexing_failed', {
    p_document_id: documentId,
    p_user_id: authoritativeUserId,
    p_embedding_token: token,
    p_error: errorText,
  })

  if (error) {
    return false
  }

  return Boolean(data)
}

export interface UpdateOptimizedSizeParams {
  documentId: string
  userId: string
  expectedStoragePath: string
  newStoragePath: string
  optimizedSize: number
  originalSize: number
  savedBytes: number
  savingsPercent: number
  status: string
}

export async function storeOptimizedDocument(
  storagePath: string,
  buffer: Buffer
): Promise<boolean> {
  const client = getServiceRoleClient()
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) {
    console.error(`[ServiceWorker] Failed to upload optimized PDF to ${storagePath}:`, error)
    return false
  }
  return true
}

export async function verifyStorageObject(
  storagePath: string
): Promise<{ size: number } | null> {
  const client = getServiceRoleClient()
  const segments = storagePath.split('/')
  if (segments.length < 2) return null

  const folder = segments.slice(0, -1).join('/')
  const filename = segments[segments.length - 1]

  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .list(folder)

  if (error || !data) return null

  const matched = data.find((f) => f.name === filename)
  if (!matched) return null

  const size = matched.metadata?.size || 0
  return { size }
}

export async function updateDocumentOptimizedSize(
  params: UpdateOptimizedSizeParams
): Promise<boolean> {
  const client = getServiceRoleClient()
  const { data, error } = await client.rpc('update_document_optimized_size', {
    p_document_id: params.documentId,
    p_user_id: params.userId,
    p_expected_storage_path: params.expectedStoragePath,
    p_new_storage_path: params.newStoragePath,
    p_optimized_size: params.optimizedSize,
    p_original_size: params.originalSize,
    p_saved_bytes: params.savedBytes,
    p_savings_percent: params.savingsPercent,
    p_status: params.status,
  })

  if (error) {
    console.error(`[ServiceWorker] update_document_optimized_size error:`, error)
    return false
  }

  return Boolean(data)
}

export async function deleteStorageObject(storagePath: string): Promise<boolean> {
  const client = getServiceRoleClient()
  const { error } = await client.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath])

  if (error) {
    console.warn(`[ServiceWorker] deleteStorageObject failed for ${storagePath}:`, error)
    return false
  }
  return true
}
