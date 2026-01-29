import { registerPlugin } from '@capacitor/core';

/**
 * Customer entitlement info from RevenueCat
 */
export interface EntitlementInfo {
  isActive: boolean;
  willRenew: boolean;
  productIdentifier: string;
  expirationDate: string | null;
  isSandbox: boolean;
}

/**
 * Customer info from RevenueCat
 */
export interface CustomerInfo {
  originalAppUserId: string;
  entitlements: Record<string, EntitlementInfo>;
  activeSubscriptions: string[];
  firstSeen: string;
  latestExpirationDate: string | null;
}

/**
 * Product info from App Store
 */
export interface ProductInfo {
  identifier: string;
  title: string;
  description: string;
  price: number;
  priceString: string;
  currencyCode: string;
}

/**
 * Package info from RevenueCat offerings
 */
export interface PackageInfo {
  identifier: string;
  packageType: number;
  product: ProductInfo;
}

/**
 * Offering info from RevenueCat
 */
export interface OfferingInfo {
  identifier: string;
  serverDescription: string;
  packages: PackageInfo[];
}

/**
 * RevenueCat Purchases Plugin interface
 */
export interface PurchasesPlugin {
  /**
   * Configure RevenueCat with API key
   */
  configure(options: {
    apiKey: string;
    userId?: string;
  }): Promise<{ success: boolean; message: string }>;

  /**
   * Login user to RevenueCat
   */
  login(options: {
    userId: string;
  }): Promise<{ success: boolean; created: boolean; customerInfo: CustomerInfo }>;

  /**
   * Logout user from RevenueCat
   */
  logout(): Promise<{ success: boolean; customerInfo: CustomerInfo }>;

  /**
   * Get current customer info
   */
  getCustomerInfo(): Promise<{ customerInfo: CustomerInfo }>;

  /**
   * Get available offerings
   */
  getOfferings(): Promise<{
    current?: OfferingInfo;
    all: OfferingInfo[];
  }>;

  /**
   * Purchase a product
   */
  purchase(options: {
    productId: string;
    offeringId?: string;
  }): Promise<{
    success: boolean;
    cancelled: boolean;
    customerInfo?: CustomerInfo;
    message?: string;
  }>;

  /**
   * Restore previous purchases
   */
  restorePurchases(): Promise<{ success: boolean; customerInfo: CustomerInfo }>;

  /**
   * Sync purchases with RevenueCat
   */
  syncPurchases(): Promise<{ success: boolean; customerInfo: CustomerInfo }>;

  /**
   * Check trial eligibility
   */
  checkTrialEligibility(options: {
    productIds: string[];
  }): Promise<{ eligibility: Record<string, string> }>;

  /**
   * Add listener for customer info updates
   */
  addListener(
    eventName: 'customerInfoUpdated',
    listenerFunc: (data: { customerInfo: CustomerInfo }) => void
  ): Promise<{ remove: () => void }>;

  /**
   * Add listener for purchase completion
   */
  addListener(
    eventName: 'purchaseCompleted',
    listenerFunc: (data: { productId: string; customerInfo: CustomerInfo }) => void
  ): Promise<{ remove: () => void }>;
}

/**
 * Register and export the Purchases plugin
 * Falls back to a no-op implementation on web
 */
export const Purchases = registerPlugin<PurchasesPlugin>('PurchasesPlugin', {
  web: () => ({
    configure: async () => ({ success: false, message: 'Not available on web' }),
    login: async () => { throw new Error('Not available on web'); },
    logout: async () => { throw new Error('Not available on web'); },
    getCustomerInfo: async () => { throw new Error('Not available on web'); },
    getOfferings: async () => { throw new Error('Not available on web'); },
    purchase: async () => ({ success: false, cancelled: false, message: 'Not available on web' }),
    restorePurchases: async () => { throw new Error('Not available on web'); },
    syncPurchases: async () => { throw new Error('Not available on web'); },
    checkTrialEligibility: async () => ({ eligibility: {} }),
    addListener: async () => ({ remove: () => {} }),
  }),
});

/**
 * Check if native purchases are available
 */
export function isNativePurchasesAvailable(): boolean {
  return typeof (Purchases as any)?.configure === 'function' &&
         !window.location.protocol.startsWith('http');
}
