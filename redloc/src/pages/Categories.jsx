import { Link } from 'react-router-dom'
import { LuChevronRight, LuSettings } from 'react-icons/lu'
import { useAuth } from '../lib/auth'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { DictIcon } from '../lib/icons'
import { PageLoader } from '../components/ui'

function DictList({ title, items, param }) {
  const { tn } = useLang()
  return (
    <section className="card p-5">
      <h2 className="section-title mb-3">{title}</h2>
      <div className="divide-y divide-line">
        {items.map((c) => (
          <Link key={c.id} to={`/locations?${param}=${c.slug}`} className="group flex items-center gap-4 py-3">
            <DictIcon name={c.icon} className="h-5 w-5 text-ink-600" />
            <span className="flex-1 text-sm font-medium group-hover:text-brand">{tn(c)}</span>
            <span className="text-xs text-muted">{c.locations_count}</span>
            <LuChevronRight className="h-4 w-4 text-muted" />
          </Link>
        ))}
      </div>
    </section>
  )
}

export default function Categories() {
  const { t } = useLang()
  const { isStaff } = useAuth()
  const { data: meta, isLoading } = useMeta()
  if (isLoading) return <PageLoader />
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="page-title">{t('cats.title')}</h1>
        {isStaff && (
          <Link to="/settings" className="btn btn-primary btn-sm"><LuSettings className="h-4 w-4" /> {t('nav.settings')}</Link>
        )}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <DictList title={t('filters.category')} items={meta.categories} param="category" />
        <div className="space-y-5">
          <DictList title={t('filters.shootType')} items={meta.shoot_types} param="shoot_type" />
          <DictList title={t('filters.city')} items={meta.cities} param="city" />
        </div>
      </div>
    </div>
  )
}
