import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPE } from '../constants';

export function validateMimeType(mimeType: string): boolean {
  return mimeType === ALLOWED_MIME_TYPE;
}

export function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes <= MAX_FILE_SIZE_BYTES;
}

export function validateUpload(file: { type: string; size: number }): { valid: boolean; error?: string } {
  if (!validateMimeType(file.type)) {
    return { valid: false, error: 'Invalid file type. Only ' + ALLOWED_MIME_TYPE + ' is allowed.' };
  }
  
  if (!validateFileSize(file.size)) {
    return { valid: false, error: 'File size exceeds the maximum limit.' };
  }

  return { valid: true };
}
