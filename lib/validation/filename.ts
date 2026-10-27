import { MAX_FILENAME_LENGTH } from '../constants'

export function sanitizeFilename(filename: string | undefined | null): string {
  if (!filename) {
    return 'document.pdf'
  }

  let sanitized = filename

  // 1. URL-decode the filename (convert %2F → /, etc.)
  try {
    sanitized = decodeURIComponent(sanitized)
  } catch {
    // Ignore decode errors
  }

  // 2. Extract basename only: strip everything before the last / or \
  const lastSlashIndex = Math.max(sanitized.lastIndexOf('/'), sanitized.lastIndexOf('\\'))
  if (lastSlashIndex !== -1) {
    sanitized = sanitized.slice(lastSlashIndex + 1)
  }

  // 3. Strip null bytes (\0, %00)
  sanitized = sanitized.replace(/\0|%00/g, '')

  // 4. Strip control characters (ASCII 0–31 and 127)
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  // 5. Strip .. sequences
  sanitized = sanitized.replace(/\.\./g, '')

  // 6. Strip remaining / and \ characters
  sanitized = sanitized.replace(/[/\\]/g, '')

  // 7. Trim leading and trailing whitespace
  sanitized = sanitized.trim()

  // 8. If result is empty → use 'document' as base name
  // 9. Ensure extension is .pdf: strip any existing extension, append .pdf
  // Remove any existing extension first
  const dotIndex = sanitized.lastIndexOf('.')
  let baseName = dotIndex !== -1 ? sanitized.slice(0, dotIndex) : sanitized
  baseName = baseName.trim()

  if (!baseName) {
    baseName = 'document'
  }

  // 10. Truncate to MAX_FILENAME_LENGTH (200) characters, preserving .pdf extension
  const ext = '.pdf'
  const maxBaseLength = MAX_FILENAME_LENGTH - ext.length
  if (baseName.length > maxBaseLength) {
    baseName = baseName.slice(0, maxBaseLength)
  }

  // 11. The sanitized filename is used as the last path segment in Storage and as display name in UI
  return `${baseName}${ext}`
}
