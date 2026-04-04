import { useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getApiBaseUrl } from '@/lib/queryClient'

const API_BASE = getApiBaseUrl()

export function useUpsellTracker() {
  const { getToken } = useAuth()

  const track = useCallback(async (
    trigger: string,
    upsellType: string,
    action: 'shown' | 'clicked' | 'dismissed' | 'converted'
  ) => {
    try {
      const token = await getToken()
      await fetch(`${API_BASE}/api/upsells/event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ triggerType: trigger, upsellType, placement: 'inline_chat', action }),
      })
    } catch { /* non-critical */ }
  }, [getToken])

  return { track }
}
