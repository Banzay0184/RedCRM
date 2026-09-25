import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LuCamera, LuEyeOff, LuHeart, LuImage, LuMapPin, LuVideo } from 'react-icons/lu'
import { useFavorites } from '../lib/favorites'
import { useLang } from '../lib/i18n'
import { cx } from '../lib/format'

export function BadgePill({ badge, className }) {
  const { t } = useLang()
  if (!badge) return null
  const styles = {
    premium: 'bg-sky-500 text-white',
    hit: 'bg-brand text-white',
    new: 'bg-emerald-500 text-white',
  }
  return (
    <span className={cx('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', styles[badge], className)}>
      {t(`badge.${badge}`)}
    </span>
  )
}

export function FavoriteButton({ location, className, withLabel = false }) {
  const fav = useFavorites()
  const { t } = useLang()
  const active = fav.has(location.id)
  const onClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const on = await fav.toggle(location)
    if (on && fav.isGuest) toast(t('fav.guestHint'), { id: 'fav-guest', icon: '♡' })
  }
  if (withLabel) {
    return (
      <button onClick={onClick} className={cx('btn', active ? 'btn-outline text-brand' : 'btn-primary', className)}>
        <LuHeart className={cx('h-4 w-4', active && 'fill-brand')} />
        {active ? t('loc.inFav') : t('loc.addFav')}
      </button>
    )
  }
  return (
    <button onClick={onClick} aria-label="favorite"
      className={cx('grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow transition hover:scale-105', className)}>
      <LuHeart className={cx('h-[18px] w-[18px]', active ? 'fill-brand text-brand' : 'text-ink')} />
    </button>
  )
}

export default function LocationCard({ location }) {
  const { t, tn } = useLang()
  const cover = location.cover
  return (
    <Link to={`/locations/${location.slug}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
        {cover ? (
          <img src={cover.thumbnail} alt={location.title} loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted"><LuImage className="h-10 w-10" /></div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <BadgePill badge={location.badge} />
          {!location.is_published && (
            <span className="flex items-center gap-1 rounded-md bg-ink/80 px-2 py-0.5 text-[10px] font-bold text-white">
              <LuEyeOff className="h-3 w-3" /> {t('loc.hidden')}
            </span>
          )}
        </div>
        <FavoriteButton location={location} className="absolute right-3 top-3" />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold">{location.title}</h3>
        {location.city && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted">
            <LuMapPin className="h-3.5 w-3.5" /> {tn(location.city)}
          </div>
        )}
        <div className="mt-3 flex items-center gap-4 text-xs text-ink-600">
          <span className="flex items-center gap-1.5"><LuCamera className="h-4 w-4" /> {location.photos_count} {t('photos')}</span>
          <span className="flex items-center gap-1.5"><LuVideo className="h-4 w-4" /> {location.videos_count} {t('videos')}</span>
        </div>
        {(location.categories.length > 0 || location.tags.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {location.categories.slice(0, 1).map((c) => <span key={c.id} className="chip">{tn(c)}</span>)}
            {location.tags.slice(0, 2).map((tag) => <span key={tag} className="chip">{tag}</span>)}
          </div>
        )}
      </div>
    </Link>
  )
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] animate-pulse bg-canvas" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-canvas" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-canvas" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-canvas" />
      </div>
    </div>
  )
}

export function LocationGrid({ items, loading, count = 8, className = 'sm:grid-cols-2 xl:grid-cols-4' }) {
  return (
    <div className={cx('grid grid-cols-1 gap-4', className)}>
      {loading
        ? Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)
        : items.map((loc) => <LocationCard key={loc.id} location={loc} />)}
    </div>
  )
}
