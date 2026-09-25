import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuCalendar, LuInbox, LuMapPin, LuPhone, LuSearch, LuTrash2 } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { cx, formatDate, formatDateTime } from '../../lib/format'
import { Empty, PageLoader } from '../../components/ui'

const STATUSES = ['new', 'in_progress', 'done', 'rejected']
const STATUS_STYLE = {
  new: 'bg-brand-soft text-brand',
  in_progress: 'bg-amber-100 text-amber-700',
  done: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-canvas text-muted',
}

function RequestCard({ r, onChanged }) {
  const { t, lang } = useLang()
  const [note, setNote] = useState(r.admin_note)
  const update = async (data) => {
    try {
      await redloc.updateRequest(r.id, data)
      onChanged()
    } catch (e) {
      toast.error(errorText(e))
    }
  }
  const remove = async () => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await redloc.deleteRequest(r.id)
    onChanged()
  }
  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold">{r.name}</span>
            <a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-1 text-sm text-brand">
              <LuPhone className="h-3.5 w-3.5" /> {r.phone}
            </a>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>{formatDateTime(r.created_at, lang)}</span>
            {r.location_slug && (
              <Link to={`/locations/${r.location_slug}`} className="flex items-center gap-1 hover:text-brand">
                <LuMapPin className="h-3.5 w-3.5" /> {r.location_title}
              </Link>
            )}
            {r.shoot_type_name && <span>{r.shoot_type_name}</span>}
            {r.crm_client_name && <span className="font-medium text-ink-600">RedCRM: {r.crm_client_name}</span>}
            {r.shooting_date && (
              <span className="flex items-center gap-1"><LuCalendar className="h-3.5 w-3.5" /> {formatDate(r.shooting_date, lang)}</span>
            )}
          </div>
        </div>
        <select className={cx('input h-8 w-auto border-0 text-xs font-semibold', STATUS_STYLE[r.status])} value={r.status}
          onChange={(e) => update({ status: e.target.value })}>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
        </select>
        <button className="btn btn-ghost btn-icon h-8 w-8 text-muted hover:text-brand" onClick={remove}><LuTrash2 className="h-4 w-4" /></button>
      </div>
      {r.message && <p className="mt-3 whitespace-pre-line rounded-xl bg-canvas p-3 text-sm">{r.message}</p>}
      <textarea className="input mt-3 text-xs" rows={1} placeholder={t('a.note')} value={note}
        onChange={(e) => setNote(e.target.value)} onBlur={() => note !== r.admin_note && update({ admin_note: note })} />
    </div>
  )
}

export default function Requests() {
  const { t } = useLang()
  const qc = useQueryClient()
  const [status, setStatus] = useState('new')
  const [q, setQ] = useState('')
  const counts = useQuery({ queryKey: ['requests', 'counts'], queryFn: redloc.requestCounts })
  const list = useQuery({
    queryKey: ['requests', status, q],
    queryFn: () => redloc.requests({ status: status || undefined, q: q || undefined, page_size: 60 }),
  })
  const refresh = () => qc.invalidateQueries({ queryKey: ['requests'] })
  const total = Object.values(counts.data || {}).reduce((a, b) => a + b, 0)

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="page-title mr-auto">{t('nav.requests')}</h1>
        <div className="relative w-full sm:w-64">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none">
        {[['', t('common.all'), total], ...STATUSES.map((s) => [s, t(`status.${s}`), counts.data?.[s] || 0])].map(([k, label, n]) => (
          <button key={k || 'all'} data-active={status === k} className="chip-toggle shrink-0" onClick={() => setStatus(k)}>
            {label} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>
      {list.isLoading ? (
        <PageLoader />
      ) : list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((r) => <RequestCard key={r.id} r={r} onChanged={refresh} />)}
        </div>
      ) : (
        <Empty icon={LuInbox} title={t('a.noRequests')} />
      )}
    </div>
  )
}
