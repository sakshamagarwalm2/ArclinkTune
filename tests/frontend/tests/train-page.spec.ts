import { test, expect, describe } from '../test-utils/test';
import { BaseTestPage, NavigationHelper, FormHelper } from '../test-utils';

describe('TrainPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/train');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Header', () => {
    test('should display Training Configuration title', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Training Configuration' })).toBeVisible();
    });

    test('should display status badge showing Ready', async ({ page }) => {
      const statusBadge = page.locator('.animate-pulse, .badge');
      await expect(statusBadge).toBeVisible();
    });

    test('should display Backend Connected indicator', async ({ page }) => {
      await expect(page.getByText('Backend Connected')).toBeVisible();
    });
  });

  describe('Tab Navigation', () => {
    test('should display all 6 tabs', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Basic/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Model/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Hyperparams/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /LoRA/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Advanced/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Output/i })).toBeVisible();
    });

    test('should switch between tabs', async ({ page }) => {
      await page.getByRole('tab', { name: /Model/i }).click();
      await expect(page.getByText('Quantization Bit')).toBeVisible();

      await page.getByRole('tab', { name: /Hyperparams/i }).click();
      await expect(page.getByText('Learning Rate')).toBeVisible();

      await page.getByRole('tab', { name: /LoRA/i }).click();
      await expect(page.getByText('LoRA Rank')).toBeVisible();
    });
  });

  describe('Basic Tab - Training Stage', () => {
    test('should display Training Stage select', async ({ page }) => {
      const trainingStageLabel = page.getByText('Training Stage');
      await expect(trainingStageLabel).toBeVisible();

      const selectTrigger = page.locator('button').filter({ hasText: 'SFT (Supervised Fine-tuning)' }).first();
      await expect(selectTrigger).toBeVisible();
    });

    test('should select different training stages', async ({ page }) => {
      await page.getByRole('button', { name: /SFT/i }).click();
      await expect(page.getByRole('option', { name: /SFT/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Reward Modeling/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /PPO/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /DPO/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /KTO/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Pre-Training/i })).toBeVisible();
    });
  });

  describe('Basic Tab - Dataset Settings', () => {
    test('should display Dataset Directory input', async ({ page }) => {
      await expect(page.getByText('Dataset Directory')).toBeVisible();
      const input = page.locator('input[placeholder="data"]');
      await expect(input).toBeVisible();
    });

    test('should display Dataset input', async ({ page }) => {
      await expect(page.getByText('Dataset')).toBeVisible();
      const input = page.locator('input[placeholder="alpaca, oasst1"]');
      await expect(input).toBeVisible();
    });

    test('should display Max Samples input', async ({ page }) => {
      await expect(page.getByText('Max Samples')).toBeVisible();
      const input = page.locator('input[type="number"]').first();
      await expect(input).toBeVisible();
    });

    test('should allow entering dataset values', async ({ page }) => {
      await page.locator('input[placeholder="alpaca, oasst1"]').fill('my_custom_dataset');
      await expect(page.locator('input[value="my_custom_dataset"]')).toBeVisible();
    });
  });

  describe('Basic Tab - Model Settings', () => {
    test('should display Model Path input', async ({ page }) => {
      await expect(page.getByText('Model Path')).toBeVisible();
      const input = page.locator('input[placeholder*="meta-llama"]');
      await expect(input).toBeVisible();
    });

    test('should display Browse Models link', async ({ page }) => {
      await expect(page.getByRole('link', { name: /Browse Models/i })).toBeVisible();
    });

    test('should display Template select', async ({ page }) => {
      await expect(page.getByText('Template')).toBeVisible();
    });

    test('should display Fine-tuning Type select', async ({ page }) => {
      await expect(page.getByText('Fine-tuning Type')).toBeVisible();
      await expect(page.getByRole('button', { name: 'LoRA' })).toBeVisible();
    });

    test('should display Output Directory input', async ({ page }) => {
      await expect(page.getByText('Output Directory')).toBeVisible();
      const outputInput = page.locator('input[type="text"]').nth(3);
      await expect(outputInput).toBeVisible();
    });

    test('should allow entering model path', async ({ page }) => {
      const modelPathInput = page.locator('input').filter({ hasText: '' }).nth(2);
      await modelPathInput.fill('meta-llama/Llama-3.1-8B');
      await expect(modelPathInput).toHaveValue('meta-llama/Llama-3.1-8B');
    });
  });

  describe('Model Tab - Quantization', () => {
    test('should display Quantization Bit options', async ({ page }) => {
      await page.getByRole('tab', { name: /Model/i }).click();
      await expect(page.getByText('Quantization Bit')).toBeVisible();
      await expect(page.getByRole('button', { name: /None/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /4-bit/i })).toBeVisible();
    });

    test('should display Quantization Method options', async ({ page }) => {
      await expect(page.getByText('Quantization Method')).toBeVisible();
      await expect(page.getByRole('button', { name: 'BNB' })).toBeVisible();
    });

    test('should display Booster options', async ({ page }) => {
      await expect(page.getByText('Booster')).toBeVisible();
      await expect(page.getByRole('button', { name: 'auto' })).toBeVisible();
    });

    test('should display RoPE Scaling options', async ({ page }) => {
      await expect(page.getByText('RoPE Scaling')).toBeVisible();
    });

    test('should toggle quantization options', async ({ page }) => {
      await page.getByRole('button', { name: '4-bit' }).click();
      await expect(page.getByRole('button', { name: '4-bit' })).toHaveClass(/bg-primary/);
    });
  });

  describe('Hyperparams Tab - Sliders', () => {
    test('should display Learning Rate slider', async ({ page }) => {
      await page.getByRole('tab', { name: /Hyperparams/i }).click();
      await expect(page.getByText('Learning Rate')).toBeVisible();
      const slider = page.locator('.slider-track, [role="slider"]').first();
      await expect(slider).toBeVisible();
    });

    test('should display Epochs slider', async ({ page }) => {
      await expect(page.getByText('Epochs')).toBeVisible();
    });

    test('should display Cutoff Length slider', async ({ page }) => {
      await expect(page.getByText('Cutoff Length')).toBeVisible();
    });

    test('should display Batch Size slider', async ({ page }) => {
      await expect(page.getByText('Batch Size')).toBeVisible();
    });

    test('should display Gradient Accumulation slider', async ({ page }) => {
      await expect(page.getByText('Gradient Accumulation')).toBeVisible();
    });

    test('should display Max Grad Norm slider', async ({ page }) => {
      await expect(page.getByText('Max Grad Norm')).toBeVisible();
    });

    test('should display Warmup Steps slider', async ({ page }) => {
      await expect(page.getByText('Warmup Steps')).toBeVisible();
    });

    test('should display Validation Size slider', async ({ page }) => {
      await expect(page.getByText('Validation Size')).toBeVisible();
    });
  });

  describe('Hyperparams Tab - Compute Type', () => {
    test('should display Compute Type options', async ({ page }) => {
      await expect(page.getByText('Compute Type')).toBeVisible();
      await expect(page.getByRole('button', { name: 'BF16' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'FP16' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'FP32' })).toBeVisible();
    });

    test('should toggle compute type', async ({ page }) => {
      await page.getByRole('button', { name: 'FP16' }).click();
      await expect(page.getByRole('button', { name: 'FP16' })).toHaveClass(/bg-primary/);
    });
  });

  describe('Hyperparams Tab - LR Scheduler', () => {
    test('should display LR Scheduler options', async ({ page }) => {
      await expect(page.getByText('LR Scheduler')).toBeVisible();
      await expect(page.getByRole('button', { name: 'linear' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'cosine' })).toBeVisible();
    });
  });

  describe('LoRA Tab', () => {
    test('should display LoRA Rank slider', async ({ page }) => {
      await page.getByRole('tab', { name: /LoRA/i }).click();
      await expect(page.getByText('LoRA Rank')).toBeVisible();
    });

    test('should display LoRA Alpha slider', async ({ page }) => {
      await expect(page.getByText('LoRA Alpha')).toBeVisible();
    });

    test('should display LoRA Dropout slider', async ({ page }) => {
      await expect(page.getByText('LoRA Dropout')).toBeVisible();
    });

    test('should display LoRA Target Modules input', async ({ page }) => {
      await expect(page.getByText('LoRA Target Modules')).toBeVisible();
    });

    test('should display LoRA+ LR Ratio slider', async ({ page }) => {
      await expect(page.getByText('LoRA+ LR Ratio')).toBeVisible();
    });

    test('should display LoRA option switches', async ({ page }) => {
      await expect(page.getByText('RSLoRA')).toBeVisible();
      await expect(page.getByText('DoRA')).toBeVisible();
      await expect(page.getByText('PiSSA')).toBeVisible();
      await expect(page.getByText('New Adapter')).toBeVisible();
    });

    test('should toggle LoRA options', async ({ page }) => {
      const rsLoraSwitch = page.locator('.switch').first();
      await rsLoraSwitch.click();
    });
  });

  describe('LoRA Sub-Tabs', () => {
    test('should display Freeze sub-tab', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Freeze/i })).toBeVisible();
    });

    test('should display RLHF sub-tab', async ({ page }) => {
      await expect(page.getByRole('button', { name: /RLHF/i })).toBeVisible();
    });

    test('should display GaLorE sub-tab', async ({ page }) => {
      await expect(page.getByRole('button', { name: /GaLorE/i })).toBeVisible();
    });

    test('should display Apollo sub-tab', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Apollo/i })).toBeVisible();
    });

    test('should display BAdam sub-tab', async ({ page }) => {
      await expect(page.getByRole('button', { name: /BAdam/i })).toBeVisible();
    });

    test('should switch between sub-tabs', async ({ page }) => {
      await page.getByRole('button', { name: /GaLorE/i }).click();
      await expect(page.getByText('Enable GaLorE')).toBeVisible();
    });
  });

  describe('Advanced Tab', () => {
    test('should display Deepspeed Stage options', async ({ page }) => {
      await page.getByRole('tab', { name: /Advanced/i }).click();
      await expect(page.getByText('Deepspeed Stage')).toBeVisible();
    });

    test('should display Report To options', async ({ page }) => {
      await expect(page.getByText('Report To')).toBeVisible();
    });

    test('should display Extra Args input', async ({ page }) => {
      await expect(page.getByText('Extra Arguments')).toBeVisible();
    });
  });

  describe('Output Tab', () => {
    test('should display output settings', async ({ page }) => {
      await page.getByRole('tab', { name: /Output/i }).click();
      await expect(page.getByText('Output Directory')).toBeVisible();
    });
  });

  describe('Training Actions', () => {
    test('should display Start Training button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Start Training/i })).toBeVisible();
    });

    test('should display Preview button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Preview/i })).toBeVisible();
    });

    test('should display logs area', async ({ page }) => {
      await expect(page.locator('.font-mono, code').first()).toBeVisible();
    });

    test('should start and stop training', async ({ page }) => {
      await page.getByRole('button', { name: /Start Training/i }).click();
      await expect(page.getByText('Training')).toBeVisible();
    });
  });

  describe('Info Tooltips', () => {
    test('should have info tooltips on key elements', async ({ page }) => {
      const infoIcons = page.locator('.lucide-info, svg[data-lucide="info"]');
      const count = await infoIcons.count();
      expect(count).toBeGreaterThan(5);
    });
  });

  describe('Links to other pages', () => {
    test('should have link to Models page', async ({ page }) => {
      const browseLink = page.getByRole('link', { name: /Browse Models/i });
      await expect(browseLink).toHaveAttribute('href', '/models');
    });
  });
});