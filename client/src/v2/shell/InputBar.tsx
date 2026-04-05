import { useState } from 'react'
import { Camera, Image, Send, Mic } from 'lucide-react'
import { useSpeechInput } from './useSpeechInput'

interface InputBarProps {
  onSend: (text: string) => void
  onCamera: () => void
  onError?: (msg: string) => void
}

export default function InputBar({ onSend, onCamera, onError }: InputBarProps) {
  const [text, setText] = useState('')
  const { isListening, startListening } = useSpeechInput(
    (t) => onSend(t),
    (msg) => onError?.(msg),
  )

  const handleSend = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  const handleGallery = async () => {
    try {
      const { Camera: CapCamera, CameraResultType, CameraSource } = await import('@capacitor/camera')
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Photos,
      })
      if (photo.base64String) {
        onSend('__PHOTO__' + photo.base64String)
      }
    } catch (e: any) {
      if (e?.message?.includes('User cancelled')) return
      onError?.('Photo library is not available on this device.')
    }
  }

  return (
    <div className="z-50 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 pt-2 flex-shrink-0 w-full max-w-full overflow-x-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}>
      <div className="flex items-center gap-2">
        <button onClick={onCamera} className="p-1.5 text-gray-500 dark:text-gray-400">
          <Camera className="w-5 h-5" />
        </button>
        <button onClick={handleGallery} className="p-1.5 text-gray-500 dark:text-gray-400">
          <Image className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSend() } }}
          placeholder="Ask me anything..."
          className="flex-1 min-w-0 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-4 py-2.5 text-base outline-none"
        />
        <button onClick={handleSend} className="p-2.5 bg-gray-900 dark:bg-white rounded-xl">
          <Send className="w-4 h-4 text-white dark:text-gray-900" />
        </button>
        <button
          onClick={isListening ? undefined : startListening}
          className={`p-2 ${isListening ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
