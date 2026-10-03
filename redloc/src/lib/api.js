import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'https://api.redcrm.uz/api'
const TOKEN_KEY = 'redloc_token'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

// Временная ссылка-доступ клиента (из Telegram): токен + срок действия
const ACCESS_KEY = 'redloc_access'
export const accessStore = {
  get: () => {
    try {
      const v = JSON.parse(localStorage.getItem(ACCESS_KEY) || 'null')
      return v?.token && v?.expiresAt ? v : null
    } catch {
      return null
    }
  },
  set: (token, expiresAt) => localStorage.setItem(ACCESS_KEY, JSON.stringify({ token, expiresAt })),
  clear: () => localStorage.removeItem(ACCESS_KEY),
}

const api = axios.create({ baseURL: API_URL, timeout: 20000 })

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token && !config._anonymous) config.headers.Authorization = `Bearer ${token}`
  const access = accessStore.get()
  if (access) config.headers['X-Redloc-Access'] = access.token
  return config
})

// Сервер закрыл доступ по ссылке (истекла / отозвана / нет ссылки) — сообщаем приложению
api.interceptors.response.use(
  (r) => r,
  (error) => {
    const code = error?.response?.data?.code
    if (typeof code === 'string' && code.startsWith('access_') && !tokenStore.get()) {
      accessStore.clear()
      window.dispatchEvent(new CustomEvent('redloc:access-denied', { detail: code }))
    }
    return Promise.reject(error)
  },
)

// Каталог публичный: если токен протух, не ломаем страницу, а сбрасываем токен
// и повторяем запрос анонимно. Для действий, требующих входа, ошибка уйдёт дальше.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error
    if (response?.status === 401 && config && !config._anonymous && tokenStore.get()) {
      tokenStore.clear()
      window.dispatchEvent(new Event('redloc:logout'))
      config._anonymous = true
      delete config.headers.Authorization
      return api(config)
    }
    return Promise.reject(error)
  },
)

export function errorText(error, fallback = 'Что-то пошло не так') {
  const data = error?.response?.data
  if (!data) return error?.message || fallback
  if (typeof data === 'string') return fallback
  if (data.detail) return data.detail
  const first = Object.entries(data)[0]
  if (!first) return fallback
  const [field, value] = first
  const msg = Array.isArray(value) ? value[0] : typeof value === 'object' ? JSON.stringify(value) : value
  return field === 'non_field_errors' ? msg : `${msg}`
}

const R = '/redloc'

const progressOpts = (onProgress) => ({
  timeout: 0,
  onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
})

// Пачка фото одним multipart-запросом: { <owner>: id, images: [...] }
function uploadImages(path, ownerKey, ownerId, files, onProgress) {
  const fd = new FormData()
  fd.append(ownerKey, ownerId)
  files.forEach((f) => fd.append('images', f))
  return api.post(`${R}/${path}/`, fd, progressOpts(onProgress)).then((r) => r.data)
}

function postForm(method, path, data) {
  const body = new FormData()
  Object.entries(data).forEach(([k, v]) => v !== undefined && v !== null && body.append(k, v))
  return api[method](`${R}/${path}/`, body, { timeout: 0 }).then((r) => r.data)
}

// Видео: JSON для ссылки YouTube, multipart — если есть файл или постер
function postMedia(path, data, onProgress) {
  let body = data
  if (data.file || data.poster) {
    body = new FormData()
    Object.entries(data).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && body.append(k, v))
  }
  return api.post(`${R}/${path}/`, body, progressOpts(onProgress)).then((r) => r.data)
}


export const redloc = {
  // auth
  login: (username, password) => api.post('/token/', { username, password }),
  me: () => api.get(`${R}/me/`),
  checkAccess: (token) => api.get(`${R}/access/${encodeURIComponent(token)}/`).then((r) => r.data),

  meta: () => api.get(`${R}/meta/`).then((r) => r.data),

  // locations
  locations: (params) => api.get(`${R}/locations/`, { params }).then((r) => r.data),
  location: (slug) => api.get(`${R}/locations/${slug}/`).then((r) => r.data),
  createLocation: (data) => api.post(`${R}/locations/`, data).then((r) => r.data),
  updateLocation: (slug, data) => api.patch(`${R}/locations/${slug}/`, data).then((r) => r.data),
  deleteLocation: (slug) => api.delete(`${R}/locations/${slug}/`),
  reorderLocations: (ids) => api.post(`${R}/locations/reorder/`, { ids }),

  // media
  photos: (params) => api.get(`${R}/photos/`, { params }).then((r) => r.data),
  portfolios: (params) => api.get(`${R}/portfolios/`, { params }).then((r) => r.data),
  portfolio: (slug) => api.get(`${R}/portfolios/${slug}/`).then((r) => r.data),
  uploadPhotos: (locationId, files, onProgress) => uploadImages('photos', 'location', locationId, files, onProgress),
  deletePhoto: (id) => api.delete(`${R}/photos/${id}/`),
  reorderPhotos: (location, ids) => api.post(`${R}/photos/reorder/`, { location, ids }),

  videos: (params) => api.get(`${R}/videos/`, { params }).then((r) => r.data),
  createVideo: (data, onProgress) => postMedia('videos', data, onProgress),
  deleteVideo: (id) => api.delete(`${R}/videos/${id}/`),
  reorderVideos: (location, ids) => api.post(`${R}/videos/reorder/`, { location, ids }),

  // баннер главной: тексты (+ hero_image файлом или remove_hero_image)
  updateSite: (data) => postForm('patch', 'site', data),

  // портфолио (love story / альбомы)
  createPortfolio: (data) => api.post(`${R}/portfolios/`, data).then((r) => r.data),
  updatePortfolio: (slug, data) => api.patch(`${R}/portfolios/${slug}/`, data).then((r) => r.data),
  deletePortfolio: (slug) => api.delete(`${R}/portfolios/${slug}/`),
  uploadPortfolioPhotos: (id, files, onProgress) => uploadImages('portfolio-photos', 'portfolio', id, files, onProgress),
  deletePortfolioPhoto: (id) => api.delete(`${R}/portfolio-photos/${id}/`),
  reorderPortfolioPhotos: (portfolio, ids) => api.post(`${R}/portfolio-photos/reorder/`, { portfolio, ids }),
  createPortfolioVideo: (data, onProgress) => postMedia('portfolio-videos', data, onProgress),
  deletePortfolioVideo: (id) => api.delete(`${R}/portfolio-videos/${id}/`),
  reorderPortfolioVideos: (portfolio, ids) => api.post(`${R}/portfolio-videos/reorder/`, { portfolio, ids }),

  // dictionaries: kind = cities
  dict: (kind, params) => api.get(`${R}/${kind}/`, { params }).then((r) => r.data),
  createDict: (kind, data) => api.post(`${R}/${kind}/`, data).then((r) => r.data),
  updateDict: (kind, id, data) => api.patch(`${R}/${kind}/${id}/`, data).then((r) => r.data),
  deleteDict: (kind, id) => api.delete(`${R}/${kind}/${id}/`),
  reorderDict: (kind, ids) => api.post(`${R}/${kind}/reorder/`, { ids }),
}

export default api
