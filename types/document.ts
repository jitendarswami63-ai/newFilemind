/**
 * Canonical document types for FileMind
 */

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type FilterStatus = 'all' | 'ready' | 'processing' | 'failed'

export interface DocumentRecord {
  id: string
  user_id: string
  filename: string
  mime_type: string
  file_size: number | null
  original_file_size?: number | null
  storage_path: string
  status: DocumentStatus
  doc_category?: string | null
  tags?: string[] | null
  page_count?: number | null
  is_scanned?: boolean | null
  error_message?: string | null
  processing_locked_at?: string | null
  processing_token?: string | null
  processing_attempts?: number
  created_at: string
  updated_at: string
}

export interface DocumentItem {
  id: string
  filename: string
  status: DocumentStatus
  created_at: string
  file_size: number | null
  original_file_size?: number | null
  storage_path?: string | null
  doc_category?: string | null
  tags?: string[] | null
}

export interface PaginationMeta {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasMore: boolean
}

export interface SearchResultItem {
  document_id: string
  filename: string
  doc_category?: string
  chunk_id: string
  page_start: number
  page_end: number
  matching_pages?: number[]
  snippet: string
  score: number
}
