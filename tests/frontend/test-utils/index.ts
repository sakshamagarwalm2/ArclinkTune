import { test as base, Page, Locator, expect } from '@playwright/test';

export class BaseTestPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageReady() {
    await this.page.waitForLoadState('networkidle');
  }

  async getTextContent(selector: string): Promise<string> {
    return (await this.page.locator(selector).textContent()) || '';
  }

  async isVisible(selector: string): Promise<boolean> {
    return (await this.page.locator(selector).isVisible()) || false;
  }

  async click(selector: string) {
    await this.page.locator(selector).click();
  }

  async fillInput(selector: string, value: string) {
    await this.page.locator(selector).fill(value);
  }

  async selectOption(selector: string, value: string) {
    await this.page.locator(selector).selectOption(value);
  }

  async waitForElement(selector: string, timeout = 5000) {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout });
  }

  async getElementCount(selector: string): Promise<number> {
    return await this.page.locator(selector).count();
  }
}

export class NavigationHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigateTo(pageName: string) {
    const pageMap: Record<string, string> = {
      'train': '/train',
      'models': '/models',
      'chat': '/chat',
      'export': '/export',
      'evaluate': '/evaluate',
      'monitor': '/monitor',
      'about': '/about',
    };
    const path = pageMap[pageName.toLowerCase()];
    if (path) {
      await this.page.goto(path);
      await this.page.waitForLoadState('networkidle');
    }
  }

  async getCurrentPath(): Promise<string> {
    return this.page.url();
  }
}

export class FormHelper {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async fillInputByLabel(label: string, value: string) {
    const input = this.page.getByLabel(label, { exact: false }).first();
    await input.fill(value);
  }

  async selectByLabel(label: string, value: string) {
    const select = this.page.getByLabel(label, { exact: false }).first();
    await select.selectOption(value);
  }

  async checkCheckboxByLabel(label: string) {
    const checkbox = this.page.getByLabel(label, { exact: false }).first();
    await checkbox.check();
  }

  async clickButtonByText(text: string) {
    await this.page.getByRole('button', { name: text }).click();
  }
}

export async function expectElementVisible(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
}

export async function expectElementContains(page: Page, selector: string, text: string) {
  await expect(page.locator(selector)).toContainText(text);
}

export async function expectToHaveCount(page: Page, selector: string, count: number) {
  await expect(page.locator(selector)).toHaveCount(count);
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}