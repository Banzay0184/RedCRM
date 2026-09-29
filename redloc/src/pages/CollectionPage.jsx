import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuChevronRight, LuLayers } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { LocationGrid } from '../components/LocationCard'
import { Empty } from '../components/ui'

export default function CollectionPage() {
  const { slug } = useParams()
  const { t, tn } = useLang()
  const { data: meta } = useMeta()
  const collection = meta?.collections.find((c) => c.slug === slug)
  const list = useQuery({
    queryKey: ['locations', 'collection', slug],
    queryFn: () => redloc.locations({ collection: slug, ordering: 'popular', page_size: 60 }),
  })

  if (meta && !collection) return <Empty icon={LuLayers} title={t('collection.notFound')} />

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <Link to="/" className="hover:text-brand">{t('nav.home')}</Link>
        <LuChevronRight className="h-3 w-3" />
        <span className="text-ink">{collection && tn(collection)}</span>
      </nav>
      <h1 className="page-title">{collection && tn(collection)}</h1>
      <LocationGrid items={list.data?.results || []} loading={list.isLoading} count={8} />
    </div>
  )
}
