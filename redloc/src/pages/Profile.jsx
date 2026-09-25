import { Link, Navigate } from 'react-router-dom'
import { LuHeart, LuInbox, LuLogOut, LuPlus, LuSettings } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { useFavorites } from '../lib/favorites'
import { useLang } from '../lib/i18n'

export default function Profile() {
  const { t, lang, setLang } = useLang()
  const { user, isStaff, logout } = useAuth()
  const fav = useFavorites()
  if (!user) return <Navigate to="/login" replace />
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username

  const links = [
    { to: '/favorites', icon: LuHeart, label: `${t('nav.favorites')} (${fav.ids.length})` },
    ...(isStaff
      ? [
          { to: '/admin/locations/new', icon: LuPlus, label: t('common.add') + ' — ' + t('nav.locations').toLowerCase() },
          { to: '/requests', icon: LuInbox, label: t('nav.requests') },
          { to: '/settings', icon: LuSettings, label: t('nav.settings') },
        ]
      : []),
  ]

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="card flex items-center gap-4 p-5">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-ink text-xl font-bold uppercase text-white">{name[0]}</span>
        <div>
          <div className="font-bold">{name}</div>
          <div className="text-sm text-muted">{isStaff ? t('user.admin') : t('user.user')} · @{user.username}</div>
        </div>
      </div>
      <div className="card divide-y divide-line">
        {links.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="flex items-center gap-3 px-5 py-3.5 text-sm font-medium hover:bg-canvas">
            <Icon className="h-5 w-5 text-ink-600" /> {label}
          </Link>
        ))}
        <div className="flex items-center justify-between px-5 py-3.5 text-sm font-medium">
          <span>Язык / Til</span>
          <div className="flex gap-1">
            {['ru', 'uz'].map((l) => (
              <button key={l} onClick={() => setLang(l)} className={`btn btn-sm uppercase ${lang === l ? 'btn-dark' : 'btn-outline'}`}>{l}</button>
            ))}
          </div>
        </div>
        <button onClick={logout} className="flex w-full items-center gap-3 px-5 py-3.5 text-sm font-medium text-brand hover:bg-brand-soft">
          <LuLogOut className="h-5 w-5" /> {t('user.logout')}
        </button>
      </div>
    </div>
  )
}
