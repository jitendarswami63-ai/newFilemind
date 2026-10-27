import {
  MAX_FILE_SIZE_BYTES,
  MAX_BATCH_FILES,
  MAX_CONCURRENT_UPLOADS,
  MAX_CONCURRENT_PROCESSING,
  ALLOWED_MIME_TYPE,
  PDF_MAGIC_BYTES,
} from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

export type BatchItemStatus =
  | 'queued'
  | 'validating'
  | 'preparing'
  | 'uploading'
  | 'confirming'
  | 'secured'
  | 'processing'
  | 'completed'
  | 'failed'

export interface BatchFileItem {
  id: string
  file: File
  name: string
  size: number
  status: BatchItemStatus
  uploadProgress: number
  error: string | null
  documentId: string | null
  storagePath: string | null
}

export type BatchUpdateListener = (items: BatchFileItem[]) => void

export class BatchUploadManager {
  private items: BatchFileItem[] = []
  private listeners: Set<BatchUpdateListener> = new Set()
  private activeUploads = 0
  private activeProcessing = 0
  private isCancelled = false
  private activeXhrs: Map<string, XMLHttpRequest> = new Map()

  constructor() {}

  public subscribe(listener: BatchUpdateListener): () => void {
    this.listeners.add(listener)
    listener([...this.items])
    return () => this.listeners.delete(listener)
  }

  private notify() {
    const snapshot = [...this.items]
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot)
      } catch (err) {
        console.error('Error in batch listener:', err)
      }
    })
  }

  public getItems(): BatchFileItem[] {
    return [...this.items]
  }

  public addFiles(files: File[]): { accepted: number; rejected: number; message?: string } {
    this.isCancelled = false
    let accepted = 0
    let rejected = 0

    const availableSlots = MAX_BATCH_FILES - this.items.length
    if (availableSlots <= 0) {
      return {
        accepted: 0,
        rejected: files.length,
        message: `Maximum batch limit of ${MAX_BATCH_FILES} files reached.`,
      }
    }

    const filesToProcess = files.slice(0, availableSlots)
    rejected += files.length - filesToProcess.length

    for (const file of filesToProcess) {
      const item: BatchFileItem = {
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        status: 'queued',
        uploadProgress: 0,
        error: null,
        documentId: null,
        storagePath: null,
      }
      this.items.push(item)
      accepted++
    }

    this.notify()
    this.processUploadQueue()
    return { accepted, rejected }
  }

  public retryItem(id: string) {
    const item = this.items.find((i) => i.id === id)
    if (!item) return

    item.status = 'queued'
    item.uploadProgress = 0
    item.error = null
    this.notify()
    this.processUploadQueue()
    this.processProcessingQueue()
  }

  public retryAllFailed() {
    for (const item of this.items) {
      if (item.status === 'failed') {
        item.status = 'queued'
        item.uploadProgress = 0
        item.error = null
      }
    }
    this.notify()
    this.processUploadQueue()
    this.processProcessingQueue()
  }

  public cancelItem(id: string) {
    const xhr = this.activeXhrs.get(id)
    if (xhr) {
      xhr.abort()
      this.activeXhrs.delete(id)
    }
    this.items = this.items.filter((i) => i.id !== id)
    this.notify()
    this.processUploadQueue()
  }

  public cancelAll() {
    this.isCancelled = true
    this.activeXhrs.forEach((xhr) => xhr.abort())
    this.activeXhrs.clear()
    this.items = []
    this.activeUploads = 0
    this.activeProcessing = 0
    this.notify()
  }

  public clearCompleted() {
    this.items = this.items.filter((i) => i.status !== 'completed')
    this.notify()
  }

  private updateItem(id: string, updates: Partial<BatchFileItem>) {
    const item = this.items.find((i) => i.id === id)
    if (!item) return
    Object.assign(item, updates)
    this.notify()
  }

  /**
   * Upload Worker Pool with sliding-window concurrency capped at MAX_CONCURRENT_UPLOADS (4)
   */
  private async processUploadQueue() {
    if (this.isCancelled) return

    while (this.activeUploads < MAX_CONCURRENT_UPLOADS) {
      const nextItem = this.items.find((i) => i.status === 'queued')
      if (!nextItem) break

      this.activeUploads++
      this.uploadSingleFile(nextItem)
        .catch((err) => {
          console.error(`Upload error for ${nextItem.name}:`, err)
        })
        .finally(() => {
          this.activeUploads--
          this.processUploadQueue()
          this.processProcessingQueue()
        })
    }
  }

  private async uploadSingleFile(item: BatchFileItem): Promise<void> {
    const { file, id } = item

    // Step 1: Client Validation
    this.updateItem(id, { status: 'validating', uploadProgress: 5 })

    if (file.type !== ALLOWED_MIME_TYPE && !file.name.toLowerCase().endsWith('.pdf')) {
      this.updateItem(id, {
        status: 'failed',
        error: 'Only standard PDF files are supported.',
      })
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      this.updateItem(id, {
        status: 'failed',
        error: 'File exceeds 49 MB limit.',
      })
      return
    }

    try {
      const headerSlice = await file.slice(0, 4).arrayBuffer()
      const arr = new Uint8Array(headerSlice)
      const isPdf =
        arr.length === 4 &&
        arr[0] === PDF_MAGIC_BYTES[0] &&
        arr[1] === PDF_MAGIC_BYTES[1] &&
        arr[2] === PDF_MAGIC_BYTES[2] &&
        arr[3] === PDF_MAGIC_BYTES[3]

      if (!isPdf) {
        this.updateItem(id, {
          status: 'failed',
          error: 'Corrupt header (not a valid PDF).',
        })
        return
      }
    } catch {
      this.updateItem(id, {
        status: 'failed',
        error: 'Failed to read file header.',
      })
      return
    }

    // Step 2: Prepare upload
    this.updateItem(id, { status: 'preparing', uploadProgress: 15 })
    let documentId: string
    let storagePath: string

    try {
      const prepRes = await fetch('/api/documents/prepare-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          fileSize: file.size,
          mimeType: 'application/pdf',
        }),
      })

      if (!prepRes.ok) {
        const data = await prepRes.json().catch(() => ({}))
        throw new Error(data.error || 'Upload preparation failed')
      }

      const prepData = await prepRes.json()
      documentId = prepData.documentId
      storagePath = prepData.storagePath
      this.updateItem(id, { documentId, storagePath })
    } catch (prepErr) {
      this.updateItem(id, {
        status: 'failed',
        error: prepErr instanceof Error ? prepErr.message : 'Upload initialization failed',
      })
      return
    }

    // Step 3: Direct Upload to Supabase Storage with Progress Tracking
    this.updateItem(id, { status: 'uploading', uploadProgress: 20 })

    try {
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      const jwt = sessionData.session?.access_token

      if (!jwt) {
        throw new Error('User session expired. Please sign in again.')
      }

      const storageEndpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/documents/${storagePath}`

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        this.activeXhrs.set(id, xhr)

        xhr.open('POST', storageEndpoint)
        xhr.setRequestHeader('Authorization', `Bearer ${jwt}`)
        xhr.setRequestHeader('Content-Type', 'application/pdf')
        xhr.setRequestHeader('x-upsert', 'false')

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const rawProgress = (event.loaded / event.total) * 100
            // Map 0-100% upload progress to 20%-85% overall status
            const mappedProgress = Math.min(85, Math.max(20, Math.round(20 + rawProgress * 0.65)))
            this.updateItem(id, { uploadProgress: mappedProgress })
          }
        }

        xhr.onload = () => {
          this.activeXhrs.delete(id)
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            let errMsg = 'Storage transmission failed'
            try {
              const resData = JSON.parse(xhr.responseText)
              if (resData.message) errMsg = resData.message
            } catch {}
            reject(new Error(errMsg))
          }
        }

        xhr.onerror = () => {
          this.activeXhrs.delete(id)
          reject(new Error('Network error during storage transfer'))
        }

        xhr.onabort = () => {
          this.activeXhrs.delete(id)
          reject(new Error('Upload cancelled'))
        }

        xhr.send(file)
      })
    } catch (uploadErr) {
      if (this.isCancelled) return
      this.updateItem(id, {
        status: 'failed',
        error: uploadErr instanceof Error ? uploadErr.message : 'Storage upload failed',
      })
      return
    }

    // Step 4: Confirm Upload
    this.updateItem(id, { status: 'confirming', uploadProgress: 90 })

    try {
      const confirmRes = await fetch('/api/documents/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          storagePath,
          fileSize: file.size,
          skipImmediateProcessing: true, // Controlled queue will process at concurrency = 2
        }),
      })

      if (!confirmRes.ok) {
        const data = await confirmRes.json().catch(() => ({}))
        throw new Error(data.error || 'Upload verification failed')
      }

      this.updateItem(id, {
        status: 'secured',
        uploadProgress: 100,
      })
    } catch (confirmErr) {
      this.updateItem(id, {
        status: 'failed',
        error: confirmErr instanceof Error ? confirmErr.message : 'Upload confirmation failed',
      })
    }
  }

  /**
   * Controlled AI Processing Queue Worker (Concurrency = 2)
   */
  private async processProcessingQueue() {
    if (this.isCancelled) return

    while (this.activeProcessing < MAX_CONCURRENT_PROCESSING) {
      const nextItem = this.items.find((i) => i.status === 'secured' && i.documentId)
      if (!nextItem) break

      this.activeProcessing++
      this.updateItem(nextItem.id, { status: 'processing' })

      this.processSingleAiItem(nextItem)
        .catch((err) => {
          console.error(`AI processing error for ${nextItem.name}:`, err)
        })
        .finally(() => {
          this.activeProcessing--
          this.processProcessingQueue()
        })
    }
  }

  private async processSingleAiItem(item: BatchFileItem): Promise<void> {
    const { documentId, id } = item
    if (!documentId) return

    try {
      const res = await fetch('/api/documents/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data.error) {
        throw new Error(data.error || 'AI analysis failed')
      }

      this.updateItem(id, {
        status: 'completed',
        error: null,
      })
    } catch (err) {
      this.updateItem(id, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Analysis failed',
      })
    }
  }
}
