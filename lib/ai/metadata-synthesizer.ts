import { GoogleGenAI, Type } from '@google/genai'
import type { NormalizedMetadataItem } from './schema'

export interface DocumentMetadataResult {
  doc_category: string
  tags: string[]
  metadata: NormalizedMetadataItem[]
  is_scanned: boolean
}

const METADATA_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
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
  required: ['doc_category', 'tags', 'metadata'],
}

export function inferHeuristicMetadata(
  filename: string,
  introText: string
): DocumentMetadataResult {
  const cleanName = filename.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ')
  const lowerName = cleanName.toLowerCase()
  const lowerIntro = (introText || '').slice(0, 1500).toLowerCase()

  let category = 'Other'
  if (lowerName.includes('math') || lowerName.includes('textbook') || lowerName.includes('physics') || lowerName.includes('chemistry') || lowerIntro.includes('mathematics') || lowerIntro.includes('textbook')) {
    category = 'Education / Textbook'
  } else if (lowerName.includes('report') || lowerName.includes('annual') || lowerName.includes('quarterly')) {
    category = 'Business Report'
  } else if (lowerName.includes('paper') || lowerName.includes('journal') || lowerName.includes('thesis')) {
    category = 'Research Paper'
  } else if (lowerName.includes('spec') || lowerName.includes('architecture') || lowerName.includes('design')) {
    category = 'Technical Specification'
  } else if (lowerName.includes('invoice') || lowerName.includes('bill') || lowerName.includes('receipt')) {
    category = 'Financial Document'
  } else if (lowerName.includes('contract') || lowerName.includes('agreement')) {
    category = 'Legal Document'
  } else if (lowerIntro.includes('table of contents') || lowerIntro.includes('chapter 1')) {
    category = 'Book / Manual'
  }

  const nameWords = cleanName
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !/^\d+$/.test(w))

  const tags = Array.from(new Set(['Document', ...nameWords])).slice(0, 8)

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
  ]

  return {
    doc_category: category,
    tags,
    metadata,
    is_scanned: false,
  }
}

export async function synthesizeDocumentMetadataWithGemini({
  geminiClient,
  introText,
  filename,
  candidateModels,
}: {
  geminiClient: GoogleGenAI
  introText: string
  filename: string
  candidateModels: string[]
}): Promise<DocumentMetadataResult> {
  if (!introText || introText.trim().length < 20) {
    return inferHeuristicMetadata(filename, '')
  }

  const prompt = `Analyze this introductory sample from the PDF document "${filename}" and extract high-level metadata:
1. doc_category: Choose a concise category (e.g. Textbook, Technical Specification, Financial Report, Legal Contract, Research Paper, Manual, General).
2. tags: 4 to 8 relevant topic keywords.
3. metadata: Key-value attributes (e.g. title, author, subject, edition, publisher, year, version).

Document Introductory Sample:
${introText}`

  for (const model of candidateModels) {
    try {
      const response = await geminiClient.models.generateContent({
        model,
        contents: [prompt],
        config: {
          systemInstruction:
            'You are an authoritative document metadata classifier. Output strictly valid JSON matching the requested schema.',
          responseMimeType: 'application/json',
          responseSchema: METADATA_RESPONSE_SCHEMA,
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
        }
      }
    } catch (err: unknown) {
      console.warn(
        `[MetadataSynthesizer] Model ${model} metadata synthesis failed (${err instanceof Error ? err.message : String(err)}), trying fallback...`
      )
    }
  }

  console.log('[MetadataSynthesizer] All LLM models unavailable, using heuristic classification')
  return inferHeuristicMetadata(filename, introText)
}
