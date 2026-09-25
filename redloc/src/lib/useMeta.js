import { useQuery } from '@tanstack/react-query'
import { redloc } from './api'

// Справочники для фильтров и форм (города, категории, типы съёмки, удобства) + статистика
export function useMeta() {
  return useQuery({ queryKey: ['meta'], queryFn: redloc.meta, staleTime: 5 * 60_000 })
}
