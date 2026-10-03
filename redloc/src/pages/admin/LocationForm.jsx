import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuChevronRight, LuExternalLink, LuImage, LuTrash2, LuX } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang, usePageTitle } from '../../lib/i18n'
import { useMeta } from '../../lib/useMeta'
import { useGoBack } from '../../lib/useGoBack'
import { cx } from '../../lib/format'
import Dropzone from '../../components/Dropzone'
import { Field, PageLoader, Spinner, Toggle } from '../../components/ui'
import { PhotosManager, VideosManager } from './MediaManager'

const EMPTY = {
  title: '', city: '', address_hint: '', description_ru: '', description_uz: '',
  badge: '', is_published: true,
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
  usePageTitle(t(slug ? 'a.editLocation' : 'a.addLocation'))
  const navigate = useNavigate()
  const goBack = useGoBack()
  const qc = useQueryClient()
  const { data: meta, refetch: refetchMeta } = useMeta({ fresh: true })
  const loc = useQuery({ queryKey: ['location', slug], queryFn: () => redloc.location(slug), enabled: editing })
  const [form, setForm] = useState(EMPTY)
  const [pending, setPending] = useState([]) // фото, выбранные до первого сохранения
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!loc.data) return
    const d = loc.data
    setForm({
      title: d.title, city: d.city?.id || '', address_hint: d.address_hint,
      description_ru: d.description_ru, description_uz: d.description_uz,
      badge: d.badge, is_published: d.is_published,
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
    // Город могли удалить в «Настройках», пока форма была открыта — тогда сохраняем без города
    const city = meta.cities.some((c) => c.id === form.city) ? form.city : null
    if (form.city && !city) setForm((f) => ({ ...f, city: '' }))
    setSaving(true)
    const payload = { ...form, city }
    try {
      if (editing) {
        const saved = await redloc.updateLocation(slug, payload)
        toast.success(t('common.saved'))
        refresh()
        goBack(`/locations/${saved.slug}`, { force: saved.slug !== slug })
      } else {
        const created = await redloc.createLocation(payload)
        if (pending.length) {
          const toastId = toast.loading(t('a.uploading'))
          await redloc.uploadPhotos(created.id, pending).catch(() => toast.error(t('a.notUploaded')))
          toast.dismiss(toastId)
        }
        toast.success(t('common.saved'))
        qc.invalidateQueries({ queryKey: ['locations'] })
        qc.invalidateQueries({ queryKey: ['meta'] })
        goBack(`/locations/${created.slug}`)
      }
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object') setErrors(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])))
      if (data?.city) {
        // Справочник поменялся на сервере — подтягиваем актуальный и просим выбрать заново
        refetchMeta()
        toast.error(t('a.dictChanged'))
      } else {
        toast.error(errorText(err))
      }
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
    navigate('/')
  }

  if (editing && loc.isLoading) return <PageLoader />
  if (!meta) return <PageLoader />

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <nav className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          <Link to="/" className="hover:text-brand">{t('nav.home')}</Link>
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
              <div className="grid gap-4 sm:grid-cols-2">
                {['ru', 'uz'].map((l) => (
                  <Field key={l} label={`${t('a.description')} (${l.toUpperCase()})`} hint={`${(form[`description_${l}`] || '').length} / 3000`}>
                    <textarea className="input" rows={6} maxLength={3000} lang={l} value={form[`description_${l}`]}
                      onChange={set(`description_${l}`)} />
                  </Field>
                ))}
              </div>
            </div>
          </Card>

          <Card title={t('a.publication')}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <Toggle checked={form.is_published} onChange={set('is_published')} label={t('a.published')} />
              <div className="flex items-center gap-2 text-sm">
                <span>{t('a.badge')}</span>
                <div className="flex gap-1 rounded-lg bg-canvas p-1 text-xs font-semibold">
                  {['', ...meta.badges.map((b) => b.value)].map((v) => (
                    <button type="button" key={v || 'none'} onClick={() => set('badge')(v)}
                      className={cx('rounded-md px-2.5 py-1', form.badge === v ? 'bg-white shadow-sm' : 'text-muted')}>
                      {v ? t(`badge.${v}`) : '—'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title={t('a.photos')}>
            {editing ? (
              <PhotosManager photos={loc.data.photos} onChanged={refresh} api={{
                upload: (files, onProgress) => redloc.uploadPhotos(loc.data.id, files, onProgress),
                reorder: (ids) => redloc.reorderPhotos(loc.data.id, ids),
                remove: redloc.deletePhoto,
              }} />
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
            {editing ? (
              <VideosManager videos={loc.data.videos} onChanged={refresh} api={{
                create: (data, onProgress) => redloc.createVideo({ ...data, location: loc.data.id }, onProgress),
                reorder: (ids) => redloc.reorderVideos(loc.data.id, ids),
                remove: redloc.deleteVideo,
              }} />
            ) : <p className="text-sm text-muted">{t('a.saveFirst')}</p>}
          </Card>
        </div>
      </div>

      <div className="sticky bottom-16 z-10 -mx-4 flex items-center gap-2 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-2xl lg:border">
        <button className="btn btn-primary min-w-32" disabled={saving}>
          {saving && <Spinner className="h-4 w-4 text-white" />} {t('common.save')}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => goBack(editing ? `/locations/${slug}` : '/')}>{t('common.cancel')}</button>
        {editing && (
          <button type="button" className="btn btn-ghost ml-auto text-brand" onClick={remove}>
            <LuTrash2 className="h-4 w-4" /> <span className="hidden sm:inline">{t('common.delete')}</span>
          </button>
        )}
      </div>
    </form>
  )
}
