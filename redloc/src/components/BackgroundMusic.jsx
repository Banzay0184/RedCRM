import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { LuMusic, LuVolume2, LuVolumeX } from 'react-icons/lu'
import Logo from './Logo'
import { useLang } from '../lib/i18n'
import { cx } from '../lib/format'

const KEY = 'redloc_music'
const ASKED = 'redloc_music_asked'
const VOLUME = 0.25

function readPref() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}

function asked() {
  try {
    return sessionStorage.getItem(ASKED) === '1'
  } catch {
    return false
  }
}

function savePref(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
    sessionStorage.setItem(ASKED, '1')
  } catch {
    /* приватный режим — просто не запоминаем */
  }
}

// Тихая фоновая музыка. Браузеры не дают играть звук без действия пользователя, поэтому
// при входе спрашиваем окном «OK / Без музыки» — нажатие «OK» и запускает звук.
// Во время видео и в свёрнутой вкладке — пауза. Выбор «без музыки» запоминаем.
export default function BackgroundMusic() {
  const { t } = useLang()
  const { pathname } = useLocation()
  const audio = useRef(null)
  const unlocked = useRef(false)
  const videoPlaying = useRef(false)
  const [enabled, setEnabled] = useState(readPref)
  const [playing, setPlaying] = useState(false)
  const [ask, setAsk] = useState(() => readPref() && !asked())

  const get = () => {
    if (!audio.current) {
      const a = new Audio('/music.mp3')
      a.loop = true
      a.volume = VOLUME
      a.preload = 'none'
      a.addEventListener('play', () => setPlaying(true))
      a.addEventListener('pause', () => setPlaying(false))
      audio.current = a
    }
    return audio.current
  }

  const tryPlay = () => {
    if (!enabled || !unlocked.current || videoPlaying.current || document.hidden) return
    get().play().catch(() => {})
  }

  // Видео на странице, свернутая вкладка — музыка на паузе
  useEffect(() => {
    const isVideo = (e) => e.target instanceof HTMLVideoElement
    const onPlay = (e) => { if (isVideo(e)) { videoPlaying.current = true; audio.current?.pause() } }
    const onStop = (e) => { if (isVideo(e)) { videoPlaying.current = false; tryPlay() } }
    const onVisibility = () => (document.hidden ? audio.current?.pause() : tryPlay())
    document.addEventListener('play', onPlay, true)
    document.addEventListener('pause', onStop, true)
    document.addEventListener('ended', onStop, true)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('play', onPlay, true)
      document.removeEventListener('pause', onStop, true)
      document.removeEventListener('ended', onStop, true)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  useEffect(() => () => audio.current?.pause(), [])

  const choose = (next) => {
    setEnabled(next)
    setAsk(false)
    savePref(next)
    if (next) {
      unlocked.current = true
      videoPlaying.current = false
      get().play().catch(() => {})
    } else {
      audio.current?.pause()
    }
  }

  const on = enabled && playing
  // На страницах редактирования окно-вопрос не показываем — спросим, когда сотрудник выйдет на сайт
  const adminPage = pathname.startsWith('/admin') || pathname.startsWith('/settings')
  const label = t(on ? 'music.off' : 'music.on')
  const button = (
    <button type="button" onClick={() => choose(!on)} aria-label={label} title={label} aria-pressed={on}
      className={cx('btn btn-ghost btn-sm gap-1.5 px-2', on ? 'text-brand' : 'text-muted')}>
      {on ? <LuVolume2 className="h-[18px] w-[18px]" /> : <LuVolumeX className="h-[18px] w-[18px]" />}
      <span className="hidden text-xs font-semibold md:inline">{t('music.label')}</span>
    </button>
  )
  if (ask && !adminPage) {
    return (
      <>
      {button}
      {/* Портал: у шапки backdrop-blur, внутри неё fixed-окно не растянулось бы на весь экран */}
      {createPortal(
      <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-xs rounded-3xl bg-ink p-6 text-center text-white shadow-2xl ring-1 ring-white/10">
          <Logo dark compact className="mx-auto" />
          <span className="mx-auto mt-5 grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-brand">
            <LuMusic className="h-6 w-6" />
          </span>
          <p className="mt-4 text-sm leading-relaxed text-white/85">{t('music.prompt')}</p>
          <button type="button" className="btn btn-primary mt-5 w-full" onClick={() => choose(true)}>OK</button>
          <button type="button" className="mt-2 w-full py-2 text-xs text-white/50 hover:text-white" onClick={() => choose(false)}>
            {t('music.skip')}
          </button>
        </div>
      </div>,
      document.body,
      )}
      </>
    )
  }
  return button
}
