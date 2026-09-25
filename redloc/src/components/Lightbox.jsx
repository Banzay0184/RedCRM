import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { LuChevronLeft, LuChevronRight, LuExternalLink, LuX } from 'react-icons/lu'

// photos: [{id, image, caption, location_slug?, location_title?}]
export default function Lightbox({ photos, index, onChange, onClose, showLocation = false }) {
  const open = index !== null && index !== undefined && photos[index]
  const go = useCallback((d) => onChange((index + d + photos.length) % photos.length), [index, photos.length, onChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, go, onClose])

  if (!open) return null
  const photo = photos[index]
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 text-white" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
        <span className="text-white/60">{index + 1} / {photos.length}</span>
        <div className="flex items-center gap-2">
          {showLocation && photo.location_slug && (
            <Link to={`/locations/${photo.location_slug}`} onClick={onClose}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 hover:bg-white/20">
              {photo.location_title} <LuExternalLink className="h-3.5 w-3.5" />
            </Link>
          )}
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/10" aria-label="close">
            <LuX className="h-6 w-6" />
          </button>
        </div>
      </div>
      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 sm:px-16">
        <img key={photo.id} src={photo.image} alt={photo.caption || ''} onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full select-none object-contain" />
        {photos.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); go(-1) }} aria-label="prev"
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:left-4">
              <LuChevronLeft className="h-6 w-6" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); go(1) }} aria-label="next"
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20 sm:right-4">
              <LuChevronRight className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
      <div className="min-h-[52px] px-4 py-3 text-center text-sm text-white/80" onClick={(e) => e.stopPropagation()}>
        {photo.caption}
      </div>
    </div>,
    document.body,
  )
}
