import { useQuery } from '@tanstack/react-query'
import { redloc } from './api'

// Справочники для фильтров и форм (города, категории) + статистика.
// fresh: формы редактирования всегда берут свежий список — его могли изменить в «Настройках».
export function useMeta({ fresh = false } = {}) {
  return useQuery({
    queryKey: ['meta'], queryFn: redloc.meta, staleTime: 5 * 60_000, ...(fresh ? { refetchOnMount: 'always' } : {}),
  })
}
