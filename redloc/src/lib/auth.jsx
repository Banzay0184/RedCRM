import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { redloc, tokenStore } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(() => !tokenStore.get())
  const qc = useQueryClient()

  const loadMe = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null)
      setReady(true)
      return
    }
    try {
      const { data } = await redloc.me()
      setUser(data)
    } catch {
      tokenStore.clear()
      setUser(null)
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    loadMe()
    const onLogout = () => setUser(null)
    window.addEventListener('redloc:logout', onLogout)
    return () => window.removeEventListener('redloc:logout', onLogout)
  }, [loadMe])

  const login = useCallback(
    async (username, password) => {
      const { data } = await redloc.login(username, password)
      tokenStore.set(data.access)
      await loadMe()
      qc.invalidateQueries()
    },
    [loadMe, qc],
  )

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    qc.invalidateQueries()
  }, [qc])

  const value = useMemo(
    () => ({ user, ready, isStaff: !!user?.is_staff, login, logout }),
    [user, ready, login, logout],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
