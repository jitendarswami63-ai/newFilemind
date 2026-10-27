export const STORAGE_BUCKET = 'documents'
export const MAX_FILE_SIZE_BYTES = 51_380_224        // 49 MiB (49 * 1024 * 1024)
export const MAX_FILE_SIZE_MB = 49
export const MAX_BATCH_FILES = 150
export const MAX_CONCURRENT_UPLOADS = 4
export const MAX_CONCURRENT_PROCESSING = 2
export const ALLOWED_MIME_TYPE = 'application/pdf'
export const PDF_MAGIC_BYTES = [0x25, 0x50, 0x44, 0x46]  // %PDF
export const VIEWER_SIGNED_URL_EXPIRY = 300          // seconds (5 minutes)
export const DOWNLOAD_SIGNED_URL_EXPIRY = 120        // seconds (2 minutes)
export const MAX_FILENAME_LENGTH = 200

