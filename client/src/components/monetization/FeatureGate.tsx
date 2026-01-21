import { useState, type ReactNode } from 'react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { ProUpsellModal } from './ProUpsellModal';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showLockIcon?: boolean;
  onUpsell?: () => void;
}

/**
 * FeatureGate component for gating premium features
 * Wraps content and shows upsell when feature is not available
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showLockIcon = true,
  onUpsell,
}: FeatureGateProps) {
  const { canUseFeature, isPro, getRemainingUsage } = useSubscription();
  const [showUpsell, setShowUpsell] = useState(false);

  const canUse = canUseFeature(feature);
  const remaining = getRemainingUsage(feature);

  const handleClick = () => {
    if (onUpsell) {
      onUpsell();
    } else {
      setShowUpsell(true);
    }
  };

  // If user can use the feature, show the content
  if (canUse) {
    return <>{children}</>;
  }

  // If fallback is provided, show it
  if (fallback) {
    return (
      <>
        {fallback}
        <ProUpsellModal
          isOpen={showUpsell}
          onClose={() => setShowUpsell(false)}
          trigger={{
            type: feature as any,
            context: { remaining },
          }}
        />
      </>
    );
  }

  // Default locked state UI
  return (
    <>
      <div
        className="relative cursor-pointer group"
        onClick={handleClick}
      >
        <div className="opacity-50 pointer-events-none filter blur-[1px]">
          {children}
        </div>
        {showLockIcon && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <div className="p-2 rounded-full bg-yellow-500/10">
                <Crown className="h-6 w-6 text-yellow-500" />
              </div>
              <p className="text-sm font-medium">Pro Feature</p>
              <Button size="sm" variant="outline" className="gap-1">
                <Lock className="h-3 w-3" />
                Unlock
              </Button>
            </div>
          </div>
        )}
      </div>
      <ProUpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        trigger={{
          type: feature as any,
          context: { remaining },
        }}
      />
    </>
  );
}

/**
 * UsageBadge - Shows remaining usage for a feature
 */
interface UsageBadgeProps {
  feature: string;
  showWhenUnlimited?: boolean;
}

export function UsageBadge({ feature, showWhenUnlimited = false }: UsageBadgeProps) {
  const { getRemainingUsage, isPro } = useSubscription();
  const remaining = getRemainingUsage(feature);

  // Don't show for unlimited
  if (remaining === -1 && !showWhenUnlimited) {
    return null;
  }

  const isLow = remaining !== -1 && remaining <= 1;
  const isUnlimited = remaining === -1;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        isUnlimited
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : isLow
          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
      }`}
    >
      {isUnlimited ? (
        <>
          <Crown className="h-3 w-3 mr-1" />
          Unlimited
        </>
      ) : (
        `${remaining} left`
      )}
    </span>
  );
}

/**
 * ProBadge - Shows when user is on Pro plan
 */
export function ProBadge() {
  const { isPro, isTrialing, subscription } = useSubscription();

  if (!isPro) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
      <Crown className="h-3 w-3" />
      {isTrialing ? 'Pro Trial' : 'Pro'}
    </span>
  );
}

/**
 * UpgradeButton - Button to trigger upgrade flow
 */
interface UpgradeButtonProps {
  plan?: 'monthly' | 'annual';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  children?: ReactNode;
}

export function UpgradeButton({
  plan = 'annual',
  variant = 'default',
  size = 'default',
  children,
}: UpgradeButtonProps) {
  const { openCheckout, isPro, isLoading } = useSubscription();
  const [showUpsell, setShowUpsell] = useState(false);

  if (isPro) return null;

  const handleClick = () => {
    if (children) {
      // If custom children, show modal
      setShowUpsell(true);
    } else {
      // Direct checkout
      openCheckout(plan);
    }
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={isLoading}
        variant={variant}
        size={size}
        className={variant === 'default' ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' : ''}
      >
        {children || (
          <>
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Pro
          </>
        )}
      </Button>
      <ProUpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
        trigger={{ type: 'general' }}
      />
    </>
  );
}
