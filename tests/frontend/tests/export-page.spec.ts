import { test, expect, describe } from '../test-utils/test';

describe('ExportPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/export');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Header', () => {
    test('should display Export Model title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Export Model' })).toBeVisible();
    });

    test('should display description', async ({ page }) => {
      await expect(page.getByText(/Export trained models/)).toBeVisible();
    });

    test('should display Ready badge', async ({ page }) => {
      await expect(page.getByText('Ready')).toBeVisible();
    });
  });

  describe('Source Model Card', () => {
    test('should display Source Model card', async ({ page }) => {
      await expect(page.getByText('Source Model')).toBeVisible();
    });

    test('should display Model Path input', async ({ page }) => {
      await expect(page.getByText('Model Path')).toBeVisible();
      await expect(page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct')).toBeVisible();
    });

    test('should display Browse Models link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /Browse/i })).toBeVisible();
    });

    test('should display Checkpoint Path input', async ({ page }) => {
      await expect(page.getByText('Checkpoint Path')).toBeVisible();
      await expect(page.getByPlaceholder('output/my_model')).toBeVisible();
    });

    test('should display Fine-tuning Type select', async ({ page }) => {
      await expect(page.getByText('Fine-tuning Type')).toBeVisible();
      await expect(page.getByRole('button', { name: 'LoRA' })).toBeVisible();
    });
  });

  describe('Export Settings Card', () => {
    test('should display Export Settings card', async ({ page }) => {
      await expect(page.getByText('Export Settings')).toBeVisible();
    });

    test('should display Export Directory input', async ({ page }) => {
      await expect(page.getByText('Export Directory')).toBeVisible();
      await expect(page.getByPlaceholder('exported_model')).toBeVisible();
    });

    test('should display Shard Size slider', async ({ page }) => {
      await expect(page.getByText(/Shard Size/)).toBeVisible();
      await expect(page.getByText('5GB')).toBeVisible();
    });

    test('should display Export Device select', async ({ page }) => {
      await expect(page.getByText('Export Device')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Auto (CUDA if available)' })).toBeVisible();
    });

    test('should display Legacy Format toggle', async ({ page }) => {
      await expect(page.getByText('Use Legacy Format')).toBeVisible();
    });
  });

  describe('Quantization Settings Card', () => {
    test('should display Quantization Settings card', async ({ page }) => {
      await expect(page.getByText('Quantization Settings')).toBeVisible();
    });

    test('should display Quantization Bit select', async ({ page }) => {
      await expect(page.getByText('Quantization Bit')).toBeVisible();
      await expect(page.getByRole('button', { name: 'None' })).toBeVisible();
    });

    test('should display Calibration Dataset input when quantization enabled', async ({ page }) => {
      await page.getByRole('button', { name: '4-bit' }).click();
      await expect(page.getByText('Calibration Dataset')).toBeVisible();
    });
  });

  describe('HuggingFace Hub Card', () => {
    test('should display HuggingFace Hub card', async ({ page }) => {
      await expect(page.getByText('HuggingFace Hub')).toBeVisible();
    });

    test('should display Hub Model ID input', async ({ page }) => {
      await expect(page.getByText('Hub Model ID')).toBeVisible();
      await expect(page.getByPlaceholder('username/my-model')).toBeVisible();
    });

    test('should display Private Repo toggle', async ({ page }) => {
      await expect(page.getByText('Make Repository Private')).toBeVisible();
    });

    test('should display Extra Arguments input', async ({ page }) => {
      await expect(page.getByText('Extra Arguments')).toBeVisible();
      await expect(page.getByPlaceholder(/use_fast/)).toBeVisible();
    });
  });

  describe('Export Actions Card', () => {
    test('should display Export Actions card', async ({ page }) => {
      await expect(page.getByText('Export Actions')).toBeVisible();
    });

    test('should display Command Preview', async ({ page }) => {
      await expect(page.getByText('Command Preview:')).toBeVisible();
    });

    test('should display Clear Logs button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Clear Logs/i })).toBeVisible();
    });

    test('should display Start Export button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Start Export/i })).toBeVisible();
    });

    test('should display logs area', async ({ page }) => {
      await expect(page.locator('.font-mono')).toBeVisible();
    });

    test('should disable Start Export without export dir', async ({ page }) => {
      const exportBtn = page.getByRole('button', { name: /Start Export/i });
      await expect(exportBtn).toBeDisabled();
    });

    test('should enable Start Export with export dir', async ({ page }) => {
      await page.getByPlaceholder('exported_model').fill('my_export');
      const exportBtn = page.getByRole('button', { name: /Start Export/i });
      await expect(exportBtn).toBeEnabled();
    });

    test('should start export process', async ({ page }) => {
      await page.getByPlaceholder('exported_model').fill('my_export');
      await page.getByRole('button', { name: /Start Export/i }).click();
      await expect(page.getByText('Exporting')).toBeVisible();
    });
  });

  describe('Form Interactions', () => {
    test('should allow entering model path', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('my-model');
      await expect(page.getByDisplayValue('my-model')).toBeVisible();
    });

    test('should allow entering export directory', async ({ page }) => {
      await page.getByPlaceholder('exported_model').fill('output/model');
      await expect(page.getByDisplayValue('output/model')).toBeVisible();
    });

    test('should allow entering checkpoint path', async ({ page }) => {
      await page.getByPlaceholder('output/my_model').fill('output/checkpoint');
      await expect(page.getByDisplayValue('output/checkpoint')).toBeVisible();
    });
  });

  describe('Info Tooltips', () => {
    test('should have info tooltips', async ({ page }) => {
      const infoIcons = page.locator('.lucide-info, svg[data-lucide="info"]');
      const count = await infoIcons.count();
      expect(count).toBeGreaterThan(8);
    });
  });
});