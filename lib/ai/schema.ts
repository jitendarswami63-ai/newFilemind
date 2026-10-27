import { z } from 'zod'

/**
 * Normalized metadata item representation.
 */
export interface NormalizedMetadataItem {
  key: string
  type: 'string' | 'number' | 'date' | 'boolean'
  value_string?: string
  value_number?: number
  value_boolean?: boolean
  currency?: string
}

/**
 * Raw input schema for single metadata item before transformation.
 */
const RawMetadataItemSchema = z
  .object({
    key: z.string().trim().min(1, 'Metadata key is required').max(100),
    type: z.enum(['string', 'number', 'date', 'boolean']),
    value_string: z.string().optional(),
    value_number: z.number().optional(),
    value_boolean: z.boolean().optional(),
    currency: z.string().trim().max(10).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.type === 'string') {
      if (typeof val.value_string !== 'string' || val.value_string.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'value_string is required when type is string',
          path: ['value_string'],
        })
      }
    } else if (val.type === 'number') {
      if (typeof val.value_number !== 'number' || Number.isNaN(val.value_number)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'value_number is required when type is number',
          path: ['value_number'],
        })
      }
    } else if (val.type === 'boolean') {
      if (typeof val.value_boolean !== 'boolean') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'value_boolean is required when type is boolean',
          path: ['value_boolean'],
        })
      }
    } else if (val.type === 'date') {
      if (typeof val.value_string !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(val.value_string.trim())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'value_string must be in strict YYYY-MM-DD format for date type',
          path: ['value_string'],
        })
      } else {
        const parsed = Date.parse(val.value_string.trim())
        if (Number.isNaN(parsed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Invalid date value',
            path: ['value_string'],
          })
        }
      }
    }
  })
  .transform((val): NormalizedMetadataItem => {
    // Strip irrelevant fields based on type
    const sanitizedKey = val.key.replace(/[\x00-\x1F\x7F]/g, '').trim()

    if (val.type === 'string') {
      return {
        key: sanitizedKey,
        type: 'string',
        value_string: val.value_string!.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim(),
      }
    }

    if (val.type === 'number') {
      const item: NormalizedMetadataItem = {
        key: sanitizedKey,
        type: 'number',
        value_number: val.value_number!,
      }
      if (val.currency && val.currency.trim()) {
        item.currency = val.currency.replace(/[\x00-\x1F\x7F]/g, '').trim()
      }
      return item
    }

    if (val.type === 'boolean') {
      return {
        key: sanitizedKey,
        type: 'boolean',
        value_boolean: val.value_boolean!,
      }
    }

    // type === 'date'
    return {
      key: sanitizedKey,
      type: 'date',
      value_string: val.value_string!.trim(),
    }
  })

/**
 * Raw page item schema.
 */
const RawPageSchema = z.object({
  page_number: z.number().int('Page number must be an integer'),
  text: z.string().max(100_000, 'Page text exceeds 100,000 characters limit'),
})

/**
 * Sanitize doc_category.
 */
const DocCategorySchema = z
  .string()
  .max(100)
  .transform((val) => {
    const cleaned = val.replace(/[\x00-\x1F\x7F]/g, '').trim()
    return cleaned.length > 0 ? cleaned : 'Uncategorized'
  })

/**
 * Sanitize tags: bounded count, max 50 chars each, no control chars, deduplicated.
 */
const TagsSchema = z
  .array(z.string())
  .transform((rawTags) => {
    const cleaned = rawTags
      .map((t) => t.replace(/[\x00-\x1F\x7F]/g, '').trim())
      .filter((t) => t.length > 0 && t.length <= 50)
    // Deduplicate preserving case
    const seen = new Set<string>()
    const deduped: string[] = []
    for (const tag of cleaned) {
      const lower = tag.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        deduped.push(tag)
      }
    }
    return deduped.slice(0, 20)
  })

/**
 * Full AI structured output schema.
 */
export const DocumentAiOutputSchema = z
  .object({
    doc_category: DocCategorySchema,
    tags: TagsSchema,
    metadata: z.array(RawMetadataItemSchema).max(50),
    pages: z.array(RawPageSchema),
    page_count: z.number().int().min(1, 'page_count must be at least 1'),
    is_scanned: z.boolean(),
  })
  .superRefine((val, ctx) => {
    // Page count matching
    if (val.pages.length !== val.page_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `pages.length (${val.pages.length}) does not match page_count (${val.page_count})`,
        path: ['pages'],
      })
      return
    }

    // Contiguous page numbers check: 1 to page_count
    const pageNumbers = val.pages.map((p) => p.page_number).sort((a, b) => a - b)
    for (let i = 0; i < pageNumbers.length; i++) {
      const expected = i + 1
      if (pageNumbers[i] !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Page numbers must be strictly contiguous from 1 to ${val.page_count}. Found: ${pageNumbers.join(', ')}`,
          path: ['pages'],
        })
        return
      }
    }
  })

export type DocumentAiOutput = z.infer<typeof DocumentAiOutputSchema>

/**
 * Page integrity verification function.
 * Throws an Error if integrity validation fails.
 */
export function validatePageIntegrity(
  pages: Array<{ page_number: number; text: string }>,
  pageCount: number
): void {
  if (pageCount < 1) {
    throw new Error(`Invalid page_count: ${pageCount}. Must be >= 1.`)
  }

  if (pages.length !== pageCount) {
    throw new Error(`Page count mismatch: pages array has ${pages.length} items but page_count is ${pageCount}.`)
  }

  const sortedPages = [...pages].sort((a, b) => a.page_number - b.page_number)
  for (let i = 0; i < sortedPages.length; i++) {
    const expected = i + 1
    if (sortedPages[i].page_number !== expected) {
      throw new Error(`Page numbers are not contiguous starting at 1. Expected ${expected}, got ${sortedPages[i].page_number}.`)
    }
    if (typeof sortedPages[i].text !== 'string') {
      throw new Error(`Page ${sortedPages[i].page_number} is missing text property.`)
    }
    if (sortedPages[i].text.length > 100_000) {
      throw new Error(`Page ${sortedPages[i].page_number} text exceeds 100,000 characters.`)
    }
  }
}
