'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  FileText,
  AlertCircle,
  Loader2,
  Package,
  Table as TableIcon,
  ShieldCheck,
  Folder,
  Tag,
  Code2,
  FileSpreadsheet,
  Music,
  Video as VideoIcon,
  Archive as ArchiveIcon,
  File as GenericFileIcon,
  Sparkles,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { detectFileFormat, FileFormatDefinition } from '@/lib/files/file-types'
import { getFileIconForFilename } from '@/lib/files/file-icons'
import { formatFileSize, formatDate } from '@/lib/utils'
import type { DocumentStatus } from '@/types'

const PDFViewer = dynamic(
  () => import('@/components/pdf/PDFViewer').then((m) => m.PDFViewer),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-[500px] text-[#777064]">
        <Loader2 className="h-6 w-6 animate-spin text-[#9C7D47]" />
      </div>
    ),
  }
)

interface FileViewerProps {
  documentId: string
  filename: string
  mimeType?: string
  initialStatus: DocumentStatus
  initialEmbeddingStatus?: string | null
  errorMessage?: string | null
  initialCategory?: string | null
  initialTags?: string[] | null
  initialLockedAt?: string | null
  initialPage?: number
  storagePath?: string
  isLocked?: boolean
  fileSize?: number | null
  createdAt?: string
  extractedData?: Record<string, unknown> | null
}

export function FileViewer(props: FileViewerProps) {
  const {
    documentId,
    filename,
    mimeType,
    initialStatus,
    initialEmbeddingStatus,
    errorMessage,
    initialCategory,
    initialTags,
    initialLockedAt,
    initialPage,
    storagePath,
    isLocked = false,
    fileSize,
    createdAt,
    extractedData,
  } = props

  const format = detectFileFormat(filename, mimeType)

  // 1. If PDF, preserve existing 100% PDFViewer implementation
  if (format.previewType === 'pdf') {
    return (
      <PDFViewer
        documentId={documentId}
        initialStatus={initialStatus}
        initialEmbeddingStatus={initialEmbeddingStatus}
        errorMessage={errorMessage}
        initialCategory={initialCategory}
        initialTags={initialTags}
        initialLockedAt={initialLockedAt}
        initialPage={initialPage}
        storagePath={storagePath}
        isLocked={isLocked}
        extractedData={extractedData}
      />
    )
  }

  // 2. Multi-Format Viewers
  return (
    <div className="flex flex-col w-full rounded-2xl border border-[#E5DED1] bg-[#FFFCF5] shadow-2xs overflow-hidden">
      {/* Header bar */}
      <div className="min-h-12 px-5 py-2.5 bg-[#FFFCF5] border-b border-[#E5DED1] flex flex-wrap items-center justify-between gap-3 text-xs text-[#777064] select-none">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex items-center gap-2 font-medium text-[#292720]">
            <ShieldCheck className="h-4 w-4 text-[#9C7D47]" />
            <span>Vault View • {format.label}</span>
          </span>

          {initialCategory && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAF5EC] text-[#777064] border border-[#E5DED1]">
              <Folder className="h-3 w-3 text-[#777064]" />
              <span>{initialCategory}</span>
            </span>
          )}

          {initialTags && initialTags.length > 0 && (
            <div className="hidden sm:flex flex-wrap items-center gap-1.5">
              {initialTags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#FAF5EC] text-[#777064] border border-[#E5DED1]"
                >
                  <Tag className="h-2.5 w-2.5 text-[#9C7D47]" />
                  <span>{tag}</span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {fileSize && (
            <span className="font-mono text-[#777064] text-xs">
              {formatFileSize(fileSize)}
            </span>
          )}
          <a
            href={`/api/documents/${documentId}/view`}
            download={filename}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAF5EC] hover:bg-[#F3EFE5] text-[#292720] rounded-xl border border-[#E5DED1] text-xs font-semibold transition-all shadow-2xs"
          >
            <Download className="h-3.5 w-3.5 text-[#9C7D47]" />
            <span>Download</span>
          </a>
        </div>
      </div>

      {typeof extractedData?.summary === 'string' && extractedData.summary.trim() && (
        <div className="px-5 py-3.5 bg-[#FAF5EC] border-b border-[#E5DED1] flex items-start gap-3 text-xs select-text">
          <Sparkles className="h-4 w-4 text-[#9C7D47] flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-[#292720] tracking-tight">AI Document Intelligence</span>
            <p className="text-[#777064] leading-relaxed">{extractedData.summary}</p>
          </div>
        </div>
      )}

      {/* Body Viewer */}
      <div className="p-4 sm:p-6 min-h-[55vh] flex flex-col items-center justify-center bg-[#FDFBF7]">
        {format.previewType === 'image' ? (
          <ImageViewer documentId={documentId} filename={filename} />
        ) : format.previewType === 'audio' ? (
          <AudioPlayer documentId={documentId} filename={filename} />
        ) : format.previewType === 'video' ? (
          <VideoPlayer documentId={documentId} filename={filename} />
        ) : format.previewType === 'code' || format.previewType === 'text' ? (
          <CodeViewer documentId={documentId} filename={filename} format={format} />
        ) : format.previewType === 'spreadsheet' ? (
          <SpreadsheetViewer documentId={documentId} filename={filename} extractedData={extractedData} />
        ) : format.previewType === 'archive' ? (
          <ArchiveViewer filename={filename} extractedData={extractedData} />
        ) : (
          <GenericFileViewer
            documentId={documentId}
            filename={filename}
            format={format}
            fileSize={fileSize}
            createdAt={createdAt}
            extractedData={extractedData}
          />
        )}
      </div>
    </div>
  )
}

/* ========================================================================= */
/* 1. Image Viewer (Zoom, Pan, Rotate)                                       */
/* ========================================================================= */
function ImageViewer({ documentId, filename }: { documentId: string; filename: string }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)

  return (
    <div className="flex flex-col items-center w-full max-w-4xl space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-2 bg-[#FFFCF5] px-4 py-2 rounded-2xl border border-[#E5DED1] shadow-2xs">
        <button
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          className="p-1.5 hover:bg-[#FAF5EC] rounded-xl text-[#777064] hover:text-[#292720]"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <span className="text-xs font-mono text-[#777064] min-w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
          className="p-1.5 hover:bg-[#FAF5EC] rounded-xl text-[#777064] hover:text-[#292720]"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={() => setRotation((r) => (r + 90) % 360)}
          className="p-1.5 hover:bg-[#FAF5EC] rounded-xl text-[#777064] hover:text-[#292720]"
          title="Rotate 90°"
        >
          <RotateCw className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setZoom(1)
            setRotation(0)
          }}
          className="text-xs text-[#9C7D47] font-semibold px-2 py-1 hover:bg-[#FAF5EC] rounded-lg"
        >
          Reset
        </button>
      </div>

      {/* Image Canvas */}
      <div className="w-full max-h-[70vh] overflow-auto flex items-center justify-center p-4 bg-[#F3EFE5] rounded-2xl border border-[#E5DED1]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/documents/${documentId}/view`}
          alt={filename}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.15s ease-out',
          }}
          className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm"
        />
      </div>
    </div>
  )
}

/* ========================================================================= */
/* 2. Audio Player                                                           */
/* ========================================================================= */
function AudioPlayer({ documentId, filename }: { documentId: string; filename: string }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="w-full max-w-md p-6 bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] shadow-2xs space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-[#FDF2F8] border border-[#FBCFE8] text-[#DB2777] flex items-center justify-center shrink-0">
          <Music className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-bold text-[#292720] truncate" title={filename}>
            {filename}
          </h4>
          <p className="text-xs text-[#777064] mt-0.5">High-Fidelity Audio Stream</p>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={`/api/documents/${documentId}/view`}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      {/* Progress slider */}
      <div className="space-y-1.5">
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={(e) => {
            const val = parseFloat(e.target.value)
            setCurrentTime(val)
            if (audioRef.current) audioRef.current.currentTime = val
          }}
          className="w-full accent-[#9C7D47] cursor-pointer"
        />
        <div className="flex justify-between text-[11px] font-mono text-[#777064]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={togglePlay}
          className="h-12 w-12 rounded-2xl bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] flex items-center justify-center transition-all shadow-sm active:scale-95"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <button
          onClick={() => {
            if (!audioRef.current) return
            audioRef.current.muted = !isMuted
            setIsMuted(!isMuted)
          }}
          className="p-2 text-[#777064] hover:text-[#292720] hover:bg-[#FAF5EC] rounded-xl transition-colors"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
      </div>
    </div>
  )
}

/* ========================================================================= */
/* 3. Video Player                                                           */
/* ========================================================================= */
function VideoPlayer({ documentId, filename }: { documentId: string; filename: string }) {
  return (
    <div className="w-full max-w-4xl bg-black rounded-3xl overflow-hidden shadow-md border border-[#E5DED1]">
      <video
        controls
        src={`/api/documents/${documentId}/view`}
        className="w-full max-h-[70vh] object-contain"
        preload="metadata"
      >
        Your browser does not support HTML5 video playback for {filename}.
      </video>
    </div>
  )
}

/* ========================================================================= */
/* 4. Code & Text Viewer                                                     */
/* ========================================================================= */
function CodeViewer({
  documentId,
  filename,
  format,
}: {
  documentId: string
  filename: string
  format: FileFormatDefinition
}) {
  const [content, setContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [wordWrap, setWordWrap] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    fetch(`/api/documents/${documentId}/view`)
      .then((res) => res.text())
      .then((text) => {
        if (!ignore) {
          setContent(text)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setContent('Failed to load text content.')
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [documentId])

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = content.split('\n')

  return (
    <div className="w-full max-w-5xl bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] shadow-2xs overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5DED1] bg-[#FAF5EC] text-xs">
        <div className="flex items-center gap-2 text-[#777064] font-medium">
          <Code2 className="h-4 w-4 text-[#9C7D47]" />
          <span>{format.label} • {lines.length} lines</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
              wordWrap
                ? 'bg-[#9C7D47] text-[#FFFCF5] border-[#9C7D47]'
                : 'bg-[#FFFCF5] text-[#777064] border-[#E5DED1] hover:bg-[#F3EFE5]'
            }`}
          >
            Wrap
          </button>
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFFCF5] hover:bg-[#F3EFE5] text-[#292720] border border-[#E5DED1] rounded-lg text-[11px] font-semibold transition-all"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="p-4 overflow-auto max-h-[65vh] font-mono text-xs text-[#292720] bg-[#FFFCF5] select-text">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[#777064]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Loading source text...</span>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-[#FAF5EC]/60">
                  <td className="pr-4 py-0.5 text-right text-[#DDD5C7] select-none w-10 text-[11px]">
                    {idx + 1}
                  </td>
                  <td className={`py-0.5 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
                    {line || ' '}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ========================================================================= */
/* 5. Spreadsheet Viewer (CSV / XLSX)                                        */
/* ========================================================================= */
function SpreadsheetViewer({
  documentId,
  filename,
  extractedData,
}: {
  documentId: string
  filename: string
  extractedData?: Record<string, unknown> | null
}) {
  const [rows, setRows] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    setLoading(true)

    // If pre-extracted preview rows are present in extractedData:
    if (extractedData?.previewRows && Array.isArray(extractedData.previewRows)) {
      const parsed = (extractedData.previewRows as string[]).map((r) =>
        r.split('|').map((c) => c.trim())
      )
      setRows(parsed)
      setLoading(false)
      return
    }

    // Otherwise fetch CSV / raw stream
    fetch(`/api/documents/${documentId}/view`)
      .then((res) => res.text())
      .then((text) => {
        if (!ignore) {
          const parsed = text
            .split(/\r?\n/)
            .filter(Boolean)
            .slice(0, 100)
            .map((r) => r.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim()))
          setRows(parsed)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [documentId, extractedData])

  return (
    <div className="w-full max-w-5xl bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] shadow-2xs overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5DED1] bg-[#FAF5EC] text-xs">
        <div className="flex items-center gap-2 text-[#777064] font-medium">
          <FileSpreadsheet className="h-4 w-4 text-[#1E7E34]" />
          <span>Table View • {rows.length} rows loaded</span>
        </div>
      </div>

      <div className="overflow-auto max-h-[65vh] p-2">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-[#777064]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span>Parsing spreadsheet matrix...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-xs text-[#777064]">
            No tabular data found in spreadsheet preview.
          </div>
        ) : (
          <table className="w-full text-xs text-[#292720] border-collapse border border-[#E5DED1]">
            <tbody>
              {rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className={rIdx === 0 ? 'bg-[#FAF5EC] font-bold' : 'hover:bg-[#FAF5EC]/50'}
                >
                  <td className="p-2 border border-[#E5DED1] text-center text-[#777064] bg-[#F8F4EA] w-12 font-mono text-[11px] select-none">
                    {rIdx + 1}
                  </td>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2 border border-[#E5DED1] max-w-xs truncate">
                      {cell || '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

/* ========================================================================= */
/* 6. Archive Viewer (ZIP / TAR / GZ)                                        */
/* ========================================================================= */
function ArchiveViewer({
  filename,
  extractedData,
}: {
  filename: string
  extractedData?: Record<string, unknown> | null
}) {
  const manifest = extractedData?.archiveManifest as
    | {
        totalFiles: number
        totalUncompressedBytes: number
        entries: { filename: string; uncompressedSize: number; isDirectory: boolean }[]
        isZipBombRisk?: boolean
      }
    | undefined

  const entries = manifest?.entries || []

  return (
    <div className="w-full max-w-4xl bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] shadow-2xs overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5DED1] bg-[#FAF5EC] text-xs">
        <div className="flex items-center gap-2 text-[#777064] font-medium">
          <ArchiveIcon className="h-4 w-4 text-[#CA8A04]" />
          <span>
            Archive Manifest • {manifest?.totalFiles || entries.length} files (
            {formatFileSize(manifest?.totalUncompressedBytes || 0)} uncompressed)
          </span>
        </div>
      </div>

      <div className="p-4 max-h-[60vh] overflow-y-auto divide-y divide-[#E5DED1]">
        {entries.length === 0 ? (
          <div className="text-center py-10 text-xs text-[#777064]">
            Archive manifest parsed safely without server expansion. Download archive to extract files locally.
          </div>
        ) : (
          entries.map((entry, idx) => (
            <div key={idx} className="flex items-center justify-between py-2.5 px-3 text-xs hover:bg-[#FAF5EC] rounded-xl">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {entry.isDirectory ? (
                  <Folder className="h-4 w-4 text-[#9C7D47] shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-[#777064] shrink-0" />
                )}
                <span className="font-mono text-[#292720] truncate" title={entry.filename}>
                  {entry.filename}
                </span>
              </div>
              {!entry.isDirectory && (
                <span className="font-mono text-[11px] text-[#777064] shrink-0 ml-4">
                  {formatFileSize(entry.uncompressedSize)}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/* ========================================================================= */
/* 7. Generic File Information Card                                          */
/* ========================================================================= */
function GenericFileViewer({
  documentId,
  filename,
  format,
  fileSize,
  createdAt,
  extractedData,
}: {
  documentId: string
  filename: string
  format: FileFormatDefinition
  fileSize?: number | null
  createdAt?: string
  extractedData?: Record<string, unknown> | null
}) {
  const theme = getFileIconForFilename(filename, format.mimeType)
  const Icon = theme.icon

  return (
    <div className="w-full max-w-lg p-8 bg-[#FFFCF5] rounded-3xl border border-[#E5DED1] shadow-2xs flex flex-col items-center text-center space-y-6">
      <div className={`h-20 w-20 rounded-3xl ${theme.bgColor} border ${theme.borderColor} ${theme.textColor} flex items-center justify-center shadow-xs`}>
        <Icon className="h-10 w-10" />
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h3 className="text-base sm:text-lg font-bold text-[#292720] break-all leading-snug">
          {filename}
        </h3>
        <p className="text-xs text-[#777064]">
          {format.label} • Stored securely in Cloudflare R2
        </p>
      </div>

      {typeof extractedData?.summary === 'string' && extractedData.summary.trim() && (
        <div className="w-full bg-[#FAF5EC] p-4 rounded-2xl border border-[#E5DED1] text-xs space-y-1.5 text-left font-medium select-text">
          <span className="flex items-center gap-1.5 font-bold text-[#292720]">
            <Sparkles className="h-3.5 w-3.5 text-[#9C7D47]" />
            AI Summary
          </span>
          <p className="text-[#777064] leading-relaxed">{extractedData.summary}</p>
        </div>
      )}

      <div className="w-full bg-[#FAF5EC] p-4 rounded-2xl border border-[#E5DED1] text-xs space-y-2 text-left font-medium">
        <div className="flex justify-between">
          <span className="text-[#777064]">File Size</span>
          <span className="font-mono text-[#292720]">{formatFileSize(fileSize)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#777064]">MIME Type</span>
          <span className="font-mono text-[#292720]">{format.mimeType}</span>
        </div>
        {createdAt && (
          <div className="flex justify-between">
            <span className="text-[#777064]">Uploaded</span>
            <span className="text-[#292720]">{formatDate(createdAt)}</span>
          </div>
        )}
      </div>

      <a
        href={`/api/documents/${documentId}/view`}
        download={filename}
        className="w-full py-3 bg-[#9C7D47] hover:bg-[#856837] text-[#FFFCF5] font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-98"
      >
        <Download className="h-4 w-4" />
        <span>Download {filename}</span>
      </a>
    </div>
  )
}
