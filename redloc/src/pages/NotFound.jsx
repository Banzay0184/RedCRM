import { Link } from 'react-router-dom'
import { LuMapPin } from 'react-icons/lu'
import { useLang } from '../lib/i18n'
import { Empty } from '../components/ui'

export default function NotFound() {
  const { t } = useLang()
  return <Empty icon={LuMapPin} title={t('notFound.title')} action={<Link to="/" className="btn btn-primary">{t('notFound.home')}</Link>} />
}
