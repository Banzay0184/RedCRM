import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInfiniteQuery } from '@tanstack/react-query'
import { LuSearchX, LuSlidersHorizontal, LuX } from 'react-icons/lu'
import { redloc } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { cx } from '../lib/format'
import { DictIcon } from '../lib/icons'
import { LocationGrid } from '../components/LocationCard'
import { Checkbox, Empty, Spinner } from '../components/ui'

const MULTI = ['city', 'category', 'shoot_type', 'amenity', 'badge', 'tag']

function useFilters() {
  const [params, setParams] = useSearchParams()
  const get = (k) => (params.get(k) || '').split(',').filter(Boolean)
  const toggle = (k, v) => {
    const cur = get(k)
    const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]
    const p = new URLSearchParams(params)
    next.length ? p.set(k, next.join(',')) : p.delete(k)
    setParams(p, { replace: true })
  }
  const set = (k, v) => {
    const p = new URLSearchParams(params)
    v ? p.set(k, v) : p.delete(k)
    setParams(p, { replace: true })
  }
  const reset = () => setParams(params.get('q') ? { q: params.get('q') } : {}, { replace: true })
  return { params, get, toggle, set, reset }
}

function FilterGroup({ title, items, k, f, withIcons }) {
  const { tn } = useLang()
  if (!items?.length) return null
  const active = f.get(k)
  return (
    <div>
      <div className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it) => (
          <button key={it.slug} data-active={active.includes(it.slug)} className="chip-toggle" onClick={() => f.toggle(k, it.slug)}>
            {withIcons && <DictIcon name={it.icon} className="h-3.5 w-3.5" />}
            {tn(it)}
            {it.locations_count !== undefined && <span className="opacity-50">{it.locations_count}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

function Filters({ f, meta, onClose }) {
  const { t } = useLang()
  const { isStaff } = useAuth()
  const badges = (meta?.badges || []).map((b) => ({ slug: b.value, name_ru: t(`badge.${b.value}`) }))
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">{t('filters.title')}</h2>
        <div className="flex gap-1">
          <button className="btn btn-ghost btn-sm text-brand" onClick={f.reset}>{t('filters.reset')}</button>
          {onClose && (
            <button className="btn btn-ghost btn-sm" onClick={onClose}><LuX className="h-4 w-4" /></button>
          )}
        </div>
      </div>
      <FilterGroup title={t('filters.city')} items={meta?.cities.filter((c) => c.locations_count)} k="city" f={f} />
      <FilterGroup title={t('filters.category')} items={meta?.categories.filter((c) => c.locations_count)} k="category" f={f} withIcons />
      <FilterGroup title={t('filters.shootType')} items={meta?.shoot_types.filter((c) => c.locations_count)} k="shoot_type" f={f} withIcons />
      <FilterGroup title={t('filters.amenities')} items={meta?.amenities.filter((c) => c.locations_count)} k="amenity" f={f} withIcons />
      <FilterGroup title={t('filters.other')} items={badges} k="badge" f={f} />
      <div className="space-y-2">
        <Checkbox label={t('filters.withVideo')} checked={f.params.get('has_video') === '1'}
          onChange={(v) => f.set('has_video', v ? '1' : '')} />
        {isStaff && (
          <Checkbox label={`${t('loc.hidden')} (${t('nav.admin').toLowerCase()})`} checked={f.params.get('all') === '1'}
            onChange={(v) => f.set('all', v ? '1' : '')} />
        )}
      </div>
    </div>
  )
}

export default function Catalog() {
  const { t, tn } = useLang()
  const { data: meta } = useMeta()
  const f = useFilters()
  const [drawer, setDrawer] = useState(false)

  const query = useMemo(() => {
    const q = {}
    for (const [k, v] of f.params.entries()) if (v) q[k] = v
    return q
  }, [f.params])

  const list = useInfiniteQuery({
    queryKey: ['locations', 'catalog', query],
    queryFn: ({ pageParam }) => redloc.locations({ ...query, page: pageParam, page_size: 12 }),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  })
  const items = list.data?.pages.flatMap((p) => p.results) || []
  const total = list.data?.pages[0]?.count ?? 0

  // Активные фильтры — чипсами над списком
  const lookup = { city: meta?.cities, category: meta?.categories, shoot_type: meta?.shoot_types, amenity: meta?.amenities }
  const activeChips = MULTI.flatMap((k) =>
    f.get(k).map((v) => {
      const item = lookup[k]?.find((x) => x.slug === v)
      const label = k === 'badge' ? t(`badge.${v}`) : item ? tn(item) : `#${v}`
      return { k, v, label }
    }),
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card hidden h-fit p-5 lg:sticky lg:top-24 lg:block">
        <Filters f={f} meta={meta} />
      </aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setDrawer(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-8">
            <Filters f={f} meta={meta} onClose={() => setDrawer(false)} />
            <button className="btn btn-primary mt-6 w-full" onClick={() => setDrawer(false)}>
              {t('filters.show')} ({total})
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="page-title">{t('nav.locations')}</h1>
            <p className="text-sm text-muted">
              {f.params.get('q') && <>«{f.params.get('q')}» · </>}
              {t('catalog.found')}: {total}
            </p>
          </div>
          <button className="btn btn-outline lg:hidden" onClick={() => setDrawer(true)}>
            <LuSlidersHorizontal className="h-4 w-4" /> {t('filters.title')}
            {activeChips.length > 0 && <span className="rounded-full bg-brand px-1.5 text-[10px] text-white">{activeChips.length}</span>}
          </button>
          <select className="input w-auto" value={f.params.get('ordering') || ''} onChange={(e) => f.set('ordering', e.target.value)}
            aria-label={t('sort.label')}>
            <option value="">{t('sort.default')}</option>
            <option value="new">{t('sort.new')}</option>
            <option value="popular">{t('sort.popular')}</option>
            <option value="photos">{t('sort.photos')}</option>
            <option value="title">{t('sort.title')}</option>
          </select>
        </div>

        {(activeChips.length > 0 || f.params.get('q')) && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {f.params.get('q') && (
              <button className="chip-toggle" data-active="true" onClick={() => f.set('q', '')}>
                «{f.params.get('q')}» <LuX className="h-3 w-3" />
              </button>
            )}
            {activeChips.map((c) => (
              <button key={c.k + c.v} className="chip-toggle" data-active="true" onClick={() => f.toggle(c.k, c.v)}>
                {c.label} <LuX className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}

        {!list.isLoading && items.length === 0 ? (
          <Empty icon={LuSearchX} title={t('catalog.empty')} hint={t('catalog.emptyHint')}
            action={<button className="btn btn-outline" onClick={f.reset}>{t('filters.reset')}</button>} />
        ) : (
          <div className={cx('transition-opacity', list.isFetching && !list.isFetchingNextPage && !list.isLoading && 'opacity-60')}>
            <LocationGrid items={items} loading={list.isLoading} count={6} className="sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" />
          </div>
        )}

        {list.hasNextPage && (
          <div className="mt-6 flex justify-center">
            <button className="btn btn-outline min-w-44" onClick={() => list.fetchNextPage()} disabled={list.isFetchingNextPage}>
              {list.isFetchingNextPage ? <Spinner className="h-4 w-4 text-brand" /> : t('catalog.more')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
