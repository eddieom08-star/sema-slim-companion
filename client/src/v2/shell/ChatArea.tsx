import { useEffect, useRef } from 'react'
import { Bot } from 'lucide-react'
import type { Message } from '@/v2/agent/types'

interface ChatAreaProps {
  messages: Message[]
  onSuggestionTap: (text: string) => void
}

export default function ChatArea({ messages, onSuggestionTap }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.role === 'user' ? (
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm">
                {msg.content}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="space-y-2 max-w-[82%]">
                {msg.content && (
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-100">
                    {msg.content}
                  </div>
                )}
                {msg.component && (
                  <div>{msg.component}</div>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => onSuggestionTap(s)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-xs text-gray-700 dark:text-gray-200 active:bg-gray-100"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="space-y-2">
                    {msg.actions.map((a, i) => (
                      <button
                        key={i}
                        onClick={a.onClick}
                        className="flex items-center gap-2 w-full px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-sm font-medium"
                      >
                        {a.icon && <span className="w-4 h-4">{a.icon}</span>}
                        {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
