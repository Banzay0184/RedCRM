import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { redloc } from './api'
import { useAuth } from './auth'

// Гость: избранное в localStorage. После входа — переносится в аккаунт (favorites/sync).
const KEY = 'redloc_guest_favorites'
const readGuest = () => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(v) ? v.filter(Number.isInteger) : []
  } catch {
    return []
  }
}
const writeGuest = (ids) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    /* private mode */
  }
}

const FavContext = createContext(null)

export function FavoritesProvider({ children }) {
  const { user, ready } = useAuth()
  const [ids, setIds] = useState(readGuest)
  const qc = useQueryClient()

  useEffect(() => {
    if (!ready) return
    if (!user) {
      setIds(readGuest())
      return
    }
    const guest = readGuest()
    const req = guest.length ? redloc.syncFavorites(guest) : redloc.favoriteIds()
    req
      .then((serverIds) => {
        setIds(serverIds)
        if (guest.length) writeGuest([])
      })
      .catch(() => {})
  }, [user, ready])

  const toggle = useCallback(
    async (location) => {
      const on = !ids.includes(location.id)
      const next = on ? [...ids, location.id] : ids.filter((i) => i !== location.id)
      setIds(next)
      if (!user) {
        writeGuest(next)
      } else {
        try {
          await (on ? redloc.addFavorite(location.slug) : redloc.removeFavorite(location.slug))
        } catch {
          setIds(ids)
          return ids.includes(location.id)
        }
      }
      qc.invalidateQueries({ queryKey: ['favorites'] })
      return on
    },
    [ids, user, qc],
  )

  const value = useMemo(() => ({ ids, has: (id) => ids.includes(id), toggle, isGuest: !user }), [ids, toggle, user])
  return <FavContext.Provider value={value}>{children}</FavContext.Provider>
}

export const useFavorites = () => useContext(FavContext)
