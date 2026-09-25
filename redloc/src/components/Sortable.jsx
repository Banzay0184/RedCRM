import { useState } from 'react'

// Лёгкая сортировка перетаскиванием на HTML5 DnD (без зависимостей).
// items: [{id,...}], onReorder(newItems). renderItem(item, index, {dragging}).
export default function Sortable({ items, onReorder, renderItem, className }) {
  const [dragId, setDragId] = useState(null)
  const [order, setOrder] = useState(null)
  const list = order || items

  const onDragOver = (e, overId) => {
    e.preventDefault()
    if (dragId === null || overId === dragId) return
    const cur = [...list]
    const from = cur.findIndex((x) => x.id === dragId)
    const to = cur.findIndex((x) => x.id === overId)
    const [moved] = cur.splice(from, 1)
    cur.splice(to, 0, moved)
    setOrder(cur)
  }

  const onDragEnd = () => {
    if (order && order.map((x) => x.id).join() !== items.map((x) => x.id).join()) onReorder(order)
    setDragId(null)
    setOrder(null)
  }

  return (
    <div className={className}>
      {list.map((item, i) => (
        <div key={item.id} draggable onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; setDragId(item.id) }}
          onDragOver={(e) => onDragOver(e, item.id)} onDragEnd={onDragEnd} onDrop={(e) => e.preventDefault()}
          className={dragId === item.id ? 'opacity-40' : undefined}>
          {renderItem(item, i)}
        </div>
      ))}
    </div>
  )
}

export function move(items, index, delta) {
  const next = [...items]
  const to = index + delta
  if (to < 0 || to >= next.length) return items
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}
