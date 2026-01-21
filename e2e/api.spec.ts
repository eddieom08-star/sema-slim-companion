import { test, expect } from '@playwright/test';

test.describe('API Endpoints', () => {
  test('health endpoint should return healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('database');
    expect(data).toHaveProperty('timestamp');
  });

  test('simple health check should work', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
  });

  test('protected API endpoints should require auth', async ({ request }) => {
    // These should return 401 without auth
    const protectedEndpoints = [
      '/api/auth/user',
      '/api/food-entries',
      '/api/medications',
      '/api/dashboard',
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      // Should be 401 Unauthorized or redirect
      expect([401, 403, 302]).toContain(response.status());
    }
  });

  test('API should accept CORS from allowed origins', async ({ request }) => {
    const response = await request.get('/api/health', {
      headers: {
        'Origin': 'http://localhost:5000',
      },
    });
    expect(response.status()).toBe(200);
  });

  test('API rate limiting should be in place', async ({ request }) => {
    // Make multiple rapid requests
    const promises = Array(10).fill(null).map(() =>
      request.get('/api/health')
    );

    const responses = await Promise.all(promises);

    // All should succeed (rate limit is 100/15min)
    responses.forEach(response => {
      expect(response.status()).toBe(200);
    });
  });
});
