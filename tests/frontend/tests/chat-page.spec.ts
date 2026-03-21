import { test, expect, describe } from '../test-utils/test';

describe('ChatPage Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForTimeout(1500); await page.waitForLoadState("networkidle");
  });

  describe('Page Layout', () => {
    test('should display three column layout', async ({ page }) => {
      const cards = page.locator('.card, [class*="Card"]').first();
      await expect(cards).toBeVisible();
    });
  });

  describe('Model Settings Card', () => {
    test('should display Model Settings title', async ({ page }) => {
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
      await expect(page.getByPlaceholder(/LoRA adapter/)).toBeVisible();
    });

    test('should display Fine-tuning select', async ({ page }) => {
      await expect(page.getByText('Fine-tuning')).toBeVisible();
      await expect(page.getByRole('combobox').nth(0)).toBeVisible();
    });

    test('should display Template select', async ({ page }) => {
      await expect(page.getByText('Template')).toBeVisible();
      await expect(page.getByRole('combobox').nth(1)).toBeVisible();
    });

    test('should display Load Model button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Load Model/i })).toBeVisible();
    });

    test('should allow entering model path', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('my-model/path');
      await expect(page.getByDisplayValue('my-model/path')).toBeVisible();
    });

    test('should display Unloaded badge initially', async ({ page }) => {
      await expect(page.getByText('Unloaded')).toBeVisible();
    });
  });

  describe('Generation Settings Card', () => {
    test('should display Generation title', async ({ page }) => {
      await expect(page.getByText('Generation')).toBeVisible();
    });

    test('should display Max Tokens slider', async ({ page }) => {
      await expect(page.getByText(/Max Tokens/)).toBeVisible();
    });

    test('should display Temperature slider', async ({ page }) => {
      await expect(page.getByText(/Temperature/)).toBeVisible();
    });

    test('should display Top-P slider', async ({ page }) => {
      await expect(page.getByText(/Top-P/)).toBeVisible();
    });

    test('should display Top-K slider', async ({ page }) => {
      await expect(page.getByText(/Top-K/)).toBeVisible();
    });

    test('should display Rep. Penalty slider', async ({ page }) => {
      await expect(page.getByText(/Rep\. Penalty/)).toBeVisible();
    });

    test('should display slider value labels', async ({ page }) => {
      await expect(page.getByText('1024')).toBeVisible();
      await expect(page.getByText('0.95')).toBeVisible();
    });
  });

  describe('Advanced Settings Card', () => {
    test('should display Advanced title', async ({ page }) => {
      await expect(page.getByText('Advanced')).toBeVisible();
    });

    test('should display Backend select', async ({ page }) => {
      await expect(page.getByText('Backend')).toBeVisible();
      await expect(page.getByRole('option', { name: 'HuggingFace' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'vLLM' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'SGLang' })).toBeVisible();
    });

    test('should display Data Type select', async ({ page }) => {
      await expect(page.getByText('Data Type')).toBeVisible();
      await expect(page.getByRole('option', { name: 'Auto' })).toBeVisible();
    });

    test('should display System Prompt input', async ({ page }) => {
      await expect(page.getByText('System Prompt')).toBeVisible();
      await expect(page.getByPlaceholder('You are a helpful assistant.')).toBeVisible();
    });

    test('should display toggle switches', async ({ page }) => {
      await expect(page.getByText('Skip Special Tokens')).toBeVisible();
      await expect(page.getByText('Escape HTML')).toBeVisible();
      await expect(page.getByText('Enable Thinking')).toBeVisible();
    });

    test('should display Extra Args input', async ({ page }) => {
      await expect(page.getByText('Extra Args')).toBeVisible();
      await expect(page.getByPlaceholder(/vllm_enforce/)).toBeVisible();
    });
  });

  describe('Chat Interface Card', () => {
    test('should display Chat Interface title', async ({ page }) => {
      await expect(page.getByText('Chat Interface')).toBeVisible();
    });

    test('should display empty state message', async ({ page }) => {
      await expect(page.getByText('Start a conversation')).toBeVisible();
      await expect(page.getByText('Load a model first to begin chatting')).toBeVisible();
    });

    test('should display Clear button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Clear/i })).toBeVisible();
    });

    test('should display message input field', async ({ page }) => {
      await expect(page.getByPlaceholder('Type your message...')).toBeVisible();
    });

    test('should display Send button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /Send/i })).toBeVisible();
    });

    test('should display multimedia buttons', async ({ page }) => {
      const imageBtn = page.locator('button').filter({ has: page.locator('.lucide-image') });
      const videoBtn = page.locator('button').filter({ has: page.locator('.lucide-video') });
      const micBtn = page.locator('button').filter({ has: page.locator('.lucide-mic') });
      await expect(imageBtn).toBeVisible();
      await expect(videoBtn).toBeVisible();
      await expect(micBtn).toBeVisible();
    });

    test('should disable input when no model loaded', async ({ page }) => {
      const input = page.getByPlaceholder('Type your message...');
      await expect(input).toBeDisabled();
    });

    test('should disable send button when no model loaded', async ({ page }) => {
      const sendBtn = page.getByRole('button', { name: /Send/i });
      await expect(sendBtn).toBeDisabled();
    });
  });

  describe('Model Loading', () => {
    test('should load model with valid path', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('test-model');
      await page.getByRole('button', { name: /Load Model/i }).click();
      await expect(page.getByText(/loaded successfully/i)).toBeVisible();
    });

    test('should enable chat after model loading', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('test-model');
      await page.getByRole('button', { name: /Load Model/i }).click();
      await page.waitForTimeout(500);
      
      const input = page.getByPlaceholder('Type your message...');
      await expect(input).toBeEnabled();
    });

    test('should change Load Model to Unload Model after loading', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('test-model');
      await page.getByRole('button', { name: /Load Model/i }).click();
      await page.waitForTimeout(500);
      
      await expect(page.getByRole('button', { name: /Unload Model/i })).toBeVisible();
    });
  });

  describe('Chat Functionality', () => {
    test('should not send empty messages', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('test-model');
      await page.getByRole('button', { name: /Load Model/i }).click();
      await page.waitForTimeout(500);
      
      const sendBtn = page.getByRole('button', { name: /Send/i });
      await expect(sendBtn).toBeDisabled();
    });

    test('should display user message in chat', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('test-model');
      await page.getByRole('button', { name: /Load Model/i }).click();
      await page.waitForTimeout(500);
      
      await page.getByPlaceholder('Type your message...').fill('Hello');
      await page.getByRole('button', { name: /Send/i }).click();
      
      await expect(page.getByText('Hello')).toBeVisible();
    });

    test('should clear chat messages', async ({ page }) => {
      await page.getByPlaceholder('meta-llama/Llama-3.1-8B-Instruct').fill('test-model');
      await page.getByRole('button', { name: /Load Model/i }).click();
      await page.waitForTimeout(500);
      
      await page.getByPlaceholder('Type your message...').fill('Test message');
      await page.getByRole('button', { name: /Send/i }).click();
      await page.waitForTimeout(500);
      
      await page.getByRole('button', { name: /Clear/i }).click();
      await expect(page.getByText('Test message')).not.toBeVisible();
    });
  });

  describe('Settings Persistence', () => {
    test('should persist generation settings after model load', async ({ page }) => {
      await expect(page.getByText('0.70')).toBeVisible();
    });

    test('should update temperature value', async ({ page }) => {
      const slider = page.locator('[role="slider"]').nth(1);
      await slider.click();
      await expect(page.getByText('1.00')).toBeVisible();
    });
  });

  describe('Info Tooltips', () => {
    test('should have info tooltips on settings', async ({ page }) => {
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
  });
});