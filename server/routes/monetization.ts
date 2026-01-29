import { Router, Request, Response, raw } from 'express';
import { requireAuth, clerkClient } from '@clerk/express';
import { entitlementsService } from '../services/entitlements';
import { stripeService } from '../services/stripe';
import { revenueCatService } from '../services/revenuecat';
import { pdfExportService } from '../services/pdf-export';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { subscriptions, upsellEvents } from '@shared/schema';
import { SUBSCRIPTION_PRODUCTS, TOKEN_PRODUCTS, FEATURE_TYPES } from '@shared/features';
import {
  sendUnauthorizedError,
  sendValidationError,
  sendFeatureLimitError,
  sendInternalError,
} from '../lib/error-responses';

const router = Router();

// ============================================
// SUBSCRIPTION ENDPOINTS
// ============================================

/**
 * GET /api/subscription
 * Get current user's subscription and entitlements
 */
router.get('/subscription', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const entitlements = await entitlementsService.getUserEntitlements(userId);

    const [subscription] = await db.select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);

    res.json({
      subscription: subscription ? {
        tier: subscription.tier,
        status: subscription.status,
        billingPeriod: subscription.billingPeriod,
        currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        trialEndDate: subscription.trialEndDate?.toISOString(),
        cancelAtPeriodEnd: subscription.cancelledAt !== null && subscription.status === 'active',
      } : {
        tier: 'free',
        status: 'active',
        billingPeriod: null,
        currentPeriodEnd: null,
        trialEndDate: null,
        cancelAtPeriodEnd: false,
      },
      entitlements,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

/**
 * POST /api/subscription/checkout
 * Create a Stripe checkout session for subscription
 */
router.post('/subscription/checkout', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plan, successUrl, cancelUrl } = req.body;

    if (!['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan. Must be "monthly" or "annual"' });
    }

    // Get user email from Clerk
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    const { url, sessionId } = await stripeService.createSubscriptionCheckout(
      userId,
      email,
      plan,
      successUrl || `${process.env.APP_URL}/dashboard?subscription=success`,
      cancelUrl || `${process.env.APP_URL}/pricing?subscription=cancelled`
    );

    res.json({ url, sessionId });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /api/subscription/portal
 * Create a Stripe billing portal session
 */
router.post('/subscription/portal', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { returnUrl } = req.body;

    const { url } = await stripeService.createBillingPortalSession(
      userId,
      returnUrl || `${process.env.APP_URL}/profile`
    );

    res.json({ url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription at period end
 */
router.post('/subscription/cancel', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await stripeService.cancelSubscription(userId);

    res.json({
      success: true,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * POST /api/subscription/reactivate
 * Reactivate a cancelled subscription
 */
router.post('/subscription/reactivate', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await stripeService.reactivateSubscription(userId);

    res.json({
      success: true,
      status: subscription.status,
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// ============================================
// TOKEN ENDPOINTS
// ============================================

/**
 * GET /api/tokens/balance
 * Get user's token balances
 */
router.get('/tokens/balance', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const entitlements = await entitlementsService.getUserEntitlements(userId);

    res.json({
      aiTokens: entitlements.aiTokens,
      exportTokens: entitlements.exportTokens,
      streakShields: entitlements.streakShields,
      monthlyUsage: {
        aiMealPlans: entitlements.aiMealPlansUsed,
        aiRecipes: entitlements.aiRecipeSuggestionsUsed,
        pdfExports: entitlements.pdfExportsUsed,
      },
      monthlyLimits: {
        aiMealPlans: entitlements.aiMealPlansPerMonth,
        aiRecipes: entitlements.aiRecipeSuggestionsPerMonth,
        pdfExports: entitlements.pdfExportsIncluded,
      },
    });
  } catch (error) {
    console.error('Error fetching token balance:', error);
    res.status(500).json({ error: 'Failed to fetch token balance' });
  }
});

/**
 * POST /api/tokens/purchase
 * Create a checkout session for token purchase
 */
router.post('/tokens/purchase', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { productId, successUrl, cancelUrl } = req.body;

    if (!TOKEN_PRODUCTS[productId]) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    // Get user email from Clerk
    const user = await clerkClient.users.getUser(userId);
    const email = user.emailAddresses[0]?.emailAddress;

    if (!email) {
      return res.status(400).json({ error: 'User email not found' });
    }

    const { url, sessionId } = await stripeService.createTokenCheckout(
      userId,
      email,
      productId,
      successUrl || `${process.env.APP_URL}/dashboard?purchase=success`,
      cancelUrl || `${process.env.APP_URL}/dashboard?purchase=cancelled`
    );

    res.json({ url, sessionId });
  } catch (error) {
    console.error('Error creating token purchase session:', error);
    res.status(500).json({ error: 'Failed to create purchase session' });
  }
});

/**
 * GET /api/tokens/products
 * Get available token products
 */
router.get('/tokens/products', async (_req: Request, res: Response) => {
  res.json({
    subscriptions: SUBSCRIPTION_PRODUCTS,
    tokens: TOKEN_PRODUCTS,
  });
});

/**
 * POST /api/tokens/use-shield
 * Use a streak shield
 */
router.post('/tokens/use-shield', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await entitlementsService.useStreakShield(userId);

    if (!result.success) {
      return res.status(402).json({
        error: 'No streak shields available',
        remaining: 0,
        upsellOptions: {
          shields3: TOKEN_PRODUCTS.streak_shields_3,
          shields10: TOKEN_PRODUCTS.streak_shields_10,
        },
      });
    }

    res.json({
      success: true,
      remaining: result.remaining,
    });
  } catch (error) {
    console.error('Error using streak shield:', error);
    res.status(500).json({ error: 'Failed to use streak shield' });
  }
});

// ============================================
// FEATURE USAGE ENDPOINTS
// ============================================

/**
 * GET /api/features/:feature/check
 * Check if user can use a feature (RESTful - read operation)
 */
router.get('/features/:feature/check', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return sendUnauthorizedError(res);
    }

    const { feature } = req.params;
    const quantity = parseInt(req.query.quantity as string) || 1;

    const validFeatures = Object.values(FEATURE_TYPES);
    if (!validFeatures.includes(feature as any)) {
      return sendValidationError(res, 'Invalid feature type', { validFeatures });
    }

    const result = await entitlementsService.canUseFeature(userId, feature as any, quantity);

    res.json(result);
  } catch (error) {
    console.error('Error checking feature:', error);
    return sendInternalError(res, 'Failed to check feature');
  }
});

/**
 * POST /api/features/check
 * Check if user can use a feature (legacy - kept for backward compatibility)
 * @deprecated Use GET /api/features/:feature/check instead
 */
router.post('/features/check', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return sendUnauthorizedError(res);
    }

    const { feature, quantity } = req.body;

    const validFeatures = Object.values(FEATURE_TYPES);
    if (!validFeatures.includes(feature)) {
      return sendValidationError(res, 'Invalid feature type', { validFeatures });
    }

    const result = await entitlementsService.canUseFeature(userId, feature, quantity || 1);

    res.json(result);
  } catch (error) {
    console.error('Error checking feature:', error);
    return sendInternalError(res, 'Failed to check feature');
  }
});

/**
 * POST /api/features/consume
 * Consume a feature (record usage)
 */
router.post('/features/consume', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return sendUnauthorizedError(res);
    }

    const { feature, quantity, useTokens } = req.body;

    const validFeatures = Object.values(FEATURE_TYPES);
    if (!validFeatures.includes(feature)) {
      return sendValidationError(res, 'Invalid feature type', { validFeatures });
    }

    const result = await entitlementsService.consumeFeature(
      userId,
      feature,
      quantity || 1,
      useTokens || false
    );

    if (!result.success) {
      const canUse = await entitlementsService.canUseFeature(userId, feature, quantity || 1);
      return sendFeatureLimitError(
        res,
        canUse.reason || 'feature_limit_reached',
        canUse.upsellType || 'pro',
        canUse.remaining || 0
      );
    }

    res.json(result);
  } catch (error) {
    console.error('Error consuming feature:', error);
    return sendInternalError(res, 'Failed to consume feature');
  }
});

// ============================================
// PDF EXPORT ENDPOINTS
// ============================================

/**
 * POST /api/exports/healthcare-pdf
 * Generate a healthcare provider PDF report
 */
router.post('/exports/healthcare-pdf', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { reportPeriod, format } = req.body;

    // Check if user can export
    const canExport = await entitlementsService.canUseFeature(userId, FEATURE_TYPES.PDF_EXPORT);

    if (!canExport.allowed) {
      // Track upsell event
      await db.insert(upsellEvents).values({
        userId,
        triggerType: 'pdf_export_attempt',
        upsellType: 'export_tokens',
        placement: 'api',
        action: 'shown',
        contextData: { reportPeriod, format },
      });

      return res.status(402).json({
        success: false,
        reason: canExport.reason,
        upsellOptions: {
          singleExport: TOKEN_PRODUCTS.export_single,
          fivePack: TOKEN_PRODUCTS.export_5,
          proPlan: SUBSCRIPTION_PRODUCTS.pro_monthly,
        },
      });
    }

    // Consume the export
    const entitlements = await entitlementsService.getUserEntitlements(userId);
    const useTokens = entitlements.tier !== 'pro' ||
      entitlements.pdfExportsUsed >= entitlements.pdfExportsIncluded;

    await entitlementsService.consumeFeature(userId, FEATURE_TYPES.PDF_EXPORT, 1, useTokens);

    // Generate PDF
    const pdfBuffer = await pdfExportService.generateHealthcareReport(userId, {
      period: reportPeriod || '30days',
      format: format || 'detailed',
    });

    // Set response headers for PDF download
    const filename = `semaslim-health-report-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

// ============================================
// UPSELL ANALYTICS ENDPOINTS
// ============================================

/**
 * POST /api/upsells/event
 * Record an upsell event for analytics
 */
router.post('/upsells/event', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { triggerType, upsellType, placement, action, contextData } = req.body;

    await db.insert(upsellEvents).values({
      userId,
      triggerType,
      upsellType,
      placement,
      action,
      contextData,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording upsell event:', error);
    res.status(500).json({ error: 'Failed to record event' });
  }
});

/**
 * GET /api/upsells/should-show
 * Check if user should see an upsell
 */
router.get('/upsells/should-show', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { triggerType } = req.query;

    // Check user's subscription status
    const entitlements = await entitlementsService.getUserEntitlements(userId);

    // Pro users don't see most upsells
    if (entitlements.tier === 'pro' && triggerType !== 'annual_upgrade') {
      return res.json({ shouldShow: false, reason: 'user_subscribed' });
    }

    // Check recent upsell events (frequency capping)
    const recentEvents = await db.select()
      .from(upsellEvents)
      .where(eq(upsellEvents.userId, userId))
      .orderBy(upsellEvents.createdAt)
      .limit(10);

    // Check if dismissed recently (48 hour cooldown)
    const recentDismiss = recentEvents.find(e =>
      e.action === 'dismissed' &&
      e.createdAt &&
      new Date().getTime() - new Date(e.createdAt).getTime() < 48 * 60 * 60 * 1000
    );

    if (recentDismiss) {
      return res.json({
        shouldShow: false,
        reason: 'recently_dismissed',
        cooldownEnds: new Date(new Date(recentDismiss.createdAt!).getTime() + 48 * 60 * 60 * 1000).toISOString(),
      });
    }

    // Check weekly frequency cap (max 3 per week)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyShown = recentEvents.filter(e =>
      e.action === 'shown' &&
      e.createdAt &&
      new Date(e.createdAt) > weekAgo
    ).length;

    if (weeklyShown >= 3) {
      return res.json({ shouldShow: false, reason: 'frequency_cap' });
    }

    res.json({ shouldShow: true });
  } catch (error) {
    console.error('Error checking upsell:', error);
    res.status(500).json({ error: 'Failed to check upsell' });
  }
});

// ============================================
// STRIPE WEBHOOK ENDPOINT
// ============================================

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
router.post(
  '/webhooks/stripe',
  raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!signature || typeof signature !== 'string') {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    try {
      const event = stripeService.verifyWebhookSignature(req.body, signature);
      await stripeService.handleWebhook(event);
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook verification failed' });
    }
  }
);

// ============================================
// REVENUECAT ENDPOINTS (MOBILE)
// ============================================

/**
 * POST /api/mobile/sync-purchases
 * Sync mobile purchases from RevenueCat to local database
 * Called by mobile app after purchase to ensure server is in sync
 */
router.post('/mobile/sync-purchases', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Sync subscription status from RevenueCat
    await revenueCatService.syncSubscriptionStatus(userId);

    // Return updated entitlements
    const entitlements = await entitlementsService.getUserEntitlements(userId);

    res.json({
      success: true,
      entitlements,
    });
  } catch (error) {
    console.error('Error syncing mobile purchases:', error);
    res.status(500).json({ error: 'Failed to sync purchases' });
  }
});

/**
 * GET /api/mobile/subscriber
 * Get RevenueCat subscriber info for mobile app
 */
router.get('/mobile/subscriber', requireAuth(), async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscriber = await revenueCatService.getSubscriber(userId);

    res.json({
      hasSubscriber: !!subscriber,
      subscriber: subscriber?.subscriber || null,
    });
  } catch (error) {
    console.error('Error fetching subscriber:', error);
    res.status(500).json({ error: 'Failed to fetch subscriber info' });
  }
});

/**
 * POST /api/webhooks/revenuecat
 * Handle RevenueCat webhook events (mobile purchases)
 */
router.post('/webhooks/revenuecat', async (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

  // Require webhook secret in production
  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('REVENUECAT_WEBHOOK_SECRET not configured - rejecting webhook');
      return res.status(503).json({ error: 'Webhook not configured' });
    }
    console.warn('REVENUECAT_WEBHOOK_SECRET not set - accepting webhook in development');
  }

  // Always verify webhook authenticity when secret is configured
  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    console.warn('RevenueCat webhook auth failed - invalid secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const event = req.body;

    if (!event || !event.event) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    console.log('RevenueCat webhook received:', event.event.type);

    await revenueCatService.handleWebhook(event);

    res.json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
