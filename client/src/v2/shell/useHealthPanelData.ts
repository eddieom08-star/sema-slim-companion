import { useQuery } from '@tanstack/react-query'
import { useHealthPanel } from '@/v2/agent/HealthPanelContext'
import { apiRequest } from '@/lib/queryClient'

export function useHealthPanelData() {
  const { isOpen, trendOpen, trendTab, period } = useHealthPanel()
  const today = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - (period - 1) * 86400000).toISOString().split('T')[0]

  const { data: dashboard } = useQuery({
    queryKey: ['panel-dashboard'], enabled: isOpen,
    queryFn: () => apiRequest('GET', '/api/dashboard').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })
  const { data: foodToday, refetch: refetchFood } = useQuery({
    queryKey: ['panel-food-today', today], enabled: isOpen,
    queryFn: () => apiRequest('GET', `/api/food-entries?date=${today}`).then(r => r.json()),
  })
  const { data: weightLogsResult, refetch: refetchWeight } = useQuery({
    queryKey: ['panel-weight', period], enabled: isOpen,
    queryFn: async () => {
      const r = await apiRequest('GET', `/api/weight-logs?limit=${period + 5}`)
      const truncated = r.headers.get('X-Data-Truncated') === 'true'
      const retentionDays = parseInt(r.headers.get('X-Retention-Days') || '0')
      const data = await r.json()
      return { data, truncated, retentionDays }
    },
  })
  const weightLogs = weightLogsResult?.data
  const isDataTruncated = weightLogsResult?.truncated ?? false
  const retentionDays = weightLogsResult?.retentionDays ?? 0
  const { data: medications } = useQuery({
    queryKey: ['panel-medications'], enabled: isOpen,
    queryFn: () => apiRequest('GET', '/api/medications').then(r => r.json()),
  })
  const { data: hungerToday, refetch: refetchHunger } = useQuery({
    queryKey: ['panel-hunger-today', today], enabled: isOpen,
    queryFn: () => apiRequest('GET', `/api/hunger-logs?date=${today}`).then(r => r.json()),
  })
  const weekStart = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
  const { data: foodWeek } = useQuery({
    queryKey: ['panel-food-week', weekStart], enabled: isOpen,
    queryFn: () => apiRequest('GET', `/api/food-entries?startDate=${weekStart}&endDate=${today}`).then(r => r.json()),
  })
  const { data: hungerWeek } = useQuery({
    queryKey: ['panel-hunger-week'], enabled: isOpen,
    queryFn: () => apiRequest('GET', '/api/hunger-logs?days=7').then(r => r.json()),
  })
  const { data: foodRange } = useQuery({
    queryKey: ['panel-food-range', period, today], enabled: isOpen && trendOpen,
    queryFn: () => apiRequest('GET', `/api/food-entries?startDate=${startDate}&endDate=${today}`).then(r => r.json()),
  })
  const { data: hungerLogs } = useQuery({
    queryKey: ['panel-hunger-range', period], enabled: isOpen && trendOpen && trendTab === 'appetite',
    queryFn: () => apiRequest('GET', `/api/hunger-logs?days=${period}`).then(r => r.json()),
  })
  const { data: medLogs } = useQuery({
    queryKey: ['panel-medlogs', period], enabled: isOpen && trendOpen && trendTab === 'adherence',
    queryFn: () => apiRequest('GET', '/api/medication-logs?limit=60').then(r => r.json()),
  })
  const { data: medLogsWeek } = useQuery({
    queryKey: ['panel-medlogs-week'], enabled: isOpen,
    queryFn: () => apiRequest('GET', '/api/medication-logs?limit=60').then(r => r.json()),
  })

  return {
    dashboard, foodToday, foodWeek, weightLogs, medications,
    hungerToday, hungerWeek, foodRange, hungerLogs, medLogs, medLogsWeek,
    refetchFood, refetchWeight, refetchHunger,
    isDataTruncated, retentionDays,
  }
}
