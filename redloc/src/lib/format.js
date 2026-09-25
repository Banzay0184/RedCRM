export function formatDuration(sec) {
  if (!sec && sec !== 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function formatDate(value, lang = 'ru') {
  if (!value) return ''
  const d = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatDateTime(value, lang = 'ru') {
  if (!value) return ''
  const d = new Date(value.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export const cx = (...a) => a.filter(Boolean).join(' ')

// Длительность видео из локального файла — чтобы не ставить ffmpeg на сервер
export function readVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null)
    }
    v.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    v.src = url
  })
}
