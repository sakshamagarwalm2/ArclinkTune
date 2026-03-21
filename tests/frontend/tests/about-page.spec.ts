import { test, expect, describe } from '../test-utils/test';

describe('AboutPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');
  });

  describe('Page Load', () => {
    test('should load about page successfully', async ({ page }) => {
      await expect(page.locator('img[alt="ArclinkTune Banner"]')).toBeVisible({ timeout: 10000 });
    });
  });

  describe('Banner Section', () => {
    test('should display banner image', async ({ page }) => {
      const banner = page.locator('img[alt="ArclinkTune Banner"]');
      await expect(banner).toBeVisible();
    });

    test.skip('should display version badge', async ({ page }) => {
      const badge = page.locator('[class*="badge"]').first();
      await expect(badge).toBeVisible();
    });

    test('should display ArclinkTune title', async ({ page }) => {
      const title = page.locator('h1').first();
      await expect(title).toBeVisible();
    });

    test('should display description text', async ({ page }) => {
      await expect(page.getByText(/next generation of model fine-tuning/)).toBeVisible();
    });
  });

  describe('About the App Card', () => {
    test('should display About the App title', async ({ page }) => {
      await expect(page.getByText('About the App')).toBeVisible();
    });

    test('should display app description', async ({ page }) => {
      await expect(page.getByText(/autonomous LLM fine-tuning studio/)).toBeVisible();
    });

    test.skip('should display feature badges', async ({ page }) => {
      const badges = page.locator('[class*="badge"]');
      const count = await badges.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display powered by text', async ({ page }) => {
      await expect(page.getByText(/Powered by HKRM/)).toBeVisible();
    });
  });

  describe('About the Creator Card', () => {
    test('should display About the Creator title', async ({ page }) => {
      await expect(page.getByText('About the Creator')).toBeVisible();
    });

    test('should display creator avatar', async ({ page }) => {
      const avatarContainer = page.locator('.rounded-full').filter({ hasText: 'AL' }).first();
      await expect(avatarContainer).toBeVisible();
    });

    test('should display creator name', async ({ page }) => {
      await expect(page.getByText('AstralLink_')).toBeVisible();
    });

    test('should display role badge', async ({ page }) => {
      await expect(page.getByText('AI Systems Architect')).toBeVisible();
    });

    test('should display live indicator', async ({ page }) => {
      const indicator = page.locator('.animate-pulse').first();
      await expect(indicator).toBeVisible();
    });
  });

  describe('Contact Information', () => {
    test('should display email section', async ({ page }) => {
      await expect(page.getByText('Email')).toBeVisible();
    });

    test('should display email address', async ({ page }) => {
      await expect(page.getByText('sakshamagarwalm2@gmail.com')).toBeVisible();
    });

    test('should display github section', async ({ page }) => {
      await expect(page.getByText('Github')).toBeVisible();
    });

    test('should display github username', async ({ page }) => {
      const username = page.locator('p').filter({ hasText: 'sakshamagarwalm2' }).first();
      await expect(username).toBeVisible();
    });

    test('should have email link', async ({ page }) => {
      const emailLink = page.locator('a[href^="mailto:"]');
      await expect(emailLink).toBeVisible();
    });

    test('should have github link', async ({ page }) => {
      const githubLink = page.locator('a[href*="github.com"]');
      await expect(githubLink).toBeVisible();
    });

    test('should have external link buttons', async ({ page }) => {
      const extLinks = page.locator('button').filter({ has: page.locator('.lucide-external-link') });
      const count = await extLinks.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Quote', () => {
    test('should display creator quote', async ({ page }) => {
      await expect(page.getByText(/Architecting the future/)).toBeVisible();
    });
  });

  describe('Visual Elements', () => {
    test('should display gradient border on creator card', async ({ page }) => {
      const card = page.locator('.from-primary').first();
      await expect(card).toBeVisible();
    });
  });
});