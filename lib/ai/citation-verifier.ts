export interface VerifiedCitation {
  raw: string
  filename: string
  pageStart: number
  pageEnd: number
  verified: boolean
  matchedDocumentId?: string
  unverifiedReason?: string
}

export interface CitationVerificationResult {
  annotatedText: string
  citations: VerifiedCitation[]
  verifiedIndices: Set<number>
}

export function normalizeFilename(name: string): string {
  return name
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\.pdf$/i, '')
}

export function verifyCitationsAgainstEvidence(
  text: string,
  evidence: Array<{
    document_id: string
    filename: string
    page_start: number
    page_end: number
    matching_pages?: number[]
  }>
): CitationVerificationResult {
  if (!text) {
    return { annotatedText: '', citations: [], verifiedIndices: new Set() }
  }

  const citationRegex =
    /\[(?:(?:Document|Doc):\s*)?["']?([^,"'\n\]]+?)["']?,\s*(?:Pages?|p\.?|pp\.?):?\s*(\d+)(?:\s*[–-]\s*(\d+))?\]/gi

  const citations: VerifiedCitation[] = []
  const verifiedIndices = new Set<number>()

  const annotatedText = text.replace(citationRegex, (raw, rawName, rawPStart, rawPEnd) => {
    const pStart = parseInt(rawPStart, 10)
    const pEnd = rawPEnd ? parseInt(rawPEnd, 10) : pStart
    const cleanCitName = normalizeFilename(rawName)

    let matchIdx = -1
    let unverifiedReason = ''

    const evidenceIdxMatch = rawName.match(/^(?:Evidence|Source)\s*#?(\d+)$/i)
    if (evidenceIdxMatch) {
      const eIdx = parseInt(evidenceIdxMatch[1], 10) - 1
      if (eIdx >= 0 && eIdx < evidence.length) {
        const item = evidence[eIdx]
        const pageMatches =
          (pStart <= item.page_end && pEnd >= item.page_start) ||
          (item.matching_pages && item.matching_pages.some((p) => p >= pStart && p <= pEnd))
        if (pageMatches) {
          matchIdx = eIdx
        } else {
          unverifiedReason = `Page ${pStart} not in evidence item ${eIdx + 1} (pages ${item.page_start}–${item.page_end})`
        }
      } else {
        unverifiedReason = `Evidence index "${rawName}" out of bounds`
      }
    } else {
      const matchingDocs = evidence
        .map((e, idx) => ({ e, idx }))
        .filter(({ e }) => {
          const docClean = normalizeFilename(e.filename)
          if (docClean === cleanCitName) return true
          const docAlpha = docClean.replace(/[^a-z0-9]/g, '')
          const citAlpha = cleanCitName.replace(/[^a-z0-9]/g, '')
          return docAlpha === citAlpha || (docAlpha.length > 5 && citAlpha.length > 5 && (docAlpha.includes(citAlpha) || citAlpha.includes(docAlpha)))
        })

      if (matchingDocs.length === 0) {
        unverifiedReason = `Document "${rawName}" not found in retrieved evidence`
      } else {
        const pageMatch = matchingDocs.find(
          ({ e }) =>
            (pStart <= e.page_end && pEnd >= e.page_start) ||
            (e.matching_pages && e.matching_pages.some((p) => p >= pStart && p <= pEnd))
        )
        if (pageMatch) {
          matchIdx = pageMatch.idx
        } else {
          unverifiedReason = `Page ${pStart} not in retrieved passages for "${rawName}"`
        }
      }
    }

    if (matchIdx >= 0) {
      verifiedIndices.add(matchIdx)
      citations.push({
        raw,
        filename: evidence[matchIdx].filename,
        pageStart: pStart,
        pageEnd: pEnd,
        verified: true,
        matchedDocumentId: evidence[matchIdx].document_id,
      })
      return raw
    } else {
      citations.push({
        raw,
        filename: rawName,
        pageStart: pStart,
        pageEnd: pEnd,
        verified: false,
        unverifiedReason,
      })
      return raw.replace(/\]$/, ' (Unverified Citation)]')
    }
  })

  return {
    annotatedText,
    citations,
    verifiedIndices,
  }
}
