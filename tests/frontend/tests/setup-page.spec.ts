import { test, expect, describe } from '../test-utils/test';

describe('SetupPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/setup');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Layout', () => {
    test('should display centered card layout', async ({ page }) => {
      const card = page.locator('.card, [class*="Card"]').first();
      await expect(card).toBeVisible();
    });
  });

  describe('Welcome Section', () => {
    test('should display Welcome title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Welcome to ArclinkTune' })).toBeVisible();
    });

    test('should display setup description', async ({ page }) => {
      await expect(page.getByText(/set up your models directory/)).toBeVisible();
    });

    test('should display logo/icon', async ({ page }) => {
      const icon = page.locator('.lucide-sparkles, svg[data-lucide="sparkles"]');
      await expect(icon).toBeVisible();
    });
  });

  describe('Models Directory Input', () => {
    test('should display Models Directory label', async ({ page }) => {
      await expect(page.getByText('Models Directory')).toBeVisible();
    });

    test('should display description text', async ({ page }) => {
      await expect(page.getByText(/downloaded models will be stored/)).toBeVisible();
    });

    test('should display input field', async ({ page }) => {
      await expect(page.getByPlaceholder(/Enter custom path/)).toBeVisible();
    });

    test('should display folder open button', async ({ page }) => {
      const folderBtn = page.locator('button').filter({ has: page.locator('.lucide-folder-open') });
      await expect(folderBtn).toBeVisible();
    });

    test('should display default path info', async ({ page }) => {
      await expect(page.getByText(/Default: ~\//)).toBeVisible();
    });

    test('should allow entering custom path', async ({ page }) => {
      await page.getByPlaceholder(/Enter custom path/).fill('D:/models');
      await expect(page.getByDisplayValue('D:/models')).toBeVisible();
    });
  });

  describe('Feature List', () => {
    test('should display feature heading', async ({ page }) => {
      await expect(page.getByText("What you'll be able to do:")).toBeVisible();
    });

    test('should display Download and manage models feature', async ({ page }) => {
      await expect(page.getByText(/Download and manage LLM models/)).toBeVisible();
    });

    test('should display Fine-tune models feature', async ({ page }) => {
      await expect(page.getByText(/Fine-tune models with custom datasets/)).toBeVisible();
    });

    test('should display Chat with models feature', async ({ page }) => {
      await expect(page.getByText(/Chat with your models/)).toBeVisible();
    });

    test('should display Monitor resources feature', async ({ page }) => {
      await expect(page.getByText(/Monitor GPU and system resources/)).toBeVisible();
    });

    test('should display checkmark icons for features', async ({ page }) => {
      const checks = page.locator('.lucide-check, svg[data-lucide="check"]');
      const count = await checks.count();
      expect(count).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Get Started Button', () => {
    test('should display Get Started button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Get Started/i })).toBeVisible();
    });

    test('should be enabled by default', async ({ page }) => {
      const btn = page.getByRole('button', { name: /Get Started/i });
      await expect(btn).toBeEnabled();
    });

    test('should show loading state on click', async ({ page }) => {
      await page.getByRole('button', { name: /Get Started/i }).click();
      await expect(page.getByText(/Setting up/)).toBeVisible();
    });
  });

  describe('Button States', () => {
    test('should show loading spinner when clicked', async ({ page }) => {
      await page.getByRole('button', { name: /Get Started/i }).click();
      const spinner = page.locator('.animate-spin, .lucide-loader-2');
      await expect(spinner).toBeVisible();
    });

    test('should show success state after completion', async ({ page }) => {
      await page.getByRole('button', { name: /Get Started/i }).click();
      await page.waitForTimeout(2000);
      await expect(page.getByText(/Setup Complete/)).toBeVisible();
    });
  });
});