# RevenueCat Setup Guide for SemaSlim

## Overview

This guide walks through setting up RevenueCat for SemaSlim's mobile in-app purchases.

**Your API Key:** `sk_FRrSVmwxtNfetWtdsRCCbFeRVrrIP`

---

## Step 1: Create Products in App Stores

Before RevenueCat can manage purchases, you must create the products in App Store Connect and Google Play Console.

### iOS (App Store Connect)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → Subscriptions / In-App Purchases
3. Create these products:

| Product ID | Type | Price | Description |
|------------|------|-------|-------------|
| `com.semaslim.pro.monthly` | Auto-Renewable Subscription | $9.99/month | SemaSlim Pro Monthly |
| `com.semaslim.pro.annual` | Auto-Renewable Subscription | $79.99/year | SemaSlim Pro Annual |
| `com.semaslim.tokens.ai.5` | Consumable | $4.99 | 5 AI Tokens |
| `com.semaslim.tokens.ai.15` | Consumable | $11.99 | 15 AI Tokens |
| `com.semaslim.shields.3` | Consumable | $2.99 | 3 Streak Shields |
| `com.semaslim.export.single` | Consumable | $1.99 | Single PDF Export |

### Android (Google Play Console)

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app → Monetize → Products
3. Create these products:

| Product ID | Type | Price | Description |
|------------|------|-------|-------------|
| `pro_monthly` | Subscription | $9.99/month | SemaSlim Pro Monthly |
| `pro_annual` | Subscription | $79.99/year | SemaSlim Pro Annual |
| `ai_tokens_5` | Managed Product | $4.99 | 5 AI Tokens |
| `ai_tokens_15` | Managed Product | $11.99 | 15 AI Tokens |
| `streak_shields_3` | Managed Product | $2.99 | 3 Streak Shields |
| `export_single` | Managed Product | $1.99 | Single PDF Export |

---

## Step 2: Configure RevenueCat Dashboard

### 2.1 Connect App Stores

1. Go to [RevenueCat Dashboard](https://app.revenuecat.com)
2. Select your project (or create one)
3. Go to **Project Settings** → **Apps**
4. Add iOS app:
   - Bundle ID: `com.semaslim.app` (your actual bundle ID)
   - App Store Connect API Key (create in App Store Connect → Users & Access → Keys)
5. Add Android app:
   - Package name: `com.semaslim.app`
   - Upload Google Play service account JSON

### 2.2 Create Products

1. Go to **Products** in the sidebar
2. Click **+ New** for each product
3. Link to App Store / Play Store products:

| RevenueCat ID | iOS Product | Android Product | Type |
|---------------|-------------|-----------------|------|
| `pro_monthly` | `com.semaslim.pro.monthly` | `pro_monthly` | Subscription |
| `pro_annual` | `com.semaslim.pro.annual` | `pro_annual` | Subscription |
| `ai_tokens_5` | `com.semaslim.tokens.ai.5` | `ai_tokens_5` | Non-subscription |
| `ai_tokens_15` | `com.semaslim.tokens.ai.15` | `ai_tokens_15` | Non-subscription |
| `streak_shields_3` | `com.semaslim.shields.3` | `streak_shields_3` | Non-subscription |
| `export_single` | `com.semaslim.export.single` | `export_single` | Non-subscription |

### 2.3 Create Entitlement

1. Go to **Entitlements** in the sidebar
2. Click **+ New**
3. Create entitlement:
   - Identifier: `pro`
   - Display Name: `Pro Access`
4. Attach products:
   - Click on the `pro` entitlement
   - Add `pro_monthly` and `pro_annual`

### 2.4 Create Offering

1. Go to **Offerings** in the sidebar
2. Click **+ New**
3. Create offering:
   - Identifier: `default`
   - Display Name: `Default`
4. Add packages:

| Package | Identifier | Product |
|---------|------------|---------|
| Monthly | `$rc_monthly` | `pro_monthly` |
| Annual | `$rc_annual` | `pro_annual` |
| AI Tokens 5 | `ai_tokens_5` | `ai_tokens_5` |
| AI Tokens 15 | `ai_tokens_15` | `ai_tokens_15` |
| Streak Shields | `streak_shields_3` | `streak_shields_3` |
| PDF Export | `export_single` | `export_single` |

5. Set `default` as the **Current Offering**

---

## Step 3: Configure Webhook

1. Go to **Project Settings** → **Integrations** → **Webhooks**
2. Click **+ New Webhook**
3. Configure:
   - **URL:** `https://your-domain.com/api/webhooks/revenuecat`
   - **Authorization Header:** `Bearer YOUR_WEBHOOK_SECRET`
4. Select events to send:
   - ✅ Initial Purchase
   - ✅ Renewal
   - ✅ Cancellation
   - ✅ Uncancellation
   - ✅ Non-renewing Purchase
   - ✅ Subscription Paused
   - ✅ Expiration
   - ✅ Billing Issue
   - ✅ Product Change
5. Save

**Generate a webhook secret:**
```bash
openssl rand -hex 32
```

---

## Step 4: Environment Variables

Add these to your server environment:

```env
# RevenueCat
REVENUECAT_API_KEY=sk_FRrSVmwxtNfetWtdsRCCbFeRVrrIP
REVENUECAT_WEBHOOK_SECRET=<your-generated-secret>
```

---

## Step 5: Mobile SDK Setup

### iOS (Swift)

```swift
// In AppDelegate or App init
import RevenueCat

Purchases.logLevel = .debug
Purchases.configure(withAPIKey: "YOUR_RC_PUBLIC_KEY", appUserID: clerkUserId)
```

### Android (Kotlin)

```kotlin
// In Application class
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration

Purchases.logLevel = LogLevel.DEBUG
Purchases.configure(
    PurchasesConfiguration.Builder(this, "YOUR_RC_PUBLIC_KEY")
        .appUserID(clerkUserId)
        .build()
)
```

### After Purchase - Sync with Server

```swift
// iOS - After successful purchase
func syncPurchaseWithServer() async {
    guard let token = try? await Clerk.shared.session?.getToken() else { return }

    var request = URLRequest(url: URL(string: "https://api.semaslim.com/api/mobile/sync-purchases")!)
    request.httpMethod = "POST"
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

    let (_, _) = try? await URLSession.shared.data(for: request)
}
```

---

## Product ID Mapping Reference

| Feature | RevenueCat ID | iOS ID | Android ID |
|---------|---------------|--------|------------|
| Pro Monthly | `pro_monthly` | `com.semaslim.pro.monthly` | `pro_monthly` |
| Pro Annual | `pro_annual` | `com.semaslim.pro.annual` | `pro_annual` |
| 5 AI Tokens | `ai_tokens_5` | `com.semaslim.tokens.ai.5` | `ai_tokens_5` |
| 15 AI Tokens | `ai_tokens_15` | `com.semaslim.tokens.ai.15` | `ai_tokens_15` |
| 3 Streak Shields | `streak_shields_3` | `com.semaslim.shields.3` | `streak_shields_3` |
| Single Export | `export_single` | `com.semaslim.export.single` | `export_single` |

---

## Testing

### Sandbox Testing

1. Create sandbox testers in App Store Connect
2. Use test accounts in Google Play Console
3. RevenueCat will automatically detect sandbox purchases

### Verify Webhook

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/api/webhooks/revenuecat \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "api_version": "1.0",
    "event": {
      "type": "TEST",
      "app_user_id": "test_user",
      "product_id": "pro_monthly"
    }
  }'
```

---

## Troubleshooting

### Purchase not syncing to server

1. Check webhook is configured correctly
2. Verify REVENUECAT_WEBHOOK_SECRET matches
3. Check server logs for webhook errors
4. Call `/api/mobile/sync-purchases` manually after purchase

### Entitlement not granting access

1. Verify product is attached to `pro` entitlement
2. Check user has active subscription in RevenueCat dashboard
3. Verify webhook is firing on purchase

### Products not showing in app

1. Verify products exist in App Store Connect / Play Console
2. Check products are linked in RevenueCat
3. Verify offering is set as current
4. Check RevenueCat SDK logs for errors
