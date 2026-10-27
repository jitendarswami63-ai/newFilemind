const { createClient } = require('@supabase/supabase-js')
const { GoogleGenAI } = require('@google/genai')
const fs = require('fs')
const crypto = require('crypto')

// 1. Read environment from .env.local
const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((line) => line.trim().split('='))
    .filter((parts) => parts.length >= 2)
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const GEMINI_API_KEY = env.GEMINI_API_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials in .env.local')
  process.exit(1)
}

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY })

const TARGET_CHUNK_CHARS = 3200
const OVERLAP_CHARS = 500
const MIN_CHUNK_CHARS = 100

function chunkDocumentPages(pages) {
  if (!pages || pages.length === 0) return []
  const sortedPages = [...pages].sort((a, b) => a.page_number - b.page_number)
  const segments = []
  for (const page of sortedPages) {
    const paragraphs = (page.extracted_text || '').split(/\n\s*\n/)
    for (const para of paragraphs) {
      const trimmed = para.trim()
      if (trimmed.length > 0) {
        segments.push({ text: trimmed, page: page.page_number })
      }
    }
  }
  if (segments.length === 0) return []

  const rawChunks = []
  let currentBuffer = []
  let currentPages = []
  let currentLength = 0

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (currentLength + seg.text.length > TARGET_CHUNK_CHARS && currentLength >= MIN_CHUNK_CHARS) {
      const chunkText = currentBuffer.join('\n\n').trim()
      if (chunkText.length > 0) {
        rawChunks.push({
          content: chunkText,
          page_start: Math.min(...currentPages),
          page_end: Math.max(...currentPages),
        })
      }
      const overlapBuffer = []
      const overlapPages = []
      let overlapLen = 0
      for (let j = currentBuffer.length - 1; j >= 0; j--) {
        const item = currentBuffer[j]
        if (overlapLen + item.length <= OVERLAP_CHARS) {
          overlapBuffer.unshift(item)
          overlapPages.unshift(currentPages[j])
          overlapLen += item.length
        } else {
          break
        }
      }
      currentBuffer = [...overlapBuffer, seg.text]
      currentPages = [...overlapPages, seg.page]
      currentLength = currentBuffer.reduce((sum, item) => sum + item.length, 0)
    } else {
      currentBuffer.push(seg.text)
      currentPages.push(seg.page)
      currentLength += seg.text.length
    }
  }

  if (currentBuffer.length > 0) {
    const chunkText = currentBuffer.join('\n\n').trim()
    if (chunkText.length > 0) {
      if (rawChunks.length > 0 && chunkText.length < MIN_CHUNK_CHARS) {
        const lastChunk = rawChunks[rawChunks.length - 1]
        lastChunk.content = `${lastChunk.content}\n\n${chunkText}`
        lastChunk.page_end = Math.max(lastChunk.page_end, ...currentPages)
      } else {
        rawChunks.push({
          content: chunkText,
          page_start: Math.min(...currentPages),
          page_end: Math.max(...currentPages),
        })
      }
    }
  }

  return rawChunks.map((chunk, index) => ({
    ...chunk,
    chunk_index: index,
    content_hash: crypto.createHash('sha256').update(chunk.content).digest('hex'),
  }))
}

async function embedChunk(text, title) {
  const formattedText = `title: ${title || 'Document'} | text: ${text}`
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: formattedText,
    config: {
      outputDimensionality: 768,
    },
  })
  return response.embedding.values
}

async function backfill() {
  console.log('--- Checking Phase 1B database tables ---')
  const tableCheck = await supabase.from('document_chunks').select('id').limit(1)
  if (tableCheck.error && tableCheck.error.code === 'PGRST205') {
    console.error('\n❌ ERROR: public.document_chunks does not exist yet!')
    console.error('Please open Supabase SQL Editor and run supabase_phase1b_setup.sql first.')
    process.exit(1)
  }

  console.log('Fetching completed documents...')
  const { data: docs, error: docsErr } = await supabase
    .from('documents')
    .select('id, filename, user_id, status, doc_category')
    .eq('status', 'completed')

  if (docsErr) {
    console.error('Error fetching documents:', docsErr)
    process.exit(1)
  }

  console.log(`Found ${docs.length} completed document(s).\n`)

  for (const doc of docs) {
    console.log(`[Processing] ${doc.filename} (${doc.id})...`)

    // Check if chunks already exist
    const { data: existingChunks } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('document_id', doc.id)

    if (existingChunks && existingChunks.length > 0) {
      console.log(`  -> Already indexed (${existingChunks.length} chunks). Skipping.\n`)
      continue
    }

    // Fetch pages
    const { data: pages, error: pagesErr } = await supabase
      .from('document_pages')
      .select('page_number, extracted_text')
      .eq('document_id', doc.id)
      .order('page_number', { ascending: true })

    if (pagesErr || !pages || pages.length === 0) {
      console.warn(`  -> No page texts found. Skipping.\n`)
      continue
    }

    // Chunk pages
    const chunks = chunkDocumentPages(pages)
    console.log(`  -> Generated ${chunks.length} text chunk(s). Generating Gemini embeddings...`)

    // Embed chunks
    const chunkInserts = []
    for (const c of chunks) {
      process.stdout.write(`    Embedding chunk ${c.chunk_index + 1}/${chunks.length}... `)
      const embedding = await embedChunk(c.content, doc.filename)
      chunkInserts.push({
        document_id: doc.id,
        chunk_index: c.chunk_index,
        page_start: c.page_start,
        page_end: c.page_end,
        content: c.content,
        content_hash: c.content_hash,
        embedding: JSON.stringify(embedding),
      })
      console.log('done.')
    }

    // Insert chunks
    const { error: insertErr } = await supabase
      .from('document_chunks')
      .insert(chunkInserts)

    if (insertErr) {
      console.error(`  -> Failed to insert chunks:`, insertErr)
      continue
    }

    // Update document status
    await supabase
      .from('documents')
      .update({
        embedding_status: 'completed',
        embedding_completed_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    console.log(`  ✅ Successfully indexed ${doc.filename} with ${chunkInserts.length} vector chunks!\n`)
  }

  console.log('--- All documents processed! ---')
}

backfill().catch(console.error)
