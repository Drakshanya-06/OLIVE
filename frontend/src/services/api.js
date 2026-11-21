import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || '/api'
export const MEDIA_URL = import.meta.env.VITE_MEDIA_URL || ''
const KEY = 'olive_tokens'

export const tokenStore = {
  get() { try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null } },
  set(t) { localStorage.setItem(KEY, JSON.stringify(t)) },
  clear() { localStorage.removeItem(KEY) },
}

const api = axios.create({ baseURL: API_URL, timeout: 30000 })

api.interceptors.request.use((config) => {
  const t = tokenStore.get()
  if (t?.access) config.headers.Authorization = `Bearer ${t.access}`
  return config
})

// Refresh the access token once on 401, sharing one refresh call between parallel requests.
let refreshing = null
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const url = original?.url || ''
    const isAuthCall = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/admin/login')
    if (status === 401 && !original._retry && !isAuthCall && tokenStore.get()?.refresh) {
      original._retry = true
      try {
        refreshing = refreshing || axios.post(`${API_URL}/auth/refresh/`, { refresh: tokenStore.get().refresh }).finally(() => { refreshing = null })
        const { data } = await refreshing
        tokenStore.set(data.tokens)
        original.headers.Authorization = `Bearer ${data.tokens.access}`
        return api(original)
      } catch (e) {
        tokenStore.clear()
        window.dispatchEvent(new Event('olive:logout'))
      }
    }
    return Promise.reject(error)
  }
)

export const errMsg = (e, fallback = 'Something went wrong. Please try again.') =>
  e?.response?.data?.error?.message || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : fallback)
export const errDetails = (e) => e?.response?.data?.error?.details || {}
export const errCode = (e) => e?.response?.data?.error?.code
export const mediaUrl = (p) => (!p ? '' : p.startsWith('http') ? p : `${MEDIA_URL}${p}`)

export default api
