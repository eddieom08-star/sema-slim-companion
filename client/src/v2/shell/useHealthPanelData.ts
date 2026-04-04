import { useQuery } from '@tanstack/react-query'
import { useHealthPanel } from '@/v2/agent/HealthPanelContext'

export function useHealthPanelData() {
  const { isOpen, trendOpen, trendTab, period } = useHealthPanel()
  const today = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - (period - 1) * 86400000).toISOString().split('T')[0]

  const { data: dashboard } = useQuery({
    queryKey: ['panel-dashboard'], enabled: isOpen,
    queryFn: () => fetch('/api/dashboard', { credentials: 'include' }).then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })
  const { data: foodToday, refetch: refetchFood } = useQuery({
    queryKey: ['panel-food-today', today], enabled: isOpen,
    queryFn: () => fetch(`/api/food-entries?date=${today}`, { credentials: 'include' }).then(r => r.json()),
  })
  const { data: weightLogs, refetch: refetchWeight } = useQuery({
    queryKey: ['panel-weight', period], enabled: isOpen,
    queryFn: () => fetch(`/api/weight-logs?limit=${period + 5}`, { credentials: 'include' }).then(r => r.json()),
  })
  const { data: medications } = useQuery({
    queryKey: ['panel-medications'], enabled: isOpen,
    queryFn: () => fetch('/api/medications', { credentials: 'include' }).then(r => r.json()),
  })
  const { data: hungerToday, refetch: refetchHunger } = useQuery({
    queryKey: ['panel-hunger-today', today], enabled: isOpen,
    queryFn: () => fetch(`/api/hunger-logs?date=${today}`, { credentials: 'include' }).then(r => r.json()),
  })
  const { data: foodRange } = useQuery({
    queryKey: ['panel-food-range', period, today], enabled: isOpen && trendOpen,
    queryFn: () => fetch(`/api/food-entries?startDate=${startDate}&endDate=${today}`, { credentials: 'include' }).then(r => r.json()),
  })
  const { data: hungerLogs } = useQuery({
    queryKey: ['panel-hunger-range', period], enabled: isOpen && trendOpen && trendTab === 'appetite',
    queryFn: () => fetch(`/api/hunger-logs?days=${period}`, { credentials: 'include' }).then(r => r.json()),
  })
  const { data: medLogs } = useQuery({
    queryKey: ['panel-medlogs', period], enabled: isOpen && trendOpen && trendTab === 'adherence',
    queryFn: () => fetch('/api/medication-logs?limit=60', { credentials: 'include' }).then(r => r.json()),
  })

  return {
    dashboard, foodToday, weightLogs, medications,
    hungerToday, foodRange, hungerLogs, medLogs,
    refetchFood, refetchWeight, refetchHunger,
  }
}
