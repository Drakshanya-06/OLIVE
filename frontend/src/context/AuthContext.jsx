import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api, { tokenStore } from '../services/api'
import { useTheme } from './ThemeContext'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())
  const { setTheme } = useTheme()

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me/')
      setUser(data.user)
      if (data.user.theme) setTheme(data.user.theme)
    } catch { setUser(null); tokenStore.clear() }
    finally { setLoading(false) }
  }, [setTheme])

  useEffect(() => { if (tokenStore.get()) loadMe(); else setLoading(false) }, [loadMe])
  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener('olive:logout', onLogout)
    return () => window.removeEventListener('olive:logout', onLogout)
  }, [])

  const startSession = (payload) => { tokenStore.set(payload.tokens); setUser(payload.user) }

  const login = async (email, password, admin = false, otp = null) => {
    const payload = { email, password }
    if (otp) payload.otp = otp
    const { data } = await api.post(admin ? '/auth/admin/login/' : '/auth/login/', payload)
    if (data.require_otp) {
      return data
    }
    startSession(data)
    return data.user
  }
  const logout = async () => {
    const t = tokenStore.get()
    try { if (t) await api.post('/auth/logout/', { refresh: t.refresh }) } catch { /* ignore */ }
    tokenStore.clear(); setUser(null)
  }
  const isAdmin = !!user && ['admin', 'super_admin'].includes(user.role)

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, login, logout, startSession, isAdmin, isSuperAdmin: user?.role === 'super_admin', reload: loadMe }}>
      {children}
    </AuthCtx.Provider>
  )
}
