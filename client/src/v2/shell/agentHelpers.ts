import { apiRequest } from '@/lib/queryClient'
import type { QueryClient } from '@tanstack/react-query'

export async function captureRecipeImage(
  source: 'Photos' | 'Camera',
  addUserMessage: (text: string) => void,
  addAgentMessage: (text: string, opts: any) => void,
  handleRecipeFromImage: (base64: string) => Promise<void>,
) {
  try {
    const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
    const photo = await CapCamera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: source === 'Camera' ? CameraSource.Camera : CameraSource.Photos,
    })
    if (photo.base64String) {
      addUserMessage(source === 'Camera' ? 'Snap a receipt' : 'Photo of ingredients')
      await handleRecipeFromImage(photo.base64String)
    }
  } catch (e: any) {
    if (e?.message?.includes('User cancelled')) return
    addAgentMessage('Camera is not available right now.', { isTemplated: true })
  }
}

export async function logHungerLevel(
  level: number,
  tip: string,
  suggestions: string[],
  queryClient: QueryClient,
  addAgentMessage: (text: string, opts: any) => void,
) {
  try {
    await apiRequest('POST', '/api/hunger-logs', { hungerBefore: level, loggedAt: new Date().toISOString() })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['panel-dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['panel-hunger-today'] })
    queryClient.invalidateQueries({ queryKey: ['panel-hunger-week'] })
    queryClient.invalidateQueries({ queryKey: ['panel-hunger-range'] })
    addAgentMessage(`Logged hunger level ${level}/10. ${tip}`, { isTemplated: true, suggestions })
  } catch {
    addAgentMessage('Failed to log appetite. Try again.', { isTemplated: true })
  }
}
