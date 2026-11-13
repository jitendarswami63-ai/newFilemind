import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client, getR2BucketName, isR2Configured } from './r2-client'
import { detectFileFormat } from '../files/file-types'
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Supabase credentials not configured.')
  }
  return createSupabaseAdminClient(url, serviceKey)
}

export type StorageProvider = 'r2' | 'supabase'

export interface StorageHeadResult {
  size: number
  contentType?: string
  etag?: string
  provider: StorageProvider
}

export interface SignedUploadResult {
  uploadUrl: string
  storagePath: string
  method: 'PUT'
  provider: 'r2'
  expiresIn: number
}

export class StorageService {
  public isR2Enabled(): boolean {
    return isR2Configured()
  }

  public async getSignedUploadUrl(
    storagePath: string,
    contentType: string = 'application/pdf',
    expiresInSeconds: number = 900
  ): Promise<SignedUploadResult> {
    if (!this.isR2Enabled()) {
      throw new Error('Cloudflare R2 is required for direct presigned uploads.')
    }

    const client = getR2Client()
    const bucket = getR2BucketName()

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      ContentType: contentType,
    })

    const uploadUrl = await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    })

    return {
      uploadUrl,
      storagePath,
      method: 'PUT',
      provider: 'r2',
      expiresIn: expiresInSeconds,
    }
  }

  public async getSignedDownloadUrl(
    storagePath: string,
    expiresInSeconds: number = 300,
    filename?: string,
    provider?: StorageProvider
  ): Promise<string> {
    const format = detectFileFormat(filename || storagePath)
    const detectedContentType = format.mimeType || 'application/octet-stream'

    if (provider === 'r2' || (this.isR2Enabled() && provider !== 'supabase')) {
      try {
        const client = getR2Client()
        const bucket = getR2BucketName()

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: storagePath,
          ResponseContentType: detectedContentType,
          ResponseContentDisposition: filename
            ? `attachment; filename="${encodeURIComponent(filename)}"`
            : 'inline',
        })

        return await getSignedUrl(client, command, {
          expiresIn: expiresInSeconds,
        })
      } catch (err) {
        if (provider === 'r2') throw err
      }
    }

    try {
      const admin = getSupabaseAdmin()
      const { data, error } = await admin.storage
        .from('documents')
        .createSignedUrl(storagePath, expiresInSeconds, {
          download: Boolean(filename),
        })

      if (!error && data?.signedUrl) {
        return data.signedUrl
      }
    } catch {}

    // Fallback: If Supabase signing failed, try R2 if enabled
    if (this.isR2Enabled()) {
      const client = getR2Client()
      const bucket = getR2BucketName()

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: storagePath,
        ResponseContentType: detectedContentType,
        ResponseContentDisposition: filename
          ? `attachment; filename="${encodeURIComponent(filename)}"`
          : 'inline',
      })

      return await getSignedUrl(client, command, {
        expiresIn: expiresInSeconds,
      })
    }

    throw new Error('Failed to generate signed download URL from both R2 and Supabase')
  }

  public async downloadBuffer(
    storagePath: string,
    provider?: StorageProvider
  ): Promise<{ buffer: Buffer; provider: StorageProvider }> {
    if (provider === 'r2' || (this.isR2Enabled() && provider !== 'supabase')) {
      try {
        const client = getR2Client()
        const bucket = getR2BucketName()

        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: storagePath,
          })
        )

        if (response.Body) {
          const bytes = await response.Body.transformToByteArray()
          return { buffer: Buffer.from(bytes), provider: 'r2' }
        }
      } catch (err) {
        if (provider === 'r2') {
          throw new Error(`Failed to retrieve object from R2: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.storage.from('documents').download(storagePath)

    if (error || !data) {
      throw new Error(`Failed to download object from storage: ${error?.message || 'Empty response'}`)
    }

    const arrayBuf = await data.arrayBuffer()
    return { buffer: Buffer.from(arrayBuf), provider: 'supabase' }
  }

  public async uploadBuffer(
    storagePath: string,
    buffer: Buffer,
    contentType?: string
  ): Promise<{ success: boolean; provider: StorageProvider }> {
    const finalContentType = contentType || detectFileFormat(storagePath).mimeType || 'application/octet-stream'

    if (this.isR2Enabled()) {
      const client = getR2Client()
      const bucket = getR2BucketName()

      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: storagePath,
          Body: buffer,
          ContentType: finalContentType,
        })
      )

      return { success: true, provider: 'r2' }
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin.storage.from('documents').upload(storagePath, buffer, {
      contentType: finalContentType,
      upsert: true,
    })

    if (error) {
      throw new Error(`Failed to upload to storage: ${error.message}`)
    }

    return { success: true, provider: 'supabase' }
  }

  public async deleteFile(storagePath: string, provider?: StorageProvider): Promise<boolean> {
    let r2Success = false
    let supabaseSuccess = false

    if (this.isR2Enabled() && provider !== 'supabase') {
      try {
        const client = getR2Client()
        const bucket = getR2BucketName()

        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: storagePath,
          })
        )
        r2Success = true
      } catch (err) {
        console.warn(`[StorageService] R2 delete failed for ${storagePath}:`, err)
      }
    }

    if (!provider || provider === 'supabase' || !r2Success) {
      try {
        const admin = getSupabaseAdmin()
        await admin.storage.from('documents').remove([storagePath])
        supabaseSuccess = true
      } catch (err) {
        console.warn(`[StorageService] Supabase delete failed for ${storagePath}:`, err)
      }
    }

    return r2Success || supabaseSuccess
  }

  public async headObject(storagePath: string): Promise<StorageHeadResult | null> {
    if (this.isR2Enabled()) {
      try {
        const client = getR2Client()
        const bucket = getR2BucketName()

        const response = await client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: storagePath,
          })
        )

        return {
          size: response.ContentLength || 0,
          contentType: response.ContentType,
          etag: response.ETag,
          provider: 'r2',
        }
      } catch {
        // Fall back to check Supabase
      }
    }

    try {
      const admin = getSupabaseAdmin()
      const segments = storagePath.split('/')
      if (segments.length >= 2) {
        const folder = segments.slice(0, -1).join('/')
        const filename = segments[segments.length - 1]
        const { data } = await admin.storage.from('documents').list(folder)
        const match = data?.find((f) => f.name === filename)
        if (match) {
          return {
            size: match.metadata?.size || 0,
            contentType: match.metadata?.mimetype,
            provider: 'supabase',
          }
        }
      }
    } catch {
      // Not found in Supabase
    }

    return null
  }

  public async getByteRange(
    storagePath: string,
    start: number,
    end: number,
    provider?: StorageProvider
  ): Promise<Buffer> {
    if (provider === 'r2' || (this.isR2Enabled() && provider !== 'supabase')) {
      try {
        const client = getR2Client()
        const bucket = getR2BucketName()

        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: storagePath,
            Range: `bytes=${start}-${end}`,
          })
        )

        if (response.Body) {
          const bytes = await response.Body.transformToByteArray()
          return Buffer.from(bytes)
        }
      } catch (err) {
        if (provider === 'r2') throw err
      }
    }

    const { buffer } = await this.downloadBuffer(storagePath, 'supabase')
    return buffer.subarray(start, end + 1)
  }
}

export const storageService = new StorageService()
