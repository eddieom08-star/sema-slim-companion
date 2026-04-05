import { useEffect, useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useUpsellTracker } from './useUpsellTracker'

type TriggerType =
  | 'recipe_limit' | 'history_limit' | 'satiety_intel'
  | 'receipt_scan' | 'barcode_limit' | 'streak_shields'
  | 'pdf_export' | 'appetite_trends'

interface ProMomentCardProps {
  trigger: TriggerType
  onUpgrade: (plan: 'monthly' | 'annual') => void
  onBuyTokens?: (productId: string) => void
  onDismiss: () => void
}

const CONFIG: Record<TriggerType, { headline: string; sub: string; hasTokenPath: boolean }> = {
  recipe_limit:   { headline: 'Unlimited recipes', sub: 'You\'ve used your free recipe generations this month.', hasTokenPath: true },
  history_limit:  { headline: '90-day history', sub: 'Unlock your full weight and calorie history.', hasTokenPath: false },
  satiety_intel:  { headline: 'Appetite intelligence', sub: 'See how your hunger changes around dose days.', hasTokenPath: false },
  receipt_scan:   { headline: 'Receipt scanning', sub: 'Scan a grocery receipt to get instant recipes.', hasTokenPath: false },
  barcode_limit:  { headline: 'Unlimited scans', sub: 'You\'ve hit today\'s barcode scan limit.', hasTokenPath: false },
  streak_shields: { headline: 'Streak shields', sub: 'Protect your streak on off-days.', hasTokenPath: true },
  pdf_export:     { headline: 'PDF health reports', sub: 'Generate a report to share with your prescriber.', hasTokenPath: true },
  appetite_trends:{ headline: 'Appetite insights', sub: 'Discover your hunger patterns over 30 days.', hasTokenPath: false },
}

export default function ProMomentCard({ trigger, onUpgrade, onBuyTokens, onDismiss }: ProMomentCardProps) {
  const config = CONFIG[trigger]
  const { track } = useUpsellTracker()
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    track(trigger, 'pro_subscription', 'shown')
  }, [trigger])

  const handleUpgrade = async (plan: 'monthly' | 'annual') => {
    track(trigger, 'pro_subscription', 'clicked')
    setStatus('loading')
    try {
      await onUpgrade(plan)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  const handleDismiss = () => {
    track(trigger, 'pro_subscription', 'dismissed')
    onDismiss()
  }

  return (
    <div className="bg-white rounded-2xl border border-purple-200/80 overflow-hidden w-full shadow-lg">
      <div className="bg-purple-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-purple-900">{config.headline}</p>
        <p className="text-xs text-purple-600 mt-0.5">{config.sub}</p>
      </div>

      <div className="px-4 py-2 flex items-baseline gap-2">
        <span className="text-xl font-bold text-gray-900">£6.67</span>
        <span className="text-xs text-gray-400">/month</span>
        <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 ml-auto">Annual plan</span>
      </div>

      <div className="px-4 pb-4 space-y-2">
        {status === 'error' && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 text-center">
            In-app purchases are being set up. Try again later.
          </p>
        )}
        <button
          onClick={() => handleUpgrade('annual')}
          disabled={status === 'loading'}
          className="w-full bg-purple-600 text-white text-sm font-medium py-2.5 rounded-xl shadow-md hover:shadow-lg active:shadow-sm transition-shadow duration-200 disabled:opacity-50"
        >
          {status === 'loading' ? 'Processing...' : 'Unlock Pro — £80/year'}
        </button>
        <button
          onClick={() => handleUpgrade('monthly')}
          disabled={status === 'loading'}
          className="w-full border border-gray-200 text-gray-600 text-xs py-2 rounded-xl disabled:opacity-50"
        >
          Monthly — £9.99/month
        </button>
        {config.hasTokenPath && onBuyTokens && (
          <button
            onClick={() => onBuyTokens('ai_tokens_10')}
            className="w-full border border-gray-200 text-gray-500 text-xs py-2 rounded-xl"
          >
            Buy tokens instead
          </button>
        )}
        <button onClick={handleDismiss} className="w-full text-gray-400 text-xs py-1">
          Not now
        </button>
      </div>
    </div>
  )
}
