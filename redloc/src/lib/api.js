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

export const redloc = {
  // auth
  login: (username, password) => api.post('/token/', { username, password }),
  me: () => api.get(`${R}/me/`),
  checkAccess: (token) => api.get(`${R}/access/${encodeURIComponent(token)}/`).then((r) => r.data),

  meta: () => api.get(`${R}/meta/`).then((r) => r.data),

  // locations
  locations: (params) => api.get(`${R}/locations/`, { params }).then((r) => r.data),
  location: (slug) => api.get(`${R}/locations/${slug}/`).then((r) => r.data),
  similar: (slug) => api.get(`${R}/locations/${slug}/similar/`).then((r) => r.data),
  createLocation: (data) => api.post(`${R}/locations/`, data).then((r) => r.data),
  updateLocation: (slug, data) => api.patch(`${R}/locations/${slug}/`, data).then((r) => r.data),
  deleteLocation: (slug) => api.delete(`${R}/locations/${slug}/`),
  addFavorite: (slug) => api.post(`${R}/locations/${slug}/favorite/`),
  removeFavorite: (slug) => api.delete(`${R}/locations/${slug}/favorite/`),
  favoriteIds: () => api.get(`${R}/favorites/ids/`).then((r) => r.data.ids),
  syncFavorites: (ids) => api.post(`${R}/favorites/sync/`, { ids }).then((r) => r.data.ids),

  // media
  photos: (params) => api.get(`${R}/photos/`, { params }).then((r) => r.data),
  uploadPhotos: (locationId, files, onProgress) => {
    const fd = new FormData()
    fd.append('location', locationId)
    files.forEach((f) => fd.append('images', f))
    return api
      .post(`${R}/photos/`, fd, {
        timeout: 0,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
      .then((r) => r.data)
  },
  updatePhoto: (id, data) => api.patch(`${R}/photos/${id}/`, data).then((r) => r.data),
  deletePhoto: (id) => api.delete(`${R}/photos/${id}/`),
  reorderPhotos: (location, ids) => api.post(`${R}/photos/reorder/`, { location, ids }),

  videos: (params) => api.get(`${R}/videos/`, { params }).then((r) => r.data),
  createVideo: (data, onProgress) => {
    const hasFile = data.file || data.poster
    let body = data
    if (hasFile) {
      body = new FormData()
      Object.entries(data).forEach(([k, v]) => v !== undefined && v !== null && v !== '' && body.append(k, v))
    }
    return api
      .post(`${R}/videos/`, body, {
        timeout: 0,
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      })
      .then((r) => r.data)
  },
  updateVideo: (id, data) => api.patch(`${R}/videos/${id}/`, data).then((r) => r.data),
  deleteVideo: (id) => api.delete(`${R}/videos/${id}/`),
  reorderVideos: (location, ids) => api.post(`${R}/videos/reorder/`, { location, ids }),

  createZone: (data) => api.post(`${R}/zones/`, data).then((r) => r.data),
  updateZone: (id, data) => api.patch(`${R}/zones/${id}/`, data).then((r) => r.data),
  deleteZone: (id) => api.delete(`${R}/zones/${id}/`),

  // dictionaries: kind = cities | categories | shoot-types | amenities | tags
  dict: (kind, params) => api.get(`${R}/${kind}/`, { params }).then((r) => r.data),
  createDict: (kind, data) => api.post(`${R}/${kind}/`, data).then((r) => r.data),
  updateDict: (kind, id, data) => api.patch(`${R}/${kind}/${id}/`, data).then((r) => r.data),
  deleteDict: (kind, id) => api.delete(`${R}/${kind}/${id}/`),
  reorderDict: (kind, ids) => api.post(`${R}/${kind}/reorder/`, { ids }),

  // requests
  createRequest: (data) => api.post(`${R}/requests/`, data).then((r) => r.data),
  requests: (params) => api.get(`${R}/requests/`, { params }).then((r) => r.data),
  requestCounts: () => api.get(`${R}/requests/counts/`).then((r) => r.data),
  updateRequest: (id, data) => api.patch(`${R}/requests/${id}/`, data).then((r) => r.data),
  deleteRequest: (id) => api.delete(`${R}/requests/${id}/`),
}

export default api
