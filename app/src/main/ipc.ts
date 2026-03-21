import { ipcMain, BrowserWindow, app, shell } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import os from 'os';

let backendProcess: ChildProcess | null = null;
let isBackendRunning = false;

async function getConfig() {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  const fs = await import('fs/promises');
  try {
    const data = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function setConfig(config: Record<string, string>) {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  const fs = await import('fs/promises');
  const existing = await getConfig();
  const merged = { ...existing, ...config };
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(merged, null, 2));
}

export function setupIpcHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('backend:start', async () => {
    if (isBackendRunning) {
      return { success: true, message: 'Backend already running' };
    }

    try {
      const backendPath = path.join(app.getAppPath(), '..', 'backend');
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      
      const config = await getConfig();
      const env: Record<string, string> = {
        ...process.env as Record<string, string>,
        PYTHONPATH: path.join(app.getAppPath(), '..', 'core', 'LlamaFactory', 'src'),
      };
      
      if (config.hfToken) {
        env.HF_TOKEN = config.hfToken;
      }

      backendProcess = spawn(pythonCmd, ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'], {
        cwd: backendPath,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      backendProcess.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Uvicorn running')) {
          isBackendRunning = true;
          mainWindow.webContents.send('backend:status', { running: true });
        }
        mainWindow.webContents.send('backend:log', { type: 'stdout', data: output });
      });

      backendProcess.stderr?.on('data', (data) => {
        mainWindow.webContents.send('backend:log', { type: 'stderr', data: data.toString() });
      });

      backendProcess.on('error', (error) => {
        isBackendRunning = false;
        mainWindow.webContents.send('backend:status', { running: false, error: error.message });
      });

      backendProcess.on('exit', (code) => {
        isBackendRunning = false;
        mainWindow.webContents.send('backend:status', { running: false, code });
      });

      return { success: true, message: 'Backend starting...' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('backend:stop', async () => {
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
      isBackendRunning = false;
      return { success: true };
    }
    return { success: true, message: 'Backend not running' };
  });

  ipcMain.handle('backend:status', () => {
    return { running: isBackendRunning };
  });

  ipcMain.handle('api:get', async (_, endpoint: string) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error: any) {
      return { error: error.message };
    }
  });

  ipcMain.handle('api:post', async (_, endpoint: string, data?: any) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error: any) {
      return { error: error.message };
    }
  });

  ipcMain.handle('api:stream', async (_, endpoint: string, data?: any) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error: any) {
      return { error: error.message };
    }
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());
  
  ipcMain.handle('app:getPath', (_, name: string) => {
    try {
      return app.getPath(name as any);
    } catch {
      return null;
    }
  });

  ipcMain.handle('app:getHomeDir', () => os.homedir());

  ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    await shell.openExternal(url);
  });

  ipcMain.handle('config:get', async (_, key: string) => {
    const config = await getConfig();
    return config[key] || null;
  });

  ipcMain.handle('config:set', async (_, key: string, value: string) => {
    await setConfig({ [key]: value });
  });

  ipcMain.handle('system:getConfigDir', () => {
    return path.join(app.getPath('userData'), 'config');
  });

  ipcMain.handle('system:getModelsDir', async () => {
    const config = await getConfig();
    return config.modelsDir || path.join(os.homedir(), 'models', 'arclink');
  });

  ipcMain.handle('system:setModelsDir', async (_, modelsDir: string) => {
    await setConfig({ modelsDir });
    return { success: true };
  });

  ipcMain.handle('window:minimize', () => mainWindow?.minimize());
  ipcMain.handle('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.handle('window:close', () => mainWindow?.close());
  ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false);
}
