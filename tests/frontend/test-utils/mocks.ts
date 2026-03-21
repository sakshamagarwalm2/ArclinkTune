// Mock electron API for testing in browser
export const mockElectronAPI = {
  backend: {
    start: async () => ({ success: true }),
    stop: async () => ({ success: true }),
    status: async () => ({ running: true }),
    onStatus: () => {},
    onLog: () => {},
  },
  api: {
    get: async (endpoint: string) => {
      const baseUrl = 'http://localhost:8000';
      const response = await fetch(`${baseUrl}${endpoint}`);
      return response.json();
    },
    post: async (endpoint: string, data?: any) => {
      const baseUrl = 'http://localhost:8000';
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      return response.json();
    },
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

// Apply mock before tests
if (typeof window !== 'undefined' && !(window as any).electronAPI) {
  (window as any).electronAPI = mockElectronAPI;
}