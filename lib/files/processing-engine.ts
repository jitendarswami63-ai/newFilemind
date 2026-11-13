import 'server-only'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { storageService, StorageProvider } from '@/lib/storage/storage-service'
import { detectFileFormat, FileFormatDefinition } from './file-types'
import { parseZipManifest, extractDocxText, extractXlsxText } from './archive-utils'
import { parseImageMetadata } from './media-utils'
import { processDocument as processPdfDocument } from '@/lib/ai/processor'
import { indexDocument } from '@/lib/ai/index-document'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseAdminClient(url, serviceKey)
}

export interface ProcessingResult {
  success: boolean
  category: string
  pageCount?: number
  extractedText?: string
  metadata?: Record<string, unknown>
  tags?: string[]
  error?: string
}

export type FileProcessor = (
  documentId: string,
  doc: {
    id: string
    user_id: string
    filename: string
    storage_path: string
    storage_provider?: string | null
    file_size: number | null
    mime_type: string
  },
  buffer: Buffer,
  format: FileFormatDefinition
) => Promise<ProcessingResult>

export class ProcessingEngineRegistry {
  private processors = new Map<string, FileProcessor>()

  public register(category: string, processor: FileProcessor) {
    this.processors.set(category, processor)
  }

  public getProcessor(category: string): FileProcessor {
    return this.processors.get(category) || this.processors.get('default')!
  }
}

export const processingRegistry = new ProcessingEngineRegistry()

// 1. Text & Documents Processor (DOCX, TXT, MD, RTF, HTML, EPUB)
const documentProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  let text = ''
  const ext = format.extension.toLowerCase()

  if (ext === 'docx') {
    text = extractDocxText(buffer)
  } else if (ext === 'html' || ext === 'htm') {
    const raw = buffer.toString('utf8')
    text = raw.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } else if (ext === 'rtf') {
    const raw = buffer.toString('utf8')
    text = raw.replace(/\\par[d]?/g, '\n')
      .replace(/\\[a-z0-9\-]+/gi, '')
      .replace(/[{}]/g, '')
      .trim()
  } else {
    // txt, md, etc.
    text = buffer.toString('utf8').trim()
  }

  const pageSize = 3000
  const pages: { page_number: number; extracted_text: string }[] = []

  if (text.length > 0) {
    for (let i = 0; i < text.length; i += pageSize) {
      pages.push({
        page_number: Math.floor(i / pageSize) + 1,
        extracted_text: text.slice(i, i + pageSize),
      })
    }
  } else {
    pages.push({
      page_number: 1,
      extracted_text: `Document: ${doc.filename}`,
    })
  }

  // Insert pages for semantic indexing
  if (pages.length > 0) {
    await admin.from('document_pages').delete().eq('document_id', documentId)
    await admin.from('document_pages').insert(
      pages.map((p) => ({
        document_id: documentId,
        page_number: p.page_number,
        extracted_text: p.extracted_text,
      }))
    )
  }

  const tags = [format.label.split(' ')[0], 'Text Content']
  if (text.length > 5000) tags.push('Long Form')

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: pages.length,
      doc_category: 'Document',
      tags,
      extracted_data: {
        characterCount: text.length,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        snippet: text.slice(0, 300),
      },
    })
    .eq('id', documentId)

  // Trigger semantic embedding index
  indexDocument(documentId).catch((err) => {
    console.warn(`[ProcessingEngine] Semantic indexing warning for ${doc.filename}:`, err)
  })

  return {
    success: true,
    category: 'Document',
    pageCount: pages.length,
    extractedText: text.slice(0, 1000),
    tags,
  }
}

// 2. Spreadsheet Processor (CSV, XLSX, XLS, ODS)
const spreadsheetProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  let tableText = ''
  let rowCount = 0
  let columnCount = 0
  const ext = format.extension.toLowerCase()

  if (ext === 'xlsx') {
    const extracted = extractXlsxText(buffer)
    tableText = extracted.text
    rowCount = extracted.rowCount
    columnCount = extracted.columnCount
  } else if (ext === 'csv') {
    const raw = buffer.toString('utf8').trim()
    const lines = raw.split(/\r?\n/)
    rowCount = lines.length
    columnCount = lines[0] ? lines[0].split(',').length : 0
    tableText = lines.slice(0, 500).join('\n')
  } else {
    tableText = `Spreadsheet file: ${doc.filename}`
  }

  const pages = [
    {
      page_number: 1,
      extracted_text: tableText.slice(0, 10000) || `Spreadsheet data: ${doc.filename}`,
    },
  ]

  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert(
    pages.map((p) => ({
      document_id: documentId,
      page_number: p.page_number,
      extracted_text: p.extracted_text,
    }))
  )

  const tags = ['Spreadsheet', format.extension.toUpperCase()]
  if (rowCount > 0) tags.push(`${rowCount} Rows`)

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: 'Spreadsheet',
      tags,
      extracted_data: {
        rowCount,
        columnCount,
        previewRows: tableText.split('\n').slice(0, 15),
      },
    })
    .eq('id', documentId)

  indexDocument(documentId).catch(() => {})

  return {
    success: true,
    category: 'Spreadsheet',
    pageCount: 1,
    tags,
  }
}

// 3. Code & Config Processor (JSON, XML, JS, TS, PY, SQL, etc.)
const codeProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  const code = buffer.toString('utf8')
  const lines = code.split(/\r?\n/)
  const lineCount = lines.length

  const pageSize = 80 // 80 lines per virtual page
  const pages: { page_number: number; extracted_text: string }[] = []

  for (let i = 0; i < lines.length; i += pageSize) {
    pages.push({
      page_number: Math.floor(i / pageSize) + 1,
      extracted_text: lines.slice(i, i + pageSize).join('\n'),
    })
  }

  if (pages.length === 0) {
    pages.push({ page_number: 1, extracted_text: `Code file: ${doc.filename}` })
  }

  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert(
    pages.map((p) => ({
      document_id: documentId,
      page_number: p.page_number,
      extracted_text: p.extracted_text,
    }))
  )

  const langTag = format.extension.toUpperCase()
  const tags = ['Source Code', langTag]

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: pages.length,
      doc_category: 'Code',
      tags,
      extracted_data: {
        lineCount,
        language: format.label,
        snippet: lines.slice(0, 20).join('\n'),
      },
    })
    .eq('id', documentId)

  indexDocument(documentId).catch(() => {})

  return {
    success: true,
    category: 'Code',
    pageCount: pages.length,
    tags,
  }
}

// 4. Image Processor (PNG, JPG, WEBP, GIF, SVG, BMP)
const imageProcessor: FileProcessor = async (documentId, _doc, buffer, format) => {
  const admin = createAdminClient()
  const meta = parseImageMetadata(buffer, format.extension)

  const tags = ['Image', meta.format || format.extension.toUpperCase()]
  if (meta.width && meta.height) {
    tags.push(`${meta.width}x${meta.height}`)
  }

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: 'Image',
      tags,
      extracted_data: {
        ...meta,
        fileSizeBytes: buffer.length,
      },
      embedding_status: 'completed',
    })
    .eq('id', documentId)

  return {
    success: true,
    category: 'Image',
    metadata: meta as unknown as Record<string, unknown>,
    tags,
  }
}

// 5. Media Processor (Audio & Video)
const mediaProcessor: FileProcessor = async (documentId, _doc, buffer, format) => {
  const admin = createAdminClient()
  const isVideo = format.category === 'video'
  const categoryLabel = isVideo ? 'Video' : 'Audio'

  const tags = [categoryLabel, format.extension.toUpperCase()]

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: categoryLabel,
      tags,
      extracted_data: {
        fileSizeBytes: buffer.length,
        mimeType: format.mimeType,
        format: format.label,
      },
      embedding_status: 'completed',
    })
    .eq('id', documentId)

  return {
    success: true,
    category: categoryLabel,
    tags,
  }
}

// 6. Archive Processor (ZIP, TAR, GZ)
const archiveProcessor: FileProcessor = async (documentId, _doc, buffer, format) => {
  const admin = createAdminClient()
  let manifest = { totalFiles: 0, totalUncompressedBytes: buffer.length, entries: [] as unknown[], isZipBombRisk: false }

  if (format.extension.toLowerCase() === 'zip') {
    manifest = parseZipManifest(buffer)
  }

  const tags = ['Archive', format.extension.toUpperCase()]
  if (manifest.totalFiles > 0) {
    tags.push(`${manifest.totalFiles} Files`)
  }
  if (manifest.isZipBombRisk) {
    tags.push('Decompression Alert')
  }

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: 'Archive',
      tags,
      extracted_data: {
        archiveManifest: manifest,
        isZipBombRisk: manifest.isZipBombRisk,
      },
      embedding_status: 'completed',
    })
    .eq('id', documentId)

  return {
    success: true,
    category: 'Archive',
    tags,
  }
}

// 7. Generic Fallback Processor
const genericProcessor: FileProcessor = async (documentId, _doc, buffer, format) => {
  const admin = createAdminClient()
  const tags = ['Stored File', format.extension.toUpperCase()]

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: 'Other',
      tags,
      extracted_data: {
        fileSizeBytes: buffer.length,
        mimeType: format.mimeType,
        notice: 'File stored securely in Cloudflare R2. AI processing unavailable for this binary format.',
      },
      embedding_status: 'completed',
    })
    .eq('id', documentId)

  return {
    success: true,
    category: 'Other',
    tags,
  }
}

// Register all modular processors
processingRegistry.register('document', documentProcessor)
processingRegistry.register('spreadsheet', spreadsheetProcessor)
processingRegistry.register('code', codeProcessor)
processingRegistry.register('image', imageProcessor)
processingRegistry.register('audio', mediaProcessor)
processingRegistry.register('video', mediaProcessor)
processingRegistry.register('archive', archiveProcessor)
processingRegistry.register('presentation', documentProcessor)
processingRegistry.register('default', genericProcessor)

/**
 * Universal Processing Gateway: routes documents to their dedicated processor
 */
export async function processUniversalFile(
  documentId: string,
  preAcquiredToken?: string
): Promise<boolean> {
  const admin = createAdminClient()

  const { data: doc, error } = await admin
    .from('documents')
    .select('id, user_id, filename, storage_path, storage_provider, file_size, mime_type, status')
    .eq('id', documentId)
    .single()

  if (error || !doc) {
    console.warn(`[UniversalProcessing] Document not found: ${documentId}`)
    return false
  }

  const format = detectFileFormat(doc.filename, doc.mime_type)

  // 1. If it's a PDF, delegate to the established PDF intelligence pipeline
  if (format.extension.toLowerCase() === 'pdf' || format.mimeType === 'application/pdf') {
    return await processPdfDocument(documentId, preAcquiredToken)
  }

  // 2. Multi-format processing
  try {
    await admin
      .from('documents')
      .update({
        status: 'processing',
        processing_stage: 'analyzing',
        processing_locked_at: new Date().toISOString(),
      })
      .eq('id', documentId)

    const { buffer } = await storageService.downloadBuffer(
      doc.storage_path,
      (doc.storage_provider as StorageProvider) || undefined
    )

    const processor = processingRegistry.getProcessor(format.category)
    const result = await processor(documentId, doc, buffer, format)
    return result.success
  } catch (procErr: unknown) {
    const errMsg = procErr instanceof Error ? procErr.message : 'Universal document processing failed'
    console.error(`[UniversalProcessing] Error processing ${doc.filename}:`, procErr)

    await admin
      .from('documents')
      .update({
        status: 'failed',
        error_message: errMsg,
      })
      .eq('id', documentId)

    return false
  }
}
