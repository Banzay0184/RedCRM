import { cx } from '../lib/format'

export function Pin({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path fill="#E3212B" d="M16 2C9.9 2 5 6.8 5 12.8 5 20.6 16 30 16 30s11-9.4 11-17.2C27 6.8 22.1 2 16 2z" />
      <circle cx="16" cy="12.6" r="4.6" fill="#fff" />
    </svg>
  )
}

export default function Logo({ dark = false, compact = false, className }) {
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <Pin className={compact ? 'h-7 w-7' : 'h-9 w-9'} />
      <div className="leading-none">
        <div className={cx('font-extrabold tracking-tight', compact ? 'text-lg' : 'text-[22px]')}>
          <span className="text-brand">RED</span>
          <span className={dark ? 'text-white' : 'text-ink'}>LOC</span>
        </div>
        {!compact && (
          <div className={cx('mt-1 text-[9px] font-medium', dark ? 'text-white/50' : 'text-muted')}>
            Locations for Photo &amp; Video
          </div>
        )}
      </div>
    </div>
  )
}
