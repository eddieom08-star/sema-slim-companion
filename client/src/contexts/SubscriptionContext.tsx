import React, { createContext, useContext, useEffect, useState, useCallback, useRef, type PropsWithChildren } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/queryClient';
import type { UserEntitlements } from '../../../shared/features';

const API_BASE = getApiBaseUrl();

// Cache configuration
const CACHE_KEY_SUBSCRIPTION = 'semaslim_subscription_cache';
const CACHE_KEY_ENTITLEMENTS = 'semaslim_entitlements_cache';
const CACHE_KEY_TOKENS = 'semaslim_tokens_cache';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  userId: string;
}

/**
 * Get cached data if valid (not expired and same user)
 */
function getFromCache<T>(key: string, userId: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const isExpired = Date.now() - entry.timestamp > CACHE_TTL_MS;
    const isWrongUser = entry.userId !== userId;

    if (isExpired || isWrongUser) {
      localStorage.removeItem(key);
      return null;
    }

    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Save data to cache
 */
function saveToCache<T>(key: string, data: T, userId: string): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      userId,
    };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache storage failed - non-critical
  }
}

/**
 * Clear all subscription-related cache
 */
function clearCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY_SUBSCRIPTION);
    localStorage.removeItem(CACHE_KEY_ENTITLEMENTS);
    localStorage.removeItem(CACHE_KEY_TOKENS);
  } catch {
    // Non-critical
  }
}

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
  isOffline: boolean;
  error: string | null;

  // Helpers
  isPro: boolean;
  isTrialing: boolean;
  canUseFeature: (feature: string) => boolean;
  getRemainingUsage: (feature: string) => number;

  // Actions
  refreshSubscription: (forceRefresh?: boolean) => Promise<void>;
  refreshTokenBalance: (forceRefresh?: boolean) => Promise<void>;
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
  const { isSignedIn, userId, getToken } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Track last successful fetch for cache invalidation
  const lastFetchRef = useRef<number>(0);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from cache on mount (offline-first)
  useEffect(() => {
    if (userId) {
      const cachedSub = getFromCache<Subscription>(CACHE_KEY_SUBSCRIPTION, userId);
      const cachedEnt = getFromCache<UserEntitlements>(CACHE_KEY_ENTITLEMENTS, userId);
      const cachedTokens = getFromCache<TokenBalance>(CACHE_KEY_TOKENS, userId);

      if (cachedSub) setSubscription(cachedSub);
      if (cachedEnt) setEntitlements(cachedEnt);
      if (cachedTokens) setTokenBalance(cachedTokens);
    }
  }, [userId]);

  const fetchWithAuth = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    const fullUrl = API_BASE + url;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        ...options.headers,
        ...headers,
      },
      credentials: 'include',
    });
    return response;
  }, [getToken]);

  const refreshSubscription = useCallback(async (forceRefresh: boolean = false) => {
    if (!isSignedIn || !userId) return;

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = getFromCache<{ subscription: Subscription; entitlements: UserEntitlements }>(
        CACHE_KEY_SUBSCRIPTION,
        userId
      );
      if (cached) {
        setSubscription(cached.subscription);
        setEntitlements(cached.entitlements);
        // Still fetch in background to update cache
      }
    }

    // If offline, use cached data
    if (isOffline) {
      const cached = getFromCache<{ subscription: Subscription; entitlements: UserEntitlements }>(
        CACHE_KEY_SUBSCRIPTION,
        userId
      );
      if (cached) {
        setSubscription(cached.subscription);
        setEntitlements(cached.entitlements);
        setError(null);
      }
      return;
    }

    try {
      const response = await fetchWithAuth('/api/subscription');
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
        setEntitlements(data.entitlements);
        setError(null);
        lastFetchRef.current = Date.now();

        // Cache the response
        saveToCache(CACHE_KEY_SUBSCRIPTION, {
          subscription: data.subscription,
          entitlements: data.entitlements,
        }, userId);
        saveToCache(CACHE_KEY_ENTITLEMENTS, data.entitlements, userId);
      } else {
        throw new Error('Failed to fetch subscription');
      }
    } catch (err) {
      // On network error, fall back to cache
      const cached = getFromCache<{ subscription: Subscription; entitlements: UserEntitlements }>(
        CACHE_KEY_SUBSCRIPTION,
        userId
      );
      if (cached) {
        setSubscription(cached.subscription);
        setEntitlements(cached.entitlements);
      }
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [isSignedIn, userId, isOffline, fetchWithAuth]);

  const refreshTokenBalance = useCallback(async (forceRefresh: boolean = false) => {
    if (!isSignedIn || !userId) return;

    // Check cache first
    if (!forceRefresh) {
      const cached = getFromCache<TokenBalance>(CACHE_KEY_TOKENS, userId);
      if (cached) {
        setTokenBalance(cached);
      }
    }

    // If offline, use cached data
    if (isOffline) {
      const cached = getFromCache<TokenBalance>(CACHE_KEY_TOKENS, userId);
      if (cached) {
        setTokenBalance(cached);
      }
      return;
    }

    try {
      const response = await fetchWithAuth('/api/tokens/balance');
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data);
        saveToCache(CACHE_KEY_TOKENS, data, userId);
      }
    } catch (err) {
      // On error, keep cached data
      console.error('Failed to fetch token balance:', err);
    }
  }, [isSignedIn, userId, isOffline, fetchWithAuth]);

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
    // Offline-first: use local entitlements to check
    if (isOffline && entitlements) {
      const allowed = canUseFeatureLocal(entitlements, feature, quantity);
      return {
        allowed,
        reason: allowed ? undefined : 'offline_check',
        remaining: getRemainingLocal(entitlements, feature),
      };
    }

    try {
      const response = await fetchWithAuth('/api/features/check', {
        method: 'POST',
        body: JSON.stringify({ feature, quantity }),
      });

      return await response.json();
    } catch (err) {
      // Fallback to local check on error
      if (entitlements) {
        const allowed = canUseFeatureLocal(entitlements, feature, quantity);
        return { allowed, reason: 'network_error' };
      }
      return { allowed: false, reason: 'error' };
    }
  }, [fetchWithAuth, isOffline, entitlements]);

  const consumeFeature = useCallback(async (
    feature: string,
    quantity: number = 1,
    useTokens: boolean = false
  ) => {
    // Cannot consume offline - would create sync issues
    if (isOffline) {
      return { success: false, tokensUsed: false, reason: 'offline' };
    }

    try {
      const response = await fetchWithAuth('/api/features/consume', {
        method: 'POST',
        body: JSON.stringify({ feature, quantity, useTokens }),
      });

      const result = await response.json();

      if (response.ok) {
        // Invalidate cache and refresh
        if (userId) {
          clearCache();
        }
        await refreshTokenBalance(true);
      }

      return result;
    } catch (err) {
      return { success: false, tokensUsed: false };
    }
  }, [fetchWithAuth, refreshTokenBalance, isOffline, userId]);

  // Helper for local feature checks (offline-first)
  const canUseFeatureLocal = (ent: UserEntitlements, feature: string, quantity: number = 1): boolean => {
    switch (feature) {
      case 'barcode_scan':
        return ent.barcodeScansPerDay === -1 || ent.barcodeScansToday + quantity <= ent.barcodeScansPerDay;
      case 'ai_meal_plan':
        return ent.aiMealPlansUsed + quantity <= ent.aiMealPlansPerMonth || ent.aiTokens >= quantity;
      case 'ai_recipe':
        return ent.aiRecipeSuggestionsUsed + quantity <= ent.aiRecipeSuggestionsPerMonth || ent.aiTokens >= quantity;
      case 'pdf_export':
        return (ent.tier === 'pro' && ent.pdfExportsUsed + quantity <= ent.pdfExportsIncluded) || ent.exportTokens >= quantity;
      default:
        return true;
    }
  };

  const getRemainingLocal = (ent: UserEntitlements, feature: string): number => {
    switch (feature) {
      case 'barcode_scan':
        return ent.barcodeScansPerDay === -1 ? -1 : Math.max(0, ent.barcodeScansPerDay - ent.barcodeScansToday);
      case 'ai_meal_plan':
        return Math.max(0, ent.aiMealPlansPerMonth - ent.aiMealPlansUsed) + ent.aiTokens;
      case 'ai_recipe':
        return Math.max(0, ent.aiRecipeSuggestionsPerMonth - ent.aiRecipeSuggestionsUsed) + ent.aiTokens;
      default:
        return -1;
    }
  };

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

  // Exponential backoff retry for post-checkout refresh
  const refreshWithRetry = useCallback(async (maxRetries: number = 5, initialDelayMs: number = 1000) => {
    let delay = initialDelayMs;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await refreshSubscription(true);
        await refreshTokenBalance(true);

        // Check if subscription is now Pro (webhook processed)
        if (subscription?.tier === 'pro') {
          return true;
        }
      } catch (err) {
        console.log(`Refresh attempt ${attempt + 1} failed, retrying...`);
      }

      // Wait with exponential backoff (1s, 2s, 4s, 8s, 16s)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }

    return false;
  }, [refreshSubscription, refreshTokenBalance, subscription]);

  // Handle URL params for checkout/purchase success with retry logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const subscriptionStatus = urlParams.get('subscription');
    const purchaseStatus = urlParams.get('purchase');

    if (subscriptionStatus === 'success' || purchaseStatus === 'success') {
      // Clear cache to ensure fresh data
      if (userId) {
        clearCache();
      }

      // Retry refresh with exponential backoff (webhook may not have arrived yet)
      refreshWithRetry(5, 1000).then((success) => {
        if (!success) {
          console.warn('Subscription refresh failed after retries - webhook may be delayed');
        }
      });

      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('subscription');
      url.searchParams.delete('purchase');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, '', url.toString());
    }
  }, [userId, refreshWithRetry]);

  const value: SubscriptionContextValue = {
    subscription,
    entitlements,
    tokenBalance,
    isLoading,
    isOffline,
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
