/**
 * Client-side image resize/compress for API uploads (~1MB target).
 * @param {File|Blob} file
 * @param {{ maxEdge?: number, maxBytes?: number, quality?: number }} opts
 * @returns {Promise<{ base64: string, mediaType: string }>}
 */
export async function compressImageForUpload(
  file,
  opts = {}
) {
  const maxEdge = opts.maxEdge ?? 1280
  const maxBytes = opts.maxBytes ?? 1_000_000
  const initialQuality = opts.quality ?? 0.82

  const bitmap = await createImageBitmap(file)
  let { width, height } = bitmap
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  width = Math.round(width * scale)
  height = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Canvas not supported')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)

  let quality = initialQuality
  let blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  )

  while (blob && blob.size > maxBytes && quality > 0.45) {
    quality -= 0.07
    blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    )
  }

  if (!blob) {
    throw new Error('Could not compress image')
  }

  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)

  return { base64, mediaType: 'image/jpeg' }
}
