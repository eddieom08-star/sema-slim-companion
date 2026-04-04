import { useEffect, useRef } from 'react'
import { Bot, Utensils, Pill, Scale, ChefHat } from 'lucide-react'
import type { Message } from '@/v2/agent/types'

const DEFAULT_QUICK_ACTIONS = [
  { label: 'Log food', icon: Utensils },
  { label: 'Log my dose', icon: Pill },
  { label: 'Log my weight', icon: Scale },
  { label: 'Need a recipe', icon: ChefHat },
]

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface ChatAreaProps {
  messages: Message[]
  onSuggestionTap: (text: string) => void
}

export default function ChatArea({ messages, onSuggestionTap }: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const isEmpty = messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4 w-full max-w-full">
      {isEmpty && (
        <div className="flex flex-col items-center justify-center h-full px-2">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4">
            <Bot className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {getGreeting()}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6 max-w-[260px]">
            Your GLP-1 companion is ready. What would you like to do?
          </p>
          <div className="w-full space-y-2">
            {DEFAULT_QUICK_ACTIONS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => onSuggestionTap(label)}
                className="flex items-center gap-3 w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700 transition-colors"
              >
                <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
          <div className="mt-6 w-full">
            <div className="flex gap-2 justify-center flex-wrap">
              {['How am I doing?', 'My progress today', 'My saved recipes'].map(chip => (
                <button
                  key={chip}
                  onClick={() => onSuggestionTap(chip)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap active:bg-gray-100 dark:active:bg-gray-600 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.role === 'user' ? (
            <div className="flex justify-end">
              <div className="bg-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] text-sm overflow-hidden break-words">
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
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-100 overflow-hidden break-words">
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
