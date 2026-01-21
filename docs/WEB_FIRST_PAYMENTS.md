# Web-First Payment Strategy

## Overview

SemaSlim uses a **web-first payment strategy** to minimize platform fees and maximize revenue. Instead of using Apple In-App Purchase (IAP) or Google Play Billing, mobile users are directed to complete purchases through Stripe web checkout.

## Why Web-First?

| Payment Method | Fee | Net Revenue (on $9.99) |
|---------------|-----|------------------------|
| Apple IAP | 30% (15% for small business) | $6.99 - $8.49 |
| Google Play | 30% (15% for subscriptions) | $6.99 - $8.49 |
| Stripe | 2.9% + $0.30 | ~$9.40 |

**Savings per $9.99 subscription: $2.41 - $2.91**

Over 1,000 subscribers, this saves **$2,410 - $2,910/month**.

## How It Works

### Mobile User Flow

```
┌─────────────────┐
│   Mobile App    │
│  "Upgrade Pro"  │
└────────┬────────┘
         │
         │ Deep link to web checkout
         ▼
┌─────────────────┐
│  Web Checkout   │
│  /checkout?...  │
└────────┬────────┘
         │
         │ Stripe checkout
         ▼
┌─────────────────┐
│ Stripe Payment  │
│    Form         │
└────────┬────────┘
         │
         │ Payment success
         ▼
┌─────────────────┐
│ Success Page    │
│ /checkout/success│
└────────┬────────┘
         │
         │ Deep link back
         ▼
┌─────────────────┐
│   Mobile App    │
│ Features unlocked│
└─────────────────┘
```

### URL Structure

**Subscription checkout:**
```
https://your-domain.com/checkout?plan=monthly&return_url=semaslim://checkout-complete
https://your-domain.com/checkout?plan=annual&return_url=semaslim://checkout-complete
```

**Token purchase:**
```
https://your-domain.com/checkout?product=ai_tokens_5&return_url=semaslim://checkout-complete
https://your-domain.com/checkout?product=streak_shields_3&return_url=semaslim://checkout-complete
```

## Mobile App Integration

### iOS (Swift)

```swift
import UIKit

class PaymentManager {
    static let webCheckoutBaseURL = "https://your-domain.com/checkout"
    static let appScheme = "semaslim"

    /// Opens web checkout for subscription
    static func openSubscriptionCheckout(plan: String) {
        let returnURL = "\(appScheme)://checkout-complete"
        let checkoutURL = "\(webCheckoutBaseURL)?plan=\(plan)&return_url=\(returnURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"

        if let url = URL(string: checkoutURL) {
            UIApplication.shared.open(url)
        }
    }

    /// Opens web checkout for token purchase
    static func openTokenPurchase(productId: String) {
        let returnURL = "\(appScheme)://checkout-complete"
        let checkoutURL = "\(webCheckoutBaseURL)?product=\(productId)&return_url=\(returnURL.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)!)"

        if let url = URL(string: checkoutURL) {
            UIApplication.shared.open(url)
        }
    }
}

// Usage in SwiftUI
Button("Upgrade to Pro") {
    PaymentManager.openSubscriptionCheckout(plan: "monthly")
}

// Handle return in SceneDelegate
func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }

    if url.host == "checkout-complete" {
        // Refresh user entitlements
        NotificationCenter.default.post(name: .purchaseCompleted, object: nil)
    }
}
```

### Android (Kotlin)

```kotlin
class PaymentManager {
    companion object {
        private const val WEB_CHECKOUT_BASE_URL = "https://your-domain.com/checkout"
        private const val APP_SCHEME = "semaslim"

        fun openSubscriptionCheckout(context: Context, plan: String) {
            val returnUrl = "$APP_SCHEME://checkout-complete"
            val checkoutUrl = "$WEB_CHECKOUT_BASE_URL?plan=$plan&return_url=${URLEncoder.encode(returnUrl, "UTF-8")}"

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
            context.startActivity(intent)
        }

        fun openTokenPurchase(context: Context, productId: String) {
            val returnUrl = "$APP_SCHEME://checkout-complete"
            val checkoutUrl = "$WEB_CHECKOUT_BASE_URL?product=$productId&return_url=${URLEncoder.encode(returnUrl, "UTF-8")}"

            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(checkoutUrl))
            context.startActivity(intent)
        }
    }
}

// In AndroidManifest.xml - Add intent filter for deep link
<activity android:name=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="semaslim" android:host="checkout-complete" />
    </intent-filter>
</activity>

// Handle deep link in Activity
override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    intent?.data?.let { uri ->
        if (uri.host == "checkout-complete") {
            // Refresh user entitlements
            refreshEntitlements()
        }
    }
}
```

### React Native / Expo

```typescript
import { Linking } from 'react-native';

const WEB_CHECKOUT_BASE_URL = 'https://your-domain.com/checkout';
const APP_SCHEME = 'semaslim';

export async function openSubscriptionCheckout(plan: 'monthly' | 'annual') {
  const returnUrl = `${APP_SCHEME}://checkout-complete`;
  const checkoutUrl = `${WEB_CHECKOUT_BASE_URL}?plan=${plan}&return_url=${encodeURIComponent(returnUrl)}`;

  await Linking.openURL(checkoutUrl);
}

export async function openTokenPurchase(productId: string) {
  const returnUrl = `${APP_SCHEME}://checkout-complete`;
  const checkoutUrl = `${WEB_CHECKOUT_BASE_URL}?product=${productId}&return_url=${encodeURIComponent(returnUrl)}`;

  await Linking.openURL(checkoutUrl);
}

// Listen for deep link return
useEffect(() => {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (url.includes('checkout-complete')) {
      // Refresh user entitlements
      refetchEntitlements();
    }
  });

  return () => subscription.remove();
}, []);
```

## App Store Compliance

### Apple App Store Guidelines

Apple allows apps to direct users to external payment methods under specific conditions:

1. **Reader Apps** (3.1.3(a)): Apps that allow users to access previously purchased content (books, audio, video, news) may use external links.

2. **External Link Entitlement** (3.1.3(b)): Apps may apply for the "External Link Account Entitlement" to link to their website for account management.

3. **Anti-Steering Provisions Removed** (2024): Following legal settlements, Apple now allows apps to inform users about alternative payment methods.

**Recommended approach for SemaSlim:**
- Apply for External Link Account Entitlement
- Clearly communicate that payment is processed externally
- Ensure the web checkout experience is seamless

### Google Play Guidelines

Google Play's policies are more lenient:
- Apps can direct users to websites for payment
- No specific entitlement required
- Must clearly indicate external payment processing

## Fallback: RevenueCat IAP

If required by platform policies, RevenueCat IAP can be enabled as a fallback:

```typescript
// In mobile app
async function handlePurchase(product: string) {
  // Check if external payments are allowed (feature flag)
  const useWebPayments = await getFeatureFlag('web_payments');

  if (useWebPayments) {
    // Preferred: Web checkout (lower fees)
    openWebCheckout(product);
  } else {
    // Fallback: RevenueCat IAP
    const offerings = await Purchases.getOfferings();
    const package = offerings.current?.availablePackages.find(p => p.identifier === product);
    if (package) {
      await Purchases.purchasePackage(package);
    }
  }
}
```

## Syncing Entitlements

After a web payment, entitlements are automatically synced via Stripe webhooks. However, the mobile app should also refresh entitlements:

### API Endpoint

```
POST /api/mobile/sync-purchases
Authorization: Bearer <clerk_token>
```

This endpoint:
1. Checks Stripe for active subscriptions
2. Checks RevenueCat for mobile purchases
3. Updates the user's entitlements
4. Returns current subscription status

### Mobile Implementation

```typescript
// Call after returning from web checkout
async function syncAfterPurchase() {
  const response = await fetch('/api/mobile/sync-purchases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getAuthToken()}`,
      'Content-Type': 'application/json',
    },
  });

  const { subscription, entitlements } = await response.json();
  updateLocalState(subscription, entitlements);
}
```

## Pricing Display

When showing prices in the mobile app, use the web prices (which don't include platform fees):

| Product | Web Price | Display Price |
|---------|-----------|---------------|
| Pro Monthly | $9.99/mo | $9.99/mo |
| Pro Annual | $79.99/yr | $79.99/yr |
| 5 AI Tokens | $4.99 | $4.99 |
| 15 AI Tokens | $11.99 | $11.99 |
| 3 Streak Shields | $2.99 | $2.99 |
| PDF Export | $1.99 | $1.99 |

## Environment Configuration

Required environment variables:

```env
# Frontend
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Backend
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: RevenueCat fallback
REVENUECAT_API_KEY=sk_...
REVENUECAT_WEBHOOK_SECRET=...
```

## Testing

### Test URLs

Development:
```
http://localhost:5173/checkout?plan=monthly&return_url=semaslim://checkout-complete
http://localhost:5173/checkout?product=ai_tokens_5&return_url=semaslim://checkout-complete
```

Production:
```
https://app.semaslim.com/checkout?plan=monthly&return_url=semaslim://checkout-complete
```

### Stripe Test Cards

| Card Number | Result |
|-------------|--------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Declined |
| 4000 0000 0000 3220 | 3D Secure required |

## Summary

The web-first payment strategy:
- Saves 12-27% on every transaction
- Provides consistent checkout experience across web and mobile
- Simplifies subscription management (single Stripe dashboard)
- Maintains compliance with app store policies through proper implementation

For questions or issues, contact the development team.
