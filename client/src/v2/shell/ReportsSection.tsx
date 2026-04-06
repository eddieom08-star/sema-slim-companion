import { useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { apiRequest } from '@/lib/queryClient'
import { Lock, Sparkles, FileText, Download } from 'lucide-react'

export default function ReportsSection() {
  const { isPro } = useSubscription()
  const [generating, setGenerating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showUpsell, setShowUpsell] = useState(false)

  const handleGenerate = async (period: string, format: string) => {
    setGenerating(format)
    setError(null)
    try {
      const res = await apiRequest('POST', '/api/exports/healthcare-pdf', { reportPeriod: period, format })
      const blob = await res.blob()
      const filename = `glpfriend-report-${new Date().toISOString().split('T')[0]}.pdf`

      const { Capacitor } = await import('@capacitor/core')
      if (Capacitor.isNativePlatform()) {
        const { Filesystem, Directory } = await import('@capacitor/filesystem')
        const { Share } = await import('@capacitor/share')
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1]
          const saved = await Filesystem.writeFile({
            path: filename,
            data: base64,
            directory: Directory.Cache,
          })
          await Share.share({ title: filename, url: saved.uri })
        }
        reader.readAsDataURL(blob)
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = filename; a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      setError('Report generation failed. Try again.')
    }
    setGenerating(null)
  }

  return (
    <div className="px-4 pt-4 pb-20">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Health reports</h2>
      <p className="text-xs text-gray-400 mb-5">Share your progress with your healthcare team</p>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      {/* Pro upsell banner */}
      {showUpsell && !isPro && (
        <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl p-4 mb-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-semibold">Upgrade to Pro</span>
          </div>
          <p className="text-xs text-white/80 mb-3">
            Unlock clinical summaries, 90-day history, data exports, and unlimited AI recipes.
          </p>
          <div className="space-y-2">
            <div className="bg-white/20 rounded-xl px-3 py-2 text-center">
              <p className="text-sm font-bold">£6.67/month</p>
              <p className="text-[10px] text-white/70">billed annually at £80/year</p>
            </div>
            <p className="text-[10px] text-white/60 text-center">
              In-app purchase coming soon. You'll be notified when it's available.
            </p>
          </div>
          <button onClick={() => setShowUpsell(false)} className="w-full text-white/50 text-xs mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Monthly — free */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden mb-4 shadow-md border border-gray-100/80 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Monthly progress</span>
          </div>
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
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Clinical summary</span>
          </div>
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
              onClick={() => setShowUpsell(true)}
              className="w-full bg-purple-600 text-white text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>

      {/* Data export — pro */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-md border border-gray-100/80 dark:border-gray-700">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Data export</span>
          </div>
          <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-medium">Pro</span>
        </div>
        <p className="px-4 text-xs text-gray-400 pb-3">All logged data as CSV for spreadsheets or other health apps.</p>
        <div className="px-4 pb-4">
          {isPro ? (
            <button onClick={() => setError('CSV export coming soon.')} className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm">
              Export CSV
            </button>
          ) : (
            <button
              onClick={() => setShowUpsell(true)}
              className="w-full bg-purple-600 text-white text-xs font-medium py-2.5 rounded-xl shadow-md active:shadow-sm flex items-center justify-center gap-2"
            >
              <Lock className="w-3.5 h-3.5" />
              Upgrade to Pro
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
