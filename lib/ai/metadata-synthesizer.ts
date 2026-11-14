import { GoogleGenAI, Type } from '@google/genai'
import type { NormalizedMetadataItem } from './schema'

export interface DocumentMetadataResult {
  doc_category: string
  tags: string[]
  metadata: NormalizedMetadataItem[]
  is_scanned: boolean
  smart_title?: string
  summary?: string
  extracted_text?: string
}

const UNIVERSAL_AI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    smart_title: { type: Type.STRING },
    summary: { type: Type.STRING },
    doc_category: { type: Type.STRING },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    metadata: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['string', 'number', 'date', 'boolean'],
          },
          value_string: { type: Type.STRING },
          value_number: { type: Type.NUMBER },
          value_boolean: { type: Type.BOOLEAN },
          currency: { type: Type.STRING },
        },
        required: ['key', 'type'],
      },
    },
  },
  required: ['smart_title', 'summary', 'doc_category', 'tags', 'metadata'],
}

const IMAGE_AI_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    smart_title: { type: Type.STRING },
    summary: { type: Type.STRING },
    doc_category: { type: Type.STRING },
    extracted_text: { type: Type.STRING },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    metadata: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['string', 'number', 'date', 'boolean'],
          },
          value_string: { type: Type.STRING },
          value_number: { type: Type.NUMBER },
          value_boolean: { type: Type.BOOLEAN },
          currency: { type: Type.STRING },
        },
        required: ['key', 'type'],
      },
    },
  },
  required: ['smart_title', 'summary', 'doc_category', 'extracted_text', 'tags', 'metadata'],
}

export function inferHeuristicMetadata(
  filename: string,
  introText: string,
  formatLabel?: string
): DocumentMetadataResult {
  const cleanName = filename.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]/g, ' ').trim()
  const lowerName = cleanName.toLowerCase()
  const lowerIntro = (introText || '').slice(0, 2000).toLowerCase()

  let category = 'Other'
  if (lowerName.includes('math') || lowerName.includes('textbook') || lowerName.includes('physics') || lowerName.includes('chemistry') || lowerIntro.includes('mathematics') || lowerIntro.includes('textbook')) {
    category = 'Education / Textbook'
  } else if (lowerName.includes('report') || lowerName.includes('annual') || lowerName.includes('quarterly')) {
    category = 'Business Report'
  } else if (lowerName.includes('paper') || lowerName.includes('journal') || lowerName.includes('thesis')) {
    category = 'Research Paper'
  } else if (lowerName.includes('spec') || lowerName.includes('architecture') || lowerName.includes('design') || lowerName.includes('api')) {
    category = 'Technical Specification'
  } else if (lowerName.includes('invoice') || lowerName.includes('bill') || lowerName.includes('receipt') || lowerName.includes('salary')) {
    category = 'Financial Document'
  } else if (lowerName.includes('contract') || lowerName.includes('agreement') || lowerName.includes('nda')) {
    category = 'Legal Document'
  } else if (lowerName.includes('slide') || lowerName.includes('presentation') || lowerName.includes('deck') || lowerIntro.includes('slide 1')) {
    category = 'Presentation Deck'
  } else if (lowerName.includes('sheet') || lowerName.includes('data') || lowerName.includes('budget') || lowerName.includes('csv') || lowerName.includes('xlsx')) {
    category = 'Spreadsheet Data'
  } else if (lowerIntro.includes('function ') || lowerIntro.includes('import ') || lowerIntro.includes('class ') || lowerIntro.includes('def ')) {
    category = 'Source Code'
  } else if (lowerIntro.includes('table of contents') || lowerIntro.includes('chapter 1')) {
    category = 'Book / Manual'
  }

  const nameWords = cleanName
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !/^\d+$/.test(w))

  const tags = Array.from(new Set([formatLabel || 'Document', ...nameWords])).slice(0, 8)

  const summary = introText && introText.trim().length > 30
    ? `Document titled "${cleanName}". Contains ${introText.slice(0, 180).replace(/\s+/g, ' ').trim()}...`
    : `Document "${filename}" securely cataloged in the FileMind vault.`

  const metadata: NormalizedMetadataItem[] = [
    {
      key: 'title',
      type: 'string',
      value_string: cleanName,
    },
    {
      key: 'source_file',
      type: 'string',
      value_string: filename,
    },
    {
      key: 'category',
      type: 'string',
      value_string: category,
    },
  ]

  return {
    doc_category: category,
    tags,
    metadata,
    is_scanned: false,
    smart_title: cleanName,
    summary,
  }
}

export async function synthesizeDocumentMetadataWithGemini({
  geminiClient,
  introText,
  filename,
  candidateModels,
  formatLabel,
}: {
  geminiClient: GoogleGenAI
  introText: string
  filename: string
  candidateModels: string[]
  formatLabel?: string
}): Promise<DocumentMetadataResult> {
  if (!introText || introText.trim().length < 20) {
    return inferHeuristicMetadata(filename, '', formatLabel)
  }

  const prompt = `Analyze this introductory sample from "${filename}" (${formatLabel || 'Document'}) and generate comprehensive metadata:
1. smart_title: Clean, professional human-readable title.
2. summary: A concise, informative 2-3 sentence overview of what the document contains, core topics, and primary findings.
3. doc_category: Concise classification (e.g. Textbook, Technical Specification, Financial Report, Legal Contract, Research Paper, Manual, Presentation Deck, Spreadsheet Data, Source Code, Meeting Notes, Other).
4. tags: 4 to 8 relevant topic keywords and semantic tags.
5. metadata: Array of key-value attributes (e.g. author, date, subject, version, total_pages, language).

Sample Content:
${introText.slice(0, 6000)}`

  for (const model of candidateModels) {
    try {
      const response = await geminiClient.models.generateContent({
        model,
        contents: [prompt],
        config: {
          systemInstruction:
            'You are an authoritative document intelligence classifier. Output strictly valid JSON matching the requested schema.',
          responseMimeType: 'application/json',
          responseSchema: UNIVERSAL_AI_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      })

      const rawJson = response.text?.trim()
      if (rawJson) {
        const parsed = JSON.parse(rawJson)
        return {
          doc_category: parsed.doc_category || 'Other',
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 15) : [],
          metadata: Array.isArray(parsed.metadata) ? parsed.metadata.slice(0, 25) : [],
          is_scanned: false,
          smart_title: parsed.smart_title || filename.replace(/\.[a-zA-Z0-9]+$/i, ''),
          summary: parsed.summary || `Analysis completed for ${filename}.`,
        }
      }
    } catch (err: unknown) {
      console.warn(
        `[MetadataSynthesizer] Model ${model} metadata synthesis failed (${err instanceof Error ? err.message : String(err)}), trying fallback...`
      )
    }
  }

  console.log('[MetadataSynthesizer] All LLM models unavailable, using heuristic classification')
  return inferHeuristicMetadata(filename, introText, formatLabel)
}

export async function analyzeImageWithGemini({
  geminiClient,
  imageBuffer,
  mimeType,
  filename,
  candidateModels,
}: {
  geminiClient: GoogleGenAI
  imageBuffer: Buffer
  mimeType: string
  filename: string
  candidateModels: string[]
}): Promise<DocumentMetadataResult> {
  const base64Data = imageBuffer.toString('base64')

  const prompt = `Perform thorough visual analysis and optical character recognition (OCR) on this image named "${filename}":
1. smart_title: Descriptive title for this image.
2. summary: A detailed 2-4 sentence summary of what is depicted, including visual layout, diagrams, charts, or document structure.
3. doc_category: Classification (e.g. Architecture Diagram, Screenshot, Receipt, Invoice, Flowchart, UI Wireframe, Identification, Document Photo, Artwork).
4. extracted_text: Complete, faithful OCR transcription of all readable text, titles, numbers, data points, or diagram labels in the image.
5. tags: 4 to 10 relevant topical and visual tags.
6. metadata: Key-value attributes detected in the image.`

  for (const model of candidateModels) {
    try {
      const response = await geminiClient.models.generateContent({
        model,
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
        config: {
          systemInstruction:
            'You are an authoritative vision and document OCR intelligence model. Output strictly valid JSON matching the schema.',
          responseMimeType: 'application/json',
          responseSchema: IMAGE_AI_RESPONSE_SCHEMA,
          temperature: 0.1,
        },
      })

      const rawJson = response.text?.trim()
      if (rawJson) {
        const parsed = JSON.parse(rawJson)
        return {
          doc_category: parsed.doc_category || 'Image',
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 15) : ['Image'],
          metadata: Array.isArray(parsed.metadata) ? parsed.metadata.slice(0, 25) : [],
          is_scanned: false,
          smart_title: parsed.smart_title || filename.replace(/\.[a-zA-Z0-9]+$/i, ''),
          summary: parsed.summary || `Image analysis for ${filename}.`,
          extracted_text: parsed.extracted_text || `Image: ${filename}`,
        }
      }
    } catch (err: unknown) {
      console.warn(
        `[ImageAI] Model ${model} image analysis failed (${err instanceof Error ? err.message : String(err)}), trying fallback...`
      )
    }
  }

  const cleanName = filename.replace(/\.[a-zA-Z0-9]+$/i, '').replace(/[-_]/g, ' ')
  return {
    doc_category: 'Image',
    tags: ['Image', 'Visual Media'],
    metadata: [
      { key: 'title', type: 'string', value_string: cleanName },
      { key: 'mime_type', type: 'string', value_string: mimeType },
    ],
    is_scanned: false,
    smart_title: cleanName,
    summary: `Image "${filename}" saved in secure vault.`,
    extracted_text: `Image file: ${filename}`,
  }
}
