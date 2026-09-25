import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LuArrowRight, LuCamera, LuHeart, LuImage, LuLink2, LuMapPin, LuSearch, LuShieldCheck,
} from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { DictIcon } from '../lib/icons'
import { LocationGrid } from '../components/LocationCard'
import Logo from '../components/Logo'

function Hero({ background }) {
  const { t, tn } = useLang()
  const { data: meta } = useMeta()
  const navigate = useNavigate()
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [q, setQ] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (city) p.set('city', city)
    if (category) p.set('category', category)
    if (q.trim()) p.set('q', q.trim())
    navigate(`/locations?${p}`)
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-ink text-white">
      {background && <img src={background} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-ink/30" />
      {!background && (
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
      )}
      <div className="relative px-6 pb-6 pt-10 sm:px-10 sm:pt-14">
        <h1 className="max-w-xl whitespace-pre-line text-3xl font-extrabold leading-tight tracking-tight sm:text-[40px]">
          {t('hero.title')}
        </h1>
        <p className="mt-4 max-w-md whitespace-pre-line text-sm text-white/75 sm:text-base">{t('hero.subtitle')}</p>
        <form onSubmit={submit}
          className="mt-8 grid gap-2 rounded-2xl bg-white p-2 text-ink shadow-2xl sm:mt-12 md:grid-cols-[1fr_1fr_1.4fr_auto]">
          <div className="relative">
            <LuMapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <select className="input border-transparent pl-9" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">{t('all.cities')}</option>
              {meta?.cities.map((c) => <option key={c.id} value={c.slug}>{tn(c)}</option>)}
            </select>
          </div>
          <select className="input border-transparent md:border-l md:border-l-line md:rounded-none" value={category}
            onChange={(e) => setCategory(e.target.value)}>
            <option value="">{t('all.categories')}</option>
            {meta?.categories.map((c) => <option key={c.id} value={c.slug}>{tn(c)}</option>)}
          </select>
          <div className="relative">
            <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input border-transparent bg-canvas pl-9" placeholder={t('search.byName')} value={q}
              onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn btn-primary px-8">{t('search.find')}</button>
        </form>
        {meta?.stats && (
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/60">
            <span><b className="text-white">{meta.stats.locations}</b> {t('nav.locations').toLowerCase()}</span>
            <span><b className="text-white">{meta.stats.photos}</b> {t('photos')}</span>
            <span><b className="text-white">{meta.stats.videos}</b> {t('videos')}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function SectionHead({ title, to }) {
  const { t } = useLang()
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="section-title">{title}</h2>
      {to && (
        <Link to={to} className="flex items-center gap-1 text-xs font-medium text-muted hover:text-brand">
          {t('home.seeAll')} <LuArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

function Features() {
  const { t } = useLang()
  const items = [
    { icon: LuCamera, text: t('feat.base') },
    { icon: LuShieldCheck, text: t('feat.verified') },
    { icon: LuImage, text: t('feat.quality') },
    { icon: LuHeart, text: t('feat.fav') },
    { icon: LuLink2, text: t('feat.crm') },
  ]
  return (
    <section className="card grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(5,1fr)] lg:items-center lg:gap-0 lg:divide-x lg:divide-line">
      <div className="lg:pr-6"><Logo /></div>
      {items.map(({ icon: Icon, text }) => (
        <div key={text} className="flex items-center gap-3 lg:flex-col lg:items-start lg:px-6">
          <Icon className="h-7 w-7 shrink-0 text-ink" strokeWidth={1.5} />
          <p className="whitespace-pre-line text-xs leading-relaxed text-ink-600">{text}</p>
        </div>
      ))}
    </section>
  )
}

export default function Home() {
  const { t, tn } = useLang()
  const { data: meta } = useMeta()
  const featured = useQuery({
    queryKey: ['locations', 'home-popular'],
    queryFn: () => redloc.locations({ ordering: 'popular', page_size: 8 }),
  })
  const fresh = useQuery({
    queryKey: ['locations', 'home-new'],
    queryFn: () => redloc.locations({ ordering: 'new', page_size: 4 }),
  })
  const popular = featured.data?.results || []
  const heroBg = popular.find((l) => l.cover)?.cover?.image

  return (
    <div className="space-y-10">
      <Hero background={heroBg} />

      <section>
        <SectionHead title={t('home.popular')} to="/locations?ordering=popular" />
        <LocationGrid items={popular.slice(0, 8)} loading={featured.isLoading} count={4} />
      </section>

      {meta?.categories?.length > 0 && (
        <section>
          <SectionHead title={t('home.categories')} to="/categories" />
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {meta.categories.map((c) => (
              <Link key={c.id} to={`/locations?category=${c.slug}`}
                className="card flex min-w-[150px] flex-1 items-center gap-3 px-4 py-3 transition hover:border-brand/40">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-canvas text-ink">
                  <DictIcon name={c.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{tn(c)}</span>
                  <span className="text-xs text-muted">{c.locations_count}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {fresh.data?.results?.length > 0 && (
        <section>
          <SectionHead title={t('home.new')} to="/locations?ordering=new" />
          <LocationGrid items={fresh.data.results} />
        </section>
      )}

      <Features />
    </div>
  )
}
