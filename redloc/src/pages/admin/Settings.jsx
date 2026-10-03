import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuArrowDown, LuArrowUp, LuImage, LuPlus, LuRotateCcw, LuTrash2 } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang, usePageTitle } from '../../lib/i18n'
import { cx } from '../../lib/format'
import { move } from '../../components/Sortable'
import { Field, PageLoader, Spinner } from '../../components/ui'
import Dropzone from '../../components/Dropzone'
import { useMeta } from '../../lib/useMeta'

const KINDS = [
  { kind: 'cities', label: 'filters.city' },
]

function Row({ item, kind, onChanged, onMove, first, last }) {
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
      <input className="input h-9 flex-1" value={draft.name_ru} placeholder="RU" onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} />
      <input className="input h-9 flex-1" value={draft.name_uz} placeholder="UZ" onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })} />
      <span className="w-8 text-center text-xs text-muted" title={t('nav.locations')}>{item.locations_count}</span>
      <button className={cx('btn btn-sm', dirty ? 'btn-primary' : 'btn-outline invisible')} onClick={save}>{t('common.save')}</button>
      <button className="btn btn-ghost btn-icon h-8 w-8 text-muted hover:text-brand" onClick={remove}><LuTrash2 className="h-4 w-4" /></button>
    </div>
  )
}

function DictEditor({ kind }) {
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
          <Row key={`${item.id}-${item.name_ru}-${item.name_uz}-${item.icon}`} item={item} kind={kind}
            onChanged={refresh} onMove={(d) => reorder(i, d)} first={i === 0} last={i === data.length - 1} />
        ))}
      </div>
      <form onSubmit={add} className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-canvas p-3 sm:flex-nowrap">
        <input className="input h-9 flex-1" required placeholder={`${t('a.name')} (RU)`} value={draft.name_ru}
          onChange={(e) => setDraft({ ...draft, name_ru: e.target.value })} />
        <input className="input h-9 flex-1" placeholder={`${t('a.name')} (UZ)`} value={draft.name_uz}
          onChange={(e) => setDraft({ ...draft, name_uz: e.target.value })} />
        <button className="btn btn-primary btn-sm h-9"><LuPlus className="h-4 w-4" /> {t('common.add')}</button>
      </form>
    </div>
  )
}

function HeroEditor() {
  const { t, tIn } = useLang()
  const qc = useQueryClient()
  const { data: meta } = useMeta()
  const site = meta?.site
  const [form, setForm] = useState(null)
  const [file, setFile] = useState(null)
  const [lang, setLang] = useState('ru')
  const [saving, setSaving] = useState(false)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])
  useEffect(() => {
    if (site && !form) {
      const { hero_title_ru, hero_title_uz, hero_subtitle_ru, hero_subtitle_uz } = site
      setForm({ hero_title_ru, hero_title_uz, hero_subtitle_ru, hero_subtitle_uz })
    }
  }, [site, form])
  if (!form) return <PageLoader />

  const save = async (extra = {}) => {
    setSaving(true)
    try {
      await redloc.updateSite({ ...form, ...(file ? { hero_image: file } : {}), ...extra })
      setFile(null)
      qc.invalidateQueries({ queryKey: ['meta'] })
      toast.success(t('common.saved'))
    } catch (e) {
      toast.error(errorText(e))
    } finally {
      setSaving(false)
    }
  }
  const image = preview || site.hero_image_url
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <div className="flex rounded-lg bg-canvas p-0.5 text-[11px] font-semibold">
          {['ru', 'uz'].map((l) => (
            <button type="button" key={l} onClick={() => setLang(l)}
              className={cx('rounded-md px-2 py-0.5 uppercase', lang === l ? 'bg-white shadow-sm' : 'text-muted')}>{l}</button>
          ))}
        </div>
      </div>
      <Field label={`${t('a.heroTitle')} (${lang.toUpperCase()})`} hint={t('a.heroDefaultHint')}>
        <textarea className="input" rows={2} maxLength={120} placeholder={tIn(lang, 'hero.title')}
          value={form[`hero_title_${lang}`]} onChange={set(`hero_title_${lang}`)} />
      </Field>
      <Field label={`${t('a.heroSubtitle')} (${lang.toUpperCase()})`}>
        <textarea className="input" rows={2} maxLength={300} placeholder={tIn(lang, 'hero.subtitle')}
          value={form[`hero_subtitle_${lang}`]} onChange={set(`hero_subtitle_${lang}`)} />
      </Field>
      <Field label={t('a.heroImage')} hint={t('a.heroImageHint')}>
        <div className="space-y-2">
          {image && <img src={image} alt="" className="aspect-[21/9] w-full rounded-xl bg-canvas object-cover" />}
          <Dropzone accept="image/*" multiple={false} onFiles={(files) => setFile(files[0] || null)} icon={LuImage}
            title={t('a.uploadPhotos')} hint={t('a.dropHint')} button={t('a.chooseFiles')} />
          {site.hero_image_url && !file && (
            <button type="button" className="btn btn-ghost btn-sm text-brand" disabled={saving} onClick={() => save({ remove_hero_image: 1 })}>
              <LuRotateCcw className="h-4 w-4" /> {t('a.heroDefault')}
            </button>
          )}
        </div>
      </Field>
      <button type="button" className="btn btn-primary min-w-32" disabled={saving} onClick={() => save()}>
        {saving && <Spinner className="h-4 w-4 text-white" />} {t('common.save')}
      </button>
    </div>
  )
}

export default function Settings() {
  const { t } = useLang()
  usePageTitle(t('nav.settings'))
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') || 'home'
  const setTab = (k) => setParams({ tab: k }, { replace: true })
  const current = KINDS.find((k) => k.kind === tab)
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="page-title mb-4">{t('nav.settings')}</h1>
      <div className="mb-4 flex gap-1.5 overflow-x-auto scrollbar-none">
        {[['home', t('nav.homeHero')], ...KINDS.map((k) => [k.kind, t(k.label)])].map(([k, label]) => (
          <button key={k} data-active={tab === k} className="chip-toggle shrink-0" onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      <section className="card p-5">
        {current ? <DictEditor key={tab} kind={tab} /> : <HeroEditor />}
      </section>
    </div>
  )
}
