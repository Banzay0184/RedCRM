// Сжатие фото в браузере перед загрузкой: фото с телефона (5–15 МБ) превращаются в ~1–2 МБ.
// Сервер всё равно ужимает до 2000 px в WebP, поэтому 2560 px JPEG — без потери итогового качества.
const MAX_SIDE = 2560
const QUALITY = 0.9
const SKIP_BELOW = 1.5 * 1024 * 1024 // небольшие файлы отправляем как есть

export async function shrinkImage(file) {
  if (!file?.type?.startsWith('image/') || file.size < SKIP_BELOW || typeof createImageBitmap !== 'function') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file // формат, который браузер не умеет читать (например, HEIC в Chrome) — пусть разберётся сервер
  }
}

// Делим файлы на пачки: не больше maxCount штук и maxBytes суммарно в одном запросе
export function chunkBySize(files, maxBytes = 15 * 1024 * 1024, maxCount = 10) {
  const chunks = []
  let cur = []
  let size = 0
  for (const f of files) {
    if (cur.length && (cur.length >= maxCount || size + f.size > maxBytes)) {
      chunks.push(cur)
      cur = []
      size = 0
    }
    cur.push(f)
    size += f.size
  }
  if (cur.length) chunks.push(cur)
  return chunks
}
