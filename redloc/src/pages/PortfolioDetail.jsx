import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuChevronRight, LuHeart, LuMapPin, LuPencil } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLang, usePageTitle } from '../lib/i18n'
import Lightbox from '../components/Lightbox'
import VideoModal from '../components/VideoModal'
import VideoTile from '../components/VideoTile'
import { Empty, PageLoader } from '../components/ui'

export default function PortfolioDetail() {
  const { slug } = useParams()
  const { t, tn, td } = useLang()
  const { isStaff } = useAuth()
  const { data: item, isLoading, isError } = useQuery({ queryKey: ['portfolio', slug], queryFn: () => redloc.portfolio(slug) })
  usePageTitle(item?.title)
  const [lightbox, setLightbox] = useState(null)
  const [video, setVideo] = useState(null)

  if (isLoading) return <PageLoader />
  if (isError || !item) return <Empty icon={LuHeart} title={t('portfolio.notFound')} />

  const isAlbum = item.kind === 'album'
  const loc = item.location

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link to={isAlbum ? '/albums' : '/love-story'} className="hover:text-brand">{t(isAlbum ? 'nav.albums' : 'nav.loveStory')}</Link>
        <LuChevronRight className="h-3 w-3" />
        <span className="truncate text-ink">{item.title}</span>
      </nav>

      <header>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="mr-auto text-3xl font-extrabold tracking-tight">{item.title}</h1>
          {isStaff && (
            <Link to={`/admin/portfolios/${item.slug}/edit`} className="btn btn-dark btn-sm">
              <LuPencil className="h-4 w-4" /> {t('a.editPortfolio')}
            </Link>
          )}
        </div>
        {td(item) && <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-ink-600">{td(item)}</p>}
      </header>

      {item.videos.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {item.videos.map((v) => <VideoTile key={v.id} video={v} onClick={() => setVideo(v)} caption={v.title} />)}
        </div>
      )}

      <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 [&>*]:mb-2">
        {item.photos.map((p, i) => (
          <button key={p.id} onClick={() => setLightbox(i)} className="group block w-full overflow-hidden rounded-xl bg-canvas">
            <img src={p.thumbnail} alt={item.title} loading="lazy"
              style={p.width && p.height ? { aspectRatio: `${p.width}/${p.height}` } : undefined}
              className="w-full object-cover transition duration-300 group-hover:scale-105" />
          </button>
        ))}
      </div>

      {loc && (
        <Link to={`/locations/${loc.slug}`} className="card flex items-center gap-3 p-4 transition hover:border-brand/40">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand"><LuMapPin className="h-5 w-5" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs text-muted">{t('portfolio.shotAt')}</span>
            <span className="block truncate font-semibold">{loc.title}{loc.city && `, ${tn(loc.city)}`}</span>
          </span>
          <LuChevronRight className="h-5 w-5 text-muted" />
        </Link>
      )}

      <Lightbox photos={item.photos} index={lightbox} onChange={setLightbox} onClose={() => setLightbox(null)} />
      <VideoModal video={video} onClose={() => setVideo(null)} />
    </div>
  )
}
