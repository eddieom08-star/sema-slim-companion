import { test, expect } from '@playwright/test';

test.describe('Feature API Endpoints', () => {
  // These tests verify that feature endpoints exist and return proper auth errors
  // when accessed without authentication

  test.describe('Food Tracking API', () => {
    test('food entries endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/food-entries');
      expect([401, 403]).toContain(response.status());
    });

    test('food search endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/food-database/search?q=chicken');
      expect([401, 403]).toContain(response.status());
    });

    test('barcode lookup endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/food-database/barcode/5000112637922');
      expect([401, 403]).toContain(response.status());
    });

    test('hunger logs endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/hunger-logs');
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Medication API', () => {
    test('medications endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/medications');
      expect([401, 403]).toContain(response.status());
    });

    test('medication logs endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/medication-logs');
      expect([401, 403]).toContain(response.status());
    });

    test('can create medication log (requires auth)', async ({ request }) => {
      const response = await request.post('/api/medication-logs', {
        data: {
          medicationId: 'test-id',
          dosage: '0.5mg',
          notes: 'Test log'
        }
      });
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Weight Tracking API', () => {
    test('weight logs endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/weight-logs');
      expect([401, 403]).toContain(response.status());
    });

    test('can create weight log (requires auth)', async ({ request }) => {
      const response = await request.post('/api/weight-logs', {
        data: {
          weight: 75.5,
          loggedAt: new Date().toISOString()
        }
      });
      expect([401, 403]).toContain(response.status());
    });

    test('body measurements endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/body-measurements');
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Recipe API', () => {
    test('recipes endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/recipes');
      expect([401, 403]).toContain(response.status());
    });

    test('AI recipe chat endpoint requires authentication', async ({ request }) => {
      const response = await request.post('/api/ai/recipe-chat', {
        data: {
          messages: [{ role: 'user', content: 'Give me a healthy recipe' }],
          systemPrompt: 'You are a helpful cooking assistant'
        }
      });
      expect([401, 403]).toContain(response.status());
    });

    test('public recipes endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/recipes/public');
      expect([401, 403]).toContain(response.status());
    });

    test('recipe favorites endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/recipes/favorites');
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('User Profile API', () => {
    test('user profile endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/auth/user');
      expect([401, 403]).toContain(response.status());
    });

    test('profile update endpoint requires authentication', async ({ request }) => {
      const response = await request.put('/api/user/profile', {
        data: {
          firstName: 'Test',
          lastName: 'User'
        }
      });
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Gamification API', () => {
    test('gamification endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/gamification');
      expect([401, 403]).toContain(response.status());
    });

    test('achievements endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/achievements');
      expect([401, 403]).toContain(response.status());
    });

    test('streaks endpoint requires authentication', async ({ request }) => {
      const response = await request.get('/api/streaks');
      expect([401, 403]).toContain(response.status());
    });
  });
});

test.describe('Feature UI Pages', () => {
  test('food tracking page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/food-tracking');
    await page.waitForLoadState('networkidle');

    // Should redirect to landing or show landing content
    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/') && !url.includes('food-tracking') ||
      content?.toLowerCase().includes('sign in') ||
      content?.toLowerCase().includes('get started');

    expect(isRedirected).toBeTruthy();
  });

  test('medication page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/medication');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/') && !url.includes('medication') ||
      content?.toLowerCase().includes('sign in') ||
      content?.toLowerCase().includes('get started');

    expect(isRedirected).toBeTruthy();
  });

  test('recipes page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/') && !url.includes('recipes') ||
      content?.toLowerCase().includes('sign in') ||
      content?.toLowerCase().includes('get started');

    expect(isRedirected).toBeTruthy();
  });

  test('progress page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/progress');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/') && !url.includes('progress') ||
      content?.toLowerCase().includes('sign in') ||
      content?.toLowerCase().includes('get started');

    expect(isRedirected).toBeTruthy();
  });

  test('profile page redirects unauthenticated users', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const url = page.url();
    const content = await page.textContent('body');
    const isRedirected = url.includes('/') && !url.includes('profile') ||
      content?.toLowerCase().includes('sign in') ||
      content?.toLowerCase().includes('get started');

    expect(isRedirected).toBeTruthy();
  });
});
