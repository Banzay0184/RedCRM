import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  LuArrowDown, LuArrowLeft, LuArrowRight, LuArrowUp, LuImage, LuPlus, LuStar, LuTrash2, LuVideo, LuYoutube,
} from 'react-icons/lu'
import { errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { cx, formatDuration, readVideoDuration } from '../../lib/format'
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

function TileButton({ label, onClick, disabled, children }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-brand disabled:invisible [&>svg]:h-3.5 [&>svg]:w-3.5">
      {children}
    </button>
  )
}

function PhotoModal({ photo, onClose, onDelete, onMakeCover, isCover }) {
  const { t } = useLang()
  if (!photo) return null
  return (
    <Modal open onClose={onClose} title={t('a.photo')} wide
      footer={<>
        <button className="btn btn-ghost mr-auto text-brand" onClick={() => onDelete(photo)}><LuTrash2 className="h-4 w-4" /> {t('common.delete')}</button>
        {!isCover && (
          <button className="btn btn-outline" onClick={() => { onMakeCover(photo); onClose() }}>
            <LuStar className="h-4 w-4" /> {t('a.makeCover')}
          </button>
        )}
        <button className="btn btn-primary" onClick={onClose}>{t('common.close')}</button>
      </>}>
      <img src={photo.image} alt="" className="w-full rounded-xl bg-canvas object-contain" />
      {photo.width && <div className="mt-2 text-xs text-muted">{photo.width} × {photo.height}px</div>}
    </Modal>
  )
}

// api = { upload(files, onProgress), reorder(ids), remove(id) } — одинаково для локации и съёмки
export function PhotosManager({ photos, api, onChanged }) {
  const { t } = useLang()
  const [progress, setProgress] = useState(null)
  const [edit, setEdit] = useState(null)

  const upload = async (files) => {
    // Загружаем пачками по 10, чтобы не упираться в лимиты запроса
    const chunks = []
    for (let i = 0; i < files.length; i += 10) chunks.push(files.slice(i, i + 10))
    let done = 0
    let failed = 0
    try {
      for (const chunk of chunks) {
        const res = await api.upload(chunk, (p) =>
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
      await api.reorder(next.map((p) => p.id))
      onChanged()
    } catch (e) {
      toast.error(errorText(e))
    }
  }

  const remove = async (photo) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await api.remove(photo.id)
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
              <div className="group relative aspect-square w-full cursor-grab overflow-hidden rounded-lg bg-canvas active:cursor-grabbing">
                <button type="button" onClick={() => setEdit(p)} className="block h-full w-full" aria-label={t('a.photo')}>
                  <img src={p.thumbnail} alt="" draggable={false} className="h-full w-full object-cover transition group-hover:brightness-90" />
                </button>
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand px-1.5 py-0.5 text-[9px] font-bold text-white">{t('a.cover')}</span>}
                {/* Кнопки на фото: на телефоне видны всегда (там нет перетаскивания), на компьютере — при наведении */}
                <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 transition sm:opacity-0 sm:group-hover:opacity-100">
                  <TileButton label={t('a.moveEarlier')} disabled={i === 0} onClick={() => reorder(move(photos, i, -1))}><LuArrowLeft /></TileButton>
                  {i !== 0 && (
                    <TileButton label={t('a.makeCover')} onClick={() => reorder([p, ...photos.filter((x) => x.id !== p.id)])}><LuStar /></TileButton>
                  )}
                  <TileButton label={t('a.moveLater')} disabled={i === photos.length - 1} onClick={() => reorder(move(photos, i, 1))}><LuArrowRight /></TileButton>
                </div>
              </div>
            )} />
        </>
      )}
      <PhotoModal key={edit?.id} photo={edit} isCover={photos[0]?.id === edit?.id}
        onClose={() => setEdit(null)} onDelete={remove}
        onMakeCover={(p) => reorder([p, ...photos.filter((x) => x.id !== p.id)])} />
    </div>
  )
}

// api = { create(data, onProgress), reorder(ids), remove(id) }; data без владельца — его добавляет api.create
export function VideosManager({ videos, api, onChanged }) {
  const { t } = useLang()
  const [mode, setMode] = useState('youtube')
  const [form, setForm] = useState({ title: '', youtube_url: '', file: null, poster: null })
  const [progress, setProgress] = useState(null)
  const [play, setPlay] = useState(null)

  // Не <form>: менеджер живёт внутри формы, вложенные формы невалидны
  const add = async () => {
    const data = { title: form.title }
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
      await api.create(data, setProgress)
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
    await api.reorder(next.map((v) => v.id))
    onChanged()
  }

  const remove = async (v) => {
    if (!window.confirm(t('common.confirmDelete'))) return
    await api.remove(v.id)
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
