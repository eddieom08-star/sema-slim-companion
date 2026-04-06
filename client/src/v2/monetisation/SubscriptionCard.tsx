import { useState } from 'react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { Crown, CreditCard, Zap, Shield, FileText, X } from 'lucide-react'

export default function SubscriptionCard() {
  const {
    subscription, tokenBalance, isPro, isTrialing,
    openCheckout, openBillingPortal, purchaseTokens,
    cancelSubscription, reactivateSubscription,
  } = useSubscription()
  const [action, setAction] = useState<'idle' | 'cancelling' | 'reactivating' | 'loading'>('idle')
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const periodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : null

  const handleCancel = async () => {
    setAction('cancelling')
    setError(null)
    const result = await cancelSubscription()
    if (result.success) {
      setShowConfirm(false)
    } else {
      setError('Failed to cancel. Try again or use Manage Billing.')
    }
    setAction('idle')
  }

  const handleReactivate = async () => {
    setAction('reactivating')
    setError(null)
    const result = await reactivateSubscription()
    if (!result.success) {
      setError('Failed to reactivate. Try again or use Manage Billing.')
    }
    setAction('idle')
  }

  return (
    <div className="space-y-4 overflow-hidden max-w-full">
      {/* Plan badge */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
          isPro
            ? 'bg-purple-100 text-purple-700'
            : isTrialing
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isPro && <Crown className="w-3.5 h-3.5" />}
          {isPro ? 'Pro' : isTrialing ? 'Pro Trial' : 'Free'}
        </div>
        {subscription?.billingPeriod && (
          <span className="text-xs text-muted-foreground capitalize">{subscription.billingPeriod}</span>
        )}
        {subscription?.cancelAtPeriodEnd && (
          <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Cancels {periodEnd}</span>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Token balances */}
      {tokenBalance && (isPro || tokenBalance.aiTokens > 0 || tokenBalance.exportTokens > 0 || tokenBalance.streakShields > 0) && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Zap className="w-3 h-3 text-blue-500" />
              <span className="text-lg font-bold text-gray-900">{tokenBalance.aiTokens}</span>
            </div>
            <p className="text-[10px] text-gray-500">AI tokens</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <FileText className="w-3 h-3 text-purple-500" />
              <span className="text-lg font-bold text-gray-900">{tokenBalance.exportTokens}</span>
            </div>
            <p className="text-[10px] text-gray-500">Exports</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span className="text-lg font-bold text-gray-900">{tokenBalance.streakShields}</span>
            </div>
            <p className="text-[10px] text-gray-500">Shields</p>
          </div>
        </div>
      )}

      {/* Monthly usage (Pro users) */}
      {isPro && tokenBalance && (
        <div className="text-xs text-gray-500 space-y-1">
          <p>Meal plans: {tokenBalance.monthlyUsage.aiMealPlans}/{tokenBalance.monthlyLimits.aiMealPlans} used</p>
          <p>Recipes: {tokenBalance.monthlyUsage.aiRecipes}/{tokenBalance.monthlyLimits.aiRecipes} used</p>
          <p>Exports: {tokenBalance.monthlyUsage.pdfExports}/{tokenBalance.monthlyLimits.pdfExports} used</p>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {!isPro && !isTrialing && (
          <button
            onClick={() => openCheckout('annual')}
            className="w-full bg-purple-600 text-white text-sm font-medium py-2.5 rounded-xl shadow-md active:shadow-sm"
          >
            Upgrade to Pro — Save 33%
          </button>
        )}

        {isPro && !subscription?.cancelAtPeriodEnd && (
          <>
            <button
              onClick={() => openBillingPortal()}
              className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-xl"
            >
              <CreditCard className="w-4 h-4" />
              Manage Billing
            </button>
            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full text-gray-400 text-xs py-1"
              >
                Cancel subscription
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2">
                <p className="text-xs text-red-700">
                  Your Pro features will remain active until {periodEnd}. After that you'll switch to Free.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={action === 'cancelling'}
                    className="flex-1 bg-red-600 text-white text-xs font-medium py-2 rounded-lg disabled:opacity-50"
                  >
                    {action === 'cancelling' ? 'Cancelling...' : 'Confirm cancel'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="px-3 border border-gray-200 text-gray-600 text-xs rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {isPro && subscription?.cancelAtPeriodEnd && (
          <button
            onClick={handleReactivate}
            disabled={action === 'reactivating'}
            className="w-full bg-emerald-600 text-white text-sm font-medium py-2.5 rounded-xl shadow-md active:shadow-sm disabled:opacity-50"
          >
            {action === 'reactivating' ? 'Reactivating...' : 'Reactivate Subscription'}
          </button>
        )}

        {isTrialing && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs text-amber-700 font-medium">
              Trial ends {periodEnd}. Upgrade to keep Pro features.
            </p>
            <button
              onClick={() => openCheckout('annual')}
              className="mt-2 w-full bg-purple-600 text-white text-xs font-medium py-2 rounded-lg"
            >
              Upgrade now
            </button>
          </div>
        )}
      </div>

      {/* Buy tokens (all users) */}
      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Top up tokens</p>
        <div className="flex gap-2">
          <button onClick={() => purchaseTokens('ai_tokens_5')} className="flex-1 border border-gray-200 text-xs text-gray-600 py-2 rounded-lg hover:bg-gray-50">
            5 AI
          </button>
          <button onClick={() => purchaseTokens('export_single')} className="flex-1 border border-gray-200 text-xs text-gray-600 py-2 rounded-lg hover:bg-gray-50">
            1 Export
          </button>
          <button onClick={() => purchaseTokens('streak_shields_3')} className="flex-1 border border-gray-200 text-xs text-gray-600 py-2 rounded-lg hover:bg-gray-50">
            3 Shields
          </button>
        </div>
      </div>
    </div>
  )
}
