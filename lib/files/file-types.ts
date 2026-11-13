export type FileCategory =
  | 'document'
  | 'image'
  | 'spreadsheet'
  | 'presentation'
  | 'video'
  | 'audio'
  | 'archive'
  | 'code'
  | 'other'

export interface FileFormatDefinition {
  extension: string
  mimeType: string
  category: FileCategory
  label: string
  previewType: 'pdf' | 'image' | 'audio' | 'video' | 'code' | 'text' | 'spreadsheet' | 'presentation' | 'archive' | 'none'
  aiProcessingType: 'pdf' | 'text' | 'table' | 'vision' | 'media' | 'archive' | 'none'
  magicBytes?: number[][]
}

export const SUPPORTED_FILE_FORMATS: Record<string, FileFormatDefinition> = {
  // Documents
  pdf: {
    extension: 'pdf',
    mimeType: 'application/pdf',
    category: 'document',
    label: 'PDF Document',
    previewType: 'pdf',
    aiProcessingType: 'pdf',
    magicBytes: [[0x25, 0x50, 0x44, 0x46]], // %PDF
  },
  docx: {
    extension: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    category: 'document',
    label: 'Word Document (DOCX)',
    previewType: 'text',
    aiProcessingType: 'text',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]], // PK..
  },
  doc: {
    extension: 'doc',
    mimeType: 'application/msword',
    category: 'document',
    label: 'Word 97-2003 Document',
    previewType: 'none',
    aiProcessingType: 'text',
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]], // OLE CFB
  },
  txt: {
    extension: 'txt',
    mimeType: 'text/plain',
    category: 'document',
    label: 'Plain Text',
    previewType: 'text',
    aiProcessingType: 'text',
  },
  rtf: {
    extension: 'rtf',
    mimeType: 'application/rtf',
    category: 'document',
    label: 'Rich Text Format',
    previewType: 'text',
    aiProcessingType: 'text',
    magicBytes: [[0x7B, 0x5C, 0x72, 0x74]], // {\rt
  },
  odt: {
    extension: 'odt',
    mimeType: 'application/vnd.oasis.opendocument.text',
    category: 'document',
    label: 'OpenDocument Text',
    previewType: 'none',
    aiProcessingType: 'text',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },
  epub: {
    extension: 'epub',
    mimeType: 'application/epub+zip',
    category: 'document',
    label: 'EPUB E-Book',
    previewType: 'none',
    aiProcessingType: 'text',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },
  html: {
    extension: 'html',
    mimeType: 'text/html',
    category: 'code',
    label: 'HTML Document',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  htm: {
    extension: 'htm',
    mimeType: 'text/html',
    category: 'code',
    label: 'HTML Document',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  md: {
    extension: 'md',
    mimeType: 'text/markdown',
    category: 'document',
    label: 'Markdown Document',
    previewType: 'text',
    aiProcessingType: 'text',
  },

  // Images
  jpg: {
    extension: 'jpg',
    mimeType: 'image/jpeg',
    category: 'image',
    label: 'JPEG Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [[0xFF, 0xD8, 0xFF]],
  },
  jpeg: {
    extension: 'jpeg',
    mimeType: 'image/jpeg',
    category: 'image',
    label: 'JPEG Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [[0xFF, 0xD8, 0xFF]],
  },
  png: {
    extension: 'png',
    mimeType: 'image/png',
    category: 'image',
    label: 'PNG Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  },
  webp: {
    extension: 'webp',
    mimeType: 'image/webp',
    category: 'image',
    label: 'WebP Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [[0x52, 0x49, 0x46, 0x46]], // RIFF
  },
  gif: {
    extension: 'gif',
    mimeType: 'image/gif',
    category: 'image',
    label: 'GIF Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [[0x47, 0x49, 0x46, 0x38]], // GIF8
  },
  svg: {
    extension: 'svg',
    mimeType: 'image/svg+xml',
    category: 'image',
    label: 'SVG Vector Image',
    previewType: 'image',
    aiProcessingType: 'text',
  },
  bmp: {
    extension: 'bmp',
    mimeType: 'image/bmp',
    category: 'image',
    label: 'Bitmap Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [[0x42, 0x4D]], // BM
  },
  tiff: {
    extension: 'tiff',
    mimeType: 'image/tiff',
    category: 'image',
    label: 'TIFF Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [
      [0x49, 0x49, 0x2A, 0x00],
      [0x4D, 0x4D, 0x00, 0x2A],
    ],
  },
  tif: {
    extension: 'tif',
    mimeType: 'image/tiff',
    category: 'image',
    label: 'TIFF Image',
    previewType: 'image',
    aiProcessingType: 'vision',
    magicBytes: [
      [0x49, 0x49, 0x2A, 0x00],
      [0x4D, 0x4D, 0x00, 0x2A],
    ],
  },
  heic: {
    extension: 'heic',
    mimeType: 'image/heic',
    category: 'image',
    label: 'HEIC High Efficiency Image',
    previewType: 'none',
    aiProcessingType: 'media',
  },

  // Spreadsheets
  xlsx: {
    extension: 'xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    category: 'spreadsheet',
    label: 'Excel Spreadsheet (XLSX)',
    previewType: 'spreadsheet',
    aiProcessingType: 'table',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },
  xls: {
    extension: 'xls',
    mimeType: 'application/vnd.ms-excel',
    category: 'spreadsheet',
    label: 'Excel 97-2003 Spreadsheet',
    previewType: 'none',
    aiProcessingType: 'table',
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]],
  },
  csv: {
    extension: 'csv',
    mimeType: 'text/csv',
    category: 'spreadsheet',
    label: 'CSV Spreadsheet',
    previewType: 'spreadsheet',
    aiProcessingType: 'table',
  },
  ods: {
    extension: 'ods',
    mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
    category: 'spreadsheet',
    label: 'OpenDocument Spreadsheet',
    previewType: 'none',
    aiProcessingType: 'table',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },

  // Presentations
  pptx: {
    extension: 'pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    category: 'presentation',
    label: 'PowerPoint Presentation (PPTX)',
    previewType: 'none',
    aiProcessingType: 'text',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },
  ppt: {
    extension: 'ppt',
    mimeType: 'application/vnd.ms-powerpoint',
    category: 'presentation',
    label: 'PowerPoint 97-2003 Presentation',
    previewType: 'none',
    aiProcessingType: 'text',
    magicBytes: [[0xD0, 0xCF, 0x11, 0xE0]],
  },
  odp: {
    extension: 'odp',
    mimeType: 'application/vnd.oasis.opendocument.presentation',
    category: 'presentation',
    label: 'OpenDocument Presentation',
    previewType: 'none',
    aiProcessingType: 'text',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04]],
  },
  key: {
    extension: 'key',
    mimeType: 'application/x-iwork-keynote-sffkey',
    category: 'presentation',
    label: 'Keynote Presentation',
    previewType: 'none',
    aiProcessingType: 'none',
  },

  // Video
  mp4: {
    extension: 'mp4',
    mimeType: 'video/mp4',
    category: 'video',
    label: 'MP4 Video',
    previewType: 'video',
    aiProcessingType: 'media',
    magicBytes: [[0x00, 0x00, 0x00], [0x66, 0x74, 0x79, 0x70]], // ftyp
  },
  mov: {
    extension: 'mov',
    mimeType: 'video/quicktime',
    category: 'video',
    label: 'QuickTime Video (MOV)',
    previewType: 'video',
    aiProcessingType: 'media',
  },
  avi: {
    extension: 'avi',
    mimeType: 'video/x-msvideo',
    category: 'video',
    label: 'AVI Video',
    previewType: 'none',
    aiProcessingType: 'media',
    magicBytes: [[0x52, 0x49, 0x46, 0x46]], // RIFF
  },
  mkv: {
    extension: 'mkv',
    mimeType: 'video/x-matroska',
    category: 'video',
    label: 'Matroska Video (MKV)',
    previewType: 'none',
    aiProcessingType: 'media',
    magicBytes: [[0x1A, 0x45, 0xDF, 0xA3]],
  },
  webm: {
    extension: 'webm',
    mimeType: 'video/webm',
    category: 'video',
    label: 'WebM Video',
    previewType: 'video',
    aiProcessingType: 'media',
    magicBytes: [[0x1A, 0x45, 0xDF, 0xA3]],
  },

  // Audio
  mp3: {
    extension: 'mp3',
    mimeType: 'audio/mpeg',
    category: 'audio',
    label: 'MP3 Audio',
    previewType: 'audio',
    aiProcessingType: 'media',
    magicBytes: [[0x49, 0x44, 0x33], [0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2]],
  },
  wav: {
    extension: 'wav',
    mimeType: 'audio/wav',
    category: 'audio',
    label: 'WAV Audio',
    previewType: 'audio',
    aiProcessingType: 'media',
    magicBytes: [[0x52, 0x49, 0x46, 0x46]], // RIFF
  },
  aac: {
    extension: 'aac',
    mimeType: 'audio/aac',
    category: 'audio',
    label: 'AAC Audio',
    previewType: 'audio',
    aiProcessingType: 'media',
    magicBytes: [[0xFF, 0xF1], [0xFF, 0xF9]],
  },
  m4a: {
    extension: 'm4a',
    mimeType: 'audio/mp4',
    category: 'audio',
    label: 'M4A Audio',
    previewType: 'audio',
    aiProcessingType: 'media',
  },
  flac: {
    extension: 'flac',
    mimeType: 'audio/flac',
    category: 'audio',
    label: 'FLAC Lossless Audio',
    previewType: 'audio',
    aiProcessingType: 'media',
    magicBytes: [[0x66, 0x4C, 0x61, 0x43]], // fLaC
  },
  ogg: {
    extension: 'ogg',
    mimeType: 'audio/ogg',
    category: 'audio',
    label: 'Ogg Vorbis Audio',
    previewType: 'audio',
    aiProcessingType: 'media',
    magicBytes: [[0x4F, 0x67, 0x67, 0x53]], // OggS
  },

  // Archives
  zip: {
    extension: 'zip',
    mimeType: 'application/zip',
    category: 'archive',
    label: 'ZIP Archive',
    previewType: 'archive',
    aiProcessingType: 'archive',
    magicBytes: [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]],
  },
  rar: {
    extension: 'rar',
    mimeType: 'application/x-rar-compressed',
    category: 'archive',
    label: 'RAR Archive',
    previewType: 'none',
    aiProcessingType: 'none',
    magicBytes: [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]],
  },
  '7z': {
    extension: '7z',
    mimeType: 'application/x-7z-compressed',
    category: 'archive',
    label: '7-Zip Archive',
    previewType: 'none',
    aiProcessingType: 'none',
    magicBytes: [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]],
  },
  tar: {
    extension: 'tar',
    mimeType: 'application/x-tar',
    category: 'archive',
    label: 'TAR Archive',
    previewType: 'archive',
    aiProcessingType: 'archive',
  },
  gz: {
    extension: 'gz',
    mimeType: 'application/gzip',
    category: 'archive',
    label: 'Gzip Archive',
    previewType: 'none',
    aiProcessingType: 'none',
    magicBytes: [[0x1F, 0x8B]],
  },

  // Code and Text
  json: {
    extension: 'json',
    mimeType: 'application/json',
    category: 'code',
    label: 'JSON Document',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  xml: {
    extension: 'xml',
    mimeType: 'application/xml',
    category: 'code',
    label: 'XML Document',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  js: {
    extension: 'js',
    mimeType: 'application/javascript',
    category: 'code',
    label: 'JavaScript Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  ts: {
    extension: 'ts',
    mimeType: 'text/typescript',
    category: 'code',
    label: 'TypeScript Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  jsx: {
    extension: 'jsx',
    mimeType: 'text/jsx',
    category: 'code',
    label: 'React JSX Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  tsx: {
    extension: 'tsx',
    mimeType: 'text/tsx',
    category: 'code',
    label: 'React TSX Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  py: {
    extension: 'py',
    mimeType: 'text/x-python',
    category: 'code',
    label: 'Python Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  java: {
    extension: 'java',
    mimeType: 'text/x-java-source',
    category: 'code',
    label: 'Java Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  c: {
    extension: 'c',
    mimeType: 'text/x-c',
    category: 'code',
    label: 'C Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  cpp: {
    extension: 'cpp',
    mimeType: 'text/x-c++',
    category: 'code',
    label: 'C++ Source',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  css: {
    extension: 'css',
    mimeType: 'text/css',
    category: 'code',
    label: 'CSS Stylesheet',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  sql: {
    extension: 'sql',
    mimeType: 'application/sql',
    category: 'code',
    label: 'SQL Script',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  log: {
    extension: 'log',
    mimeType: 'text/plain',
    category: 'code',
    label: 'Log File',
    previewType: 'text',
    aiProcessingType: 'text',
  },
  yaml: {
    extension: 'yaml',
    mimeType: 'text/yaml',
    category: 'code',
    label: 'YAML Configuration',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  yml: {
    extension: 'yml',
    mimeType: 'text/yaml',
    category: 'code',
    label: 'YAML Configuration',
    previewType: 'code',
    aiProcessingType: 'text',
  },
  toml: {
    extension: 'toml',
    mimeType: 'application/toml',
    category: 'code',
    label: 'TOML Configuration',
    previewType: 'code',
    aiProcessingType: 'text',
  },
}

export const DANGEROUS_EXTENSIONS = new Set([
  'exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'vbs', 'ps1', 'reg', 'pif',
  'application', 'gadget', 'wsf', 'wsh', 'hta', 'cpl', 'msc', 'jar', 'apk',
  'dll', 'sys', 'drv', 'bin', 'iso', 'img', 'vmdk',
])

export const EXECUTABLE_MAGIC_HEADERS: number[][] = [
  [0x4D, 0x5A], // MZ (DOS/Windows Executable)
  [0x7F, 0x45, 0x4C, 0x46], // \x7FELF (Linux/Unix Executable)
  [0xCA, 0xFE, 0xBA, 0xBE], // Mach-O / Java Class
  [0xCE, 0xFA, 0xED, 0xFE], // Mach-O 32-bit
  [0xCF, 0xFA, 0xED, 0xFE], // Mach-O 64-bit
]

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  if (parts.length <= 1) return ''
  return parts[parts.length - 1].toLowerCase().trim()
}

export function detectFileFormat(filename: string, mimeType?: string): FileFormatDefinition {
  const ext = getFileExtension(filename)
  if (ext && SUPPORTED_FILE_FORMATS[ext]) {
    return SUPPORTED_FILE_FORMATS[ext]
  }

  if (mimeType) {
    const cleanMime = mimeType.split(';')[0].trim().toLowerCase()
    const match = Object.values(SUPPORTED_FILE_FORMATS).find((f) => f.mimeType === cleanMime)
    if (match) {
      return match
    }
  }

  return {
    extension: ext || 'bin',
    mimeType: mimeType || 'application/octet-stream',
    category: 'other',
    label: ext ? `${ext.toUpperCase()} File` : 'Generic File',
    previewType: 'none',
    aiProcessingType: 'none',
  }
}

export function isDangerousFile(filename: string, bufferHead?: Uint8Array): { dangerous: boolean; reason?: string } {
  const ext = getFileExtension(filename)
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return {
      dangerous: true,
      reason: `Direct execution hazard: .${ext} files are strictly barred from the storage vault.`,
    }
  }

  if (bufferHead && bufferHead.length >= 2) {
    for (const signature of EXECUTABLE_MAGIC_HEADERS) {
      let matches = true
      for (let i = 0; i < signature.length; i++) {
        if (bufferHead[i] !== signature[i]) {
          matches = false
          break
        }
      }
      if (matches) {
        return {
          dangerous: true,
          reason: 'Binary signature analysis flagged this file as an executable payload. Disguised uploads are prohibited.',
        }
      }
    }
  }

  return { dangerous: false }
}

export function validateMagicBytes(format: FileFormatDefinition, bytes: Uint8Array): boolean {
  if (!format.magicBytes || format.magicBytes.length === 0) {
    return true
  }

  // Special offset check for ISO BMFF (MP4, M4A, MOV) where box type starts at index 4
  if (['mp4', 'm4a', 'mov'].includes(format.extension)) {
    if (bytes.length >= 8) {
      const tag = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7])
      if (['ftyp', 'moov', 'mdat', 'wide', 'free', 'skip'].includes(tag)) {
        return true
      }
    }
  }

  for (const magic of format.magicBytes) {
    if (bytes.length < magic.length) continue
    let matched = true
    for (let i = 0; i < magic.length; i++) {
      if (bytes[i] !== magic[i]) {
        matched = false
        break
      }
    }
    if (matched) return true
  }

  return false
}

export function getCategoryLabel(category: FileCategory): string {
  switch (category) {
    case 'document':
      return 'Documents'
    case 'spreadsheet':
      return 'Spreadsheets'
    case 'presentation':
      return 'Presentations'
    case 'image':
      return 'Images'
    case 'video':
      return 'Videos'
    case 'audio':
      return 'Audio'
    case 'archive':
      return 'Archives'
    case 'code':
      return 'Code & Config'
    case 'other':
    default:
      return 'Other Files'
  }
}
