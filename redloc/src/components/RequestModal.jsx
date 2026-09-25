import { useState } from 'react'
import toast from 'react-hot-toast'
import { redloc, errorText } from '../lib/api'
import { useLang } from '../lib/i18n'
import { useMeta } from '../lib/useMeta'
import { Field, Modal, Spinner } from './ui'

export default function RequestModal({ open, onClose, location }) {
  const { t, tn } = useLang()
  const { data: meta } = useMeta()
  const [form, setForm] = useState({ name: '', phone: '+998 ', shoot_type: '', shooting_date: '', message: '' })
  const [sending, setSending] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSending(true)
    try {
      await redloc.createRequest({
        ...form,
        location: location?.id ?? null,
        shoot_type: form.shoot_type || null,
        shooting_date: form.shooting_date || null,
      })
      toast.success(t('req.sent'))
      setForm({ name: '', phone: '+998 ', shoot_type: '', shooting_date: '', message: '' })
      onClose()
    } catch (err) {
      toast.error(errorText(err))
    } finally {
      setSending(false)
    }
  }

  const types = location?.shoot_types?.length ? location.shoot_types : meta?.shoot_types || []
  return (
    <Modal open={open} onClose={onClose} title={`${t('req.title')}${location ? ` — ${location.title}` : ''}`}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('req.name')} required>
            <input className="input" required maxLength={120} value={form.name} onChange={set('name')} />
          </Field>
          <Field label={t('req.phone')} required>
            <input className="input" required type="tel" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label={t('req.type')}>
            <select className="input" value={form.shoot_type} onChange={set('shoot_type')}>
              <option value="">{t('req.choose')}</option>
              {types.map((s) => <option key={s.id} value={s.id}>{tn(s)}</option>)}
            </select>
          </Field>
          <Field label={t('req.date')}>
            <input className="input" type="date" value={form.shooting_date} onChange={set('shooting_date')}
              min={new Date().toISOString().slice(0, 10)} />
          </Field>
        </div>
        <Field label={t('req.message')}>
          <textarea className="input" rows={3} value={form.message} onChange={set('message')} />
        </Field>
        <button className="btn btn-primary w-full" disabled={sending}>
          {sending && <Spinner className="h-4 w-4" />} {t('req.send')}
        </button>
      </form>
    </Modal>
  )
}
