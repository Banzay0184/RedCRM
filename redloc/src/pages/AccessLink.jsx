import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { redloc } from '../lib/api'
import { useAccess } from '../lib/access'
import { PageLoader } from '../components/ui'
import NoAccess from './NoAccess'

// Клиент открыл ссылку из Telegram: /a/<token>
export default function AccessLink() {
  const { token } = useParams()
  const { grant } = useAccess()
  const [state, setState] = useState({ status: 'checking' })

  useEffect(() => {
    let cancelled = false
    redloc
      .checkAccess(token)
      .then((data) => {
        if (cancelled) return
        grant(token, data.expires_at)
        setState({ status: 'ok' })
      })
      .catch((err) => !cancelled && setState({ status: 'denied', code: err?.response?.data?.code || 'access_invalid' }))
    return () => {
      cancelled = true
    }
  }, [token, grant])

  if (state.status === 'ok') return <Navigate to="/" replace />
  if (state.status === 'denied') return <NoAccess reason={state.code} />
  return <div className="min-h-screen bg-canvas"><PageLoader /></div>
}
