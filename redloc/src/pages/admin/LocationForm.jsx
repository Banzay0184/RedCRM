import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuChevronRight, LuExternalLink, LuImage, LuTrash2, LuX } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { useMeta } from '../../lib/useMeta'
import { cx } from '../../lib/format'
import { DictIcon } from '../../lib/icons'
import Dropzone from '../../components/Dropzone'
import TagInput from '../../components/TagInput'
import { Checkbox, Field, PageLoader, Spinner, Toggle } from '../../components/ui'
import { PhotosManager, VideosManager, ZonesManager } from './MediaManager'

const EMPTY = {
  title: '', city: '', address_hint: '', categories: [], tags: [], description_ru: '', description_uz: '',
  shoot_types: [], amenities: [], badge: '', is_featured: false, is_published: true,
}

function ChipsSelect({ items, value, onChange }) {
  const { tn } = useLang()
  const toggle = (id) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id])
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button type="button" key={it.id} data-active={value.includes(it.id)} className="chip-toggle" onClick={() => toggle(it.id)}>
          {it.icon && <DictIcon name={it.icon} className="h-3.5 w-3.5" />} {tn(it)}
        </button>
      ))}
    </div>
  )
}

function Card({ title, children, className }) {
  return (
    <section className={cx('card p-5', className)}>
      {title && <h2 className="mb-4 text-sm font-bold">{title}</h2>}
      {children}
    </section>
  )
}

export default function LocationForm() {
  const { slug } = useParams()
  const editing = !!slug
  const { t, tn } = useLang()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: meta } = useMeta()
  const loc = useQuery({ queryKey: ['location', slug], queryFn: () => redloc.location(slug), enabled: editing })
  const [form, setForm] = useState(EMPTY)
  const [descLang, setDescLang] = useState('ru')
  const [pending, setPending] = useState([]) // фото, выбранные до первого сохранения
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!loc.data) return
    const d = loc.data
    setForm({
      title: d.title, city: d.city?.id || '', address_hint: d.address_hint, categories: d.categories.map((c) => c.id),
      tags: d.tags, description_ru: d.description_ru, description_uz: d.description_uz,
      shoot_types: d.shoot_types.map((s) => s.id), amenities: d.amenities.map((a) => a.id), badge: d.badge,
      is_featured: d.is_featured, is_published: d.is_published,
    })
  }, [loc.data])

  const previews = useMemo(() => pending.map((f) => ({ file: f, url: URL.createObjectURL(f) })), [pending])
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['location', slug] })
    qc.invalidateQueries({ queryKey: ['locations'] })
    qc.invalidateQueries({ queryKey: ['meta'] })
  }

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})
    if (!form.categories.length) {
      setErrors({ categories: t('a.needCategory') })
      return
    }
    setSaving(true)
    const payload = { ...form, city: form.city || null }
    try {
      if (editing) {
        const saved = await redloc.updateLocation(slug, payload)
        toast.success(t('common.saved'))
        refresh()
        if (saved.slug !== slug) navigate(`/admin/locations/${saved.slug}/edit`, { replace: true })
      } else {
        const created = await redloc.createLocation(payload)
        if (pending.length) {
          const toastId = toast.loading(t('a.uploading'))
          for (let i = 0; i < pending.length; i += 10) {
            await redloc.uploadPhotos(created.id, pending.slice(i, i + 10)).catch(() => null)
          }
          toast.dismiss(toastId)
        }
        toast.success(t('common.saved'))
        qc.invalidateQueries({ queryKey: ['locations'] })
        qc.invalidateQueries({ queryKey: ['meta'] })
        navigate(`/admin/locations/${created.slug}/edit`, { replace: true })
      }
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object') setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])))
      toast.error(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`${t('a.deleteLocation')} «${form.title}»? ${t('common.confirmDelete')}`)) return
    await redloc.deleteLocation(slug)
    toast.success(t('common.deleted'))
    qc.invalidateQueries({ queryKey: ['locations'] })
    qc.invalidateQueries({ queryKey: ['meta'] })
    navigate('/locations')
  }

  if (editing && loc.isLoading) return <PageLoader />
  if (!meta) return <PageLoader />

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <nav className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          <Link to="/locations" className="hover:text-brand">{t('nav.locations')}</Link>
          <LuChevronRight className="h-3 w-3" />
          <span className="text-ink">{editing ? loc.data?.title : t('a.addLocation')}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title mr-auto">{editing ? t('a.editLocation') : t('a.addLocation')}</h1>
          {editing && (
            <Link to={`/locations/${slug}`} className="btn btn-outline btn-sm"><LuExternalLink className="h-4 w-4" /> {t('a.openPage')}</Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <Card title={t('a.mainInfo')}>
            <div className="space-y-4">
              <Field label={t('a.name')} required error={errors.title}>
                <input className="input" required maxLength={150} placeholder={t('a.namePlaceholder')} value={form.title} onChange={set('title')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('filters.city')}>
                  <select className="input" value={form.city} onChange={(e) => set('city')(Number(e.target.value) || '')}>
                    <option value="">—</option>
                    {meta.cities.map((c) => <option key={c.id} value={c.id}>{tn(c)}</option>)}
                  </select>
                </Field>
                <Field label={t('a.addressHint')} hint={t('a.addressHintHelp')}>
                  <input className="input" maxLength={200} value={form.address_hint} onChange={set('address_hint')} />
                </Field>
              </div>
              <Field label={t('filters.category')} required error={errors.categories}>
                <ChipsSelect items={meta.categories} value={form.categories} onChange={set('categories')} />
              </Field>
              <Field label={t('nav.tags')} hint={t('a.tagsHint')}>
                <TagInput value={form.tags} onChange={set('tags')} placeholder={t('a.tagsPlaceholder')} />
              </Field>
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="label mb-0">{t('a.description')}</span>
                  <div className="flex rounded-lg bg-canvas p-0.5 text-[11px] font-semibold">
                    {['ru', 'uz'].map((l) => (
                      <button type="button" key={l} onClick={() => setDescLang(l)}
                        className={cx('rounded-md px-2 py-0.5 uppercase', descLang === l ? 'bg-white shadow-sm' : 'text-muted')}>{l}</button>
                    ))}
                  </div>
                </div>
                <textarea className="input" rows={6} placeholder={t('a.descPlaceholder')}
                  value={form[`description_${descLang}`]} onChange={set(`description_${descLang}`)} />
              </div>
            </div>
          </Card>

          <Card title={t('filters.shootType')}>
            <ChipsSelect items={meta.shoot_types} value={form.shoot_types} onChange={set('shoot_types')} />
          </Card>

          <Card title={t('a.amenitiesTitle')}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {meta.amenities.map((a) => (
                <Checkbox key={a.id} label={tn(a)} checked={form.amenities.includes(a.id)}
                  onChange={(on) => set('amenities')(on ? [...form.amenities, a.id] : form.amenities.filter((x) => x !== a.id))} />
              ))}
            </div>
          </Card>

          <Card title={t('a.publication')}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Toggle checked={form.is_published} onChange={set('is_published')} label={t('a.published')} />
              <Toggle checked={form.is_featured} onChange={set('is_featured')} label={t('a.featured')} />
              <label className="flex items-center gap-2 text-sm">
                {t('a.badge')}
                <select className="input h-9 w-auto" value={form.badge} onChange={set('badge')}>
                  <option value="">—</option>
                  {meta.badges.map((b) => <option key={b.value} value={b.value}>{t(`badge.${b.value}`)}</option>)}
                </select>
              </label>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title={t('a.photos')}>
            {editing ? (
              <PhotosManager location={loc.data} onChanged={refresh} />
            ) : (
              <div className="space-y-3">
                <Dropzone accept="image/*" onFiles={(files) => setPending((p) => [...p, ...files])} icon={LuImage}
                  title={t('a.uploadPhotos')} hint={t('a.dropHint')} button={t('a.chooseFiles')} />
                {previews.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {previews.map((p, i) => (
                      <div key={p.url} className="relative aspect-square overflow-hidden rounded-lg">
                        <img src={p.url} alt="" className="h-full w-full object-cover" />
                        <button type="button" onClick={() => setPending((list) => list.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white">
                          <LuX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
          <Card title={t('a.videos')}>
            {editing ? <VideosManager location={loc.data} onChanged={refresh} /> : <p className="text-sm text-muted">{t('a.saveFirst')}</p>}
          </Card>
          <Card title={t('loc.zones')}>
            {editing ? <ZonesManager location={loc.data} onChanged={refresh} /> : <p className="text-sm text-muted">{t('a.saveFirst')}</p>}
          </Card>
        </div>
      </div>

      <div className="sticky bottom-16 z-10 -mx-4 flex items-center gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-2xl lg:border">
        <button className="btn btn-primary min-w-32" disabled={saving}>
          {saving && <Spinner className="h-4 w-4 text-white" />} {t('common.save')}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>{t('common.cancel')}</button>
        {editing && (
          <button type="button" className="btn btn-ghost ml-auto text-brand" onClick={remove}>
            <LuTrash2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('common.delete')}</span>
          </button>
        )}
      </div>
    </form>
  )
}
