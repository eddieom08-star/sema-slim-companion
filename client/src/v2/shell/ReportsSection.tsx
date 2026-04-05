import { useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'

export default function ReportsSection() {
  const { isPro, openCheckout } = useSubscription()
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async (period: string, format: string) => {
    setGenerating(format)
    setError(null)
    try {
      await apiRequest('POST', '/api/exports/healthcare-pdf', { reportPeriod: period, format })
    } catch {
      setError('Report generation failed. Try again.')
    }
    setGenerating(null)
  }

  const handleProAction = async (action: () => Promise<void>) => {
    if (!isPro) {
      try { await openCheckout('annual') } catch { /* handled in SubscriptionContext */ }
      return
    }
    await action()
  }

  return (
    <div className="px-4 pt-4 pb-20">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Health reports</h2>
      <p className="text-xs text-gray-400 mb-5">Share your progress with your healthcare team</p>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {/* Monthly — free */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4 shadow-md border border-gray-100/80 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Monthly progress</span>
          <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">Free</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">Weight, calories, adherence and hunger summary for the last 30 days.</p>
        <div className="px-4 pb-4">
          <button
            onClick={() => handleGenerate('30days', 'standard')}
            disabled={generating === 'standard'}
            className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm disabled:opacity-50"
          >
            {generating === 'standard' ? 'Generating...' : 'Generate PDF'}
          </button>
        </div>
      </div>

      {/* Clinical — pro */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4 shadow-md border border-gray-100/80 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Clinical summary</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Pro</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">90-day report with side effects, dose history, and AI summary — for your prescriber.</p>
        <div className="px-4 pb-4">
          {isPro ? (
            <button
              onClick={() => handleGenerate('90days', 'clinical')}
              disabled={generating === 'clinical'}
              className="w-full bg-purple-600 text-white text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm disabled:opacity-50"
            >
              {generating === 'clinical' ? 'Generating...' : 'Generate PDF'}
            </button>
          ) : (
            <button
              onClick={() => handleProAction(async () => {})}
              className="w-full bg-purple-600 text-white text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Data export — pro */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-100/80 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data export</span>
          <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Pro</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">All logged data as CSV for spreadsheets or other health apps.</p>
        <div className="px-4 pb-4">
          {isPro ? (
            <button className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm">
              Export CSV
            </button>
          ) : (
            <button
              onClick={() => handleProAction(async () => {})}
              className="w-full bg-purple-600 text-white text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
