import { Link } from 'react-router-dom'
import { LuLock, LuLogIn } from 'react-icons/lu'
import { useLang } from '../lib/i18n'
import Logo from '../components/Logo'

export default function NoAccess({ reason }) {
  const { t, lang, setLang } = useLang()
  const key = {
    access_expired: 'access.expired',
    access_revoked: 'access.revoked',
    access_invalid: 'access.invalid',
  }[reason] || 'access.onlyByLink'

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4 py-10">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex items-center justify-between">
          <Logo dark />
          <div className="flex rounded-lg bg-white/10 p-0.5 text-xs font-semibold">
            {['ru', 'uz'].map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`rounded-md px-2 py-1 uppercase ${lang === l ? 'bg-white text-ink' : 'text-white/60'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="card p-8">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-brand-soft text-brand">
            <LuLock className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-extrabold">{t('access.title')}</h1>
          <p className="mt-2 text-sm text-ink-600">{t(key)}</p>
          <p className="mt-1 text-sm text-muted">{t('access.askManager')}</p>
        </div>
        <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
          <LuLogIn className="h-4 w-4" /> {t('access.staffLogin')}
        </Link>
      </div>
    </div>
  )
}
