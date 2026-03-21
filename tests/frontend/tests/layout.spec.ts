import { test, expect, describe } from '../test-utils/test';

describe('Layout and Navigation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Sidebar Navigation', () => {
    test('should display sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar).toBeVisible();
    });

    test('should display Train link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /Train/i }).first()).toBeVisible();
    });

    test('should display Models link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /Models/i }).first()).toBeVisible();
    });

    test('should display Chat link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /Chat/i }).first()).toBeVisible();
    });

    test('should display Export link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /Export/i }).first()).toBeVisible();
    });

    test('should display Evaluate link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /Evaluate/i }).first()).toBeVisible();
    });

    test('should display Monitor link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /Monitor/i }).first()).toBeVisible();
    });

    test('should display About link in sidebar', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await expect(sidebar.getByRole('link', { name: /About/i }).first()).toBeVisible();
    });

    test('should navigate to Train page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Train/i }).first().click();
      await expect(page).toHaveURL(/\/train/);
    });

    test('should navigate to Models page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Models/i }).first().click();
      await expect(page).toHaveURL(/\/models/);
      await expect(page.getByRole('heading', { name: /Model Hub/i })).toBeVisible();
    });

    test('should navigate to Chat page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Chat/i }).first().click();
      await expect(page).toHaveURL(/\/chat/);
    });

    test('should navigate to Export page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Export/i }).first().click();
      await expect(page).toHaveURL(/\/export/);
    });

    test('should navigate to Evaluate page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Evaluate/i }).first().click();
      await expect(page).toHaveURL(/\/evaluate/);
    });

    test('should navigate to Monitor page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Monitor/i }).first().click();
      await expect(page).toHaveURL(/\/monitor/);
    });

    test('should navigate to About page', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /About/i }).first().click();
      await expect(page).toHaveURL(/\/about/);
    });
  });

  describe('Header', () => {
    test('should display header', async ({ page }) => {
      const header = page.locator('header').first();
      await expect(header).toBeVisible();
    });
  });

  describe('App Layout', () => {
    test('should have app layout structure', async ({ page }) => {
      await expect(page.locator('#root')).toBeVisible();
    });

    test('should render without critical console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      await page.reload();
      await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
      const criticalErrors = consoleErrors.filter(e => 
        !e.includes('404') && 
        !e.includes('warning') && 
        !e.includes('favicon')
      );
      expect(criticalErrors.length).toBe(0);
    });
  });

  describe('Navigation State', () => {
    test('should persist navigation across pages', async ({ page }) => {
      const sidebar = page.locator('nav').first();
      await sidebar.getByRole('link', { name: /Train/i }).first().click();
      await expect(page).toHaveURL(/\/train/);
      await sidebar.getByRole('link', { name: /Models/i }).first().click();
      await expect(page).toHaveURL(/\/models/);
      await sidebar.getByRole('link', { name: /Chat/i }).first().click();
      await expect(page).toHaveURL(/\/chat/);
      await sidebar.getByRole('link', { name: /Train/i }).first().click();
      await expect(page).toHaveURL(/\/train/);
    });
  });

  describe('Responsive Behavior', () => {
    test('should display on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });

    test('should display on desktop viewport', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();
    });
  });
});