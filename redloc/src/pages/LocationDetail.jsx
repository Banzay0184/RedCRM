import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LuChevronRight, LuEyeOff, LuImage, LuMapPin, LuPencil,
} from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLang, usePageTitle } from '../lib/i18n'
import Lightbox from '../components/Lightbox'
import { Empty, PageLoader } from '../components/ui'
import { BadgePill } from '../components/LocationCard'

function Videos({ videos }) {
  if (!videos.length) return null
  return (
    <section className="space-y-4">
      {videos.map((v) => (
        <div key={v.id} className="overflow-hidden rounded-2xl bg-black">
          {v.youtube_id ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?rel=0`} title={v.title || 'video'}
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen
              className="aspect-video w-full" />
          ) : (
            <video src={v.file_url} poster={v.poster_url || undefined} controls playsInline preload="metadata"
              className="aspect-video w-full" />
          )}
        </div>
      ))}
    </section>
  )
}

export default function LocationDetail() {
  const { slug } = useParams()
  const { t, tn, td } = useLang()
  const { isStaff } = useAuth()
  const { data: loc, isLoading, isError } = useQuery({ queryKey: ['location', slug], queryFn: () => redloc.location(slug) })
  usePageTitle(loc?.title)
  const [lightbox, setLightbox] = useState(null)

  if (isLoading) return <PageLoader />
  if (isError || !loc) {
    return <Empty icon={LuMapPin} title={t('loc.notFound')} action={<Link to="/" className="btn btn-primary">{t('nav.home')}</Link>} />
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link to="/" className="hover:text-brand">{t('nav.home')}</Link>
        <LuChevronRight className="h-3 w-3" />
        <span className="truncate text-ink">{loc.title}</span>
      </nav>

      <section className="card p-4 sm:p-5">
        <div className="flex flex-col">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{loc.title}</h1>
                <BadgePill badge={loc.badge} />
                {!loc.is_published && (
                  <span className="flex items-center gap-1 rounded-md bg-ink px-2 py-0.5 text-[10px] font-bold text-white">
                    <LuEyeOff className="h-3 w-3" /> {t('loc.hidden')}
                  </span>
                )}
              </div>
              {loc.city && (
                <div className="mt-1.5 flex items-center gap-1 text-sm text-muted">
                  <LuMapPin className="h-4 w-4" /> {tn(loc.city)}{loc.address_hint && `, ${loc.address_hint}`}
                </div>
              )}
            </div>
          </div>

          {loc.badge === 'off_season' && (
            <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-ink-600">{t('loc.offSeasonNote')}</p>
          )}
          {td(loc) && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-600">{td(loc)}</p>}

          {isStaff && (
            <div className="mt-auto pt-6">
              <Link to={`/admin/locations/${loc.slug}/edit`} className="btn btn-dark w-full">
                <LuPencil className="h-4 w-4" /> {t('loc.edit')}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Все фото сеткой 3 в ряд, как профиль Instagram; тап — полноэкранный просмотр */}
      {loc.photos.length > 0 ? (
        <section className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-xl sm:gap-1">
          {loc.photos.map((p, i) => (
            <button key={p.id} onClick={() => setLightbox(i)} className="aspect-[3/4] overflow-hidden bg-canvas">
              <img src={p.thumbnail} alt={i === 0 ? loc.title : ''} loading={i < 6 ? 'eager' : 'lazy'}
                className="h-full w-full object-cover transition hover:opacity-80" />
            </button>
          ))}
        </section>
      ) : (
        <div className="card grid aspect-[4/3] place-items-center text-muted"><LuImage className="h-12 w-12" /></div>
      )}

      <Videos videos={loc.videos} />

      <Lightbox photos={loc.photos} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
    </div>
  )
}
