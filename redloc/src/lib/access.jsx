import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { accessStore } from './api'
import { useAuth } from './auth'

// Доступ к сайту: сотрудник (вход) или клиент с действующей ссылкой из Telegram.
const AccessContext = createContext(null)
const parse = (v) => (v ? new Date(String(v).replace(' ', 'T')).getTime() : 0)

export function AccessProvider({ children }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [link, setLink] = useState(() => accessStore.get())
  const [reason, setReason] = useState(null)

  const deny = useCallback((code) => {
    accessStore.clear()
    setLink(null)
    setReason(code || 'access_no_access')
  }, [])

  const grant = useCallback(
    (token, expiresAt) => {
      accessStore.set(token, expiresAt)
      setLink({ token, expiresAt })
      setReason(null)
      qc.invalidateQueries()
    },
    [qc],
  )

  useEffect(() => {
    const onDenied = (e) => deny(e.detail)
    window.addEventListener('redloc:access-denied', onDenied)
    return () => window.removeEventListener('redloc:access-denied', onDenied)
  }, [deny])

  // Ссылка закрывается ровно в момент истечения, даже если страница открыта
  useEffect(() => {
    if (!link) return
    const left = parse(link.expiresAt) - Date.now()
    if (left <= 0) {
      deny('access_expired')
      return
    }
    const id = setTimeout(() => deny('access_expired'), Math.min(left, 2_147_000_000))
    return () => clearTimeout(id)
  }, [link, deny])

  const value = useMemo(
    () => ({
      granted: !!user || !!link,
      viaLink: !user && !!link,
      expiresAt: link?.expiresAt || null,
      reason,
      grant,
      deny,
    }),
    [user, link, reason, grant, deny],
  )
  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export const useAccess = () => useContext(AccessContext)
