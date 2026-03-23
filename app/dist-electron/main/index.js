"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const os = require("os");
let backendProcess = null;
let isBackendRunning = false;
async function getConfig() {
  const configPath = path.join(electron.app.getPath("userData"), "config.json");
  const fs = await import("fs/promises");
  try {
    const data = await fs.readFile(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return {};
  }
}
async function setConfig(config) {
  const configPath = path.join(electron.app.getPath("userData"), "config.json");
  const fs = await import("fs/promises");
  const existing = await getConfig();
  const merged = { ...existing, ...config };
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(merged, null, 2));
}
function setupIpcHandlers(mainWindow2) {
  electron.ipcMain.handle("backend:start", async () => {
    var _a, _b;
    if (isBackendRunning) {
      return { success: true, message: "Backend already running" };
    }
    try {
      const backendPath = path.join(electron.app.getAppPath(), "..", "backend");
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      const config = await getConfig();
      const env = {
        ...process.env,
        PYTHONPATH: path.join(electron.app.getAppPath(), "..", "core", "LlamaFactory", "src")
      };
      if (config.hfToken) {
        env.HF_TOKEN = config.hfToken;
      }
      backendProcess = child_process.spawn(pythonCmd, ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"], {
        cwd: backendPath,
        env,
        stdio: ["pipe", "pipe", "pipe"]
      });
      (_a = backendProcess.stdout) == null ? void 0 : _a.on("data", (data) => {
        const output = data.toString();
        if (output.includes("Uvicorn running")) {
          isBackendRunning = true;
          mainWindow2.webContents.send("backend:status", { running: true });
        }
        mainWindow2.webContents.send("backend:log", { type: "stdout", data: output });
      });
      (_b = backendProcess.stderr) == null ? void 0 : _b.on("data", (data) => {
        mainWindow2.webContents.send("backend:log", { type: "stderr", data: data.toString() });
      });
      backendProcess.on("error", (error) => {
        isBackendRunning = false;
        mainWindow2.webContents.send("backend:status", { running: false, error: error.message });
      });
      backendProcess.on("exit", (code) => {
        isBackendRunning = false;
        mainWindow2.webContents.send("backend:status", { running: false, code });
      });
      return { success: true, message: "Backend starting..." };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("backend:stop", async () => {
    if (backendProcess) {
      backendProcess.kill();
      backendProcess = null;
      isBackendRunning = false;
      return { success: true };
    }
    return { success: true, message: "Backend not running" };
  });
  electron.ipcMain.handle("backend:status", () => {
    return { running: isBackendRunning };
  });
  electron.ipcMain.handle("api:get", async (_, endpoint) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  });
  electron.ipcMain.handle("api:post", async (_, endpoint, data) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : void 0
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  });
  electron.ipcMain.handle("api:stream", async (_, endpoint, data) => {
    try {
      const response = await fetch(`http://localhost:8000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data ? JSON.stringify(data) : void 0
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      return { error: error.message };
    }
  });
  electron.ipcMain.handle("app:getVersion", () => electron.app.getVersion());
  electron.ipcMain.handle("app:getPath", (_, name) => {
    try {
      return electron.app.getPath(name);
    } catch {
      return null;
    }
  });
  electron.ipcMain.handle("app:getHomeDir", () => os.homedir());
  electron.ipcMain.handle("shell:openPath", async (_, filePath) => {
    try {
      await electron.shell.openPath(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  electron.ipcMain.handle("shell:openExternal", async (_, url) => {
    await electron.shell.openExternal(url);
  });
  electron.ipcMain.handle("config:get", async (_, key) => {
    const config = await getConfig();
    return config[key] || null;
  });
  electron.ipcMain.handle("config:set", async (_, key, value) => {
    await setConfig({ [key]: value });
  });
  electron.ipcMain.handle("system:getConfigDir", () => {
    return path.join(electron.app.getPath("userData"), "config");
  });
  electron.ipcMain.handle("system:getModelsDir", async () => {
    const config = await getConfig();
    return config.modelsDir || path.join(os.homedir(), "models", "arclink");
  });
  electron.ipcMain.handle("system:setModelsDir", async (_, modelsDir) => {
    await setConfig({ modelsDir });
    return { success: true };
  });
  electron.ipcMain.handle("window:minimize", () => mainWindow2 == null ? void 0 : mainWindow2.minimize());
  electron.ipcMain.handle("window:maximize", () => {
    if (mainWindow2 == null ? void 0 : mainWindow2.isMaximized()) {
      mainWindow2.unmaximize();
    } else {
      mainWindow2 == null ? void 0 : mainWindow2.maximize();
    }
  });
  electron.ipcMain.handle("window:close", () => mainWindow2 == null ? void 0 : mainWindow2.close());
  electron.ipcMain.handle("window:isMaximized", () => (mainWindow2 == null ? void 0 : mainWindow2.isMaximized()) ?? false);
  electron.ipcMain.handle("dialog:openFile", async (_, options) => {
    try {
      const result = await electron.dialog.showOpenDialog(mainWindow2, {
        title: (options == null ? void 0 : options.title) || "Select File",
        filters: (options == null ? void 0 : options.filters) || [
          { name: "Dataset Files", extensions: ["json", "jsonl", "csv"] },
          { name: "All Files", extensions: ["*"] }
        ],
        defaultPath: (options == null ? void 0 : options.defaultPath) || os.homedir(),
        properties: (options == null ? void 0 : options.multiSelections) ? ["openFile", "multiSelections"] : ["openFile"]
      });
      return {
        canceled: result.canceled,
        filePaths: result.filePaths
      };
    } catch (error) {
      return { canceled: true, filePaths: [], error: error.message };
    }
  });
  electron.ipcMain.handle("dialog:openDirectory", async (_, options) => {
    try {
      const result = await electron.dialog.showOpenDialog(mainWindow2, {
        title: (options == null ? void 0 : options.title) || "Select Directory",
        defaultPath: (options == null ? void 0 : options.defaultPath) || os.homedir(),
        properties: ["openDirectory"]
      });
      return {
        canceled: result.canceled,
        filePaths: result.filePaths
      };
    } catch (error) {
      return { canceled: true, filePaths: [], error: error.message };
    }
  });
}
function createAppMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...isMac ? [
      {
        label: electron.app.name,
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" }
        ]
      }
    ] : [],
    {
      label: "File",
      submenu: [
        {
          label: "Open Model Folder",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            electron.shell.openPath(electron.app.getPath("home"));
          }
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" }
      ]
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" }
      ]
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...isMac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }]
      ]
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Documentation",
          click: async () => {
            await electron.shell.openExternal("https://github.com/hiyouga/LLaMA-Factory");
          }
        },
        {
          label: "Report Issue",
          click: async () => {
            await electron.shell.openExternal("https://github.com/anomalyco/arclinktune/issues");
          }
        }
      ]
    }
  ];
  return electron.Menu.buildFromTemplate(template);
}
let mainWindow = null;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const isDev = !!VITE_DEV_SERVER_URL;
async function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: electron.nativeTheme.shouldUseDarkColors ? "#0a0a0a" : "#ffffff",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow == null ? void 0 : mainWindow.show();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  const menu = createAppMenu();
  electron.Menu.setApplicationMenu(menu);
  setupIpcHandlers(mainWindow);
  return mainWindow;
}
electron.app.whenReady().then(() => {
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  mainWindow == null ? void 0 : mainWindow.removeAllListeners("close");
  mainWindow == null ? void 0 : mainWindow.close();
});
