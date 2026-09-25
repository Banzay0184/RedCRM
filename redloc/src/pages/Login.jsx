import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import Logo from '../components/Logo'
import { Field, Spinner } from '../components/ui'

export default function Login() {
  const { t } = useLang()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const from = useLocation().state?.from || '/'
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.username.trim(), form.password)
      navigate(from, { replace: true })
    } catch {
      setError(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex justify-center"><Logo dark /></Link>
        <form onSubmit={submit} className="card space-y-4 p-6">
          <div>
            <h1 className="text-xl font-extrabold">{t('login.title')}</h1>
            <p className="mt-1 text-sm text-muted">{t('login.subtitle')}</p>
          </div>
          <Field label={t('login.username')}>
            <input className="input" autoComplete="username" required value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <Field label={t('login.password')}>
            <input className="input" type="password" autoComplete="current-password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          {error && <div className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand">{error}</div>}
          <button className="btn btn-primary w-full" disabled={loading}>
            {loading && <Spinner className="h-4 w-4 text-white" />} {t('login.submit')}
          </button>
        </form>
        <Link to="/" className="mt-4 block text-center text-sm text-white/60 hover:text-white">← {t('nav.home')}</Link>
      </div>
    </div>
  )
}
