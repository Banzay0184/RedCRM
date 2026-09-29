import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  LuBookImage, LuCamera, LuClock, LuChevronDown, LuHeart, LuHouse, LuLogIn, LuLogOut, LuMenu,
  LuPlus, LuSettings, LuVideo, LuX,
} from 'react-icons/lu'
import { useAccess } from '../lib/access'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { cx, formatDateTime } from '../lib/format'
import Logo, { Pin } from './Logo'

function useNav() {
  const { t } = useLang()
  const { isStaff } = useAuth()
  const items = [
    { to: '/', label: t('nav.home'), icon: LuHouse, end: true },
    { to: '/photos', label: t('nav.photos'), icon: LuCamera },
    { to: '/videos', label: t('nav.videos'), icon: LuVideo },
    { to: '/love-story', label: t('nav.loveStory'), icon: LuHeart },
    { to: '/albums', label: t('nav.albums'), icon: LuBookImage },
  ]
  if (isStaff) {
    items.push(
      { to: '/settings', label: t('nav.settings'), icon: LuSettings },
    )
  }
  return items
}

function Sidebar({ onNavigate }) {
  const items = useNav()
  const { t } = useLang()
  const { isStaff } = useAuth()
  return (
    <div className="flex h-full flex-col bg-ink text-white">
      <Link to="/" onClick={onNavigate} className="px-5 pb-6 pt-6">
        <Logo dark />
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 scrollbar-none">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              isActive ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-white/70 hover:bg-white/5 hover:text-white',
            )}>
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{label}</span>
          </NavLink>
        ))}
        {isStaff && (
          <Link to="/admin/locations/new" onClick={onNavigate}
            className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm text-white/70 hover:border-brand hover:text-white">
            <LuPlus className="h-4 w-4" /> {t('nav.locations')}
          </Link>
        )}
      </nav>
      <div className="flex items-center gap-2 px-5 pb-6 pt-4">
        <Pin className="h-6 w-6" />
        <div className="leading-tight">
          <div className="text-xs font-extrabold">
            <span className="text-brand">RED</span>CRM
          </div>
          <div className="text-[9px] text-white/40">{t('footer.brand')}</div>
        </div>
      </div>
    </div>
  )
}

function LangSwitch({ className }) {
  const { lang, setLang } = useLang()
  return (
    <div className={cx('flex rounded-lg bg-canvas p-0.5 text-xs font-semibold', className)}>
      {['ru', 'uz'].map((l) => (
        <button key={l} onClick={() => setLang(l)}
          className={cx('rounded-md px-2 py-1 uppercase transition', lang === l ? 'bg-white text-ink shadow-sm' : 'text-muted')}>
          {l}
        </button>
      ))}
    </div>
  )
}

function UserMenu() {
  const { user, isStaff, logout } = useAuth()
  const { t } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  if (!user) {
    return (
      <Link to="/login" className="btn btn-outline btn-sm">
        <LuLogIn className="h-4 w-4" /> <span className="hidden sm:inline">{t('user.login')}</span>
      </Link>
    )
  }
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2.5 rounded-xl py-1 pl-1 pr-2 hover:bg-canvas">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-bold uppercase text-white">
          {name.slice(0, 1)}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block text-sm font-semibold">{name}</span>
          <span className="block text-[11px] text-muted">{isStaff ? t('user.admin') : t('user.user')}</span>
        </span>
        <LuChevronDown className="hidden h-4 w-4 text-muted md:block" />
      </button>
      {open && (
        <div className="card absolute right-0 top-12 z-30 w-48 p-1.5">
          <button onClick={() => { setOpen(false); logout() }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-brand hover:bg-brand-soft">
            <LuLogOut className="h-4 w-4" /> {t('user.logout')}
          </button>
        </div>
      )}
    </div>
  )
}

function AccessUntil() {
  const { viaLink, expiresAt } = useAccess()
  const { t, lang } = useLang()
  if (!viaLink) return null
  return (
    <span className="hidden items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand md:flex"
      title={t('access.until')}>
      <LuClock className="h-3.5 w-3.5" /> {t('access.until')} {formatDateTime(expiresAt, lang)}
    </span>
  )
}

function Topbar({ onMenu }) {
  const { t } = useLang()
  const { isStaff } = useAuth()
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        {isStaff && (
          <button className="btn btn-ghost btn-icon -ml-2 lg:hidden" onClick={onMenu} aria-label="menu">
            <LuMenu className="h-5 w-5" />
          </button>
        )}
        <Link to="/" className="lg:hidden"><Logo compact /></Link>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <AccessUntil />
          <LangSwitch />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

function MobileNav() {
  // Все разделы каталога внизу экрана; служебные пункты staff остаются в меню-гамбургере
  const items = useNav().filter((i) => i.to !== '/settings')
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white lg:hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={label} to={to} end={end}
            className={({ isActive }) => cx('flex flex-col items-center gap-1 px-1 py-2 text-[10px] font-medium', isActive ? 'text-brand' : 'text-muted')}>
            <Icon className="h-5 w-5" />
            <span className="w-full truncate text-center">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function Layout() {
  const [drawer, setDrawer] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 lg:block">
        <Sidebar />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-64">
            <Sidebar onNavigate={() => setDrawer(false)} />
            <button className="absolute -right-12 top-4 grid h-9 w-9 place-items-center rounded-full bg-white" onClick={() => setDrawer(false)}>
              <LuX className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
      <Topbar onMenu={() => setDrawer(true)} />
      <main className="mx-auto max-w-[1400px] px-4 pb-24 pt-5 lg:px-6 lg:pb-10">
        <Outlet />
      </main>
      <MobileNav />
    </div>
  )
}
