import { test, expect, describe } from '../test-utils/test';

describe('EvaluatePage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/evaluate');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Header', () => {
    test('should display Evaluation title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Evaluation' })).toBeVisible();
    });

    test('should display description', async ({ page }) => {
      await expect(page.getByText(/Evaluate model performance/)).toBeVisible();
    });

    test('should display Ready badge', async ({ page }) => {
      await expect(page.getByText('Ready')).toBeVisible();
    });
  });

  describe('Model Settings Card', () => {
    test('should display Model Settings card', async ({ page }) => {
      await expect(page.getByText('Model Settings')).toBeVisible();
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
    });

    test('should display Fine-tuning Type select', async ({ page }) => {
      await expect(page.getByText('Fine-tuning Type')).toBeVisible();
    });

    test('should display Template select', async ({ page }) => {
      await expect(page.getByText('Template')).toBeVisible();
    });
  });

  describe('Dataset Settings Card', () => {
    test('should display Dataset Settings card', async ({ page }) => {
      await expect(page.getByText('Dataset Settings')).toBeVisible();
    });

    test('should display Dataset Directory input', async ({ page }) => {
      await expect(page.getByText('Dataset Directory')).toBeVisible();
    });

    test('should display Dataset input', async ({ page }) => {
      await expect(page.getByText('Dataset')).toBeVisible();
      await expect(page.getByPlaceholder('mmlu, ceval, math')).toBeVisible();
    });

    test('should display Cutoff Length slider', async ({ page }) => {
      await expect(page.getByText(/Cutoff Length/)).toBeVisible();
    });

    test('should display Max Samples input', async ({ page }) => {
      await expect(page.getByText('Max Samples')).toBeVisible();
    });

    test('should display Batch Size slider', async ({ page }) => {
      await expect(page.getByText(/Batch Size/)).toBeVisible();
    });

    test('should display Run Predictions toggle', async ({ page }) => {
      await expect(page.getByText('Run Predictions')).toBeVisible();
    });
  });

  describe('Generation Settings Card', () => {
    test('should display Generation Settings card', async ({ page }) => {
      await expect(page.getByText('Generation Settings')).toBeVisible();
    });

    test('should display Max New Tokens slider', async ({ page }) => {
      await expect(page.getByText(/Max New Tokens/)).toBeVisible();
    });

    test('should display Temperature slider', async ({ page }) => {
      await expect(page.getByText(/Temperature/)).toBeVisible();
    });

    test('should display Top-P slider', async ({ page }) => {
      await expect(page.getByText(/Top-P/)).toBeVisible();
    });
  });

  describe('Output Settings Card', () => {
    test('should display Output Settings card', async ({ page }) => {
      await expect(page.getByText('Output Settings')).toBeVisible();
    });

    test('should display Output Directory input', async ({ page }) => {
      await expect(page.getByText('Output Directory')).toBeVisible();
      await expect(page.getByPlaceholder('output/eval_results')).toBeVisible();
    });

    test('should display Command Preview section', async ({ page }) => {
      await expect(page.getByText('Command Preview')).toBeVisible();
    });

    test('should display Preview Command button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Preview Command/i })).toBeVisible();
    });

    test('should display Export Results link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /Export Results/i })).toBeVisible();
    });
  });

  describe('Actions Card', () => {
    test('should display Actions card', async ({ page }) => {
      await expect(page.getByText('Actions')).toBeVisible();
    });

    test('should display Start Evaluation button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Start Evaluation/i })).toBeVisible();
    });

    test('should display progress bar when running', async ({ page }) => {
      await page.getByRole('button', { name: /Start Evaluation/i }).click();
      await expect(page.getByText('Progress')).toBeVisible();
    });

    test('should display Stop Evaluation button when running', async ({ page }) => {
      await page.getByRole('button', { name: /Start Evaluation/i }).click();
      await expect(page.getByRole('button', { name: /Stop Evaluation/i })).toBeVisible();
    });

    test('should display logs area', async ({ page }) => {
      await expect(page.locator('.font-mono').first()).toBeVisible();
    });
  });

  describe('Form Interactions', () => {
    test('should allow entering model path', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('eval-model');
      await expect(page.getByDisplayValue('eval-model')).toBeVisible();
    });

    test('should allow entering dataset', async ({ page }) => {
      await page.getByPlaceholder('mmlu, ceval, math').fill('mmlu');
      await expect(page.getByDisplayValue('mmlu')).toBeVisible();
    });

    test('should toggle Run Predictions', async ({ page }) => {
      const toggle = page.locator('.switch').first();
      await toggle.click();
    });
  });

  describe('Info Tooltips', () => {
    test('should have info tooltips', async ({ page }) => {
      const infoIcons = page.locator('.lucide-info, svg[data-lucide="info"]');
      const count = await infoIcons.count();
      expect(count).toBeGreaterThan(10);
    });
  });

  describe('Navigation Links', () => {
    test('should link to Models page', async ({ page }) => {
      const browseLink = page.getByRole('link', { name: /Browse/i });
      await expect(browseLink).toHaveAttribute('href', '/models');
    });

    test('should link to Export page', async ({ page }) => {
      const exportLink = page.getByRole('link', { name: /Export Results/i });
      await expect(exportLink).toHaveAttribute('href', '/export');
    });
  });
});