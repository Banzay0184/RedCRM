import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LuX } from 'react-icons/lu'
import { redloc } from '../lib/api'

export default function TagInput({ value, onChange, placeholder }) {
  const [text, setText] = useState('')
  const { data: all } = useQuery({ queryKey: ['tags', 'all'], queryFn: () => redloc.dict('tags'), staleTime: 60_000 })
  const add = (raw) => {
    const names = raw.split(',').map((s) => s.trim().replace(/^#/, '')).filter(Boolean)
    const next = [...value]
    names.forEach((n) => !next.some((x) => x.toLowerCase() === n.toLowerCase()) && next.push(n))
    onChange(next)
    setText('')
  }
  const suggestions = text.trim()
    ? (all || []).filter((t) => t.name.toLowerCase().includes(text.trim().toLowerCase()) && !value.includes(t.name)).slice(0, 6)
    : []

  return (
    <div className="relative">
      <div className="input flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5">
        {value.map((tag) => (
          <span key={tag} className="chip gap-1 bg-ink text-white">
            {tag}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))}><LuX className="h-3 w-3" /></button>
          </span>
        ))}
        <input className="min-w-[120px] flex-1 bg-transparent text-sm outline-none" value={text} placeholder={value.length ? '' : placeholder}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) { e.preventDefault(); add(text) }
            if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1))
          }}
          onBlur={() => text.trim() && add(text)} />
      </div>
      {suggestions.length > 0 && (
        <div className="card absolute inset-x-0 top-full z-10 mt-1 p-1">
          {suggestions.map((s) => (
            <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); add(s.name) }}
              className="block w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-canvas">#{s.name}</button>
          ))}
        </div>
      )}
    </div>
  )
}
