import React, { createContext, useContext, useEffect, useState, useCallback, type PropsWithChildren } from 'react';
import { useAuth } from '@clerk/clerk-react';
import type { UserEntitlements } from '../../../shared/features';

interface Subscription {
  tier: 'free' | 'pro';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  billingPeriod: 'monthly' | 'annual' | null;
  currentPeriodEnd: string | null;
  trialEndDate: string | null;
  cancelAtPeriodEnd: boolean;
}

interface TokenBalance {
  aiTokens: number;
  exportTokens: number;
  streakShields: number;
  monthlyUsage: {
    aiMealPlans: number;
    aiRecipes: number;
    pdfExports: number;
  };
  monthlyLimits: {
    aiMealPlans: number;
    aiRecipes: number;
    pdfExports: number;
  };
}

interface SubscriptionContextValue {
  subscription: Subscription | null;
  entitlements: UserEntitlements | null;
  tokenBalance: TokenBalance | null;
  isLoading: boolean;
  error: string | null;

  // Helpers
  isPro: boolean;
  isTrialing: boolean;
  canUseFeature: (feature: string) => boolean;
  getRemainingUsage: (feature: string) => number;

  // Actions
  refreshSubscription: () => Promise<void>;
  refreshTokenBalance: () => Promise<void>;
  openCheckout: (plan: 'monthly' | 'annual') => Promise<void>;
  openBillingPortal: () => Promise<void>;
  purchaseTokens: (productId: string) => Promise<void>;
  checkFeature: (feature: string, quantity?: number) => Promise<{
    allowed: boolean;
    reason?: string;
    upsellType?: string;
    remaining?: number;
  }>;
  consumeFeature: (feature: string, quantity?: number, useTokens?: boolean) => Promise<{
    success: boolean;
    tokensUsed: boolean;
    newBalance?: number;
  }>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: PropsWithChildren) {
  const { getToken, isSignedIn } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    return response;
  }, [getToken]);

  const refreshSubscription = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await fetchWithAuth('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setEntitlements(data.entitlements);
        setError(null);
      } else {
        throw new Error('Failed to fetch subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [isSignedIn, fetchWithAuth]);

  const refreshTokenBalance = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await fetchWithAuth('/api/tokens/balance');
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data);
      }
    } catch (err) {
      console.error('Failed to fetch token balance:', err);
    }
  }, [isSignedIn, fetchWithAuth]);

  const openCheckout = useCallback(async (plan: 'monthly' | 'annual') => {
    try {
      const response = await fetchWithAuth('/api/subscription/checkout', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=cancelled`,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchWithAuth]);

  const openBillingPortal = useCallback(async () => {
    try {
      const response = await fetchWithAuth('/api/subscription/portal', {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/profile`,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create billing portal session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchWithAuth]);

  const purchaseTokens = useCallback(async (productId: string) => {
    try {
      const response = await fetchWithAuth('/api/tokens/purchase', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          successUrl: `${window.location.origin}/dashboard?purchase=success`,
          cancelUrl: `${window.location.origin}/dashboard?purchase=cancelled`,
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Failed to create purchase session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      throw err;
    }
  }, [fetchWithAuth]);

  const checkFeature = useCallback(async (feature: string, quantity: number = 1) => {
    try {
      const response = await fetchWithAuth('/api/features/check', {
        method: 'POST',
        body: JSON.stringify({ feature, quantity }),
      });

      return await response.json();
    } catch (err) {
      return { allowed: false, reason: 'error' };
    }
  }, [fetchWithAuth]);

  const consumeFeature = useCallback(async (
    feature: string,
    quantity: number = 1,
    useTokens: boolean = false
  ) => {
    try {
      const response = await fetchWithAuth('/api/features/consume', {
        method: 'POST',
        body: JSON.stringify({ feature, quantity, useTokens }),
      });

      const result = await response.json();

      if (response.ok) {
        // Refresh token balance after consumption
        await refreshTokenBalance();
      }

      return result;
    } catch (err) {
      return { success: false, tokensUsed: false };
    }
  }, [fetchWithAuth, refreshTokenBalance]);

  // Computed helpers
  const isPro = subscription?.tier === 'pro' &&
    ['active', 'trialing'].includes(subscription?.status || '');

  const isTrialing = subscription?.status === 'trialing';

  const canUseFeature = useCallback((feature: string): boolean => {
    if (!entitlements) return false;

    switch (feature) {
      case 'barcode_scan':
        return entitlements.barcodeScansPerDay === -1 ||
          entitlements.barcodeScansToday < entitlements.barcodeScansPerDay;
      case 'ai_meal_plan':
        return entitlements.aiMealPlansUsed < entitlements.aiMealPlansPerMonth ||
          entitlements.aiTokens > 0;
      case 'ai_recipe':
        return entitlements.aiRecipeSuggestionsUsed < entitlements.aiRecipeSuggestionsPerMonth ||
          entitlements.aiTokens > 0;
      case 'pdf_export':
        return (isPro && entitlements.pdfExportsUsed < entitlements.pdfExportsIncluded) ||
          entitlements.exportTokens > 0;
      case 'history':
        return entitlements.historyRetentionDays === -1;
      default:
        return true;
    }
  }, [entitlements, isPro]);

  const getRemainingUsage = useCallback((feature: string): number => {
    if (!entitlements) return 0;

    switch (feature) {
      case 'barcode_scan':
        if (entitlements.barcodeScansPerDay === -1) return -1;
        return Math.max(0, entitlements.barcodeScansPerDay - entitlements.barcodeScansToday);
      case 'ai_meal_plan':
        const aiRemaining = entitlements.aiMealPlansPerMonth - entitlements.aiMealPlansUsed;
        return Math.max(0, aiRemaining) + entitlements.aiTokens;
      case 'ai_recipe':
        const recipeRemaining = entitlements.aiRecipeSuggestionsPerMonth - entitlements.aiRecipeSuggestionsUsed;
        return Math.max(0, recipeRemaining) + entitlements.aiTokens;
      case 'pdf_export':
        if (isPro) {
          return entitlements.pdfExportsIncluded - entitlements.pdfExportsUsed + entitlements.exportTokens;
        }
        return entitlements.exportTokens;
      case 'streak_shields':
        return entitlements.streakShields + (isPro ? entitlements.monthlyStreakShields : 0);
      default:
        return -1;
    }
  }, [entitlements, isPro]);

  // Initial load
  useEffect(() => {
    if (isSignedIn) {
      setIsLoading(true);
      Promise.all([refreshSubscription(), refreshTokenBalance()])
        .finally(() => setIsLoading(false));
    } else {
      setSubscription(null);
      setEntitlements(null);
      setTokenBalance(null);
      setIsLoading(false);
    }
  }, [isSignedIn, refreshSubscription, refreshTokenBalance]);

  // Handle URL params for checkout/purchase success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    const purchaseStatus = urlParams.get('purchase');

    if (subscriptionStatus === 'success' || purchaseStatus === 'success') {
      // Refresh data after successful checkout
      refreshSubscription();
      refreshTokenBalance();

      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('subscription');
      url.searchParams.delete('purchase');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [refreshSubscription, refreshTokenBalance]);

  const value: SubscriptionContextValue = {
    subscription,
    entitlements,
    tokenBalance,
    isLoading,
    error,
    isPro,
    isTrialing,
    canUseFeature,
    getRemainingUsage,
    refreshSubscription,
    refreshTokenBalance,
    openCheckout,
    openBillingPortal,
    purchaseTokens,
    checkFeature,
    consumeFeature,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Hook for feature gating
export function useFeatureGate(feature: string) {
  const { canUseFeature, getRemainingUsage, isPro, checkFeature, consumeFeature } = useSubscription();

  return {
    canUse: canUseFeature(feature),
    remaining: getRemainingUsage(feature),
    isPro,
    check: (quantity?: number) => checkFeature(feature, quantity),
    consume: (quantity?: number, useTokens?: boolean) => consumeFeature(feature, quantity, useTokens),
  };
}
