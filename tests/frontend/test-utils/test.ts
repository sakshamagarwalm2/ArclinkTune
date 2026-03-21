import { test as baseTest, expect, describe } from '@playwright/test';

const mockElectronAPI = {
  backend: {
    start: async () => ({ success: true }),
    stop: async () => ({ success: true }),
    status: async () => ({ running: true }),
    onStatus: () => {},
    onLog: () => {},
  },
  api: {
    get: async () => ({}),
    post: async () => ({}),
    stream: async () => ({}),
  },
  app: {
    getVersion: async () => '1.0.0',
    getPath: async () => null,
    getHomeDir: async () => 'C:\\Users\\Test',
  },
  system: {
    getConfigDir: async () => 'C:\\Users\\Test\\.arclinktune',
    getModelsDir: async () => 'C:\\Users\\Test\\models',
    setModelsDir: async () => ({ success: true }),
  },
  window: {
    minimize: () => {},
    maximize: () => {},
    close: () => {},
    isMaximized: async () => false,
  },
};

export const test = baseTest.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      (window as any).electronAPI = {
        backend: {
          start: async () => ({ success: true }),
          stop: async () => ({ success: true }),
          status: async () => ({ running: true }),
          onStatus: () => {},
          onLog: () => {},
        },
        api: {
          get: async () => ({}),
          post: async () => ({}),
          stream: async () => ({}),
        },
        app: {
          getVersion: async () => '1.0.0',
          getPath: async () => null,
          getHomeDir: async () => 'C:\\Users\\Test',
        },
        system: {
          getConfigDir: async () => 'C:\\Users\\Test\\.arclinktune',
          getModelsDir: async () => 'C:\\Users\\Test\\models',
          setModelsDir: async () => ({ success: true }),
        },
        window: {
          minimize: () => {},
          maximize: () => {},
          close: () => {},
          isMaximized: async () => false,
        },
      };
    });
    await use(page);
  },
});

export { expect, describe };