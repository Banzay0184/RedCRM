import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuArrowDown, LuArrowUp, LuPlus, LuTrash2 } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { cx } from '../../lib/format'
import { DictIcon, ICON_KEYS } from '../../lib/icons'
import { move } from '../../components/Sortable'
import { PageLoader } from '../../components/ui'

const KINDS = [
  { kind: 'categories', label: 'filters.category', icons: true },
  { kind: 'shoot-types', label: 'filters.shootType', icons: true },
  { kind: 'amenities', label: 'filters.amenities', icons: true },
  { kind: 'cities', label: 'filters.city', icons: false },
]

function IconSelect({ value, onChange }) {
  return (
    <div className="relative">
      <DictIcon name={value} className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
      <select className="input h-9 w-[92px] pl-8 text-xs" value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
    </div>
  )
}

function Row({ item, kind, icons, onChanged, onMove, first, last }) {
  const { t } = useLang()
  const [draft, setDraft] = useState({ name_ru: item.name_ru, name_uz: item.name_uz, icon: item.icon })
  const dirty = draft.name_ru !== item.name_ru || draft.name_uz !== item.name_uz || draft.icon !== item.icon
  const save = async () => {
    try {
      await redloc.updateDict(kind, item.id, draft)
      toast.success(t('common.saved'))
      onChanged()
    } catch (e) {
      toast.error(errorText(e))
    }
  }
  const remove = async () => {
    if (!window.confirm(`«${item.name_ru}» — ${t('common.confirmDelete')}`)) return
    try {
      await redloc.deleteDict(kind, item.id)
      onChanged()
    } catch (e) {
      toast.error(errorText(e))
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2 py-2 sm:flex-nowrap">
      <div className="flex flex-col">
        <button className="text-muted hover:text-ink disabled:opacity-30" disabled={first} onClick={() => onMove(-1)}><LuArrowUp className="h-3.5 w-3.5" /></button>
        <button className="text-muted hover:text-ink disabled:opacity-30" disabled={last} onClick={() => onMove(1)}><LuArrowDown className="h-3.5 w-3.5" /></button>
      </div>
      {icons && <IconSelect value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />}
      <input className="input h-9 flex-1" value={draft.name_ru} placeholder="RU" onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} />
      <input className="input h-9 flex-1" value={draft.name_uz} placeholder="UZ" onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })} />
      <span className="w-8 text-center text-xs text-muted" title={t('nav.locations')}>{item.locations_count}</span>
      <button className={cx('btn btn-sm', dirty ? 'btn-primary' : 'btn-outline invisible')} onClick={save}>{t('common.save')}</button>
      <button className="btn btn-ghost btn-icon h-8 w-8 text-muted hover:text-brand" onClick={remove}><LuTrash2 className="h-4 w-4" /></button>
    </div>
  )
}

function DictEditor({ kind, icons }) {
  const { t } = useLang()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['dict', kind], queryFn: () => redloc.dict(kind) })
  const [draft, setDraft] = useState({ name_ru: '', name_uz: '', icon: '' })
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['dict', kind] })
    qc.invalidateQueries({ queryKey: ['meta'] })
  }
  const add = async (e) => {
    e.preventDefault()
    if (!draft.name_ru.trim()) return
    try {
      await redloc.createDict(kind, draft)
      setDraft({ name_ru: '', name_uz: '', icon: '' })
      refresh()
    } catch (err) {
      toast.error(errorText(err))
    }
  }
  const reorder = async (idx, delta) => {
    const next = move(data, idx, delta)
    await redloc.reorderDict(kind, next.map((x) => x.id))
    refresh()
  }
  if (isLoading) return <PageLoader />
  return (
    <div>
      <div className="divide-y divide-line">
        {data.map((item, i) => (
          <Row key={`${item.id}-${item.name_ru}-${item.name_uz}-${item.icon}`} item={item} kind={kind} icons={icons}
            onChanged={refresh} onMove={(d) => reorder(i, d)} first={i === 0} last={i === data.length - 1} />
        ))}
      </div>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-3 sm:flex-nowrap">
        {icons && <IconSelect value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />}
        <input className="input h-9 flex-1" required placeholder={`${t('a.name')} (RU)`} value={draft.name_ru}
          onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} />
        <input className="input h-9 flex-1" placeholder={`${t('a.name')} (UZ)`} value={draft.name_uz}
          onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })} />
        <button className="btn btn-primary btn-sm h-9"><LuPlus className="h-4 w-4" /> {t('common.add')}</button>
      </form>
    </div>
  )
}

function TagsEditor() {
  const { t } = useLang()
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: ['tags', 'all'], queryFn: () => redloc.dict('tags') })
  const refresh = () => qc.invalidateQueries({ queryKey: ['tags'] })
  const rename = async (tag) => {
    const name = window.prompt(t('a.name'), tag.name)
    if (!name || name === tag.name) return
    try {
      await redloc.updateDict('tags', tag.id, { name })
      refresh()
    } catch (e) {
      toast.error(errorText(e))
    }
  }
  const remove = async (tag) => {
    if (!window.confirm(`#${tag.name} — ${t('common.confirmDelete')}`)) return
    await redloc.deleteDict('tags', tag.id)
    refresh()
  }
  if (isLoading) return <PageLoader />
  return (
    <div className="flex flex-wrap gap-1.5">
      {data.map((tag) => (
        <span key={tag.id} className="chip-toggle cursor-default">
          <button onClick={() => rename(tag)} className="hover:underline">#{tag.name}</button>
          <span className="opacity-50">{tag.locations_count}</span>
          <button onClick={() => remove(tag)} className="text-muted hover:text-brand">×</button>
        </span>
      ))}
      {!data.length && <span className="text-sm text-muted">—</span>}
    </div>
  )
}

export default function Settings() {
  const { t } = useLang()
  const [tab, setTab] = useState('categories')
  const current = KINDS.find((k) => k.kind === tab)
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title mb-4">{t('nav.settings')}</h1>
      <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none">
        {[...KINDS.map((k) => [k.kind, t(k.label)]), ['tags', t('nav.tags')]].map(([k, label]) => (
          <button key={k} data-active={tab === k} className="chip-toggle shrink-0" onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <section className="card p-5">
        {tab === 'tags' ? <TagsEditor /> : <DictEditor key={tab} kind={tab} icons={current.icons} />}
      </section>
    </div>
  )
}
