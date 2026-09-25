import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { LuLoaderCircle, LuX } from 'react-icons/lu'
import { cx } from '../lib/format'

export function Spinner({ className }) {
  return <LuLoaderCircle className={cx('animate-spin', className || 'h-6 w-6 text-brand')} />
}

export function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8 text-brand" />
    </div>
  )
}

export function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      {Icon && (
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <Icon className="h-7 w-7" />
        </div>
      )}
      <div className="font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm text-muted">{hint}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false, footer }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('card flex max-h-[92vh] w-full flex-col rounded-b-none sm:rounded-2xl', wide ? 'sm:max-w-3xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="font-bold">{title}</h3>
          <button className="btn btn-ghost btn-icon -mr-2 h-8 w-8" onClick={onClose} aria-label="close">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Field({ label, required, children, hint, error }) {
  return (
    <label className="block">
      {label && (
        <span className="label">
          {label} {required && <span className="text-brand">*</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[11px] text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[11px] text-brand">{error}</span>}
    </label>
  )
}

export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm">
      <span className={cx('relative h-5 w-9 rounded-full transition', checked ? 'bg-brand' : 'bg-line')}>
        <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export function Checkbox({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-600">
      <input type="checkbox" className="h-4 w-4 rounded border-line accent-brand" checked={checked}
        onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}
