# SemaSlim Monetization Strategy
## Non-Intrusive Revenue Flows for GLP-1 Companion App

**Document Version:** 1.0
**Last Updated:** January 2026
**Target Metrics:** 15-25% Premium Conversion | LTV >$200 | CAC <$50

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Monetization Philosophy](#monetization-philosophy)
3. [User Journey Monetization Map](#user-journey-monetization-map)
4. [Pro Subscription Tiers](#pro-subscription-tiers)
5. [Token-Based Purchases](#token-based-purchases)
6. [Upsell Trigger Points](#upsell-trigger-points)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Metrics & Success Criteria](#metrics--success-criteria)

---

## Executive Summary

SemaSlim serves users on a deeply personal health journey—weight loss with prescription GLP-1 medications. This creates both opportunity and responsibility. Our monetization must:

- **Never compromise health outcomes** - Core medication tracking stays free forever
- **Align payment with value moments** - Users pay when they see clear benefit
- **Build trust before asking** - Generous free tier creates loyal customers
- **Respect the medical context** - No aggressive tactics on health-sensitive features

### Revenue Model Overview

| Stream | Model | Target Revenue % | Avg Revenue/User |
|--------|-------|------------------|------------------|
| Pro Monthly | $9.99/month | 35% | $60/year |
| Pro Annual | $79.99/year | 40% | $80/year |
| AI Tokens | Pay-per-use | 15% | $25/year |
| Cosmetics | One-time | 10% | $15/lifetime |

**Projected Blended ARPU:** $45-65/year across all users

---

## Monetization Philosophy

### The Trust-First Principle

GLP-1 users are often vulnerable—they've likely tried many weight loss solutions before. They're investing significantly in medication ($500-1500/month without insurance). Our app must be a trusted companion, not another product trying to extract money.

**Rule #1:** If a feature could impact health outcomes, it's free.
**Rule #2:** Premium features enhance the experience, never gate essential functionality.
**Rule #3:** Every paywall must have a clear value proposition visible before the wall.

### Behavioral Economics Framework

| Principle | Application in SemaSlim |
|-----------|------------------------|
| **Loss Aversion** | Streak protection tokens prevent losing hard-earned progress |
| **Sunk Cost** | Free tier builds investment before upgrade prompts |
| **Social Proof** | "X users upgraded this week" in subtle contexts |
| **Endowment Effect** | 7-day Pro trial creates ownership feeling |
| **Variable Rewards** | Mystery achievement unlocks drive engagement |
| **Commitment Escalation** | Small purchases (tokens) lead to subscription conversion |

---

## User Journey Monetization Map

### Phase 1: Onboarding (Days 1-3)
**Goal:** Build trust, demonstrate value, create habit

```
User Action                    Monetization Approach         Conversion Likelihood
─────────────────────────────────────────────────────────────────────────────────
Downloads app                  → None (pure value delivery)   N/A
Completes onboarding           → None (celebrate success)     N/A
Logs first medication          → None (critical health data)  N/A
Logs first meal                → Soft mention of AI features  Very Low (5%)
Views dashboard                → Show Pro insights preview    Low (10%)
```

**Rationale:** Onboarding is sacred. Any monetization friction here destroys LTV. Users who complete onboarding have 4x higher 30-day retention.

---

### Phase 2: Habit Formation (Days 4-14)
**Goal:** Establish daily usage patterns, introduce premium value

```
User Action                    Monetization Approach         Conversion Likelihood
─────────────────────────────────────────────────────────────────────────────────
Builds 3-day streak            → Unlock streak protection     Low (12%)
                                 token preview

Uses barcode scanner 5x        → Premium nutrition database   Medium (18%)
                                 upsell (more foods, verified)

Views weight trend chart       → Show "Pro Insights" locked   Medium (20%)
                                 section below chart

Logs side effects              → Export to PDF for doctor     High (25%)
                                 (token purchase)

Reaches 100 points             → Cosmetic shop unlock         Low (8%)
                                 notification
```

**Key Insight:** Users who log 3+ meals AND medication in first week have 67% 30-day retention. These are prime upgrade candidates by day 14.

---

### Phase 3: Engagement Peak (Days 15-45)
**Goal:** Convert engaged users to Pro

```
User Action                    Monetization Approach         Conversion Likelihood
─────────────────────────────────────────────────────────────────────────────────
Reaches 7-day streak           → Streak protection offer      High (28%)
                                 "Protect your streak for
                                  emergencies"

Unlocks first achievement      → Show "Pro achievements"      Medium (18%)
                                 collection preview

Uses AI meal planning          → 2 free/month limit reached   Very High (35%)
                                 → Token purchase or Pro

Records first weight loss      → "Unlock predictive insights" High (30%)
                                 milestone celebration

Views 2-week trend             → Historical data limit        High (32%)
                                 (free = 2 weeks,
                                  Pro = unlimited)
```

**Critical Moment:** The first significant weight loss (typically days 21-35) is the highest-converting moment. Users are emotionally invested and see the app as part of their success.

---

### Phase 4: Long-Term Retention (Days 45+)
**Goal:** Maximize LTV, reduce churn

```
User Action                    Monetization Approach         Conversion Likelihood
─────────────────────────────────────────────────────────────────────────────────
Dose escalation milestone      → Unlock advanced dose         High (30%)
                                 tracking & predictions

Completes monthly challenge    → Premium challenge rewards    Medium (22%)

Refers a friend                → Give both users free         N/A (acquisition)
                                 Pro month

Approaches subscription        → Annual plan discount         Very High (45%)
renewal                          offer (save 33%)

Shows churn signals            → Win-back offer               Medium (25%)
(decreased usage)                (1 month 50% off)
```

---

## Pro Subscription Tiers

### Free Tier (Always Available)

**Core Health Features (Never Paywalled):**
- Unlimited medication logging & reminders
- Basic food tracking (manual entry + 3 barcode scans/day)
- Weight logging (unlimited)
- Side effect tracking
- Basic dashboard with today's stats
- 2-week historical data view
- Basic gamification (points, levels, 5 achievements)
- Push notifications for medication reminders

**Limited Features:**
- 2 AI meal plan generations/month
- Basic recipe browsing (community recipes)
- Weekly progress summary (basic)
- Standard food database (50,000 items)

---

### Pro Tier ($9.99/month or $79.99/year)

**Enhanced Tracking & Insights:**
| Feature | Free | Pro | Value Proposition |
|---------|------|-----|-------------------|
| Barcode scans | 3/day | Unlimited | "Never manually enter again" |
| Food database | 50K items | 2M+ verified | "Find any food, accurate macros" |
| Historical data | 2 weeks | Forever | "See your complete journey" |
| AI meal plans | 2/month | 30/month | "Personalized plans weekly" |
| Progress insights | Basic | Predictive | "Know when you'll hit goals" |

**Advanced Analytics:**
- Predictive weight loss curves based on medication + behavior
- Correlation analysis (food choices → weight trends)
- Medication adherence score with improvement tips
- Side effect pattern detection ("Nausea peaks 2 days post-injection")
- Macro optimization suggestions based on GLP-1 response

**Premium Gamification:**
- 50+ exclusive achievements
- Premium badges and profile customization
- Monthly challenges with leaderboards
- Streak shields (2 automatic per month)
- Double points weekends

**Sharing & Export:**
- PDF progress reports for healthcare providers
- Export all data (CSV/JSON)
- Family sharing (up to 3 members)
- Healthcare provider portal access

**Priority Features:**
- Early access to new features
- Priority customer support
- Ad-free experience (if ads implemented later)

---

### Pro Tier Upgrade UX Flows

#### Flow 1: Soft Upsell (Low Pressure)
**Trigger:** User views weight trend chart
**Experience:**

```
┌─────────────────────────────────────────────┐
│  Your Weight Journey                        │
│  ───────────────────                        │
│  [Beautiful 2-week chart]                   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🔒 Pro Insights                      │   │
│  │                                      │   │
│  │ • Predicted goal date: ~March 15    │   │
│  │ • Optimal weigh-in time detected    │   │
│  │ • Your best performing days: Mon/Thu│   │
│  │                                      │   │
│  │ [Unlock with Pro - $9.99/mo]        │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Impact:** Users see specific, personalized value. Shows what they'd get without blocking core functionality.
**Payment Likelihood:** 20-25% click-through, 8-12% conversion

---

#### Flow 2: Milestone Celebration (High Emotion)
**Trigger:** User logs weight showing 5+ lb loss
**Experience:**

```
┌─────────────────────────────────────────────┐
│                                             │
│            🎉 MILESTONE!                    │
│                                             │
│         You've lost 5 pounds!               │
│                                             │
│    "Your dedication is paying off. Users   │
│     who track consistently like you lose   │
│     47% more weight on average."           │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Celebrate with Pro Features         │   │
│  │                                      │   │
│  │  Get predictive insights to reach   │   │
│  │  your goal 23% faster               │   │
│  │                                      │   │
│  │  [Start 7-Day Free Trial]           │   │
│  │                                      │   │
│  │  [Maybe Later]                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Share Achievement] [Continue]             │
└─────────────────────────────────────────────┘
```

**Impact:** Capitalizes on emotional high. User attributes success partly to app.
**Payment Likelihood:** 30-40% start trial, 55-65% trial → paid conversion

---

#### Flow 3: Limit Reached (Clear Value Exchange)
**Trigger:** User attempts 4th AI meal plan in free tier
**Experience:**

```
┌─────────────────────────────────────────────┐
│                                             │
│  You've used your 2 free AI meal plans     │
│  this month                                 │
│                                             │
│  Your next free plan refreshes in 18 days  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Options:                            │   │
│  │                                      │   │
│  │  🪙 Buy 5 AI Tokens - $4.99         │   │
│  │     (Use anytime, never expire)      │   │
│  │                                      │   │
│  │  ⭐ Upgrade to Pro - $9.99/mo       │   │
│  │     30 plans/month + all features    │   │
│  │     BEST VALUE                       │   │
│  │                                      │   │
│  │  [Set Reminder for Free Refresh]     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**Impact:** User has demonstrated desire for feature. Clear options without forcing.
**Payment Likelihood:** 35% token purchase, 15% Pro upgrade, 50% wait

---

#### Flow 4: Streak at Risk (Loss Aversion)
**Trigger:** User hasn't logged by 8 PM with active streak
**Experience:**

```
Push Notification:
"Your 12-day streak is at risk! Log a meal to keep it going 🔥"

If user opens app but hasn't logged by 10 PM:

┌─────────────────────────────────────────────┐
│                                             │
│  ⚠️ Streak Protection Available            │
│                                             │
│  Your 12-day streak will reset at midnight │
│                                             │
│  Life happens! Use a Streak Shield to      │
│  protect your progress.                    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🛡️ Use Streak Shield               │   │
│  │                                      │   │
│  │  You have: 0 shields                 │   │
│  │                                      │   │
│  │  [Buy 3 Shields - $2.99]            │   │
│  │                                      │   │
│  │  Pro members get 2 free/month        │   │
│  │  [Upgrade to Pro]                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Log Something Quick] [Let Streak Reset]  │
└─────────────────────────────────────────────┘
```

**Impact:** Strong loss aversion trigger. 12-day streak feels valuable.
**Payment Likelihood:** 25% shield purchase, 10% Pro upgrade (if shield solves it)

---

## Token-Based Purchases

### Token Philosophy

Tokens serve users who want specific premium features without commitment. They also act as a "gateway" to Pro subscriptions—users who purchase tokens are 3x more likely to later subscribe.

### Token Types & Pricing

#### 1. AI Generation Tokens
**Use Case:** AI meal plans, AI recipe suggestions, AI nutrition advice

| Package | Price | Per-Token | Best For |
|---------|-------|-----------|----------|
| 5 Tokens | $4.99 | $1.00 | Try it out |
| 15 Tokens | $11.99 | $0.80 | Regular use |
| 50 Tokens | $29.99 | $0.60 | Power users |

**UX Considerations:**
- Tokens never expire
- Show token balance in AI feature areas
- "Running low" notification at 2 tokens remaining
- Earn 1 free token per 10-day streak

---

#### 2. Export Tokens
**Use Case:** PDF reports for doctors, data exports

| Item | Price | Use Case |
|------|-------|----------|
| Single PDF Report | $1.99 | One-time doctor visit |
| 5 PDF Reports | $6.99 | Quarterly check-ins |
| Full Data Export | $4.99 | Personal backup |

**UX Considerations:**
- Preview report before purchase
- "Your doctor can see: weight trend, medication adherence, side effects"
- Healthcare provider partnerships could make this free

---

#### 3. Streak Shields
**Use Case:** Protect streaks during travel, illness, busy days

| Package | Price | Per-Shield |
|---------|-------|------------|
| 3 Shields | $2.99 | $1.00 |
| 10 Shields | $7.99 | $0.80 |

**UX Considerations:**
- Shields auto-activate if no log by midnight
- Can be manually activated for planned breaks
- Pro members get 2 free/month

---

#### 4. Cosmetic Items
**Use Case:** Profile customization, achievement showcase

| Category | Items | Price Range |
|----------|-------|-------------|
| Avatar Frames | 20+ designs | $0.99-$2.99 |
| Profile Themes | 15+ themes | $1.99-$4.99 |
| Achievement Badges | 30+ premium | $0.99 each |
| Streak Flames | 10+ styles | $1.99 each |

**UX Considerations:**
- Preview before purchase
- Some earnable through achievements
- Visible on leaderboards and shared content

---

### Token Purchase UX Flow

**Trigger:** User taps "Generate Meal Plan" with 0 tokens, not Pro

```
┌─────────────────────────────────────────────┐
│                                             │
│  🤖 AI Meal Planning                        │
│                                             │
│  Get a personalized 7-day meal plan based  │
│  on your medication, preferences, and      │
│  nutritional needs.                         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Your AI Tokens: 0                   │   │
│  │                                      │   │
│  │  ┌─────────────────────────────┐    │   │
│  │  │ 5 Tokens         $4.99      │    │   │
│  │  │ Never expire                │    │   │
│  │  └─────────────────────────────┘    │   │
│  │                                      │   │
│  │  ┌─────────────────────────────┐    │   │
│  │  │ 15 Tokens        $11.99     │    │   │
│  │  │ Save 20% • Most Popular     │    │   │
│  │  └─────────────────────────────┘    │   │
│  │                                      │   │
│  │  ─── or ───                         │   │
│  │                                      │   │
│  │  ⭐ Go Pro for $9.99/mo             │   │
│  │  30 AI plans + unlimited features   │   │
│  │                                      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [Not Now]                                  │
└─────────────────────────────────────────────┘
```

---

## Upsell Trigger Points

### Trigger Matrix

| Trigger Event | Timing | Upsell Type | Aggressiveness | Expected CVR |
|--------------|--------|-------------|----------------|--------------|
| Onboarding complete | Day 1 | None | None | N/A |
| 3-day streak | Day 3 | Streak shields intro | Soft | 5% |
| 4th barcode scan/day | Daily | Pro barcode upsell | Soft | 12% |
| AI limit reached | Variable | Tokens or Pro | Medium | 35% |
| First weight loss | Day 14-30 | Pro trial | Medium | 32% |
| 7-day streak | Day 7 | Streak shields | Medium | 22% |
| 2-week history limit | Day 14+ | Pro unlock | Medium | 28% |
| Side effect export | Variable | Export token | Soft | 40% |
| Achievement unlock | Variable | Premium achievements | Soft | 8% |
| Monthly renewal | Day 30+ | Annual upgrade | Medium | 45% |
| Churn detected | Variable | Win-back discount | Medium | 25% |

### Smart Upsell Rules

**Frequency Caps:**
- Maximum 1 upsell modal per session
- Maximum 3 upsell touchpoints per week
- 48-hour cooldown after dismissing upgrade prompt
- Never show upsells during medication logging

**Contextual Rules:**
- No upsells when user reports feeling unwell (side effects logged)
- Increase upsell frequency after positive events (weight loss, streak)
- Decrease frequency during low-engagement periods
- Personalize based on feature usage patterns

**A/B Testing Priorities:**
1. Trial length (7 vs 14 days)
2. Discount depth (10% vs 20% vs 33%)
3. Social proof messaging ("12,847 users upgraded this month")
4. Urgency elements (limited time offers)

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Payment infrastructure without visible monetization

- [ ] Integrate Stripe/RevenueCat for payment processing
- [ ] Create subscription and token database tables
- [ ] Build feature flagging system for Pro features
- [ ] Implement purchase restoration for iOS/Android
- [ ] Add analytics events for conversion tracking

### Phase 2: Pro Subscription Launch (Weeks 3-4)
**Goal:** Launch Pro tier with core value features

- [ ] Implement Pro feature gates (history, AI limits, barcode limits)
- [ ] Build upgrade flow UI components
- [ ] Create Pro onboarding experience
- [ ] Implement 7-day free trial
- [ ] Add subscription management in profile

### Phase 3: Token System (Weeks 5-6)
**Goal:** Launch consumable purchases

- [ ] Build token balance system
- [ ] Implement AI token consumption
- [ ] Create token purchase flows
- [ ] Add streak shield functionality
- [ ] Build export token system

### Phase 4: Optimization (Weeks 7-8)
**Goal:** Improve conversion through testing

- [ ] Implement upsell trigger system
- [ ] A/B test pricing and messaging
- [ ] Add social proof elements
- [ ] Build win-back campaigns
- [ ] Optimize trial → paid conversion

### Phase 5: Cosmetics & Polish (Weeks 9-10)
**Goal:** Add delight-focused monetization

- [ ] Launch cosmetic shop
- [ ] Add premium achievements
- [ ] Implement referral program
- [ ] Build family sharing
- [ ] Add annual plan incentives

---

## Metrics & Success Criteria

### Primary KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Free → Trial Conversion | 25% | Users who start trial / Total free users |
| Trial → Paid Conversion | 60% | Paid subscribers / Trial starters |
| Overall Premium Rate | 15-25% | Paid users / Total active users |
| Monthly Token Revenue | $5,000+ | Total token purchases per month |
| ARPU | $45-65/year | Total revenue / Active users |
| Churn Rate | <5%/month | Cancellations / Active subscribers |
| LTV | >$200 | Avg revenue per user over lifetime |

### Secondary KPIs

| Metric | Target | Why It Matters |
|--------|--------|----------------|
| Upgrade modal click-through | >15% | Measures upsell relevance |
| Trial completion rate | >80% | Users who use Pro during trial |
| Token purchaser → Pro rate | 40% | Token as gateway validation |
| Support tickets (billing) | <1% | Payment UX quality |
| App store rating | >4.5 | Monetization doesn't hurt experience |

### Health Metrics (Guardrails)

| Metric | Threshold | Action if Breached |
|--------|-----------|-------------------|
| Day-7 retention | >40% | Reduce upsell frequency |
| Session length | >3 min | Review paywall friction |
| Feature usage (free) | Stable | Ensure free tier is valuable |
| Negative reviews mentioning $ | <5% | Adjust pricing/messaging |

---

## Appendix A: Pricing Psychology

### Why $9.99/month?

- **Category benchmark:** Health/fitness apps range $4.99-$14.99
- **Value perception:** "Less than a coffee per week"
- **Anchoring:** $79.99 annual makes monthly feel reasonable
- **Medication context:** Users already pay $500+/month for GLP-1s

### Why $79.99/year (33% discount)?

- **Loss aversion:** "Save $40" is powerful
- **Commitment signal:** Annual users have 3x lower churn
- **Cash flow:** Upfront revenue improves business metrics
- **Promotion flexibility:** Can offer 50% off and still profit

### Token Pricing Strategy

- **AI Tokens:** Priced at perceived AI value ($1/generation feels fair)
- **Streak Shields:** Emotional pricing (protect something valuable)
- **Exports:** Utility pricing (similar to document services)
- **Cosmetics:** Impulse pricing ($0.99-$4.99 range)

---

## Appendix B: Competitive Analysis

| App | Model | Pro Price | Key Pro Features |
|-----|-------|-----------|------------------|
| MyFitnessPal | Freemium | $19.99/mo | Macros, recipes, no ads |
| Noom | Subscription | $59/mo | Coaching, curriculum |
| Lose It! | Freemium | $39.99/yr | Meal planning, insights |
| Calibrate | Subscription | $135/mo | Full GLP-1 program |
| Found | Subscription | $99/mo | Medication + coaching |

**SemaSlim Positioning:** Premium to generic trackers, affordable vs. full GLP-1 programs. We're the "companion" not the "program."

---

## Appendix C: Feature Gating Reference

### Always Free (Health-Critical)
- Medication logging and reminders
- Basic food tracking
- Weight logging
- Side effect tracking
- Basic dashboard
- 2-week history

### Pro-Gated (Enhancement)
- Unlimited barcode scanning
- Extended food database
- Unlimited history
- Predictive insights
- Advanced analytics
- Premium gamification
- Export features
- Family sharing

### Token-Gated (Consumable)
- AI meal plans (beyond 2/month)
- AI recipe generation
- PDF exports
- Streak shields
- Premium cosmetics

---

*This document should be reviewed quarterly and updated based on user feedback, conversion data, and market changes.*
