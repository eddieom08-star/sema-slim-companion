import { useState } from 'react'
import { Camera, Send, Mic } from 'lucide-react'
import { useSpeechInput } from './useSpeechInput'

interface InputBarProps {
  onSend: (text: string) => void
  onCamera: () => void
}

export default function InputBar({ onSend, onCamera }: InputBarProps) {
  const [text, setText] = useState('')
  const { isListening, startListening } = useSpeechInput((t) => {
    onSend(t)
  })

  const handleSend = () => {
    const t = text.trim()
    if (!t) return
    onSend(t)
    setText('')
  }

  return (
    <div className="sticky bottom-0 z-50 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 flex-shrink-0 w-full max-w-full overflow-x-hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}>
      <div className="flex items-end gap-2">
        <button onClick={onCamera} className="p-2 text-gray-400">
          <Camera className="w-5 h-5" />
        </button>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Ask me anything..."
          rows={1}
          className="flex-1 resize-none bg-gray-100 dark:bg-gray-800 rounded-2xl px-4 py-2.5 text-sm outline-none max-h-24 overflow-y-auto"
          style={{ minHeight: '40px' }}
        />
        {text.trim() ? (
          <button onClick={handleSend} className="p-2.5 bg-gray-900 dark:bg-white rounded-xl">
            <Send className="w-4 h-4 text-white dark:text-gray-900" />
          </button>
        ) : (
          <button
            onClick={isListening ? undefined : startListening}
            className={`p-2.5 rounded-xl ${isListening ? 'bg-red-500' : 'bg-gray-900 dark:bg-white'}`}
          >
            <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-white dark:text-gray-900'}`} />
          </button>
        )}
      </div>
    </div>
  )
}
