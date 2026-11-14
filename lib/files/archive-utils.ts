import zlib from 'zlib'

export interface ArchiveEntry {
  filename: string
  uncompressedSize: number
  compressedSize: number
  compressionMethod: number
  crc32: number
  isEncrypted: boolean
  isDirectory: boolean
}

export interface ArchiveManifest {
  format: 'zip' | 'tar' | 'unknown'
  totalFiles: number
  totalUncompressedBytes: number
  entries: ArchiveEntry[]
  isZipBombRisk: boolean
}

export function parseZipManifest(buffer: Buffer): ArchiveManifest {
  const entries: ArchiveEntry[] = []
  let totalUncompressedBytes = 0
  const maxSafeFiles = 10_000
  const maxSafeUncompressedBytes = 500 * 1024 * 1024 // 500 MB max expanded limit

  // Locate End of Central Directory (EOCD) record starting from end of buffer
  let eocdOffset = -1
  const minEOCDSize = 22
  const maxCommentSize = 65535
  const searchStart = Math.max(0, buffer.length - minEOCDSize - maxCommentSize)

  for (let i = buffer.length - minEOCDSize; i >= searchStart; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4B &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) {
    return {
      format: 'unknown',
      totalFiles: 0,
      totalUncompressedBytes: 0,
      entries: [],
      isZipBombRisk: false,
    }
  }

  const centralDirSize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16)
  let offset = centralDirOffset

  while (offset < centralDirOffset + centralDirSize && offset + 46 <= buffer.length) {
    if (
      buffer[offset] !== 0x50 ||
      buffer[offset + 1] !== 0x4B ||
      buffer[offset + 2] !== 0x01 ||
      buffer[offset + 3] !== 0x02
    ) {
      break
    }

    const flags = buffer.readUInt16LE(offset + 8)
    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const crc32 = buffer.readUInt32LE(offset + 16)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const filenameLen = buffer.readUInt16LE(offset + 28)
    const extraLen = buffer.readUInt16LE(offset + 30)
    const commentLen = buffer.readUInt16LE(offset + 32)

    const filenameBytes = buffer.subarray(offset + 46, offset + 46 + filenameLen)
    const rawFilename = filenameBytes.toString('utf8').replace(/\\/g, '/')
    // Path traversal defense
    const safeFilename = rawFilename.replace(/\.\.\//g, '').replace(/^\/+/, '')
    const isDirectory = safeFilename.endsWith('/')

    const isEncrypted = (flags & 0x0001) !== 0

    totalUncompressedBytes += uncompressedSize
    entries.push({
      filename: safeFilename,
      uncompressedSize,
      compressedSize,
      compressionMethod,
      crc32,
      isEncrypted,
      isDirectory,
    })

    if (entries.length > maxSafeFiles) {
      break
    }

    offset += 46 + filenameLen + extraLen + commentLen
  }

  const compressionRatio =
    buffer.length > 0 ? totalUncompressedBytes / buffer.length : 1
  const isZipBombRisk =
    compressionRatio > 100 ||
    totalUncompressedBytes > maxSafeUncompressedBytes ||
    entries.length >= maxSafeFiles

  return {
    format: 'zip',
    totalFiles: entries.length,
    totalUncompressedBytes,
    entries: entries.slice(0, 1000), // Cap preview at 1000 items
    isZipBombRisk,
  }
}

export function extractZipEntry(buffer: Buffer, targetFilename: string): Buffer | null {
  let eocdOffset = -1
  const minEOCDSize = 22
  const maxCommentSize = 65535
  const searchStart = Math.max(0, buffer.length - minEOCDSize - maxCommentSize)

  for (let i = buffer.length - minEOCDSize; i >= searchStart; i--) {
    if (
      buffer[i] === 0x50 &&
      buffer[i + 1] === 0x4B &&
      buffer[i + 2] === 0x05 &&
      buffer[i + 3] === 0x06
    ) {
      eocdOffset = i
      break
    }
  }

  if (eocdOffset === -1) return null

  const centralDirSize = buffer.readUInt32LE(eocdOffset + 12)
  const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16)
  let offset = centralDirOffset

  while (offset < centralDirOffset + centralDirSize && offset + 46 <= buffer.length) {
    if (
      buffer[offset] !== 0x50 ||
      buffer[offset + 1] !== 0x4B ||
      buffer[offset + 2] !== 0x01 ||
      buffer[offset + 3] !== 0x02
    ) {
      break
    }

    const compressionMethod = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const uncompressedSize = buffer.readUInt32LE(offset + 24)
    const filenameLen = buffer.readUInt16LE(offset + 28)
    const extraLen = buffer.readUInt16LE(offset + 30)
    const commentLen = buffer.readUInt16LE(offset + 32)
    const localHeaderOffset = buffer.readUInt32LE(offset + 42)

    const filenameBytes = buffer.subarray(offset + 46, offset + 46 + filenameLen)
    const filename = filenameBytes.toString('utf8').replace(/\\/g, '/')

    if (filename === targetFilename) {
      // Local header check
      if (localHeaderOffset + 30 > buffer.length) return null
      const localFilenameLen = buffer.readUInt16LE(localHeaderOffset + 26)
      const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28)
      const dataOffset = localHeaderOffset + 30 + localFilenameLen + localExtraLen

      if (dataOffset + compressedSize > buffer.length) return null
      const compressedData = buffer.subarray(dataOffset, dataOffset + compressedSize)

      if (compressionMethod === 0) {
        // Stored (no compression)
        return Buffer.from(compressedData)
      } else if (compressionMethod === 8) {
        // Deflate
        try {
          return zlib.inflateRawSync(compressedData)
        } catch {
          return null
        }
      }
      return null
    }

    offset += 46 + filenameLen + extraLen + commentLen
  }

  return null
}

export function extractDocxText(buffer: Buffer): string {
  try {
    const xmlBuffer = extractZipEntry(buffer, 'word/document.xml')
    if (!xmlBuffer) return ''
    const xml = xmlBuffer.toString('utf8')

    // Extract text inside <w:t>...</w:t> and paragraphs <w:p>
    const paragraphs: string[] = []
    const pMatches = xml.split(/<\/w:p>/)

    for (const p of pMatches) {
      const textMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
      if (textMatches && textMatches.length > 0) {
        const pText = textMatches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join('')
          .trim()
        if (pText) {
          paragraphs.push(pText)
        }
      }
    }

    return paragraphs.join('\n\n')
  } catch {
    return ''
  }
}

export function extractXlsxText(buffer: Buffer): { text: string; rowCount: number; columnCount: number } {
  try {
    // 1. Extract shared strings if present
    const sharedStrings: string[] = []
    const sstXml = extractZipEntry(buffer, 'xl/sharedStrings.xml')
    if (sstXml) {
      const sstStr = sstXml.toString('utf8')
      const matches = sstStr.match(/<t[^>]*>([^<]*)<\/t>/g)
      if (matches) {
        for (const m of matches) {
          sharedStrings.push(m.replace(/<[^>]+>/g, ''))
        }
      }
    }

    // 2. Extract first sheet
    const sheetXml = extractZipEntry(buffer, 'xl/worksheets/sheet1.xml')
    if (!sheetXml) return { text: '', rowCount: 0, columnCount: 0 }

    const sheetStr = sheetXml.toString('utf8')
    const rowMatches = sheetStr.split(/<\/row>/)
    const rows: string[] = []
    let maxCols = 0

    for (const r of rowMatches) {
      const cellMatches = r.match(/<c\s+([^>]*?)>(.*?)<\/c>/g)
      if (cellMatches && cellMatches.length > 0) {
        maxCols = Math.max(maxCols, cellMatches.length)
        const cellVals: string[] = []

        for (const c of cellMatches) {
          const isShared = c.includes('t="s"')
          const valMatch = c.match(/<v>([^<]*)<\/v>/)
          if (valMatch) {
            const rawVal = valMatch[1]
            if (isShared) {
              const idx = parseInt(rawVal, 10)
              cellVals.push(sharedStrings[idx] || '')
            } else {
              cellVals.push(rawVal)
            }
          }
        }

        if (cellVals.some((v) => v.trim())) {
          rows.push(cellVals.join(' | '))
        }
      }
    }

    return {
      text: rows.join('\n'),
      rowCount: rows.length,
      columnCount: maxCols,
    }
  } catch {
    return { text: '', rowCount: 0, columnCount: 0 }
  }
}

export function extractPptxText(buffer: Buffer): { text: string; slideCount: number; slides: { slideNumber: number; text: string }[] } {
  try {
    const slides: { slideNumber: number; text: string }[] = []
    let slideIndex = 1
    const maxSlides = 250

    while (slideIndex <= maxSlides) {
      const slideXmlBuf = extractZipEntry(buffer, `ppt/slides/slide${slideIndex}.xml`)
      if (!slideXmlBuf) {
        if (slideIndex === 1) {
          const altSlide = extractZipEntry(buffer, 'ppt/slides/slide.xml')
          if (altSlide) {
            const matches = altSlide.toString('utf8').match(/<a:t[^>]*>([^<]*)<\/a:t>/g)
            if (matches) {
              const slideText = matches.map((m) => m.replace(/<[^>]+>/g, '')).join(' ').trim()
              slides.push({ slideNumber: 1, text: slideText })
            }
          }
        }
        break
      }

      const slideXml = slideXmlBuf.toString('utf8')
      const matches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g)
      let slideText = ''
      if (matches && matches.length > 0) {
        slideText = matches
          .map((m) => m.replace(/<[^>]+>/g, ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
      }

      if (slideText) {
        slides.push({ slideNumber: slideIndex, text: slideText })
      } else {
        slides.push({ slideNumber: slideIndex, text: `Slide ${slideIndex}` })
      }

      slideIndex++
    }

    const fullText = slides.map((s) => `[Slide ${s.slideNumber}]\n${s.text}`).join('\n\n')
    return {
      text: fullText,
      slideCount: slides.length,
      slides,
    }
  } catch {
    return { text: '', slideCount: 0, slides: [] }
  }
}

export function extractDocText(buffer: Buffer): string {
  try {
    const raw = buffer.toString('latin1')
    const chunks: string[] = []
    const regex = /[\x20-\x7E\xA0-\xFF]{4,}/g
    let match: RegExpExecArray | null

    while ((match = regex.exec(raw)) !== null) {
      const segment = match[0].trim()
      if (segment.length > 4 && !/^[0-9a-fA-F\s.,_-]+$/.test(segment)) {
        chunks.push(segment)
      }
    }

    return chunks.join('\n').slice(0, 50000)
  } catch {
    return ''
  }
}
