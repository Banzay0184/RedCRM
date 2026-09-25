import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LuImage } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import Lightbox from '../components/Lightbox'
import { Empty, PageLoader, Spinner } from '../components/ui'

export default function Photos() {
  const { t, tn } = useLang()
  const { data: meta } = useMeta()
  const [category, setCategory] = useState('')
  const [open, setOpen] = useState(null)
  const list = useInfiniteQuery({
    queryKey: ['photos', category],
    queryFn: ({ pageParam }) => redloc.photos({ page: pageParam, page_size: 36, category: category || undefined }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  })
  const photos = list.data?.pages.flatMap((p) => p.results) || []

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="page-title mr-auto">{t('photos.title')}</h1>
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">{t('all.categories')}</option>
          {meta?.categories.map((c) => <option key={c.id} value={c.slug}>{tn(c)}</option>)}
        </select>
      </div>
      {list.isLoading ? (
        <PageLoader />
      ) : photos.length === 0 ? (
        <Empty icon={LuImage} title={t('loc.noPhotos')} />
      ) : (
        <div className="columns-2 gap-2 sm:columns-3 lg:columns-4 2xl:columns-5 [&>*]:mb-2">
          {photos.map((p, i) => (
            <button key={p.id} onClick={() => setOpen(i)} className="group relative block w-full overflow-hidden rounded-xl bg-canvas">
              <img src={p.thumbnail} alt={p.caption || p.location_title} loading="lazy"
                style={p.width && p.height ? { aspectRatio: `${p.width}/${p.height}` } : undefined}
                className="w-full object-cover transition duration-300 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6 text-left text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                {p.location_title}
              </span>
            </button>
          ))}
        </div>
      )}
      {list.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <button className="btn btn-outline min-w-44" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
            {list.isFetchingNextPage ? <Spinner className="h-4 w-4 text-brand" /> : t('catalog.more')}
          </button>
        </div>
      )}
      <Lightbox photos={photos} index={open} onChange={setOpen} onClose={() => setOpen(null)} showLocation />
    </div>
  )
}
