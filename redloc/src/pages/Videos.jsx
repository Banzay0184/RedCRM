import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LuVideo } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useLang } from '../lib/i18n'
import VideoModal from '../components/VideoModal'
import VideoTile from '../components/VideoTile'
import { Empty, PageLoader, Spinner } from '../components/ui'

export default function Videos() {
  const { t } = useLang()
  const [video, setVideo] = useState(null)
  const list = useInfiniteQuery({
    queryKey: ['videos'],
    queryFn: ({ pageParam }) => redloc.videos({ page: pageParam, page_size: 18 }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  })
  const videos = list.data?.pages.flatMap((p) => p.results) || []

  return (
    <div>
      <h1 className="page-title mb-4">{t('videos.title')}</h1>
      {list.isLoading ? (
        <PageLoader />
      ) : videos.length === 0 ? (
        <Empty icon={LuVideo} title={t('loc.noVideos')} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((v) => (
            <div key={v.id}>
              <VideoTile video={v} onClick={() => setVideo(v)} />
              <div className="mt-2">
                {v.title && <div className="line-clamp-1 text-sm font-semibold">{v.title}</div>}
                <Link to={`/locations/${v.location_slug}`} className="text-xs text-muted hover:text-brand">{v.location_title}</Link>
              </div>
            </div>
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
      <VideoModal video={video} onClose={() => setVideo(null)} />
    </div>
  )
}
