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

/**
 * Resolves authoritative document details directly from public.documents.
 * Never trusts client or browser-supplied user_id or storage_path.
 */
export async function getAuthoritativeDocument(
  documentId: string
): Promise<AuthoritativeDocument | null> {
  const client = getServiceRoleClient()

  const { data, error } = await client
    .from('documents')
    .select('id, user_id, filename, storage_path, status, processing_attempts, processing_locked_at, processing_token')
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
  }
}

/**
 * Calls the atomic acquisition RPC acquire_document_processing.
 * Returns the fresh UUID processing_token on success, or null if lock acquisition failed.
 */
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

/**
 * Calls the atomic finalization RPC finalize_document_processing.
 * Returns true if results were committed and token was cleared,
 * or false if the token was stale (fenced out).
 */
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

/**
 * Calls the fenced failure RPC mark_document_processing_failed.
 * Returns true if error was recorded and token was cleared,
 * or false if the token was stale (fenced out).
 */
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

/**
 * Securely downloads the PDF file buffer directly from Supabase Storage
 * using the isolated service-role client and the authoritative storage_path.
 */
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

/**
 * Reads all page texts for a document from public.document_pages,
 * sorted strictly by page_number.
 */
export async function getDocumentPages(documentId: string): Promise<PageRecord[]> {
  const client = getServiceRoleClient()

  const { data, error } = await client
    .from('document_pages')
    .select('page_number, extracted_text')
    .eq('document_id', documentId)
    .order('page_number', { ascending: true })

  if (error) {
    throw new Error(`Failed to read document pages: ${error.message}`)
  }

  return (data as PageRecord[]) || []
}

/**
 * Calls Phase 1B atomic acquisition RPC acquire_document_indexing.
 * Returns the fresh UUID embedding_token on success, or null if lock acquisition failed.
 */
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
  embedding: string // formatted vector string e.g. "[0.123,...]"
}

/**
 * Calls Phase 1B atomic finalization RPC finalize_document_indexing.
 * Atomically replaces all document chunks and marks embedding_status = completed.
 * Returns false if the token was stale / fenced out.
 */
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

/**
 * Calls Phase 1B fenced failure RPC mark_document_indexing_failed.
 * Sets embedding_status = failed and records error message.
 */
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

/**
 * Uploads an optimized PDF buffer to a new versioned storage path using service-role.
 */
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

/**
 * Verifies that a storage object exists and returns its byte size.
 */
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

/**
 * Invokes the atomic update_document_optimized_size RPC.
 */
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

/**
 * Safely removes a storage object using service-role.
 */
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

