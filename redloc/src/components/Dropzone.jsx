import { useRef, useState } from 'react'
import { cx } from '../lib/format'

export default function Dropzone({ accept, multiple = true, onFiles, icon: Icon, title, hint, button, disabled }) {
  const input = useRef(null)
  const [over, setOver] = useState(false)
  const pick = (files) => {
    const list = Array.from(files || []).filter((f) => !accept || accept.split(',').some((a) => f.type.startsWith(a.trim().replace('*', ''))))
    if (list.length) onFiles(multiple ? list : list.slice(0, 1))
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); !disabled && pick(e.dataTransfer.files) }}
      className={cx('flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition',
        over ? 'border-brand bg-brand-soft' : 'border-line bg-canvas/50', disabled && 'opacity-60')}>
      {Icon && <Icon className="mb-2 h-7 w-7 text-ink-600" strokeWidth={1.5} />}
      <div className="text-sm font-semibold">{title}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      <button type="button" disabled={disabled} className="btn btn-outline btn-sm mt-3" onClick={() => input.current?.click()}>
        {button}
      </button>
      <input ref={input} type="file" hidden accept={accept} multiple={multiple}
        onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
    </div>
  )
}
