import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  backend: {
    start: () => Promise<{ success: boolean; message?: string; error?: string }>;
    stop: () => Promise<{ success: boolean; message?: string }>;
    status: () => Promise<{ running: boolean }>;
    onStatus: (callback: (status: { running: boolean; error?: string }) => void) => void;
    onLog: (callback: (log: { type: string; data: string }) => void) => void;
  };
  api: {
    get: (endpoint: string) => Promise<any>;
    post: (endpoint: string, data?: any) => Promise<any>;
    stream: (endpoint: string, data?: any) => Promise<any>;
  };
  app: {
    getVersion: () => Promise<string>;
    getPath: (name: string) => Promise<string | null>;
    getHomeDir: () => Promise<string>;
  };
  shell: {
    openPath: (path: string) => Promise<{ success: boolean; error?: string }>;
    openExternal: (url: string) => Promise<void>;
  };
  config: {
    get: (key: string) => Promise<string | null>;
    set: (key: string, value: string) => Promise<void>;
  };
  system: {
    getConfigDir: () => Promise<string>;
    getModelsDir: () => Promise<string>;
    setModelsDir: (path: string) => Promise<{ success: boolean; error?: string }>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
  };
  dialog: {
    openFile: (options?: {
      title?: string;
      filters?: { name: string; extensions: string[] }[];
      defaultPath?: string;
      multiSelections?: boolean;
    }) => Promise<{ canceled: boolean; filePaths: string[]; error?: string }>;
    openDirectory: (options?: {
      title?: string;
      defaultPath?: string;
    }) => Promise<{ canceled: boolean; filePaths: string[]; error?: string }>;
  };
}

const electronAPI: ElectronAPI = {
  backend: {
    start: () => ipcRenderer.invoke('backend:start'),
    stop: () => ipcRenderer.invoke('backend:stop'),
    status: () => ipcRenderer.invoke('backend:status'),
    onStatus: (callback) => {
      ipcRenderer.on('backend:status', (_, status) => callback(status));
    },
    onLog: (callback) => {
      ipcRenderer.on('backend:log', (_, log) => callback(log));
    },
  },
  api: {
    get: (endpoint) => ipcRenderer.invoke('api:get', endpoint),
    post: (endpoint, data) => ipcRenderer.invoke('api:post', endpoint, data),
    stream: (endpoint, data) => ipcRenderer.invoke('api:stream', endpoint, data),
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPath: (name) => ipcRenderer.invoke('app:getPath', name),
    getHomeDir: () => ipcRenderer.invoke('app:getHomeDir'),
  },
  shell: {
    openPath: (path) => ipcRenderer.invoke('shell:openPath', path),
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },
  config: {
    get: (key) => ipcRenderer.invoke('config:get', key),
    set: (key, value) => ipcRenderer.invoke('config:set', key, value),
  },
  system: {
    getConfigDir: () => ipcRenderer.invoke('system:getConfigDir'),
    getModelsDir: () => ipcRenderer.invoke('system:getModelsDir'),
    setModelsDir: (path) => ipcRenderer.invoke('system:setModelsDir', path),
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  dialog: {
    openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
    openDirectory: (options) => ipcRenderer.invoke('dialog:openDirectory', options),
  },
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
