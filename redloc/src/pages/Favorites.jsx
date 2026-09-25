import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuHeart } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useFavorites } from '../lib/favorites'
import { useLang } from '../lib/i18n'
import { LocationGrid } from '../components/LocationCard'
import { Empty } from '../components/ui'

export default function Favorites() {
  const { t } = useLang()
  const fav = useFavorites()
  const ids = [...fav.ids].sort((a, b) => a - b).join(',')
  const { data, isLoading } = useQuery({
    queryKey: ['favorites', fav.isGuest ? 'guest' : 'user', ids],
    queryFn: () =>
      fav.isGuest ? redloc.locations({ ids, page_size: 60 }) : redloc.locations({ favorites: 1, page_size: 60 }),
    enabled: fav.ids.length > 0,
  })
  // Сразу убираем снятые с избранного, не дожидаясь перезапроса
  const items = (data?.results || []).filter((l) => fav.has(l.id))

  return (
    <div>
      <h1 className="page-title mb-1">{t('fav.title')}</h1>
      {fav.isGuest && fav.ids.length > 0 && (
        <p className="mb-4 text-sm text-muted">
          {t('fav.guestHint')} <Link to="/login" className="font-medium text-brand">{t('user.login')}</Link>
        </p>
      )}
      <div className="mt-4">
        {fav.ids.length === 0 ? (
          <Empty icon={LuHeart} title={t('fav.empty')} hint={t('fav.emptyHint')}
            action={<Link to="/locations" className="btn btn-primary">{t('nav.locations')}</Link>} />
        ) : (
          <LocationGrid items={items} loading={isLoading} count={Math.min(fav.ids.length, 8)} />
        )}
      </div>
    </div>
  )
}
