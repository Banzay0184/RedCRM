import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { LuSearch, LuTag } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useLang } from '../lib/i18n'
import { Empty, PageLoader } from '../components/ui'

export default function Tags() {
  const { t } = useLang()
  const [q, setQ] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['tags', 'used'], queryFn: () => redloc.dict('tags', { used: 1 }) })
  const tags = (data || []).filter((tag) => tag.name.toLowerCase().includes(q.toLowerCase()))
  const max = Math.max(1, ...(data || []).map((x) => x.locations_count))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="page-title mr-auto">{t('tags.title')}</h1>
        <div className="relative w-full sm:w-64">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder={t('tags.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {isLoading ? (
        <PageLoader />
      ) : tags.length === 0 ? (
        <Empty icon={LuTag} title={t('catalog.empty')} />
      ) : (
        <div className="card flex flex-wrap gap-2 p-5">
          {tags.map((tag) => {
            const weight = tag.locations_count / max
            return (
              <Link key={tag.id} to={`/locations?tag=${tag.slug}`}
                className="rounded-full border border-line px-3 py-1.5 transition hover:border-brand hover:text-brand"
                style={{ fontSize: `${12 + weight * 6}px`, fontWeight: weight > 0.5 ? 600 : 500 }}>
                #{tag.name} <span className="text-[11px] text-muted">{tag.locations_count}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
