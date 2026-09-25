import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  LuCamera, LuChevronRight, LuEyeOff, LuImage, LuMapPin, LuMessageSquare, LuPencil, LuShare2, LuVideo,
} from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { cx } from '../lib/format'
import { DictIcon } from '../lib/icons'
import { BadgePill, FavoriteButton, LocationGrid } from '../components/LocationCard'
import Lightbox from '../components/Lightbox'
import RequestModal from '../components/RequestModal'
import VideoModal from '../components/VideoModal'
import VideoTile from '../components/VideoTile'
import { Empty, PageLoader } from '../components/ui'

function Gallery({ location, onOpen, onPlay }) {
  const { t } = useLang()
  const [tab, setTab] = useState('photo')
  const [zone, setZone] = useState(null)
  const zones = location.zones.filter((z) => z.photos_count > 0)
  const photos = zone ? location.photos.filter((p) => p.zone === zone) : location.photos

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">{t('loc.gallery')}</h2>
          <div className="mt-2 flex gap-5 border-b border-line text-sm">
            {[['photo', t('nav.photos'), location.photos.length], ['video', t('nav.videos'), location.videos.length]].map(([k, label, n]) => (
              <button key={k} onClick={() => setTab(k)}
                className={cx('-mb-px border-b-2 pb-2 font-medium transition', tab === k ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink')}>
                {label} <span className="text-xs opacity-60">{n}</span>
              </button>
            ))}
          </div>
        </div>
        {tab === 'photo' && zones.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button className="chip-toggle" data-active={zone === null} onClick={() => setZone(null)}>{t('loc.allZones')}</button>
            {zones.map((z) => (
              <button key={z.id} className="chip-toggle" data-active={zone === z.id} onClick={() => setZone(z.id)}>
                {z.icon && <DictIcon name={z.icon} className="h-3.5 w-3.5" />} {z.name}
                <span className="opacity-50">{z.photos_count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {tab === 'photo' ? (
          photos.length ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {photos.map((p) => (
                <button key={p.id} onClick={() => onOpen(location.photos.indexOf(p))}
                  className="group relative aspect-[4/3] overflow-hidden rounded-xl bg-canvas">
                  <img src={p.thumbnail} alt={p.caption || location.title} loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                </button>
              ))}
            </div>
          ) : (
            <Empty icon={LuImage} title={t('loc.noPhotos')} />
          )
        ) : location.videos.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {location.videos.map((v) => <VideoTile key={v.id} video={v} onClick={() => onPlay(v)} caption={v.title} />)}
          </div>
        ) : (
          <Empty icon={LuVideo} title={t('loc.noVideos')} />
        )}
      </div>
    </section>
  )
}

export default function LocationDetail() {
  const { slug } = useParams()
  const { t, tn, td } = useLang()
  const { isStaff } = useAuth()
  const { data: loc, isLoading, isError } = useQuery({ queryKey: ['location', slug], queryFn: () => redloc.location(slug) })
  const similar = useQuery({ queryKey: ['locations', 'similar', slug], queryFn: () => redloc.similar(slug), enabled: !!loc })
  const [lightbox, setLightbox] = useState(null)
  const [video, setVideo] = useState(null)
  const [request, setRequest] = useState(false)

  const thumbs = useMemo(() => loc?.photos.slice(1, 5) || [], [loc])

  if (isLoading) return <PageLoader />
  if (isError || !loc) {
    return <Empty icon={LuMapPin} title={t('loc.notFound')} action={<Link to="/locations" className="btn btn-primary">{t('nav.locations')}</Link>} />
  }

  const main = loc.photos[0]
  const rest = loc.photos.length - 5
  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: loc.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast.success(t('loc.copied'))
      }
    } catch {
      /* пользователь закрыл диалог */
    }
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link to="/locations" className="hover:text-brand">{t('nav.locations')}</Link>
        <LuChevronRight className="h-3 w-3" />
        <span className="truncate text-ink">{loc.title}</span>
      </nav>

      <section className="card grid gap-6 p-4 sm:p-5 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <button onClick={() => main && setLightbox(0)} className="block aspect-[4/3] w-full overflow-hidden rounded-xl bg-canvas">
            {main ? (
              <img src={main.image} alt={loc.title} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-muted"><LuImage className="h-12 w-12" /></div>
            )}
          </button>
          {thumbs.length > 0 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {thumbs.map((p, i) => (
                <button key={p.id} onClick={() => setLightbox(i + 1)} className="aspect-[4/3] overflow-hidden rounded-lg bg-canvas">
                  <img src={p.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover transition hover:opacity-80" />
                </button>
              ))}
              {rest > 0 && (
                <button onClick={() => setLightbox(5)} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-ink">
                  {loc.photos[5] && <img src={loc.photos[5].thumbnail} alt="" className="h-full w-full object-cover opacity-40" />}
                  <span className="absolute inset-0 grid place-items-center text-sm font-bold text-white">+{rest}</span>
                </button>
              )}
            </div>
          )}
        </div>

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
            <button onClick={share} className="btn btn-ghost btn-icon" aria-label={t('loc.share')}><LuShare2 className="h-5 w-5" /></button>
            <FavoriteButton location={loc} className="border border-line shadow-none" />
          </div>

          {(loc.categories.length > 0 || loc.tags.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {loc.categories.map((c) => (
                <Link key={c.id} to={`/locations?category=${c.slug}`} className="chip hover:bg-line">{tn(c)}</Link>
              ))}
              {loc.tags.map((tag) => <span key={tag} className="chip">{tag}</span>)}
            </div>
          )}

          <div className="mt-4 flex gap-5 text-sm text-ink-600">
            <span className="flex items-center gap-1.5"><LuCamera className="h-4 w-4" /> {loc.photos_count} {t('photos')}</span>
            <span className="flex items-center gap-1.5"><LuVideo className="h-4 w-4" /> {loc.videos_count} {t('videos')}</span>
          </div>

          {td(loc) && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-600">{td(loc)}</p>}

          {loc.shoot_types.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold">{t('loc.suitable')}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                {loc.shoot_types.map((s) => (
                  <Link key={s.id} to={`/locations?shoot_type=${s.slug}`} className="flex items-center gap-2 text-xs text-ink-600 hover:text-brand">
                    <DictIcon name={s.icon} className="h-4 w-4" /> {tn(s)}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {loc.amenities.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 text-sm font-semibold">{t('loc.amenities')}</div>
              <div className="flex flex-wrap gap-1.5">
                {loc.amenities.map((a) => (
                  <span key={a.id} className="chip gap-1.5 py-1"><DictIcon name={a.icon} className="h-3.5 w-3.5" /> {tn(a)}</span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto grid grid-cols-2 gap-2 pt-6">
            <FavoriteButton location={loc} withLabel />
            <button className="btn btn-outline" onClick={() => setRequest(true)}>
              <LuMessageSquare className="h-4 w-4" /> {t('loc.contact')}
            </button>
            {isStaff && (
              <Link to={`/admin/locations/${loc.slug}/edit`} className="btn btn-dark col-span-2">
                <LuPencil className="h-4 w-4" /> {t('loc.edit')}
              </Link>
            )}
          </div>
        </div>
      </section>

      {loc.zones.length > 0 && (
        <section className="card p-5">
          <h2 className="section-title mb-3">{t('loc.zones')}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {loc.zones.map((z) => {
              const cover = loc.photos.find((p) => p.zone === z.id)
              return (
                <button key={z.id} disabled={!cover} onClick={() => cover && setLightbox(loc.photos.indexOf(cover))}
                  className="flex items-center gap-3 rounded-xl border border-line p-2 text-left transition enabled:hover:border-brand/40">
                  <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-canvas text-ink-600">
                    {cover ? <img src={cover.thumbnail} alt="" className="h-full w-full object-cover" /> : <DictIcon name={z.icon} className="h-6 w-6" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{z.name}</span>
                    <span className="line-clamp-2 text-xs text-muted">{z.description || `${z.photos_count} ${t('photos')}`}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <Gallery location={loc} onOpen={setLightbox} onPlay={setVideo} />

      {similar.data?.length > 0 && (
        <section>
          <h2 className="section-title mb-4">{t('loc.similar')}</h2>
          <LocationGrid items={similar.data.slice(0, 4)} />
        </section>
      )}

      <Lightbox photos={loc.photos} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      <VideoModal video={video} onClose={() => setVideo(null)} />
      <RequestModal open={request} onClose={() => setRequest(false)} location={loc} />
    </div>
  )
}
