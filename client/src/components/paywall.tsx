import { useState } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { SUBSCRIPTION_PRODUCTS, TOKEN_PRODUCTS } from '../../../shared/features';

interface PaywallProps {
  reason: string;
  upsellType: string;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

/**
 * Paywall component displayed when users hit feature limits
 * Shows upgrade options based on the upsell type
 */
export function Paywall({ reason, upsellType, onClose, onPurchaseComplete }: PaywallProps) {
  const { openCheckout, purchaseTokens, isPro } = useSubscription();
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgradeToPro = async (plan: 'monthly' | 'annual') => {
    setIsLoading(true);
    try {
      await openCheckout(plan);
    } catch (error) {
      console.error('Checkout failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseTokens = async (productId: string) => {
    setIsLoading(true);
    try {
      await purchaseTokens(productId);
      onPurchaseComplete?.();
    } catch (error) {
      console.error('Token purchase failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (reason) {
      case 'ai_meal_plan_limit_reached':
        return 'Meal Plan Limit Reached';
      case 'ai_recipe_limit_reached':
        return 'Recipe Limit Reached';
      case 'barcode_scan_limit_reached':
        return 'Scan Limit Reached';
      case 'no_export_tokens':
        return 'Export Tokens Required';
      case 'no_streak_shields':
        return 'Streak Shields Required';
      default:
        return 'Upgrade Required';
    }
  };

  const getMessage = () => {
    switch (reason) {
      case 'ai_meal_plan_limit_reached':
        return "You've used all your monthly AI meal plans. Upgrade for more!";
      case 'ai_recipe_limit_reached':
        return "You've used all your monthly AI recipe generations. Upgrade for more!";
      case 'barcode_scan_limit_reached':
        return "You've reached today's barcode scan limit. Go Pro for unlimited scans!";
      case 'no_export_tokens':
        return 'Export your health data to PDF for easy sharing with healthcare providers.';
      case 'no_streak_shields':
        return 'Protect your streak with streak shields.';
      default:
        return 'Unlock this feature by upgrading your account.';
    }
  };

  const showProOption = upsellType === 'pro' || upsellType === 'pro_or_tokens' || upsellType === 'pro_or_export_tokens';
  const showTokenOption = upsellType === 'tokens' || upsellType === 'pro_or_tokens';
  const showExportTokenOption = upsellType === 'export_tokens' || upsellType === 'pro_or_export_tokens';
  const showShieldOption = reason === 'no_streak_shields';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{getTitle()}</h2>
              <p className="text-gray-600 mt-1">{getMessage()}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 space-y-4">
          {/* Pro Subscription Option */}
          {showProOption && !isPro && (
            <div className="border-2 border-emerald-500 rounded-xl p-4 bg-emerald-50">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded">
                  BEST VALUE
                </span>
                <span className="text-emerald-600 font-semibold">Save 40%</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900">SemaSlim Pro</h3>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited barcode scans
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  30 AI meal plans/month
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full history access
                </li>
              </ul>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handleUpgradeToPro('annual')}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : `$${SUBSCRIPTION_PRODUCTS.annual.price}/year`}
                </button>
                <button
                  onClick={() => handleUpgradeToPro('monthly')}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-white border border-emerald-600 text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 disabled:opacity-50"
                >
                  {isLoading ? 'Loading...' : `$${SUBSCRIPTION_PRODUCTS.monthly.price}/mo`}
                </button>
              </div>
            </div>
          )}

          {/* AI Tokens Option */}
          {showTokenOption && (
            <div className="border rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-900">AI Token Pack</h3>
              <p className="text-sm text-gray-600 mt-1">
                Get more AI generations without a subscription
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePurchaseTokens('ai_tokens_10')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 rounded-lg text-center hover:bg-gray-200 disabled:opacity-50"
                >
                  <div className="font-semibold">10 tokens</div>
                  <div className="text-sm text-gray-600">${TOKEN_PRODUCTS.ai_tokens_10.price}</div>
                </button>
                <button
                  onClick={() => handlePurchaseTokens('ai_tokens_25')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 rounded-lg text-center hover:bg-gray-200 disabled:opacity-50"
                >
                  <div className="font-semibold">25 tokens</div>
                  <div className="text-sm text-gray-600">${TOKEN_PRODUCTS.ai_tokens_25.price}</div>
                </button>
              </div>
            </div>
          )}

          {/* Export Tokens Option */}
          {showExportTokenOption && (
            <div className="border rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-900">Export Tokens</h3>
              <p className="text-sm text-gray-600 mt-1">
                Export your health data to PDF
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePurchaseTokens('export_tokens_5')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 rounded-lg text-center hover:bg-gray-200 disabled:opacity-50"
                >
                  <div className="font-semibold">5 exports</div>
                  <div className="text-sm text-gray-600">${TOKEN_PRODUCTS.export_tokens_5.price}</div>
                </button>
                <button
                  onClick={() => handlePurchaseTokens('export_tokens_10')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 rounded-lg text-center hover:bg-gray-200 disabled:opacity-50"
                >
                  <div className="font-semibold">10 exports</div>
                  <div className="text-sm text-gray-600">${TOKEN_PRODUCTS.export_tokens_10.price}</div>
                </button>
              </div>
            </div>
          )}

          {/* Streak Shields Option */}
          {showShieldOption && (
            <div className="border rounded-xl p-4">
              <h3 className="text-lg font-bold text-gray-900">Streak Shields</h3>
              <p className="text-sm text-gray-600 mt-1">
                Protect your streak when life gets busy
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handlePurchaseTokens('streak_shields_3')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 rounded-lg text-center hover:bg-gray-200 disabled:opacity-50"
                >
                  <div className="font-semibold">3 shields</div>
                  <div className="text-sm text-gray-600">${TOKEN_PRODUCTS.streak_shields_3.price}</div>
                </button>
                <button
                  onClick={() => handlePurchaseTokens('streak_shields_10')}
                  disabled={isLoading}
                  className="py-2 px-3 bg-gray-100 rounded-lg text-center hover:bg-gray-200 disabled:opacity-50"
                >
                  <div className="font-semibold">10 shields</div>
                  <div className="text-sm text-gray-600">${TOKEN_PRODUCTS.streak_shields_10.price}</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-center">
          <button
            onClick={onClose}
            className="text-gray-500 text-sm hover:text-gray-700"
            disabled={isLoading}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage paywall state
 */
export function usePaywall() {
  const [paywallState, setPaywallState] = useState<{
    isOpen: boolean;
    reason: string;
    upsellType: string;
  }>({
    isOpen: false,
    reason: '',
    upsellType: '',
  });

  const showPaywall = (reason: string, upsellType: string) => {
    setPaywallState({ isOpen: true, reason, upsellType });
  };

  const hidePaywall = () => {
    setPaywallState({ isOpen: false, reason: '', upsellType: '' });
  };

  return {
    ...paywallState,
    showPaywall,
    hidePaywall,
  };
}
