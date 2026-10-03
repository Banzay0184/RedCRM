import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuCamera, LuEyeOff, LuHeart, LuImage, LuMapPin, LuPlus, LuVideo } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLang, usePageTitle } from '../lib/i18n'
import { CardSkeleton } from '../components/LocationCard'
import { Empty } from '../components/ui'

const portfolioPath = (p) => `/${p.kind === 'album' ? 'albums' : 'love-story'}/${p.slug}`

function PortfolioCard({ item }) {
  const { t, tn } = useLang()
  return (
    <Link to={portfolioPath(item)} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-canvas">
        {item.cover ? (
          <img src={item.cover.thumbnail} alt={item.title} loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted"><LuImage className="h-10 w-10" /></div>
        )}
        {!item.is_published && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-md bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">
            <LuEyeOff className="h-3 w-3" /> {t('loc.hidden')}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 pt-16 text-white">
          <h3 className="line-clamp-2 text-lg font-bold leading-snug">{item.title}</h3>
          {item.location && (
            <div className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <LuMapPin className="h-3.5 w-3.5" /> {item.location.title}{item.location.city && ` · ${tn(item.location.city)}`}
            </div>
          )}
          <div className="mt-2 flex gap-3 text-[11px] text-white/70">
            <span className="flex items-center gap-1"><LuCamera className="h-3.5 w-3.5" /> {item.photos_count} {t('photos')}</span>
            {item.videos_count > 0 && <span className="flex items-center gap-1"><LuVideo className="h-3.5 w-3.5" /> {item.videos_count} {t('videos')}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function Portfolios({ kind }) {
  const { t } = useLang()
  usePageTitle(t(kind === 'album' ? 'nav.albums' : 'nav.loveStory'))
  const { isStaff } = useAuth()
  const isAlbum = kind === 'album'
  const { data, isLoading } = useQuery({
    queryKey: ['portfolios', kind],
    queryFn: () => redloc.portfolios({ kind, page_size: 60 }),
  })
  const items = data?.results || []

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="page-title">{t(isAlbum ? 'nav.albums' : 'nav.loveStory')}</h1>
          <p className="mt-1 text-sm text-muted">{t(isAlbum ? 'portfolio.album.sub' : 'portfolio.loveStory.sub')}</p>
        </div>
        {isStaff && (
          <Link to={`/admin/portfolios/new?kind=${kind}`} className="btn btn-primary btn-sm">
            <LuPlus className="h-4 w-4" /> {t('a.addPortfolio')}
          </Link>
        )}
      </div>
      {!isLoading && items.length === 0 ? (
        <Empty icon={LuHeart} title={t('portfolio.empty')} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)
            : items.map((p) => <PortfolioCard key={p.id} item={p} />)}
        </div>
      )}
    </div>
  )
}
