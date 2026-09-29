import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuChevronRight, LuExternalLink, LuHeart, LuTrash2 } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { cx } from '../../lib/format'
import { Empty, Field, PageLoader, Spinner, Toggle } from '../../components/ui'
import { PhotosManager, VideosManager } from './MediaManager'

const section = (kind) => (kind === 'album' ? 'albums' : 'love-story')

function Card({ title, children }) {
  return (
    <section className="card p-5">
      {title && <h2 className="mb-4 text-sm font-bold">{title}</h2>}
      {children}
    </section>
  )
}

export default function PortfolioForm() {
  const { slug } = useParams()
  const [params] = useSearchParams()
  const editing = !!slug
  const { t } = useLang()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const item = useQuery({ queryKey: ['portfolio', slug], queryFn: () => redloc.portfolio(slug), enabled: editing })
  // Для выбора локации: все локации одним списком (их немного)
  const locations = useQuery({ queryKey: ['locations', 'all-short'], queryFn: () => redloc.locations({ page_size: 60, ordering: 'title' }) })
  const [form, setForm] = useState({
    kind: params.get('kind') === 'album' ? 'album' : 'love_story', title: '', location: '', shot_at: '',
    description_ru: '', description_uz: '', is_published: true,
  })
  const [descLang, setDescLang] = useState('ru')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const d = item.data
    if (!d) return
    setForm({
      kind: d.kind, title: d.title, location: d.location?.id || '', shot_at: d.shot_at || '',
      description_ru: d.description_ru, description_uz: d.description_uz, is_published: d.is_published,
    })
  }, [item.data])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['portfolio', slug] })
    qc.invalidateQueries({ queryKey: ['portfolios'] })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, location: form.location || null, shot_at: form.shot_at || null }
    try {
      const saved = editing ? await redloc.updatePortfolio(slug, payload) : await redloc.createPortfolio(payload)
      toast.success(t('common.saved'))
      refresh()
      if (!editing || saved.slug !== slug) navigate(`/admin/portfolios/${saved.slug}/edit`, { replace: true })
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`${t('a.deletePortfolio')} «${form.title}»? ${t('common.confirmDelete')}`)) return
    await redloc.deletePortfolio(slug)
    toast.success(t('common.deleted'))
    qc.invalidateQueries({ queryKey: ['portfolios'] })
    navigate(`/${section(form.kind)}`)
  }

  if (editing && item.isLoading) return <PageLoader />
  if (editing && !item.data) return <Empty icon={LuHeart} title={t('portfolio.notFound')} />
  const d = item.data
  const kindLabel = t(form.kind === 'album' ? 'nav.albums' : 'nav.loveStory')

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <nav className="mb-1 flex items-center gap-1.5 text-xs text-muted">
          <Link to={`/${section(form.kind)}`} className="hover:text-brand">{kindLabel}</Link>
          <LuChevronRight className="h-3 w-3" />
          <span className="text-ink">{editing ? d?.title : t('a.addPortfolio')}</span>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="page-title mr-auto">{editing ? t('a.editPortfolio') : t('a.addPortfolio')}</h1>
          {editing && (
            <Link to={`/${section(form.kind)}/${slug}`} className="btn btn-outline btn-sm"><LuExternalLink className="h-4 w-4" /> {t('a.openPage')}</Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="min-w-0 space-y-5">
          <Card title={t('a.mainInfo')}>
            <div className="space-y-4">
              <Field label={t('a.kind')}>
                <div className="flex gap-1 rounded-lg bg-canvas p-1 text-sm font-semibold">
                  {[['love_story', t('nav.loveStory')], ['album', t('nav.albums')]].map(([k, label]) => (
                    <button key={k} type="button" onClick={() => set('kind')(k)}
                      className={cx('flex-1 rounded-md py-1.5', form.kind === k ? 'bg-white shadow-sm' : 'text-muted')}>{label}</button>
                  ))}
                </div>
              </Field>
              <Field label={t('a.name')} required>
                <input className="input" required maxLength={150} placeholder={t('a.portfolioPlaceholder')} value={form.title} onChange={set('title')} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('portfolio.shotAt')}>
                  <select className="input" value={form.location} onChange={(e) => set('location')(Number(e.target.value) || '')}>
                    <option value="">—</option>
                    {locations.data?.results.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </Field>
                <Field label={t('a.shotDate')}>
                  <input type="date" className="input" value={form.shot_at} onChange={set('shot_at')} />
                </Field>
              </div>
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
                <textarea className="input" rows={5} value={form[`description_${descLang}`]} onChange={set(`description_${descLang}`)} />
              </div>
              <Toggle checked={form.is_published} onChange={set('is_published')} label={t('a.published')} />
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card title={t('a.photos')}>
            {editing ? (
              <PhotosManager photos={d.photos} onChanged={refresh} api={{
                upload: (files, onProgress) => redloc.uploadPortfolioPhotos(d.id, files, onProgress),
                reorder: (ids) => redloc.reorderPortfolioPhotos(d.id, ids),
                remove: redloc.deletePortfolioPhoto,
              }} />
            ) : <p className="text-sm text-muted">{t('a.saveFirst')}</p>}
          </Card>
          <Card title={t('a.videos')}>
            {editing ? (
              <VideosManager videos={d.videos} onChanged={refresh} api={{
                create: (data, onProgress) => redloc.createPortfolioVideo({ ...data, portfolio: d.id }, onProgress),
                reorder: (ids) => redloc.reorderPortfolioVideos(d.id, ids),
                remove: redloc.deletePortfolioVideo,
              }} />
            ) : <p className="text-sm text-muted">{t('a.saveFirst')}</p>}
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
