import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { LuArrowDown, LuArrowUp, LuGripVertical, LuImage } from 'react-icons/lu'
import { redloc, errorText } from '../../lib/api'
import { useLang } from '../../lib/i18n'
import { BadgePill } from '../../components/LocationCard'
import Sortable, { move } from '../../components/Sortable'
import { Spinner } from '../../components/ui'

// Режим сотрудника на главной: порядок карточек перетаскиванием или стрелками (на телефоне)
export default function LocationsOrder({ items, onDone }) {
  const { t, tn } = useLang()
  const qc = useQueryClient()
  const [list, setList] = useState(items)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await redloc.reorderLocations(list.map((l) => l.id))
      await qc.invalidateQueries({ queryKey: ['locations'] })
      toast.success(t('common.saved'))
      onDone()
    } catch (e) {
      toast.error(errorText(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="card space-y-3 p-4">
      <p className="text-xs text-muted">{t('a.orderHint')}</p>
      <Sortable items={list} onReorder={setList} className="space-y-1.5"
        renderItem={(l, i) => (
          <div className="flex cursor-grab items-center gap-3 rounded-xl border border-line bg-white p-2 active:cursor-grabbing">
            <LuGripVertical className="hidden h-4 w-4 shrink-0 text-muted sm:block" />
            <span className="w-6 shrink-0 text-center text-xs font-bold text-muted">{i + 1}</span>
            <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-canvas">
              {l.cover ? <img src={l.cover.thumbnail} alt="" draggable={false} className="h-full w-full object-cover" /> : <LuImage className="h-4 w-4 text-muted" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{l.title}</span>
              {l.city && <span className="text-xs text-muted">{tn(l.city)}</span>}
            </span>
            <BadgePill badge={l.badge} className="hidden sm:inline-flex" />
            <button type="button" className="btn btn-ghost btn-icon h-8 w-8" disabled={i === 0} onClick={() => setList(move(list, i, -1))}>
              <LuArrowUp className="h-4 w-4" />
            </button>
            <button type="button" className="btn btn-ghost btn-icon h-8 w-8" disabled={i === list.length - 1} onClick={() => setList(move(list, i, 1))}>
              <LuArrowDown className="h-4 w-4" />
            </button>
          </div>
        )} />
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary min-w-32" disabled={saving} onClick={save}>
          {saving && <Spinner className="h-4 w-4 text-white" />} {t('common.save')}
        </button>
        <button type="button" className="btn btn-outline" onClick={onDone}>{t('common.cancel')}</button>
      </div>
    </section>
  )
}
