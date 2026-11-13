import { MAX_FILE_SIZE_BYTES } from '../constants'
import { detectFileFormat, isDangerousFile } from '../files/file-types'

export function validateMimeType(mimeType: string): boolean {
  if (!mimeType) return true
  const format = detectFileFormat('file', mimeType)
  return format.category !== 'other' || mimeType.includes('/')
}

export function validateFileSize(sizeBytes: number, maxBytes: number = MAX_FILE_SIZE_BYTES): boolean {
  return sizeBytes > 0 && sizeBytes <= maxBytes
}

export function validateUpload(file: { name?: string; type: string; size: number }): { valid: boolean; error?: string } {
  const filename = file.name || 'document'
  const dangerCheck = isDangerousFile(filename)
  if (dangerCheck.dangerous) {
    return { valid: false, error: dangerCheck.reason || 'This file type is not permitted for security reasons.' }
  }

  if (!validateFileSize(file.size)) {
    return { valid: false, error: 'File size exceeds the maximum limit.' }
  }

  return { valid: true }
}
