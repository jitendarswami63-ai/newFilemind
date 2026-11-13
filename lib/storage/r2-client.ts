import { S3Client } from '@aws-sdk/client-s3'

let r2ClientInstance: S3Client | null = null

export function getR2BucketName(): string {
  return process.env.R2_BUCKET_NAME || 'filemind-documents'
}

export function getR2Endpoint(): string {
  if (process.env.R2_ENDPOINT) {
    return process.env.R2_ENDPOINT
  }
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  if (accountId) {
    return `https://${accountId}.r2.cloudflarestorage.com`
  }
  return ''
}

export function isR2Configured(): boolean {
  const hasKeys = Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
  const hasEndpoint = Boolean(process.env.R2_ENDPOINT || process.env.CLOUDFLARE_ACCOUNT_ID)
  return hasKeys && hasEndpoint
}

export function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error('Cloudflare R2 credentials or endpoint not configured in environment variables.')
  }

  if (!r2ClientInstance) {
    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint: getR2Endpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }

  return r2ClientInstance
}
