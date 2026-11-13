export interface ImageMetadata {
  format: string
  width?: number
  height?: number
  aspectRatio?: string
}

export function parseImageMetadata(buffer: Buffer, extension: string): ImageMetadata {
  const ext = extension.toLowerCase()

  if (ext === 'png' && buffer.length >= 24) {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16)
      const height = buffer.readUInt32BE(20)
      return {
        format: 'PNG',
        width,
        height,
        aspectRatio: `${width}:${height}`,
      }
    }
  }

  if ((ext === 'jpg' || ext === 'jpeg') && buffer.length >= 4) {
    let offset = 2
    while (offset < buffer.length - 8) {
      if (buffer[offset] !== 0xFF) break
      const marker = buffer[offset + 1]
      // SOF0 (0xC0), SOF2 (0xC2)
      if (marker === 0xC0 || marker === 0xC2) {
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)
        return {
          format: 'JPEG',
          width,
          height,
          aspectRatio: `${width}:${height}`,
        }
      }
      const len = buffer.readUInt16BE(offset + 2)
      offset += 2 + len
    }
    return { format: 'JPEG' }
  }

  if (ext === 'gif' && buffer.length >= 10) {
    const width = buffer.readUInt16LE(6)
    const height = buffer.readUInt16LE(8)
    return {
      format: 'GIF',
      width,
      height,
      aspectRatio: `${width}:${height}`,
    }
  }

  if (ext === 'bmp' && buffer.length >= 26) {
    const width = buffer.readInt32LE(18)
    const height = Math.abs(buffer.readInt32LE(22))
    return {
      format: 'BMP',
      width,
      height,
      aspectRatio: `${width}:${height}`,
    }
  }

  if (ext === 'webp' && buffer.length >= 30) {
    // RIFF....WEBPVP8
    if (buffer.subarray(12, 16).toString('ascii') === 'VP8 ') {
      const width = buffer.readUInt16LE(26) & 0x3fff
      const height = buffer.readUInt16LE(28) & 0x3fff
      return { format: 'WebP', width, height, aspectRatio: `${width}:${height}` }
    }
    if (buffer.subarray(12, 16).toString('ascii') === 'VP8X') {
      const width = 1 + buffer.readUIntLE(24, 3)
      const height = 1 + buffer.readUIntLE(27, 3)
      return { format: 'WebP', width, height, aspectRatio: `${width}:${height}` }
    }
    return { format: 'WebP' }
  }

  if (ext === 'svg') {
    try {
      const text = buffer.subarray(0, Math.min(2048, buffer.length)).toString('utf8')
      const vbMatch = text.match(/viewBox=["']\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*["']/i)
      if (vbMatch) {
        const width = Math.round(parseFloat(vbMatch[1]))
        const height = Math.round(parseFloat(vbMatch[2]))
        return { format: 'SVG', width, height, aspectRatio: `${width}:${height}` }
      }
      const wMatch = text.match(/width=["'](\d+)(?:px)?["']/i)
      const hMatch = text.match(/height=["'](\d+)(?:px)?["']/i)
      if (wMatch && hMatch) {
        const width = parseInt(wMatch[1], 10)
        const height = parseInt(hMatch[1], 10)
        return { format: 'SVG', width, height, aspectRatio: `${width}:${height}` }
      }
    } catch {}
    return { format: 'SVG' }
  }

  return { format: ext.toUpperCase() }
}
