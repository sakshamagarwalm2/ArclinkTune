import { test, expect, describe } from '../test-utils/test';

describe('MonitorPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/monitor');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Header', () => {
    test('should display System Monitor title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'System Monitor' })).toBeVisible();
    });

    test('should display description', async ({ page }) => {
      await expect(page.getByText(/Real-time hardware/)).toBeVisible();
    });

    test('should display Pause/Resume button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
    });

    test('should display Force Refresh button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Force Refresh/i })).toBeVisible();
    });
  });

  describe('CPU Card', () => {
    test('should display Processor card', async ({ page }) => {
      await expect(page.getByText('Processor (CPU)')).toBeVisible();
    });

    test('should display CPU usage percentage', async ({ page }) => {
      const usageText = page.locator('.text-primary').first();
      await expect(usageText).toBeVisible();
    });

    test('should display CPU usage chart', async ({ page }) => {
      const chart = page.locator('.recharts-surface').first();
      await expect(chart).toBeVisible();
    });

    test('should display CPU model name', async ({ page }) => {
      await expect(page.getByText('Model')).toBeVisible();
    });

    test('should display CPU core count', async ({ page }) => {
      await expect(page.getByText('Cores (Logical)')).toBeVisible();
    });
  });

  describe('Memory Card', () => {
    test('should display System Memory card', async ({ page }) => {
      await expect(page.getByText('System Memory (RAM)')).toBeVisible();
    });

    test('should display memory usage percentage', async ({ page }) => {
      const usageText = page.locator('.text-neon-violet').first();
      await expect(usageText).toBeVisible();
    });

    test('should display memory chart', async ({ page }) => {
      const charts = page.locator('.recharts-surface');
      expect(await charts.count()).toBeGreaterThanOrEqual(1);
    });

    test('should display RAM used/total values', async ({ page }) => {
      await expect(page.getByText('Used / Total')).toBeVisible();
    });

    test('should display Swap usage', async ({ page }) => {
      await expect(page.getByText('Swap Usage')).toBeVisible();
    });
  });

  describe('GPU Card', () => {
    test('should display GPU section or no GPU message', async ({ page }) => {
      const hasGPU = await page.getByText('Graphics (GPU)').isVisible();
      const noGPU = await page.getByText('No NVIDIA GPU detected').isVisible();
      expect(hasGPU || noGPU).toBe(true);
    });

    test('should display GPU usage percentage when available', async ({ page }) => {
      const gpuCard = page.locator('.border-neon-green');
      const count = await gpuCard.count();
      if (count > 0) {
        await expect(gpuCard.first()).toBeVisible();
      }
    });

    test('should display VRAM usage progress bar', async ({ page }) => {
      const gpuCard = page.locator('.border-neon-green');
      const count = await gpuCard.count();
      if (count > 0) {
        await expect(page.getByText('VRAM Usage')).toBeVisible();
      }
    });

    test('should display GPU model name when available', async ({ page }) => {
      const gpuCard = page.locator('.border-neon-green');
      const count = await gpuCard.count();
      if (count > 0) {
        await expect(page.getByText('Model').first()).toBeVisible();
      }
    });

    test('should display GPU temperature when available', async ({ page }) => {
      const gpuCard = page.locator('.border-neon-green');
      const count = await gpuCard.count();
      if (count > 0) {
        await expect(page.getByText('Temperature')).toBeVisible();
      }
    });
  });

  describe('Storage Card', () => {
    test('should display Storage card', async ({ page }) => {
      await expect(page.getByText('Storage')).toBeVisible();
    });

    test('should display disk usage information', async ({ page }) => {
      await expect(page.getByText('Drive')).toBeVisible();
    });

    test('should display mount point information', async ({ page }) => {
      await expect(page.getByText('Mount:')).toBeVisible();
    });

    test('should display disk used/total values', async ({ page }) => {
      const usedTotal = page.locator('text=/\\d+\\.\\d+ \\/ \\d+\\.\\d+ GB/');
      expect(await usedTotal.count()).toBeGreaterThan(0);
    });

    test('should display disk progress bars', async ({ page }) => {
      const progressBars = page.locator('.progress, [class*="Progress"]');
      expect(await progressBars.count()).toBeGreaterThan(0);
    });
  });

  describe('Controls', () => {
    test('should toggle pause state', async ({ page }) => {
      await page.getByRole('button', { name: /Pause/i }).click();
      await expect(page.getByRole('button', { name: /Resume/i })).toBeVisible();
    });

    test('should resume from paused state', async ({ page }) => {
      await page.getByRole('button', { name: /Pause/i }).click();
      await page.getByRole('button', { name: /Resume/i }).click();
      await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible();
    });

    test('should trigger force refresh', async ({ page }) => {
      await page.getByRole('button', { name: /Force Refresh/i }).click();
      await page.waitForTimeout(500);
    });
  });

  describe('Info Tooltips', () => {
    test('should have info tooltips on cards', async ({ page }) => {
      const infoIcons = page.locator('.lucide-info, svg[data-lucide="info"]');
      const count = await infoIcons.count();
      expect(count).toBeGreaterThan(3);
    });
  });

  describe('Charts', () => {
    test('should render line charts', async ({ page }) => {
      const charts = page.locator('.recharts-line');
      const count = await charts.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should display tooltips on charts', async ({ page }) => {
      const chartArea = page.locator('.recharts-tooltip-wrapper').first();
      await expect(chartArea).toBeVisible();
    });
  });
});