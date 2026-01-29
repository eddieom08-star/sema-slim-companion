# App Store Compliance Requirements

## Critical: In-App Purchase Requirements

### Current Violation Risk
The current web-first payment strategy documented in `WEB_FIRST_PAYMENTS.md` explicitly aims to bypass Apple's 30% fee. This violates **App Store Review Guideline 3.1.1**:

> "If you want to unlock features or functionality within your app, you must use in-app purchase."

### Affected Products (Digital Goods)
The following products are **consumable digital goods** that require IAP:
- AI tokens (used for in-app AI features)
- Export tokens (used for PDF exports within app)
- Streak shields (used to protect streaks in app)
- Pro subscription (unlocks premium features)

### Recommended Compliance Strategy

#### Option 1: Dual Payment Path (Recommended)
Implement both web and native IAP:
1. **Native iOS**: Use RevenueCat SDK (already added in `PurchasesPlugin.swift`)
2. **Web/Desktop**: Continue using Stripe
3. **Revenue Split**: Accept 30% Apple fee on iOS, keep 100% on web

#### Option 2: External Link Account Entitlement
Apply for Apple's [External Link Account Entitlement](https://developer.apple.com/support/storekit-external-entitlement/):
1. Requires approval from Apple
2. Must still offer IAP as primary option
3. Can link to external website for purchase
4. **Eligibility**: Limited to specific app categories (reader apps, etc.)

**Warning**: SemaSlim is a health tracking app, NOT a reader app. The Reader App exemption (3.1.3a) does NOT apply.

### Implementation Checklist

- [x] RevenueCat SDK added to Podfile
- [x] PurchasesPlugin created for Capacitor
- [x] URL scheme registered for deep links
- [ ] RevenueCat products configured in dashboard
- [ ] App Store Connect IAP products created
- [ ] Paywall UI implemented with native purchase flow
- [ ] Stripe/RevenueCat backend sync implemented
- [ ] Receipt validation on server

## Guidelines Reference

### 3.1.1 In-App Purchase
> Apps may not use their own mechanisms to unlock content or functionality, such as license keys, augmented reality markers, QR codes, cryptocurrencies and cryptocurrency wallets, etc.

### 3.1.3 Other Purchase Methods
> Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired in your app on other platforms or your web site, including consumable items in multiplatform games, provided those items are also available as in-app purchases within the app.

### Anti-Steering (Updated 2024)
Apple now allows:
- Informing users of alternative purchase options
- Linking to external website (with approved entitlement)

Apple still requires:
- IAP must be offered as an option for in-app digital goods
- Cannot exclusively use external purchases for iOS users

## Server-Side Considerations

### RevenueCat Webhook Integration
The server already has RevenueCat webhook handling at `/api/webhooks/revenuecat`. Ensure:
1. Webhook secret is set in production
2. Subscription sync works bidirectionally
3. Token grants are idempotent (check transaction IDs)

### Stripe + RevenueCat Coexistence
- Web purchases → Stripe webhooks → Server DB
- iOS purchases → RevenueCat webhooks → Server DB
- Both should update the same `subscriptions` and `tokenBalances` tables
- User can have purchases from both sources

## Action Required Before App Store Submission

1. **Consult Legal**: Confirm External Link Account Entitlement eligibility
2. **Implement Native IAP**: Complete paywall with RevenueCat
3. **Test Purchase Flow**: End-to-end testing on TestFlight
4. **Prepare Response**: Document compliance for App Review team
5. **Consider Pricing**: Factor in 30% Apple fee for iOS pricing

## Risk Assessment

| Approach | Risk Level | Notes |
|----------|------------|-------|
| Web-only payments | **HIGH** | Will be rejected by App Review |
| IAP + Web dual path | **LOW** | Compliant, recommended |
| External Link Entitlement | **MEDIUM** | Requires Apple approval |
| No monetization on iOS | **NONE** | Compliant but loses revenue |

## References
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)
- [External Link Account Entitlement](https://developer.apple.com/support/storekit-external-entitlement/)
- [RevenueCat Documentation](https://www.revenuecat.com/docs)
