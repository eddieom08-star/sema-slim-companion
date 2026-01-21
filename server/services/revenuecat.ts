import { db } from "../db";
import { eq } from "drizzle-orm";
import { subscriptions, purchases } from "@shared/schema";
import { entitlementsService } from "./entitlements";
import { TOKEN_PRODUCTS } from "@shared/features";

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || '';
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v1';

interface RevenueCatSubscriber {
  subscriber: {
    entitlements: {
      [key: string]: {
        expires_date: string | null;
        product_identifier: string;
        purchase_date: string;
      };
    };
    subscriptions: {
      [key: string]: {
        expires_date: string | null;
        purchase_date: string;
        original_purchase_date: string;
        period_type: 'trial' | 'intro' | 'normal';
        store: 'app_store' | 'play_store';
        is_sandbox: boolean;
        unsubscribe_detected_at: string | null;
        billing_issues_detected_at: string | null;
      };
    };
    non_subscriptions: {
      [key: string]: Array<{
        id: string;
        purchase_date: string;
        store: string;
      }>;
    };
    first_seen: string;
    original_app_user_id: string;
  };
}

interface RevenueCatWebhookEvent {
  api_version: string;
  event: {
    type:
      | 'INITIAL_PURCHASE'
      | 'RENEWAL'
      | 'CANCELLATION'
      | 'UNCANCELLATION'
      | 'NON_RENEWING_PURCHASE'
      | 'SUBSCRIPTION_PAUSED'
      | 'EXPIRATION'
      | 'BILLING_ISSUE'
      | 'PRODUCT_CHANGE'
      | 'TRANSFER';
    id: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    entitlement_id?: string;
    entitlement_ids?: string[];
    period_type?: 'TRIAL' | 'INTRO' | 'NORMAL';
    purchased_at_ms: number;
    expiration_at_ms?: number;
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    environment: 'SANDBOX' | 'PRODUCTION';
    is_family_share?: boolean;
    price?: number;
    currency?: string;
    transaction_id?: string;
    original_transaction_id?: string;
  };
}

export class RevenueCatService {
  private apiKey: string;

  constructor() {
    this.apiKey = REVENUECAT_API_KEY;
    if (!this.apiKey) {
      console.warn('REVENUECAT_API_KEY not set - mobile purchases will not work');
    }
  }

  /**
   * Get subscriber info from RevenueCat
   */
  async getSubscriber(userId: string): Promise<RevenueCatSubscriber | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${REVENUECAT_API_URL}/subscribers/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Subscriber doesn't exist yet
        }
        throw new Error(`RevenueCat API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching RevenueCat subscriber:', error);
      return null;
    }
  }

  /**
   * Create or update subscriber in RevenueCat
   */
  async createOrUpdateSubscriber(userId: string, attributes?: {
    email?: string;
    displayName?: string;
  }): Promise<void> {
    if (!this.apiKey) return;

    try {
      await fetch(`${REVENUECAT_API_URL}/subscribers/${userId}/attributes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attributes: {
            $email: attributes?.email ? { value: attributes.email } : undefined,
            $displayName: attributes?.displayName ? { value: attributes.displayName } : undefined,
          },
        }),
      });
    } catch (error) {
      console.error('Error updating RevenueCat subscriber:', error);
    }
  }

  /**
   * Grant a promotional entitlement
   */
  async grantPromotionalEntitlement(
    userId: string,
    entitlementId: string,
    durationDays: number
  ): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(
        `${REVENUECAT_API_URL}/subscribers/${userId}/entitlements/${entitlementId}/promotional`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            duration: durationDays === -1 ? 'lifetime' : `${durationDays}_days`,
          }),
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error granting promotional entitlement:', error);
      return false;
    }
  }

  /**
   * Revoke a promotional entitlement
   */
  async revokePromotionalEntitlement(
    userId: string,
    entitlementId: string
  ): Promise<boolean> {
    if (!this.apiKey) return false;

    try {
      const response = await fetch(
        `${REVENUECAT_API_URL}/subscribers/${userId}/entitlements/${entitlementId}/revoke_promotionals`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.ok;
    } catch (error) {
      console.error('Error revoking promotional entitlement:', error);
      return false;
    }
  }

  /**
   * Sync user's subscription status from RevenueCat to local database
   */
  async syncSubscriptionStatus(userId: string): Promise<void> {
    const subscriber = await this.getSubscriber(userId);
    if (!subscriber) return;

    // Check for active Pro entitlement
    const proEntitlement = subscriber.subscriber.entitlements['pro'] ||
      subscriber.subscriber.entitlements['premium'];

    if (proEntitlement) {
      const expiresDate = proEntitlement.expires_date
        ? new Date(proEntitlement.expires_date)
        : null;

      const isActive = !expiresDate || expiresDate > new Date();
      const productId = proEntitlement.product_identifier;
      const subscriptionInfo = subscriber.subscriber.subscriptions[productId];

      const isPeriodTrial = subscriptionInfo?.period_type === 'trial';
      const isCancelled = !!subscriptionInfo?.unsubscribe_detected_at;

      await db.insert(subscriptions)
        .values({
          userId,
          tier: isActive ? 'pro' : 'free',
          status: !isActive ? 'cancelled' :
            isPeriodTrial ? 'trialing' :
            subscriptionInfo?.billing_issues_detected_at ? 'past_due' : 'active',
          billingPeriod: productId.includes('annual') ? 'annual' : 'monthly',
          revenuecatCustomerId: subscriber.subscriber.original_app_user_id,
          revenuecatEntitlementId: 'pro',
          trialStartDate: isPeriodTrial ? new Date(subscriptionInfo?.purchase_date || '') : null,
          trialEndDate: isPeriodTrial && expiresDate ? expiresDate : null,
          currentPeriodStart: new Date(subscriptionInfo?.purchase_date || proEntitlement.purchase_date),
          currentPeriodEnd: expiresDate,
          cancelledAt: isCancelled ? new Date(subscriptionInfo?.unsubscribe_detected_at || '') : null,
        })
        .onConflictDoUpdate({
          target: subscriptions.userId,
          set: {
            tier: isActive ? 'pro' : 'free',
            status: !isActive ? 'cancelled' :
              isPeriodTrial ? 'trialing' :
              subscriptionInfo?.billing_issues_detected_at ? 'past_due' : 'active',
            revenuecatCustomerId: subscriber.subscriber.original_app_user_id,
            currentPeriodEnd: expiresDate,
            cancelledAt: isCancelled ? new Date(subscriptionInfo?.unsubscribe_detected_at || '') : null,
            updatedAt: new Date(),
          },
        });
    }

    // Process non-subscription purchases (token packs)
    for (const [productId, purchases] of Object.entries(subscriber.subscriber.non_subscriptions)) {
      const tokenProduct = TOKEN_PRODUCTS[productId];
      if (!tokenProduct?.tokens) continue;

      for (const purchase of purchases) {
        // Check if we've already processed this purchase
        const existingPurchase = await db.query.purchases?.findFirst({
          where: eq(purchases.appleTransactionId, purchase.id),
        });

        if (!existingPurchase) {
          // Record the purchase and grant tokens
          await db.insert(purchases).values({
            userId,
            productType: 'token_pack',
            productId,
            amountCents: tokenProduct.amount,
            status: 'completed',
            appleTransactionId: purchase.id,
            completedAt: new Date(purchase.purchase_date),
          });

          // Grant tokens
          if (tokenProduct.tokens.ai_tokens) {
            await entitlementsService.addTokens(
              userId,
              'ai_tokens',
              tokenProduct.tokens.ai_tokens,
              'purchase',
              purchase.id
            );
          }
          if (tokenProduct.tokens.export_tokens) {
            await entitlementsService.addTokens(
              userId,
              'export_tokens',
              tokenProduct.tokens.export_tokens,
              'purchase',
              purchase.id
            );
          }
          if (tokenProduct.tokens.streak_shields) {
            await entitlementsService.addTokens(
              userId,
              'streak_shields',
              tokenProduct.tokens.streak_shields,
              'purchase',
              purchase.id
            );
          }
        }
      }
    }
  }

  /**
   * Handle RevenueCat webhook events
   */
  async handleWebhook(event: RevenueCatWebhookEvent): Promise<void> {
    const userId = event.event.app_user_id;
    const eventType = event.event.type;

    console.log(`RevenueCat webhook: ${eventType} for user ${userId}`);

    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        await this.handlePurchaseOrRenewal(userId, event.event);
        break;

      case 'CANCELLATION':
      case 'EXPIRATION':
        await this.handleCancellationOrExpiration(userId, event.event);
        break;

      case 'NON_RENEWING_PURCHASE':
        await this.handleNonRenewingPurchase(userId, event.event);
        break;

      case 'BILLING_ISSUE':
        await this.handleBillingIssue(userId);
        break;

      case 'PRODUCT_CHANGE':
        // Sync full status on product change
        await this.syncSubscriptionStatus(userId);
        break;
    }
  }

  private async handlePurchaseOrRenewal(
    userId: string,
    event: RevenueCatWebhookEvent['event']
  ): Promise<void> {
    const isPro = event.entitlement_ids?.includes('pro') ||
      event.entitlement_id === 'pro';

    if (!isPro) {
      // Handle token purchase
      await this.handleNonRenewingPurchase(userId, event);
      return;
    }

    const isTrialing = event.period_type === 'TRIAL';
    const expirationDate = event.expiration_at_ms
      ? new Date(event.expiration_at_ms)
      : null;

    await db.insert(subscriptions)
      .values({
        userId,
        tier: 'pro',
        status: isTrialing ? 'trialing' : 'active',
        billingPeriod: event.product_id.includes('annual') ? 'annual' : 'monthly',
        revenuecatCustomerId: event.original_app_user_id,
        revenuecatEntitlementId: 'pro',
        trialStartDate: isTrialing ? new Date(event.purchased_at_ms) : null,
        trialEndDate: isTrialing ? expirationDate : null,
        currentPeriodStart: new Date(event.purchased_at_ms),
        currentPeriodEnd: expirationDate,
        cancelledAt: null,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          tier: 'pro',
          status: isTrialing ? 'trialing' : 'active',
          currentPeriodStart: new Date(event.purchased_at_ms),
          currentPeriodEnd: expirationDate,
          cancelledAt: null,
          updatedAt: new Date(),
        },
      });

    // Reset monthly usage on renewal (not trial)
    if (event.type === 'RENEWAL') {
      await entitlementsService.resetMonthlyUsage(userId);
    }
  }

  private async handleCancellationOrExpiration(
    userId: string,
    event: RevenueCatWebhookEvent['event']
  ): Promise<void> {
    const isExpired = event.type === 'EXPIRATION';

    await db.update(subscriptions)
      .set({
        tier: isExpired ? 'free' : 'pro', // Keep pro until actual expiration
        status: isExpired ? 'cancelled' : 'active',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  private async handleNonRenewingPurchase(
    userId: string,
    event: RevenueCatWebhookEvent['event']
  ): Promise<void> {
    const productId = event.product_id;
    const tokenProduct = TOKEN_PRODUCTS[productId];

    if (!tokenProduct?.tokens) {
      console.warn(`Unknown non-renewing product: ${productId}`);
      return;
    }

    // Record purchase
    await db.insert(purchases).values({
      userId,
      productType: 'token_pack',
      productId,
      amountCents: event.price ? Math.round(event.price * 100) : tokenProduct.amount,
      currency: event.currency || 'USD',
      status: 'completed',
      appleTransactionId: event.transaction_id,
      completedAt: new Date(event.purchased_at_ms),
    });

    // Grant tokens
    if (tokenProduct.tokens.ai_tokens) {
      await entitlementsService.addTokens(
        userId,
        'ai_tokens',
        tokenProduct.tokens.ai_tokens,
        'purchase',
        event.transaction_id
      );
    }
    if (tokenProduct.tokens.export_tokens) {
      await entitlementsService.addTokens(
        userId,
        'export_tokens',
        tokenProduct.tokens.export_tokens,
        'purchase',
        event.transaction_id
      );
    }
    if (tokenProduct.tokens.streak_shields) {
      await entitlementsService.addTokens(
        userId,
        'streak_shields',
        tokenProduct.tokens.streak_shields,
        'purchase',
        event.transaction_id
      );
    }
  }

  private async handleBillingIssue(userId: string): Promise<void> {
    await db.update(subscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // RevenueCat uses a simple authorization header check
    // The webhook secret is configured in RevenueCat dashboard
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('REVENUECAT_WEBHOOK_SECRET not set');
      return true; // Allow in development
    }

    return signature === webhookSecret;
  }
}

// Export singleton instance
export const revenueCatService = new RevenueCatService();
