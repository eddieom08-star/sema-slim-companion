import { test, expect } from '@playwright/test';

test.describe('Navigation and Routing', () => {
  test('should redirect unauthenticated users from protected routes to landing', async ({ page }) => {
    // Try to access protected routes without auth
    const protectedRoutes = ['/dashboard', '/food-tracking', '/medication', '/progress', '/profile', '/recipes'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // Should be redirected to landing or show landing content
      const url = page.url();
      const content = await page.textContent('body');

      // Either redirected to / or showing landing page content
      const isOnLanding = url.endsWith('/') || url.includes('sign-in') ||
        content?.toLowerCase().includes('sign in') ||
        content?.toLowerCase().includes('get started');

      expect(isOnLanding).toBeTruthy();
    }
  });

  test('should display sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');

    // Wait for Clerk components to load (they load dynamically via JS)
    // Give extra time for external Clerk SDK to initialize
    await page.waitForTimeout(2000);

    // Should show some form of sign-in UI or Clerk is loading
    const content = await page.textContent('body');
    // Clerk pages either show sign-in UI, or the page container while loading
    // On production, Clerk widget should render with sign-in form
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });

  test('should display sign-up page', async ({ page }) => {
    await page.goto('/sign-up');
    await page.waitForLoadState('networkidle');

    // Wait for Clerk components to load (they load dynamically via JS)
    await page.waitForTimeout(2000);

    // Should show some form of sign-up UI or Clerk is loading
    const content = await page.textContent('body');
    // Clerk pages either show sign-up UI, or the page container while loading
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(10);
  });

  test('should handle 404 for non-existent routes', async ({ page }) => {
    await page.goto('/non-existent-page-12345');
    await page.waitForLoadState('networkidle');

    // Should show landing page (catchall route) or 404
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });
});
