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
      const isDuplicateInBatch = this.items.some(
        (existing) =>
          existing.name === file.name &&
          existing.size === file.size &&
          existing.file.lastModified === file.lastModified &&
          existing.status !== 'failed'
      )

      if (isDuplicateInBatch) {
        rejected++
        continue
      }

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

    item.error = null

    if (item.documentId && item.storagePath && item.uploadProgress >= 90) {
      item.status = 'secured'
      this.notify()
      this.processProcessingQueue()
    } else {
      item.documentId = null
      item.storagePath = null
      item.status = 'queued'
      item.uploadProgress = 0
      this.notify()
      this.processUploadQueue()
    }
  }

  public retryAllFailed() {
    let hasUploadRetries = false
    let hasAiRetries = false

    for (const item of this.items) {
      if (item.status === 'failed') {
        item.error = null
        if (item.documentId && item.storagePath && item.uploadProgress >= 90) {
          item.status = 'secured'
          hasAiRetries = true
        } else {
          item.documentId = null
          item.storagePath = null
          item.status = 'queued'
          item.uploadProgress = 0
          hasUploadRetries = true
        }
      }
    }

    this.notify()
    if (hasUploadRetries) this.processUploadQueue()
    if (hasAiRetries) this.processProcessingQueue()
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

    this.updateItem(id, { status: 'preparing', uploadProgress: 15 })
    let documentId: string
    let storagePath: string
    let uploadUrl: string | null = null
    let uploadMethod: string = 'POST'
    let storageProvider: 'r2' | 'supabase' = 'supabase'

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
      uploadUrl = prepData.uploadUrl || null
      uploadMethod = prepData.uploadMethod || 'PUT'
      storageProvider = prepData.storageProvider || 'supabase'
      this.updateItem(id, { documentId, storagePath })
    } catch (prepErr) {
      this.updateItem(id, {
        status: 'failed',
        error: prepErr instanceof Error ? prepErr.message : 'Upload initialization failed',
      })
      return
    }

    this.updateItem(id, { status: 'uploading', uploadProgress: 20 })

    try {
      const sendFile = (targetUrl: string | null, targetMethod: string): Promise<void> => {
        return new Promise<void>(async (resolve, reject) => {
          const xhr = new XMLHttpRequest()
          this.activeXhrs.set(id, xhr)

          if (targetUrl) {
            xhr.open(targetMethod, targetUrl)
            xhr.setRequestHeader('Content-Type', 'application/pdf')
          } else {
            const supabase = createClient()
            const { data: sessionData } = await supabase.auth.getSession()
            const jwt = sessionData.session?.access_token

            if (!jwt) {
              this.activeXhrs.delete(id)
              reject(new Error('User session expired. Please sign in again.'))
              return
            }

            const storageEndpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/documents/${storagePath}`
            xhr.open('POST', storageEndpoint)
            xhr.setRequestHeader('Authorization', `Bearer ${jwt}`)
            xhr.setRequestHeader('Content-Type', 'application/pdf')
            xhr.setRequestHeader('x-upsert', 'false')
          }

          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const rawProgress = (event.loaded / event.total) * 100
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
      }

      if (uploadUrl) {
        try {
          await sendFile(uploadUrl, uploadMethod)
        } catch (r2Err) {
          console.warn('[UploadManager] Direct R2 upload failed (e.g. CORS preflight), falling back to Supabase:', r2Err)
          storageProvider = 'supabase'
          await sendFile(null, 'POST')
        }
      } else {
        await sendFile(null, 'POST')
      }
    } catch (uploadErr) {
      if (this.isCancelled) return
      this.updateItem(id, {
        status: 'failed',
        error: uploadErr instanceof Error ? uploadErr.message : 'Storage upload failed',
      })
      return
    }

    this.updateItem(id, { status: 'confirming', uploadProgress: 90 })

    try {
      const confirmRes = await fetch('/api/documents/confirm-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          storagePath,
          fileSize: file.size,
          storageProvider,
          skipImmediateProcessing: true,
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
      await fetch('/api/documents/process-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      }).catch(() => {})

      // Poll status for up to 90 seconds (polling /api/documents/:id every 2.5s)
      const maxPollAttempts = 36
      let pollCount = 0
      let isDone = false

      while (pollCount < maxPollAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2500))
        pollCount++

        if (this.isCancelled) return

        try {
          const statusRes = await fetch(`/api/documents/${documentId}`)
          if (statusRes.ok) {
            const docData = await statusRes.json().catch(() => ({}))
            if (docData.status === 'completed') {
              isDone = true
              break
            }
            if (docData.status === 'failed') {
              throw new Error(docData.error_message || 'AI document analysis failed')
            }
          }
        } catch (pollErr) {
          if (pollErr instanceof Error && pollErr.message.includes('analysis failed')) {
            throw pollErr
          }
        }
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
