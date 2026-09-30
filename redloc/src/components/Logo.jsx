import { cx } from '../lib/format'

// Логотип RED Video Group: белый — на тёмном фоне, чёрный — на светлом
export default function Logo({ dark = false, compact = false, className }) {
  return (
    <img src={dark ? '/logo-white.png' : '/logo-black.png'} alt="RED Video Group" draggable={false}
      className={cx('w-auto select-none', compact ? 'h-8' : 'h-12', className)} />
  )
}
