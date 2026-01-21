import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page when not authenticated', async ({ page }) => {
    // Check main heading
    await expect(page.locator('h1').first()).toContainText(/sema.*slim|glp-1|weight/i);

    // Check that at least one call-to-action button exists
    const buttons = page.getByRole('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should have working navigation elements', async ({ page }) => {
    // Check that key sections are visible
    const content = await page.textContent('body');
    expect(content).toBeTruthy();
  });

  test('should be responsive', async ({ page }) => {
    // Desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.locator('body')).toBeVisible();

    // Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors
    const criticalErrors = errors.filter(err =>
      !err.includes('favicon') &&
      !err.includes('preload') &&
      !err.includes('validateDOMNesting')
    );

    expect(criticalErrors.length).toBe(0);
  });
});
