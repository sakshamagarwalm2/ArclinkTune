import { test, expect, describe } from '../test-utils/test';

describe('ModelsPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/models');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Header', () => {
    test('should display Model Hub title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Model Hub' })).toBeVisible();
    });

    test('should display description text', async ({ page }) => {
      await expect(page.getByText(/Browse, download and manage/i)).toBeVisible();
    });

    test('should display grid/list view toggle buttons', async ({ page }) => {
      await expect(page.locator('button').filter({ has: page.locator('.lucide-grid-3x3') })).toBeVisible();
      await expect(page.locator('button').filter({ has: page.locator('.lucide-list') })).toBeVisible();
    });
  });

  describe('Search Bar', () => {
    test('should display search input', async ({ page }) => {
      await expect(page.getByPlaceholder('Search models...')).toBeVisible();
    });

    test('should display model hub selector', async ({ page }) => {
      await expect(page.getByRole('combobox')).toBeVisible();
      await expect(page.getByRole('option', { name: 'HuggingFace' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'ModelScope' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'OpenMind' })).toBeVisible();
    });

    test('should allow searching models', async ({ page }) => {
      await page.getByPlaceholder('Search models...').fill('llama');
      await expect(page.getByText('Llama-3.1-8B-Instruct')).toBeVisible();
    });

    test('should filter models by search query', async ({ page }) => {
      await page.getByPlaceholder('Search models...').fill('Qwen');
      await expect(page.getByText('Qwen2.5-7B-Instruct')).toBeVisible();
      await expect(page.getByText('Llama-3.1-8B-Instruct')).not.toBeVisible();
    });
  });

  describe('Tabs', () => {
    test('should display Popular, Local, Custom tabs', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Popular/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Local/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Custom/i })).toBeVisible();
    });

    test('should switch between tabs', async ({ page }) => {
      await page.getByRole('tab', { name: /Local/i }).click();
      await expect(page.getByText('No Local Models')).toBeVisible();

      await page.getByRole('tab', { name: /Custom/i }).click();
      await expect(page.getByText('Custom Model URL')).toBeVisible();
    });
  });

  describe('Popular Models Tab', () => {
    test('should display model cards in grid view', async ({ page }) => {
      await expect(page.getByText('Llama-3.1-8B-Instruct')).toBeVisible();
      await expect(page.getByText('Qwen2.5-7B-Instruct')).toBeVisible();
      await expect(page.getByText('DeepSeek-R1-Distill-Qwen-7B')).toBeVisible();
    });

    test('should display provider names', async ({ page }) => {
      await expect(page.getByText('Meta')).toBeVisible();
      await expect(page.getByText('Alibaba')).toBeVisible();
      await expect(page.getByText('DeepSeek')).toBeVisible();
    });

    test('should display download counts', async ({ page }) => {
      const downloadLabels = page.locator('.lucide-download').first();
      await expect(downloadLabels).toBeVisible();
    });

    test('should display model sizes', async ({ page }) => {
      await expect(page.getByText('4.7GB')).toBeVisible();
      await expect(page.getByText('14GB')).toBeVisible();
    });

    test('should display template badges', async ({ page }) => {
      const templateBadges = page.locator('.badge').filter({ hasText: /^(llama3|qwen|default)$/ });
      const count = await templateBadges.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should display Download buttons', async ({ page }) => {
      const downloadButtons = page.getByRole('button', { name: /Download/i });
      await expect(downloadButtons.first()).toBeVisible();
    });

    test('should display Train and Chat links on each card', async ({ page }) => {
      await expect(page.getByRole('link', { name: /Train/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /Chat/i })).toBeVisible();
    });

    test('should toggle to list view', async ({ page }) => {
      await page.locator('button').filter({ has: page.locator('.lucide-list') }).click();
      await expect(page.getByText('Size')).toBeVisible();
      await expect(page.getByText('Downloads')).toBeVisible();
    });
  });

  describe('Local Models Tab', () => {
    test('should display empty state message', async ({ page }) => {
      await page.getByRole('tab', { name: /Local/i }).click();
      await expect(page.getByText('No Local Models')).toBeVisible();
    });

    test('should display cache path information', async ({ page }) => {
      await expect(page.getByText(/\.cache\/huggingface/)).toBeVisible();
    });
  });

  describe('Custom Model Tab', () => {
    test('should display Custom Model URL card', async ({ page }) => {
      await page.getByRole('tab', { name: /Custom/i }).click();
      await expect(page.getByText('Custom Model URL')).toBeVisible();
    });

    test('should display Model URL input', async ({ page }) => {
      await expect(page.getByText('Model URL')).toBeVisible();
      await expect(page.getByPlaceholder('e.g., meta-llama/Llama-3.1-8B-Instruct')).toBeVisible();
    });

    test('should display Model Hub buttons', async ({ page }) => {
      await expect(page.getByRole('button', { name: 'HuggingFace' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'ModelScope' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'OpenMind' })).toBeVisible();
    });

    test('should display Download Custom Model button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Download Custom Model/i })).toBeVisible();
    });

    test('should display Model Configuration card', async ({ page }) => {
      await expect(page.getByText('Model Configuration')).toBeVisible();
    });

    test('should display Quantization select', async ({ page }) => {
      await expect(page.getByText('Quantization')).toBeVisible();
      await expect(page.getByRole('option', { name: 'None (FP16/BF16)' })).toBeVisible();
      await expect(page.getByRole('option', { name: '4-bit (Q4_K_M)' })).toBeVisible();
      await expect(page.getByRole('option', { name: '8-bit (Q8_0)' })).toBeVisible();
    });

    test('should display Template select', async ({ page }) => {
      await expect(page.getByText('Template')).toBeVisible();
    });

    test('should display Max Memory slider', async ({ page }) => {
      await expect(page.getByText('Max Memory (GB)')).toBeVisible();
      const slider = page.locator('[role="slider"]').first();
      await expect(slider).toBeVisible();
    });

    test('should allow entering custom model path', async ({ page }) => {
      await page.getByPlaceholder('e.g., meta-llama/Llama-3.1-8B-Instruct').fill('custom/model-name');
      await expect(page.getByDisplayValue('custom/model-name')).toBeVisible();
    });

    test('should disable download button when no model path entered', async ({ page }) => {
      const downloadButton = page.getByRole('button', { name: /Download Custom Model/i });
      await expect(downloadButton).toBeDisabled();
    });

    test('should enable download button when model path entered', async ({ page }) => {
      await page.getByPlaceholder('e.g., meta-llama/Llama-3.1-8B-Instruct').fill('test/model');
      const downloadButton = page.getByRole('button', { name: /Download Custom Model/i });
      await expect(downloadButton).toBeEnabled();
    });
  });

  describe('Model Card Interactions', () => {
    test('should show loading state when downloading', async ({ page }) => {
      await page.getByRole('button', { name: /Download/i }).first().click();
      await expect(page.getByText('Downloading...')).toBeVisible();
    });

    test('should select different hub', async ({ page }) => {
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: 'ModelScope' }).click();
      await expect(page.getByRole('button', { name: 'ModelScope' })).toBeVisible();
    });
  });

  describe('Model Interlinks', () => {
    test('should navigate to Train page from model card', async ({ page }) => {
      await page.getByRole('link', { name: /Train/i }).first().click();
      await expect(page).toHaveURL(/\/train/);
    });

    test('should navigate to Chat page from model card', async ({ page }) => {
      await page.getByRole('link', { name: /Chat/i }).first().click();
      await expect(page).toHaveURL(/\/chat/);
    });
  });

  describe('Info Tooltips', () => {
    test('should have info tooltips on search and hub selector', async ({ page }) => {
      const infoIcons = page.locator('.lucide-info, svg[data-lucide="info"]');
      const count = await infoIcons.count();
      expect(count).toBeGreaterThan(3);
    });
  });
});