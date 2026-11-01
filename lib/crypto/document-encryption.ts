import crypto from 'node:crypto'

export interface EncryptedDocumentEnvelope {
  ciphertextBuffer: Buffer
  encryptedDek: string
  dekIv: string
  dekTag: string
  fileIv: string
  fileTag: string
  keyVersion: number
}

function getMasterSecret(): Buffer {
  const secret = process.env.VAULT_MASTER_KEY_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'filemind-default-fallback-dev-vault-secret-key-32b'
  return crypto.createHash('sha256').update(secret).digest()
}

export function deriveUserKek(userId: string, keyVersion: number = 1): Buffer {
  if (!userId) throw new Error('User ID is required for key derivation')
  const masterSecret = getMasterSecret()
  const info = Buffer.from(`filemind:vault:kek:v${keyVersion}`, 'utf8')
  const salt = Buffer.from(userId, 'utf8')
  return Buffer.from(crypto.hkdfSync('sha256', masterSecret, salt, info, 32))
}

export function wrapDek(
  dek: Buffer,
  userKek: Buffer,
  userId: string,
  documentId: string,
  keyVersion: number = 1
): { encryptedDek: string; dekIv: string; dekTag: string } {
  const dekIv = crypto.randomBytes(12)
  const aad = Buffer.from(`${userId}:${documentId}:dek:v${keyVersion}`, 'utf8')
  const cipher = crypto.createCipheriv('aes-256-gcm', userKek, dekIv)
  cipher.setAAD(aad)
  const encryptedDek = Buffer.concat([cipher.update(dek), cipher.final()])
  const dekTag = cipher.getAuthTag()

  return {
    encryptedDek: encryptedDek.toString('base64url'),
    dekIv: dekIv.toString('base64url'),
    dekTag: dekTag.toString('base64url'),
  }
}

export function unwrapDek(
  encryptedDekB64: string,
  dekIvB64: string,
  dekTagB64: string,
  userKek: Buffer,
  userId: string,
  documentId: string,
  keyVersion: number = 1
): Buffer {
  const encryptedDek = Buffer.from(encryptedDekB64, 'base64url')
  const dekIv = Buffer.from(dekIvB64, 'base64url')
  const dekTag = Buffer.from(dekTagB64, 'base64url')
  const aad = Buffer.from(`${userId}:${documentId}:dek:v${keyVersion}`, 'utf8')

  const decipher = crypto.createDecipheriv('aes-256-gcm', userKek, dekIv)
  decipher.setAAD(aad)
  decipher.setAuthTag(dekTag)

  return Buffer.concat([decipher.update(encryptedDek), decipher.final()])
}

export function encryptDocumentBuffer(
  plaintextBuffer: Buffer,
  dek: Buffer,
  userId: string,
  documentId: string,
  keyVersion: number = 1
): { ciphertextBuffer: Buffer; fileIv: string; fileTag: string } {
  const fileIv = crypto.randomBytes(12)
  const aad = Buffer.from(`${userId}:${documentId}:file:v${keyVersion}`, 'utf8')
  const cipher = crypto.createCipheriv('aes-256-gcm', dek, fileIv)
  cipher.setAAD(aad)
  const ciphertextBuffer = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()])
  const fileTag = cipher.getAuthTag()

  return {
    ciphertextBuffer,
    fileIv: fileIv.toString('base64url'),
    fileTag: fileTag.toString('base64url'),
  }
}

export function decryptDocumentBuffer(
  ciphertextBuffer: Buffer,
  dek: Buffer,
  fileIvB64: string,
  fileTagB64: string,
  userId: string,
  documentId: string,
  keyVersion: number = 1
): Buffer {
  const fileIv = Buffer.from(fileIvB64, 'base64url')
  const fileTag = Buffer.from(fileTagB64, 'base64url')
  const aad = Buffer.from(`${userId}:${documentId}:file:v${keyVersion}`, 'utf8')

  const decipher = crypto.createDecipheriv('aes-256-gcm', dek, fileIv)
  decipher.setAAD(aad)
  decipher.setAuthTag(fileTag)

  return Buffer.concat([decipher.update(ciphertextBuffer), decipher.final()])
}

export function envelopeEncryptDocument(
  plaintextBuffer: Buffer,
  userId: string,
  documentId: string,
  keyVersion: number = 1
): EncryptedDocumentEnvelope {
  const dek = crypto.randomBytes(32)
  const userKek = deriveUserKek(userId, keyVersion)

  const wrapped = wrapDek(dek, userKek, userId, documentId, keyVersion)
  const encrypted = encryptDocumentBuffer(plaintextBuffer, dek, userId, documentId, keyVersion)

  return {
    ciphertextBuffer: encrypted.ciphertextBuffer,
    encryptedDek: wrapped.encryptedDek,
    dekIv: wrapped.dekIv,
    dekTag: wrapped.dekTag,
    fileIv: encrypted.fileIv,
    fileTag: encrypted.fileTag,
    keyVersion,
  }
}

export function envelopeDecryptDocument(
  ciphertextBuffer: Buffer,
  encryptedDekB64: string,
  dekIvB64: string,
  dekTagB64: string,
  fileIvB64: string,
  fileTagB64: string,
  userId: string,
  documentId: string,
  keyVersion: number = 1
): Buffer {
  const userKek = deriveUserKek(userId, keyVersion)
  const dek = unwrapDek(encryptedDekB64, dekIvB64, dekTagB64, userKek, userId, documentId, keyVersion)
  return decryptDocumentBuffer(ciphertextBuffer, dek, fileIvB64, fileTagB64, userId, documentId, keyVersion)
}
