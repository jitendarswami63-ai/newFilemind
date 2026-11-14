import 'server-only'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'
import { storageService, StorageProvider } from '@/lib/storage/storage-service'
import { detectFileFormat, FileFormatDefinition } from './file-types'
import {
  parseZipManifest,
  extractDocxText,
  extractDocText,
  extractXlsxText,
  extractPptxText,
} from './archive-utils'
import { parseImageMetadata } from './media-utils'
import { processDocument as processPdfDocument } from '@/lib/ai/processor'
import { indexDocument } from '@/lib/ai/index-document'
import {
  synthesizeDocumentMetadataWithGemini,
  analyzeImageWithGemini,
  DocumentMetadataResult,
} from '@/lib/ai/metadata-synthesizer'

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createSupabaseAdminClient(url, serviceKey)
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null
  return new GoogleGenAI({ apiKey })
}

function getCandidateModels(): string[] {
  return Array.from(
    new Set(
      [
        process.env.GEMINI_MODEL,
        'gemini-flash-lite-latest',
        'gemini-3.5-flash',
        'gemini-flash-latest',
        'gemini-3.1-flash-lite',
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3-flash-preview',
        process.env.GEMINI_FALLBACK_MODEL,
      ].filter(Boolean) as string[]
    )
  )
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

// 1. Text & Documents Processor (DOCX, DOC, TXT, MD, RTF, HTML, EPUB, ODT)
const documentProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  let text = ''
  const ext = format.extension.toLowerCase()

  if (ext === 'docx') {
    text = extractDocxText(buffer)
  } else if (ext === 'doc') {
    text = extractDocText(buffer)
  } else if (ext === 'html' || ext === 'htm') {
    const raw = buffer.toString('utf8')
    text = raw
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  } else if (ext === 'rtf') {
    const raw = buffer.toString('utf8')
    text = raw
      .replace(/\\par[d]?/g, '\n')
      .replace(/\\[a-z0-9\-]+/gi, '')
      .replace(/[{}]/g, '')
      .trim()
  } else {
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

  // Insert pages for search and semantic indexing
  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert(
    pages.map((p) => ({
      document_id: documentId,
      page_number: p.page_number,
      extracted_text: p.extracted_text,
    }))
  )

  // AI analysis pipeline
  const gemini = getGeminiClient()
  const candidateModels = getCandidateModels()
  let aiResult: DocumentMetadataResult

  if (gemini && text.length > 20) {
    aiResult = await synthesizeDocumentMetadataWithGemini({
      geminiClient: gemini,
      introText: text.slice(0, 6000),
      filename: doc.filename,
      candidateModels,
      formatLabel: format.label,
    })
  } else {
    aiResult = {
      doc_category: 'Document',
      tags: [format.label.split(' ')[0], 'Text Content'],
      metadata: [],
      is_scanned: false,
      smart_title: doc.filename.replace(/\.[a-zA-Z0-9]+$/i, ''),
      summary: `Document "${doc.filename}" processed with ${pages.length} pages.`,
    }
  }

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: pages.length,
      doc_category: aiResult.doc_category || 'Document',
      tags: aiResult.tags,
      extracted_data: {
        smart_title: aiResult.smart_title,
        summary: aiResult.summary,
        metadata: aiResult.metadata,
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
    category: aiResult.doc_category || 'Document',
    pageCount: pages.length,
    extractedText: text.slice(0, 1000),
    tags: aiResult.tags,
  }
}

// 2. Presentation Processor (PPTX, PPT)
const presentationProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  const ext = format.extension.toLowerCase()
  let pptxResult = { text: '', slideCount: 0, slides: [] as { slideNumber: number; text: string }[] }

  if (ext === 'pptx') {
    pptxResult = extractPptxText(buffer)
  } else {
    const raw = extractDocText(buffer)
    pptxResult = {
      text: raw,
      slideCount: 1,
      slides: [{ slideNumber: 1, text: raw || `Presentation: ${doc.filename}` }],
    }
  }

  const pages =
    pptxResult.slides.length > 0
      ? pptxResult.slides.map((s) => ({
          page_number: s.slideNumber,
          extracted_text: s.text,
        }))
      : [{ page_number: 1, extracted_text: `Presentation: ${doc.filename}` }]

  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert(
    pages.map((p) => ({
      document_id: documentId,
      page_number: p.page_number,
      extracted_text: p.extracted_text,
    }))
  )

  const gemini = getGeminiClient()
  const candidateModels = getCandidateModels()
  let aiResult: DocumentMetadataResult

  if (gemini && pptxResult.text.length > 20) {
    aiResult = await synthesizeDocumentMetadataWithGemini({
      geminiClient: gemini,
      introText: pptxResult.text.slice(0, 6000),
      filename: doc.filename,
      candidateModels,
      formatLabel: 'Presentation Deck',
    })
  } else {
    aiResult = {
      doc_category: 'Presentation Deck',
      tags: ['Presentation', 'Slides', `${pptxResult.slideCount} Slides`],
      metadata: [],
      is_scanned: false,
      smart_title: doc.filename.replace(/\.[a-zA-Z0-9]+$/i, ''),
      summary: `Presentation deck "${doc.filename}" containing ${pptxResult.slideCount} slides.`,
    }
  }

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: pages.length,
      doc_category: aiResult.doc_category || 'Presentation Deck',
      tags: aiResult.tags,
      extracted_data: {
        smart_title: aiResult.smart_title,
        summary: aiResult.summary,
        metadata: aiResult.metadata,
        slideCount: pptxResult.slideCount,
        snippet: pptxResult.text.slice(0, 300),
      },
    })
    .eq('id', documentId)

  indexDocument(documentId).catch(() => {})

  return {
    success: true,
    category: aiResult.doc_category || 'Presentation Deck',
    pageCount: pages.length,
    tags: aiResult.tags,
  }
}

// 3. Spreadsheet Processor (CSV, XLSX, XLS, ODS)
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

  const gemini = getGeminiClient()
  const candidateModels = getCandidateModels()
  let aiResult: DocumentMetadataResult

  if (gemini && tableText.length > 20) {
    aiResult = await synthesizeDocumentMetadataWithGemini({
      geminiClient: gemini,
      introText: tableText.slice(0, 4000),
      filename: doc.filename,
      candidateModels,
      formatLabel: 'Spreadsheet',
    })
  } else {
    const tags = ['Spreadsheet', format.extension.toUpperCase()]
    if (rowCount > 0) tags.push(`${rowCount} Rows`)
    aiResult = {
      doc_category: 'Spreadsheet Data',
      tags,
      metadata: [],
      is_scanned: false,
      smart_title: doc.filename.replace(/\.[a-zA-Z0-9]+$/i, ''),
      summary: `Spreadsheet "${doc.filename}" containing ${rowCount} rows and ${columnCount} columns.`,
    }
  }

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: aiResult.doc_category || 'Spreadsheet Data',
      tags: aiResult.tags,
      extracted_data: {
        smart_title: aiResult.smart_title,
        summary: aiResult.summary,
        metadata: aiResult.metadata,
        rowCount,
        columnCount,
        previewRows: tableText.split('\n').slice(0, 15),
      },
    })
    .eq('id', documentId)

  indexDocument(documentId).catch(() => {})

  return {
    success: true,
    category: aiResult.doc_category || 'Spreadsheet Data',
    pageCount: 1,
    tags: aiResult.tags,
  }
}

// 4. Code & Config Processor (JSON, XML, JS, TS, PY, SQL, etc.)
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

  const gemini = getGeminiClient()
  const candidateModels = getCandidateModels()
  let aiResult: DocumentMetadataResult

  if (gemini && code.length > 20) {
    aiResult = await synthesizeDocumentMetadataWithGemini({
      geminiClient: gemini,
      introText: code.slice(0, 5000),
      filename: doc.filename,
      candidateModels,
      formatLabel: format.label,
    })
  } else {
    const langTag = format.extension.toUpperCase()
    aiResult = {
      doc_category: 'Source Code',
      tags: ['Source Code', langTag, `${lineCount} Lines`],
      metadata: [],
      is_scanned: false,
      smart_title: doc.filename,
      summary: `Source code file "${doc.filename}" written in ${format.label} (${lineCount} lines).`,
    }
  }

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: pages.length,
      doc_category: aiResult.doc_category || 'Source Code',
      tags: aiResult.tags,
      extracted_data: {
        smart_title: aiResult.smart_title,
        summary: aiResult.summary,
        metadata: aiResult.metadata,
        lineCount,
        language: format.label,
        snippet: lines.slice(0, 20).join('\n'),
      },
    })
    .eq('id', documentId)

  indexDocument(documentId).catch(() => {})

  return {
    success: true,
    category: aiResult.doc_category || 'Source Code',
    pageCount: pages.length,
    tags: aiResult.tags,
  }
}

// 5. Image Vision Multimodal Processor (PNG, JPG, WEBP, GIF, SVG, BMP)
const imageProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  const meta = parseImageMetadata(buffer, format.extension)
  const gemini = getGeminiClient()
  const candidateModels = getCandidateModels()

  let aiResult: DocumentMetadataResult

  if (gemini && buffer.length <= 10 * 1024 * 1024) {
    aiResult = await analyzeImageWithGemini({
      geminiClient: gemini,
      imageBuffer: buffer,
      mimeType: format.mimeType,
      filename: doc.filename,
      candidateModels,
    })
  } else {
    const cleanName = doc.filename.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]/g, ' ')
    aiResult = {
      doc_category: 'Image',
      tags: ['Image', meta.format || format.extension.toUpperCase()],
      metadata: [],
      is_scanned: false,
      smart_title: cleanName,
      summary: `Visual image file "${doc.filename}" with dimensions ${meta.width || 'N/A'}x${meta.height || 'N/A'}.`,
      extracted_text: `Image: ${doc.filename}`,
    }
  }

  if (meta.width && meta.height) {
    aiResult.tags = Array.from(new Set([...aiResult.tags, `${meta.width}x${meta.height}`]))
  }

  // Insert OCR/transcription into document_pages so Ask AI and Search can query it
  const pageText = aiResult.extracted_text || aiResult.summary || `Image: ${doc.filename}`
  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert([
    {
      document_id: documentId,
      page_number: 1,
      extracted_text: pageText,
    },
  ])

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: aiResult.doc_category || 'Image',
      tags: aiResult.tags,
      extracted_data: {
        smart_title: aiResult.smart_title,
        summary: aiResult.summary,
        metadata: aiResult.metadata,
        ...meta,
        fileSizeBytes: buffer.length,
      },
      embedding_status: 'pending',
    })
    .eq('id', documentId)

  // Trigger semantic embedding so images are searchable via OCR and visual description
  indexDocument(documentId).catch(() => {})

  return {
    success: true,
    category: aiResult.doc_category || 'Image',
    metadata: meta as unknown as Record<string, unknown>,
    tags: aiResult.tags,
  }
}

// 6. Media Processor (Audio & Video)
const mediaProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  const isVideo = format.category === 'video'
  const categoryLabel = isVideo ? 'Video' : 'Audio'

  const tags = [categoryLabel, format.extension.toUpperCase()]
  const cleanName = doc.filename.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]/g, ' ')

  const pageText = `${categoryLabel} file: ${doc.filename} (${format.label}). Stored securely in FileMind vault.`
  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert([
    {
      document_id: documentId,
      page_number: 1,
      extracted_text: pageText,
    },
  ])

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: categoryLabel,
      tags,
      extracted_data: {
        smart_title: cleanName,
        summary: `${categoryLabel} asset "${doc.filename}" cataloged in media library.`,
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

// 7. Archive Processor (ZIP, TAR, GZ)
const archiveProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
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

  const cleanName = doc.filename.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]/g, ' ')
  const manifestSnippet =
    Array.isArray(manifest.entries) && manifest.entries.length > 0
      ? (manifest.entries as { filename: string }[]).slice(0, 30).map((e) => e.filename).join(', ')
      : 'No files cataloged'

  const pageText = `Archive ${doc.filename} containing ${manifest.totalFiles} files: ${manifestSnippet}`
  await admin.from('document_pages').delete().eq('document_id', documentId)
  await admin.from('document_pages').insert([
    {
      document_id: documentId,
      page_number: 1,
      extracted_text: pageText,
    },
  ])

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: 'Archive',
      tags,
      extracted_data: {
        smart_title: cleanName,
        summary: `Archive "${doc.filename}" containing ${manifest.totalFiles} files.`,
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

// 8. Generic Fallback Processor
const genericProcessor: FileProcessor = async (documentId, doc, buffer, format) => {
  const admin = createAdminClient()
  const tags = ['Stored File', format.extension.toUpperCase()]
  const cleanName = doc.filename.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]/g, ' ')

  await admin
    .from('documents')
    .update({
      status: 'completed',
      page_count: 1,
      doc_category: 'Other',
      tags,
      extracted_data: {
        smart_title: cleanName,
        summary: `Binary file "${doc.filename}" stored securely in FileMind vault.`,
        fileSizeBytes: buffer.length,
        mimeType: format.mimeType,
        notice: 'File stored securely in Cloudflare R2.',
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
processingRegistry.register('presentation', presentationProcessor)
processingRegistry.register('default', genericProcessor)

/**
 * Universal Processing Gateway: routes documents to their dedicated processor
 */
export async function processUniversalFile(
  documentId: string,
  preAcquiredToken?: string
): Promise<boolean> {
  const admin = createAdminClient()

  let doc: {
    id: string
    user_id: string
    filename: string
    storage_path: string
    storage_provider?: string | null
    file_size: number | null
    mime_type: string
    status: string
  } | null = null

  const { data, error } = await admin
    .from('documents')
    .select('id, user_id, filename, storage_path, storage_provider, file_size, mime_type, status')
    .eq('id', documentId)
    .maybeSingle()

  if (error && (error.code === '42703' || error.message?.includes('storage_provider'))) {
    const { data: fallbackDoc, error: fallbackErr } = await admin
      .from('documents')
      .select('id, user_id, filename, storage_path, file_size, mime_type, status')
      .eq('id', documentId)
      .maybeSingle()

    if (fallbackErr || !fallbackDoc) {
      console.warn(`[UniversalProcessing] Document not found: ${documentId}`)
      return false
    }
    doc = { ...fallbackDoc, storage_provider: undefined }
  } else if (error || !data) {
    console.warn(`[UniversalProcessing] Document not found: ${documentId}`)
    return false
  } else {
    doc = data
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
