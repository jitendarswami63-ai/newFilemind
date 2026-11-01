import { MAX_FILENAME_LENGTH } from '../constants'

export function sanitizeFilename(filename: string | undefined | null): string {
  if (!filename) {
    return 'document.pdf'
  }

  let sanitized = filename

  try {
    sanitized = decodeURIComponent(sanitized)
  } catch {

  }

  const lastSlashIndex = Math.max(sanitized.lastIndexOf('/'), sanitized.lastIndexOf('\\'))
  if (lastSlashIndex !== -1) {
    sanitized = sanitized.slice(lastSlashIndex + 1)
  }

  sanitized = sanitized.replace(/\0|%00/g, '')

  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '')

  sanitized = sanitized.replace(/\.\./g, '')

  sanitized = sanitized.replace(/[/\\]/g, '')

  sanitized = sanitized.trim()

  const dotIndex = sanitized.lastIndexOf('.')
  let baseName = dotIndex !== -1 ? sanitized.slice(0, dotIndex) : sanitized
  baseName = baseName.trim()

  if (!baseName) {
    baseName = 'document'
  }

  const ext = '.pdf'
  const maxBaseLength = MAX_FILENAME_LENGTH - ext.length
  if (baseName.length > maxBaseLength) {
    baseName = baseName.slice(0, maxBaseLength)
  }

  return `${baseName}${ext}`
}
