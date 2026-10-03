import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LuArrowUpDown, LuCamera, LuImage, LuLink2, LuPencil, LuShieldCheck,
} from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLang, usePageTitle } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { LocationGrid } from '../components/LocationCard'
import Logo from '../components/Logo'

const LocationsOrder = lazy(() => import('./admin/LocationsOrder'))

function Hero({ background }) {
  const { t, tp, lang } = useLang()
  const { isStaff } = useAuth()
  const { data: meta } = useMeta()
  const site = meta?.site || {}
  const pick = (key) => (lang === 'uz' && site[`${key}_uz`]) || site[`${key}_ru`] || t(`hero.${key.replace('hero_', '')}`)
  const image = site.hero_image_url || background

  return (
    <section className="relative flex min-h-[380px] flex-col justify-end overflow-hidden rounded-3xl bg-ink text-white sm:min-h-[480px] lg:min-h-[540px]">
      {image && <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10 sm:bg-gradient-to-r sm:from-ink sm:via-ink/70 sm:to-transparent" />
      {!image && (
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
      )}
      {isStaff && (
        <Link to="/settings?tab=home" className="btn btn-sm absolute right-4 top-4 z-10 bg-white/90 text-ink hover:bg-white">
          <LuPencil className="h-4 w-4" /> {t('a.editHero')}
        </Link>
      )}
      <div className="relative px-6 pb-8 pt-16 sm:px-12 sm:pb-12">
        <h1 className="max-w-2xl whitespace-pre-line text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
          {pick('hero_title')}
        </h1>
        <p className="mt-5 max-w-lg whitespace-pre-line text-base text-white/80 sm:text-lg">{pick('hero_subtitle')}</p>
        {meta?.stats && (
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-white/70">
            {/* tp даёт «5 локаций» — число выделяем жирным, слово оставляем как есть */}
            <span><b className="text-lg text-white">{meta.stats.locations}</b>{tp('count.locations', meta.stats.locations).slice(String(meta.stats.locations).length)}</span>
            <span><b className="text-lg text-white">{meta.stats.photos}</b> {t('photos')}</span>
            <span><b className="text-lg text-white">{meta.stats.videos}</b> {t('videos')}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function Features() {
  const { t } = useLang()
  const items = [
    { icon: LuCamera, text: t('feat.base') },
    { icon: LuShieldCheck, text: t('feat.verified') },
    { icon: LuImage, text: t('feat.quality') },
    { icon: LuLink2, text: t('feat.crm') },
  ]
  return (
    <section className="card grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-[1.3fr_repeat(4,1fr)] lg:items-center lg:gap-0 lg:divide-x lg:divide-line">
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
  const { t } = useLang()
  usePageTitle()
  const { isStaff } = useAuth()
  const [ordering, setOrdering] = useState(false)
  const all = useQuery({
    queryKey: ['locations', 'home-all'],
    queryFn: () => redloc.locations({ ordering: 'popular', page_size: 60 }),
  })
  const items = all.data?.results || []
  const heroBg = items.find((l) => l.cover)?.cover?.image

  return (
    <div className="space-y-10">
      <Hero background={heroBg} />
      <section className="space-y-3">
        {isStaff && items.length > 1 && !ordering && (
          <div className="flex justify-end">
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setOrdering(true)}>
              <LuArrowUpDown className="h-4 w-4" /> {t('a.order')}
            </button>
          </div>
        )}
        {ordering ? (
          <Suspense fallback={null}><LocationsOrder items={items} onDone={() => setOrdering(false)} /></Suspense>
        ) : (
          <LocationGrid items={items} loading={all.isLoading} count={8} />
        )}
      </section>
      <Features />
    </div>
  )
}
