import Stripe from 'stripe';
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  subscriptions,
  purchases,
  type Subscription,
} from "@shared/schema";
import { entitlementsService } from "./entitlements";
import { SUBSCRIPTION_PRODUCTS, TOKEN_PRODUCTS } from "@shared/features";

// Initialize Stripe with API key (lazy initialization to prevent crash if key is missing)
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia',
    });
  }
  return stripeClient;
}

// Legacy reference for compatibility
const stripe = {
  get customers() { return getStripe().customers; },
  get checkout() { return getStripe().checkout; },
  get subscriptions() { return getStripe().subscriptions; },
  get billingPortal() { return getStripe().billingPortal; },
  get prices() { return getStripe().prices; },
  get products() { return getStripe().products; },
  webhooks: {
    constructEvent: (payload: string | Buffer, signature: string, secret: string) =>
      getStripe().webhooks.constructEvent(payload, signature, secret)
  }
};

export class StripeService {
  /**
   * Create or get Stripe customer for a user
   */
  async getOrCreateCustomer(userId: string, email: string): Promise<string> {
    // Check if user already has a Stripe customer ID
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (subscription?.stripeCustomerId) {
      return subscription.stripeCustomerId;
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    });

    // Store customer ID
    await db.insert(subscriptions)
      .values({
        userId,
        tier: 'free',
        status: 'active',
        stripeCustomerId: customer.id,
      })
      .onConflictDoUpdate({
        target: subscriptions.userId,
        set: {
          stripeCustomerId: customer.id,
          updatedAt: new Date(),
        },
      });

    return customer.id;
  }

  /**
   * Create a checkout session for subscription
   */
  async createSubscriptionCheckout(
    userId: string,
    email: string,
    plan: 'monthly' | 'annual',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string; sessionId: string }> {
    const customerId = await this.getOrCreateCustomer(userId, email);

    const product = plan === 'monthly'
      ? SUBSCRIPTION_PRODUCTS.pro_monthly
      : SUBSCRIPTION_PRODUCTS.pro_annual;

    // Create price if not exists (in production, use pre-created prices)
    const priceId = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`] ||
      await this.getOrCreatePrice(product.id, product.amount, product.interval);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      subscription_data: {
        trial_period_days: 7, // 7-day free trial
        metadata: {
          userId,
          plan,
        },
      },
      metadata: {
        userId,
        type: 'subscription',
        plan,
      },
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Create a checkout session for token purchase
   */
  async createTokenCheckout(
    userId: string,
    email: string,
    productId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ url: string; sessionId: string }> {
    const product = TOKEN_PRODUCTS[productId];
    if (!product) {
      throw new Error(`Invalid product ID: ${productId}`);
    }

    const customerId = await this.getOrCreateCustomer(userId, email);

    // Create a one-time price
    const priceId = await this.getOrCreateOneTimePrice(product.id, product.amount);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        type: 'token_purchase',
        productId,
      },
    });

    // Create pending purchase record
    await db.insert(purchases).values({
      userId,
      productType: 'token_pack',
      productId,
      amountCents: product.amount,
      status: 'pending',
      stripePaymentIntentId: session.payment_intent as string,
      metadata: { sessionId: session.id },
    });

    return {
      url: session.url!,
      sessionId: session.id,
    };
  }

  /**
   * Create a billing portal session
   */
  async createBillingPortalSession(
    userId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: session.url };
  }

  /**
   * Cancel subscription at period end
   */
  async cancelSubscription(userId: string): Promise<Subscription> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local record
    const [updated] = await db.update(subscriptions)
      .set({
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Reactivate a cancelled subscription
   */
  async reactivateSubscription(userId: string): Promise<Subscription> {
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    if (!subscription?.stripeSubscriptionId) {
      throw new Error('No subscription found');
    }

    // Reactivate in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update local record
    const [updated] = await db.update(subscriptions)
      .set({
        cancelledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId))
      .returning();

    return updated;
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const { userId, type, productId } = session.metadata || {};

    if (!userId) {
      console.error('No userId in checkout session metadata');
      return;
    }

    if (type === 'token_purchase' && productId) {
      // Complete token purchase
      const product = TOKEN_PRODUCTS[productId];
      if (!product || !product.tokens) return;

      // Update purchase status
      await db.update(purchases)
        .set({
          status: 'completed',
          completedAt: new Date(),
        })
        .where(eq(purchases.stripePaymentIntentId, session.payment_intent as string));

      // Add tokens to user's balance
      if (product.tokens.ai_tokens) {
        await entitlementsService.addTokens(
          userId,
          'ai_tokens',
          product.tokens.ai_tokens,
          'purchase',
          session.id
        );
      }
      if (product.tokens.export_tokens) {
        await entitlementsService.addTokens(
          userId,
          'export_tokens',
          product.tokens.export_tokens,
          'purchase',
          session.id
        );
      }
      if (product.tokens.streak_shields) {
        await entitlementsService.addTokens(
          userId,
          'streak_shields',
          product.tokens.streak_shields,
          'purchase',
          session.id
        );
      }
    }
  }

  private async handleSubscriptionUpdate(stripeSubscription: Stripe.Subscription): Promise<void> {
    const userId = stripeSubscription.metadata?.userId;
    if (!userId) {
      // Try to find by customer ID
      const customerId = stripeSubscription.customer as string;
      const [sub] = await db.select()
        .from(subscriptions)
        .where(eq(subscriptions.stripeCustomerId, customerId))
        .limit(1);

      if (!sub) {
        console.error('Could not find subscription for Stripe customer:', customerId);
        return;
      }

      await this.updateSubscriptionFromStripe(sub.userId, stripeSubscription);
    } else {
      await this.updateSubscriptionFromStripe(userId, stripeSubscription);
    }
  }

  private async updateSubscriptionFromStripe(
    userId: string,
    stripeSubscription: Stripe.Subscription
  ): Promise<void> {
    const status = this.mapStripeStatus(stripeSubscription.status);
    const isTrialing = stripeSubscription.status === 'trialing';

    await db.update(subscriptions)
      .set({
        tier: 'pro',
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripePriceId: stripeSubscription.items.data[0]?.price.id,
        billingPeriod: stripeSubscription.items.data[0]?.price.recurring?.interval === 'year'
          ? 'annual'
          : 'monthly',
        trialStartDate: isTrialing && stripeSubscription.trial_start
          ? new Date(stripeSubscription.trial_start * 1000)
          : null,
        trialEndDate: isTrialing && stripeSubscription.trial_end
          ? new Date(stripeSubscription.trial_end * 1000)
          : null,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelledAt: stripeSubscription.cancel_at_period_end
          ? new Date()
          : null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.userId, userId));

    // Reset monthly usage on renewal
    if (stripeSubscription.status === 'active' && !isTrialing) {
      await entitlementsService.resetMonthlyUsage(userId);
    }
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const customerId = stripeSubscription.customer as string;

    await db.update(subscriptions)
      .set({
        tier: 'free',
        status: 'cancelled',
        stripeSubscriptionId: null,
        stripePriceId: null,
        billingPeriod: null,
        currentPeriodStart: null,
        currentPeriodEnd: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeCustomerId, customerId));
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    await db.update(subscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.stripeCustomerId, customerId));
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    const customerId = invoice.customer as string;

    // Update status back to active if it was past_due
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeCustomerId, customerId))
      .limit(1);

    if (subscription?.status === 'past_due') {
      await db.update(subscriptions)
        .set({
          status: 'active',
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.stripeCustomerId, customerId));
    }
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status
  ): 'active' | 'cancelled' | 'past_due' | 'trialing' {
    switch (status) {
      case 'active':
        return 'active';
      case 'trialing':
        return 'trialing';
      case 'past_due':
      case 'unpaid':
        return 'past_due';
      case 'canceled':
      case 'incomplete':
      case 'incomplete_expired':
      case 'paused':
      default:
        return 'cancelled';
    }
  }

  private async getOrCreatePrice(
    productId: string,
    amount: number,
    interval: 'month' | 'year'
  ): Promise<string> {
    // In production, use pre-created prices from Stripe Dashboard
    // This is a fallback for development
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    const existingPrice = prices.data.find(
      p => p.unit_amount === amount && p.recurring?.interval === interval
    );

    if (existingPrice) {
      return existingPrice.id;
    }

    // Create product first if needed
    try {
      await stripe.products.retrieve(productId);
    } catch {
      await stripe.products.create({
        id: productId,
        name: productId === 'pro_monthly' ? 'SemaSlim Pro Monthly' : 'SemaSlim Pro Annual',
      });
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: 'usd',
      recurring: { interval },
    });

    return price.id;
  }

  private async getOrCreateOneTimePrice(productId: string, amount: number): Promise<string> {
    const product = TOKEN_PRODUCTS[productId];
    if (!product) {
      throw new Error(`Invalid product: ${productId}`);
    }

    // Create product first if needed
    try {
      await stripe.products.retrieve(productId);
    } catch {
      await stripe.products.create({
        id: productId,
        name: product.name,
        description: product.description,
      });
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: 'usd',
    });

    return price.id;
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

// Export singleton instance
export const stripeService = new StripeService();
