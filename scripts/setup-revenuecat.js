#!/usr/bin/env node

/**
 * RevenueCat Setup Script
 *
 * Sets up products, entitlements, and offerings for SemaSlim monetization.
 *
 * Usage:
 *   REVENUECAT_API_KEY=sk_xxx REVENUECAT_PROJECT_ID=xxx node scripts/setup-revenuecat.js
 *
 * Note: Webhooks must be configured manually in the RevenueCat dashboard.
 */

const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY;
const REVENUECAT_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID;
const REVENUECAT_API_URL = 'https://api.revenuecat.com/v2';

if (!REVENUECAT_API_KEY) {
  console.error('Error: REVENUECAT_API_KEY environment variable is required');
  console.error('Usage: REVENUECAT_API_KEY=sk_xxx REVENUECAT_PROJECT_ID=xxx node scripts/setup-revenuecat.js');
  process.exit(1);
}

if (!REVENUECAT_PROJECT_ID) {
  console.error('Error: REVENUECAT_PROJECT_ID environment variable is required');
  console.error('Find your project ID in RevenueCat dashboard URL: https://app.revenuecat.com/projects/PROJECT_ID');
  process.exit(1);
}

// Product definitions
const PRODUCTS = {
  subscriptions: [
    {
      id: 'pro_monthly',
      displayName: 'SemaSlim Pro Monthly',
      appStoreProductId: 'com.semaslim.pro.monthly',
      playStoreProductId: 'pro_monthly',
      type: 'subscription',
    },
    {
      id: 'pro_annual',
      displayName: 'SemaSlim Pro Annual',
      appStoreProductId: 'com.semaslim.pro.annual',
      playStoreProductId: 'pro_annual',
      type: 'subscription',
    },
  ],
  consumables: [
    {
      id: 'ai_tokens_5',
      displayName: '5 AI Tokens',
      appStoreProductId: 'com.semaslim.tokens.ai.5',
      playStoreProductId: 'ai_tokens_5',
      type: 'consumable',
    },
    {
      id: 'ai_tokens_15',
      displayName: '15 AI Tokens',
      appStoreProductId: 'com.semaslim.tokens.ai.15',
      playStoreProductId: 'ai_tokens_15',
      type: 'consumable',
    },
    {
      id: 'streak_shields_3',
      displayName: '3 Streak Shields',
      appStoreProductId: 'com.semaslim.shields.3',
      playStoreProductId: 'streak_shields_3',
      type: 'consumable',
    },
    {
      id: 'export_single',
      displayName: 'Single PDF Export',
      appStoreProductId: 'com.semaslim.export.single',
      playStoreProductId: 'export_single',
      type: 'consumable',
    },
  ],
};

const ENTITLEMENTS = [
  {
    id: 'pro',
    displayName: 'Pro Access',
    products: ['pro_monthly', 'pro_annual'],
  },
];

async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${REVENUECAT_API_URL}/projects/${REVENUECAT_PROJECT_ID}${endpoint}`;

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

async function createProduct(product) {
  console.log(`  Creating product: ${product.id}...`);

  try {
    await apiRequest('/products', 'POST', {
      store_identifier: product.appStoreProductId,
      app_id: process.env.REVENUECAT_APP_ID_IOS,
      type: product.type === 'subscription' ? 'subscription' : 'non_subscription',
    });
    console.log(`    ✓ iOS product created: ${product.appStoreProductId}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`    - iOS product already exists: ${product.appStoreProductId}`);
    } else {
      console.log(`    ✗ iOS error: ${error.message}`);
    }
  }

  try {
    await apiRequest('/products', 'POST', {
      store_identifier: product.playStoreProductId,
      app_id: process.env.REVENUECAT_APP_ID_ANDROID,
      type: product.type === 'subscription' ? 'subscription' : 'non_subscription',
    });
    console.log(`    ✓ Android product created: ${product.playStoreProductId}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`    - Android product already exists: ${product.playStoreProductId}`);
    } else {
      console.log(`    ✗ Android error: ${error.message}`);
    }
  }
}

async function createEntitlement(entitlement) {
  console.log(`  Creating entitlement: ${entitlement.id}...`);

  try {
    await apiRequest('/entitlements', 'POST', {
      lookup_key: entitlement.id,
      display_name: entitlement.displayName,
    });
    console.log(`    ✓ Entitlement created: ${entitlement.id}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`    - Entitlement already exists: ${entitlement.id}`);
    } else {
      throw error;
    }
  }
}

async function attachProductToEntitlement(entitlementId, productId) {
  console.log(`    Attaching ${productId} to ${entitlementId}...`);

  try {
    await apiRequest(`/entitlements/${entitlementId}/products`, 'POST', {
      product_id: productId,
    });
    console.log(`      ✓ Attached ${productId}`);
  } catch (error) {
    if (error.message.includes('already attached') || error.message.includes('already exists')) {
      console.log(`      - Already attached: ${productId}`);
    } else {
      console.log(`      ✗ Error: ${error.message}`);
    }
  }
}

async function createOffering() {
  console.log('  Creating default offering...');

  try {
    await apiRequest('/offerings', 'POST', {
      lookup_key: 'default',
      display_name: 'Default Offering',
    });
    console.log('    ✓ Offering created: default');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('    - Offering already exists: default');
    } else {
      throw error;
    }
  }
}

async function createPackage(offeringId, packageData) {
  console.log(`    Creating package: ${packageData.id}...`);

  try {
    await apiRequest(`/offerings/${offeringId}/packages`, 'POST', {
      lookup_key: packageData.id,
      display_name: packageData.displayName,
      position: packageData.position,
    });
    console.log(`      ✓ Package created: ${packageData.id}`);
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`      - Package already exists: ${packageData.id}`);
    } else {
      console.log(`      ✗ Error: ${error.message}`);
    }
  }
}

async function main() {
  console.log('🚀 RevenueCat Setup for SemaSlim\n');
  console.log(`Project ID: ${REVENUECAT_PROJECT_ID}`);
  console.log(`API Key: ${REVENUECAT_API_KEY.substring(0, 10)}...`);
  console.log('');

  // Step 1: Create Products
  console.log('📦 Step 1: Creating Products\n');

  console.log('Subscription Products:');
  for (const product of PRODUCTS.subscriptions) {
    await createProduct(product);
  }

  console.log('\nConsumable Products:');
  for (const product of PRODUCTS.consumables) {
    await createProduct(product);
  }

  // Step 2: Create Entitlements
  console.log('\n🎫 Step 2: Creating Entitlements\n');

  for (const entitlement of ENTITLEMENTS) {
    await createEntitlement(entitlement);

    // Attach products to entitlement
    for (const productId of entitlement.products) {
      await attachProductToEntitlement(entitlement.id, productId);
    }
  }

  // Step 3: Create Offering and Packages
  console.log('\n📋 Step 3: Creating Offering & Packages\n');

  await createOffering();

  const packages = [
    { id: 'monthly', displayName: 'Monthly', position: 1 },
    { id: 'annual', displayName: 'Annual', position: 2 },
    { id: 'ai_tokens', displayName: 'AI Tokens', position: 3 },
    { id: 'streak_shields', displayName: 'Streak Shields', position: 4 },
    { id: 'exports', displayName: 'PDF Exports', position: 5 },
  ];

  for (const pkg of packages) {
    await createPackage('default', pkg);
  }

  // Summary
  console.log('\n✅ Setup Complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n⚠️  MANUAL STEPS REQUIRED:\n');
  console.log('1. Configure webhook in RevenueCat Dashboard:');
  console.log('   URL: https://your-domain.com/api/webhooks/revenuecat');
  console.log('   Authorization: Bearer <your-webhook-secret>');
  console.log('');
  console.log('2. Create products in App Store Connect / Google Play Console');
  console.log('   with the following IDs:');
  console.log('');
  console.log('   iOS (App Store):');
  PRODUCTS.subscriptions.concat(PRODUCTS.consumables).forEach(p => {
    console.log(`     - ${p.appStoreProductId}`);
  });
  console.log('');
  console.log('   Android (Google Play):');
  PRODUCTS.subscriptions.concat(PRODUCTS.consumables).forEach(p => {
    console.log(`     - ${p.playStoreProductId}`);
  });
  console.log('');
  console.log('3. Set environment variables:');
  console.log('   REVENUECAT_API_KEY=sk_FRrSVmwxtNfetWtdsRCCbFeRVrrIP');
  console.log('   REVENUECAT_WEBHOOK_SECRET=<generate-a-secure-secret>');
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch(error => {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
});
