#!/usr/bin/env node

/**
 * RevenueCat Setup Script for SemaSlim
 *
 * This script provides CLI commands for managing RevenueCat configuration.
 *
 * Commands:
 *   setup      - Interactive setup wizard
 *   grant      - Grant promotional entitlement to a user
 *   revoke     - Revoke entitlement from a user
 *   check      - Check user's subscription status
 *   test       - Test API connectivity
 *
 * Usage:
 *   REVENUECAT_API_KEY=sk_xxx node scripts/setup-revenuecat.js <command> [args]
 *
 * Examples:
 *   node scripts/setup-revenuecat.js test
 *   node scripts/setup-revenuecat.js grant user_123 pro lifetime
 *   node scripts/setup-revenuecat.js check user_123
 */

const readline = require('readline');

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || 'sk_FRrSVmwxtNfetWtdsRCCbFeRVrrIP';
const REVENUECAT_API_V1_URL = 'https://api.revenuecat.com/v1';

// Product configuration matching our implementation
const SEMASLIM_CONFIG = {
  products: {
    subscriptions: [
      { id: 'pro_monthly', ios: 'com.semaslim.pro.monthly', android: 'pro_monthly', price: '$9.99/mo' },
      { id: 'pro_annual', ios: 'com.semaslim.pro.annual', android: 'pro_annual', price: '$79.99/yr' },
    ],
    consumables: [
      { id: 'ai_tokens_5', ios: 'com.semaslim.tokens.ai.5', android: 'ai_tokens_5', price: '$4.99' },
      { id: 'ai_tokens_15', ios: 'com.semaslim.tokens.ai.15', android: 'ai_tokens_15', price: '$11.99' },
      { id: 'streak_shields_3', ios: 'com.semaslim.shields.3', android: 'streak_shields_3', price: '$2.99' },
      { id: 'export_single', ios: 'com.semaslim.export.single', android: 'export_single', price: '$1.99' },
    ],
  },
  entitlements: [{ id: 'pro', name: 'Pro Access' }],
  webhook: {
    events: [
      'INITIAL_PURCHASE',
      'RENEWAL',
      'CANCELLATION',
      'UNCANCELLATION',
      'NON_RENEWING_PURCHASE',
      'EXPIRATION',
      'BILLING_ISSUE',
      'PRODUCT_CHANGE',
    ],
  },
};

// API v1 helper for subscriber operations
async function apiV1Request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${REVENUECAT_API_V1_URL}${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error ${response.status}: ${error}`);
  }

  return response.json();
}

// Commands

async function testConnection() {
  console.log('🔌 Testing RevenueCat API connection...\n');
  console.log(`API Key: ${REVENUECAT_API_KEY.substring(0, 15)}...`);

  try {
    // Test by fetching a non-existent user (should return 404 or empty)
    const testUserId = 'test_connection_' + Date.now();
    const result = await apiV1Request(`/subscribers/${testUserId}`);
    console.log('\n✅ Connection successful!');
    console.log('   API is responding correctly.\n');
    return true;
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('\n✅ Connection successful!');
      console.log('   API is responding correctly (user not found as expected).\n');
      return true;
    }
    console.error('\n❌ Connection failed:', error.message);
    return false;
  }
}

async function getSubscriber(userId) {
  console.log(`\n📋 Checking subscriber: ${userId}\n`);

  try {
    const result = await apiV1Request(`/subscribers/${userId}`);
    const subscriber = result.subscriber;

    console.log('Entitlements:');
    if (Object.keys(subscriber.entitlements).length === 0) {
      console.log('  (none)');
    } else {
      for (const [id, entitlement] of Object.entries(subscriber.entitlements)) {
        console.log(`  - ${id}: ${entitlement.expires_date || 'lifetime'}`);
      }
    }

    console.log('\nActive Subscriptions:');
    if (Object.keys(subscriber.subscriptions).length === 0) {
      console.log('  (none)');
    } else {
      for (const [id, sub] of Object.entries(subscriber.subscriptions)) {
        console.log(`  - ${id}: expires ${sub.expires_date}, store: ${sub.store}`);
      }
    }

    console.log('\nNon-Subscriptions (purchases):');
    if (Object.keys(subscriber.non_subscriptions).length === 0) {
      console.log('  (none)');
    } else {
      for (const [id, purchases] of Object.entries(subscriber.non_subscriptions)) {
        console.log(`  - ${id}: ${purchases.length} purchase(s)`);
      }
    }

    return subscriber;
  } catch (error) {
    if (error.message.includes('404')) {
      console.log('  User not found in RevenueCat (no purchases yet).\n');
      return null;
    }
    throw error;
  }
}

async function grantEntitlement(userId, entitlementId, duration = 'lifetime') {
  console.log(`\n🎁 Granting promotional entitlement...`);
  console.log(`   User: ${userId}`);
  console.log(`   Entitlement: ${entitlementId}`);
  console.log(`   Duration: ${duration}\n`);

  const validDurations = ['daily', 'three_day', 'weekly', 'two_week', 'monthly', 'two_month', 'three_month', 'six_month', 'yearly', 'lifetime'];
  if (!validDurations.includes(duration)) {
    throw new Error(`Invalid duration. Must be one of: ${validDurations.join(', ')}`);
  }

  try {
    const result = await apiV1Request(
      `/subscribers/${userId}/entitlements/${entitlementId}/promotional`,
      'POST',
      { duration }
    );

    console.log('✅ Entitlement granted successfully!\n');
    console.log(`   Expires: ${result.subscriber?.entitlements?.[entitlementId]?.expires_date || 'lifetime'}\n`);
    return result;
  } catch (error) {
    console.error('❌ Failed to grant entitlement:', error.message);
    throw error;
  }
}

async function revokeEntitlement(userId, entitlementId) {
  console.log(`\n🚫 Revoking entitlement...`);
  console.log(`   User: ${userId}`);
  console.log(`   Entitlement: ${entitlementId}\n`);

  try {
    const result = await apiV1Request(
      `/subscribers/${userId}/entitlements/${entitlementId}/revoke_promotionals`,
      'POST'
    );

    console.log('✅ Promotional entitlements revoked successfully!\n');
    return result;
  } catch (error) {
    console.error('❌ Failed to revoke entitlement:', error.message);
    throw error;
  }
}

async function interactiveSetup() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           SemaSlim RevenueCat Setup Wizard                        ║
╠════════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  This wizard will guide you through setting up RevenueCat for     ║
║  SemaSlim's monetization system.                                  ║
║                                                                    ║
║  API Key: ${REVENUECAT_API_KEY.substring(0, 20)}...
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
`);

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.log('Please check your API key and try again.');
    rl.close();
    return;
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 IMPORTANT: Configuration Steps

The sk_ API key (v1) can manage subscribers but cannot create products,
entitlements, or offerings. These must be configured in the dashboard.

For FULL programmatic setup, you need an API v2 key with OAuth scopes.
Generate one at: https://app.revenuecat.com → Project Settings → API Keys

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 STEP 1: Create Products in RevenueCat Dashboard
   https://app.revenuecat.com → Your Project → Products → + New

   Products to create:
`);

  console.log('   SUBSCRIPTIONS:');
  SEMASLIM_CONFIG.products.subscriptions.forEach(p => {
    console.log(`   ├─ ID: ${p.id}`);
    console.log(`   │  iOS: ${p.ios}`);
    console.log(`   │  Android: ${p.android}`);
    console.log(`   │  Price: ${p.price}`);
    console.log(`   │`);
  });

  console.log('   CONSUMABLES:');
  SEMASLIM_CONFIG.products.consumables.forEach(p => {
    console.log(`   ├─ ID: ${p.id}`);
    console.log(`   │  iOS: ${p.ios}`);
    console.log(`   │  Android: ${p.android}`);
    console.log(`   │  Price: ${p.price}`);
    console.log(`   │`);
  });

  await question('\nPress Enter when products are created...');

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 STEP 2: Create Entitlement
   https://app.revenuecat.com → Your Project → Entitlements → + New

   Create entitlement:
   ├─ Identifier: pro
   ├─ Display Name: Pro Access
   └─ Attach products: pro_monthly, pro_annual

`);

  await question('Press Enter when entitlement is created...');

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 STEP 3: Create Offering
   https://app.revenuecat.com → Your Project → Offerings → + New

   Create offering:
   ├─ Identifier: default
   ├─ Display Name: Default
   └─ Add all packages (monthly, annual, tokens, shields, exports)

   Then set as "Current Offering"

`);

  await question('Press Enter when offering is created...');

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 STEP 4: Configure Webhook
   https://app.revenuecat.com → Project Settings → Integrations → Webhooks

   Create webhook:
   ├─ URL: https://your-domain.com/api/webhooks/revenuecat
   ├─ Authorization: Bearer <your-webhook-secret>
   └─ Events: ${SEMASLIM_CONFIG.webhook.events.join(', ')}

   Generate webhook secret:
   openssl rand -hex 32

`);

  await question('Press Enter when webhook is configured...');

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ SETUP COMPLETE!

Environment variables to set:
  REVENUECAT_API_KEY=${REVENUECAT_API_KEY}
  REVENUECAT_WEBHOOK_SECRET=<your-generated-secret>

Available CLI commands:
  node scripts/setup-revenuecat.js check <user_id>     - Check user status
  node scripts/setup-revenuecat.js grant <user_id> pro lifetime - Grant Pro access
  node scripts/setup-revenuecat.js revoke <user_id> pro - Revoke Pro access

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  rl.close();
}

function showHelp() {
  console.log(`
SemaSlim RevenueCat CLI

Usage: node scripts/setup-revenuecat.js <command> [args]

Commands:
  setup                           Interactive setup wizard
  test                            Test API connection
  check <user_id>                 Check user's subscription status
  grant <user_id> <entitlement> <duration>   Grant promotional entitlement
  revoke <user_id> <entitlement>  Revoke promotional entitlement

Durations for grant:
  daily, three_day, weekly, two_week, monthly, two_month,
  three_month, six_month, yearly, lifetime

Examples:
  node scripts/setup-revenuecat.js test
  node scripts/setup-revenuecat.js check user_abc123
  node scripts/setup-revenuecat.js grant user_abc123 pro monthly
  node scripts/setup-revenuecat.js grant user_abc123 pro lifetime
  node scripts/setup-revenuecat.js revoke user_abc123 pro

Environment:
  REVENUECAT_API_KEY   Your RevenueCat secret API key (sk_xxx)
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!REVENUECAT_API_KEY) {
    console.error('Error: REVENUECAT_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'setup':
        await interactiveSetup();
        break;

      case 'test':
        await testConnection();
        break;

      case 'check':
        if (!args[1]) {
          console.error('Usage: check <user_id>');
          process.exit(1);
        }
        await getSubscriber(args[1]);
        break;

      case 'grant':
        if (!args[1] || !args[2]) {
          console.error('Usage: grant <user_id> <entitlement_id> [duration]');
          process.exit(1);
        }
        await grantEntitlement(args[1], args[2], args[3] || 'lifetime');
        break;

      case 'revoke':
        if (!args[1] || !args[2]) {
          console.error('Usage: revoke <user_id> <entitlement_id>');
          process.exit(1);
        }
        await revokeEntitlement(args[1], args[2]);
        break;

      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      default:
        if (command) {
          console.error(`Unknown command: ${command}\n`);
        }
        showHelp();
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
