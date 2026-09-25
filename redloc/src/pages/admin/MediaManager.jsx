import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  LuArrowDown, LuArrowUp, LuImage, LuPlus, LuStar, LuTrash2, LuVideo, LuYoutube,
} from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { cx, formatDuration, readVideoDuration } from '../../lib/format'
import { DictIcon, ICON_KEYS } from '../../lib/icons'
import Dropzone from '../../components/Dropzone'
import Sortable, { move } from '../../components/Sortable'
import VideoTile from '../../components/VideoTile'
import VideoModal from '../../components/VideoModal'
import { Field, Modal, Spinner } from '../../components/ui'

function Progress({ value, label }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <div className="mb-1.5 flex justify-between text-xs"><span>{label}</span><span>{value}%</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-brand transition-all" style={{ width: `${value}%` }} /></div>
    </div>
  )
}

function PhotoEditModal({ photo, zones, onClose, onSaved, onDelete, onMakeCover, isCover }) {
  const { t } = useLang()
  const [caption, setCaption] = useState(photo?.caption || '')
  const [zone, setZone] = useState(photo?.zone || '')
  const [saving, setSaving] = useState(false)
  if (!photo) return null
  const save = async () => {
    setSaving(true)
    try {
      await redloc.updatePhoto(photo.id, { caption, zone: zone || null })
      onSaved()
      onClose()
    } catch (e) {
      toast.error(errorText(e))
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal open onClose={onClose} title={t('a.photo')} wide
      footer={<>
        <button className="btn btn-ghost mr-auto text-brand" onClick={() => onDelete(photo)}><LuTrash2 className="h-4 w-4" /> {t('common.delete')}</button>
        <button className="btn btn-outline" onClick={onClose}>{t('common.cancel')}</button>
        <button className="btn btn-primary" onClick={save} disabled={saving}>{t('common.save')}</button>
      </>}>
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <img src={photo.image} alt="" className="w-full rounded-xl bg-canvas object-contain" />
        <div className="space-y-3">
          <Field label={t('a.caption')}>
            <input className="input" value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label={t('a.zone')} hint={zones.length ? '' : t('a.zonesHint')}>
            <select className="input" value={zone} onChange={(e) => setZone(Number(e.target.value) || '')}>
              <option value="">—</option>
              {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </Field>
          {!isCover && (
            <button className="btn btn-outline w-full" onClick={() => { onMakeCover(photo); onClose() }}>
              <LuStar className="h-4 w-4" /> {t('a.makeCover')}
            </button>
          )}
          {photo.width && <div className="text-xs text-muted">{photo.width} × {photo.height}px</div>}
        </div>
      </div>
    </Modal>
  )
}

export function PhotosManager({ location, onChanged }) {
  const { t } = useLang()
  const [progress, setProgress] = useState(null)
  const [edit, setEdit] = useState(null)
  const photos = location.photos

  const upload = async (files) => {
    // Загружаем пачками по 10, чтобы не упираться в лимиты запроса
    const chunks = []
    for (let i = 0; i < files.length; i += 10) chunks.push(files.slice(i, i + 10))
    let done = 0
    let failed = 0
    try {
      for (const chunk of chunks) {
        const res = await redloc.uploadPhotos(location.id, chunk, (p) =>
          setProgress(Math.round(((done + (p / 100) * chunk.length) / files.length) * 100)))
        done += chunk.length
        failed += res.errors?.length || 0
      }
      toast.success(`${t('a.uploaded')}: ${files.length - failed}`)
    } catch (e) {
      const errs = e?.response?.data?.errors
      toast.error(errs?.length ? `${errs[0].file}: ${errs[0].error}` : errorText(e))
    } finally {
      if (failed) toast.error(`${t('a.notUploaded')}: ${failed}`)
      setProgress(null)
      onChanged()
    }
  }

  const reorder = async (next) => {
    try {
      await redloc.reorderPhotos(location.id, next.map((p) => p.id))
      onChanged()
    } catch (e) {
      toast.error(errorText(e))
    }
  }

  const remove = async (photo) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await redloc.deletePhoto(photo.id)
    setEdit(null)
    onChanged()
  }

  return (
    <div className="space-y-3">
      <Dropzone accept="image/*" onFiles={upload} icon={LuImage} title={t('a.uploadPhotos')} hint={t('a.dropHint')}
        button={t('a.chooseFiles')} disabled={progress !== null} />
      {progress !== null && <Progress value={progress} label={t('a.uploading')} />}
      {photos.length > 0 && (
        <>
          <div className="text-xs text-muted">{t('a.dragHint')}</div>
          <Sortable items={photos} onReorder={reorder} className="grid grid-cols-3 gap-2 sm:grid-cols-4"
            renderItem={(p, i) => (
              <button type="button" onClick={() => setEdit(p)}
                className="group relative block aspect-square w-full cursor-grab overflow-hidden rounded-lg bg-canvas active:cursor-grabbing">
                <img src={p.thumbnail} alt="" draggable={false} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">{t('a.cover')}</span>}
                {p.zone && <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white">
                  {location.zones.find((z) => z.id === p.zone)?.name}
                </span>}
                <span className="absolute inset-0 bg-ink/0 transition group-hover:bg-ink/20" />
              </button>
            )} />
        </>
      )}
      <PhotoEditModal key={edit?.id} photo={edit} zones={location.zones} isCover={photos[0]?.id === edit?.id}
        onClose={() => setEdit(null)} onSaved={onChanged} onDelete={remove}
        onMakeCover={(p) => reorder([p, ...photos.filter((x) => x.id !== p.id)])} />
    </div>
  )
}

export function VideosManager({ location, onChanged }) {
  const { t } = useLang()
  const [mode, setMode] = useState('youtube')
  const [form, setForm] = useState({ title: '', youtube_url: '', file: null, poster: null })
  const [progress, setProgress] = useState(null)
  const [play, setPlay] = useState(null)
  const videos = location.videos

  // Не <form>: менеджер живёт внутри формы локации, вложенные формы невалидны
  const add = async () => {
    const data = { location: location.id, title: form.title }
    if (mode === 'youtube') {
      if (!form.youtube_url.trim()) return toast.error(t('a.youtubeRequired'))
      data.youtube_url = form.youtube_url.trim()
    } else {
      if (!form.file) return toast.error(t('a.chooseVideo'))
      data.file = form.file
      data.duration = await readVideoDuration(form.file)
      if (form.poster) data.poster = form.poster
    }
    setProgress(0)
    try {
      await redloc.createVideo(data, setProgress)
      setForm({ title: '', youtube_url: '', file: null, poster: null })
      toast.success(t('common.saved'))
      onChanged()
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setProgress(null)
    }
  }

  const enter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }

  const reorder = async (next) => {
    await redloc.reorderVideos(location.id, next.map((v) => v.id))
    onChanged()
  }

  const remove = async (v) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await redloc.deleteVideo(v.id)
    onChanged()
  }

  return (
    <div className="space-y-3">
      {videos.map((v, i) => (
        <div key={v.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
          <div className="w-28 shrink-0"><VideoTile video={v} onClick={() => setPlay(v)} /></div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{v.title || (v.youtube_id ? 'YouTube' : t('a.file'))}</div>
            <div className="text-xs text-muted">{v.youtube_id ? 'YouTube' : t('a.file')}{v.duration ? ` · ${formatDuration(v.duration)}` : ''}</div>
          </div>
          <button type="button" className="btn btn-ghost btn-icon h-8 w-8" disabled={i === 0} onClick={() => reorder(move(videos, i, -1))}><LuArrowUp className="h-4 w-4" /></button>
          <button type="button" className="btn btn-ghost btn-icon h-8 w-8" disabled={i === videos.length - 1} onClick={() => reorder(move(videos, i, 1))}><LuArrowDown className="h-4 w-4" /></button>
          <button type="button" className="btn btn-ghost btn-icon h-8 w-8 text-brand" onClick={() => remove(v)}><LuTrash2 className="h-4 w-4" /></button>
        </div>
      ))}

      <div className="space-y-3 rounded-2xl border-2 border-dashed border-line p-4">
        <div className="flex gap-1 rounded-lg bg-canvas p-1 text-xs font-semibold">
          {[['youtube', LuYoutube, 'YouTube'], ['file', LuVideo, t('a.file')]].map(([k, Icon, label]) => (
            <button key={k} type="button" onClick={() => setMode(k)}
              className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5', mode === k ? 'bg-white shadow-sm' : 'text-muted')}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <input className="input" placeholder={t('a.videoTitle')} value={form.title} maxLength={150} onKeyDown={enter}
          onChange={(e) => setForm({ ...form, title: e.target.value })} />
        {mode === 'youtube' ? (
          <input className="input" type="url" placeholder="https://youtu.be/..." value={form.youtube_url} onKeyDown={enter}
            onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label={t('a.videoFile')} hint="mp4 / mov / webm, ≤ 500 MB">
              <input type="file" accept="video/*" className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-1.5 file:text-white"
                onChange={(e) => setForm({ ...form, file: e.target.files[0] || null })} />
            </Field>
            <Field label={t('a.poster')}>
              <input type="file" accept="image/*" className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-canvas file:px-3 file:py-1.5"
                onChange={(e) => setForm({ ...form, poster: e.target.files[0] || null })} />
            </Field>
          </div>
        )}
        {progress !== null && mode === 'file' && <Progress value={progress} label={t('a.uploading')} />}
        <button type="button" onClick={add} className="btn btn-dark w-full" disabled={progress !== null}>
          {progress !== null ? <Spinner className="h-4 w-4 text-white" /> : <LuPlus className="h-4 w-4" />} {t('a.addVideo')}
        </button>
      </div>
      <VideoModal video={play} onClose={() => setPlay(null)} />
    </div>
  )
}

export function ZonesManager({ location, onChanged }) {
  const { t } = useLang()
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('frame')
  const qc = useQueryClient()

  const add = async () => {
    if (!name.trim()) return
    try {
      await redloc.createZone({ location: location.id, name: name.trim(), icon })
      setName('')
      onChanged()
    } catch (err) {
      toast.error(errorText(err))
    }
  }
  const rename = async (z) => {
    const next = window.prompt(t('a.zoneName'), z.name)
    if (!next || next === z.name) return
    await redloc.updateZone(z.id, { name: next })
    onChanged()
  }
  const remove = async (z) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await redloc.deleteZone(z.id)
    onChanged()
    qc.invalidateQueries({ queryKey: ['photos'] })
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">{t('a.zonesIntro')}</p>
      <div className="flex flex-wrap gap-1.5">
        {location.zones.map((z) => (
          <span key={z.id} className="chip-toggle cursor-default">
            <DictIcon name={z.icon} className="h-3.5 w-3.5" />
            <button type="button" onClick={() => rename(z)} className="hover:underline">{z.name}</button>
            <span className="opacity-50">{z.photos_count}</span>
            <button type="button" onClick={() => remove(z)} className="text-muted hover:text-brand">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <select className="input w-24" value={icon} onChange={(e) => setIcon(e.target.value)} aria-label="icon">
          {ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <input className="input" placeholder={t('a.zonePlaceholder')} value={name} maxLength={100} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <button type="button" onClick={add} className="btn btn-dark btn-icon shrink-0"><LuPlus className="h-4 w-4" /></button>
      </div>
    </div>
  )
}
