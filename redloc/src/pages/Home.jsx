import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LuCamera, LuImage, LuLink2, LuShieldCheck,
} from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { LocationGrid } from '../components/LocationCard'
import Logo from '../components/Logo'

function Hero({ background }) {
  const { t } = useLang()
  const { data: meta } = useMeta()

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
        {meta?.stats && (
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/60">
            <span><b className="text-white">{meta.stats.locations}</b> {t('nav.locations').toLowerCase()}</span>
            <span><b className="text-white">{meta.stats.photos}</b> {t('photos')}</span>
            <span><b className="text-white">{meta.stats.videos}</b> {t('videos')}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function Collections() {
  const { tn } = useLang()
  const { data: meta } = useMeta()
  const items = (meta?.collections || []).filter((c) => c.locations_count > 0)
  if (!items.length) return null
  return (
    <section className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:mx-0 lg:px-0">
      {items.map((c) => (
        <Link key={c.id} to={`/collections/${c.slug}`}
          className="group relative h-28 w-40 shrink-0 snap-start overflow-hidden rounded-2xl bg-ink sm:h-32 sm:w-48">
          {c.cover && <img src={c.cover} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-80 transition duration-500 group-hover:scale-105" />}
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
          <span className="absolute inset-x-3 bottom-2.5 text-white">
            <span className="block truncate text-base font-bold leading-tight">{tn(c)}</span>
            <span className="text-[11px] text-white/75">{c.locations_count}</span>
          </span>
        </Link>
      ))}
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
  const all = useQuery({
    queryKey: ['locations', 'home-all'],
    queryFn: () => redloc.locations({ ordering: 'popular', page_size: 60 }),
  })
  const items = all.data?.results || []
  const heroBg = items.find((l) => l.cover)?.cover?.image

  return (
    <div className="space-y-10">
      <Hero background={heroBg} />
      <Collections />
      <LocationGrid items={items} loading={all.isLoading} count={8} />
      <Features />
    </div>
  )
}
