"use strict";
const electron = require("electron");
const electronAPI = {
  backend: {
    start: () => electron.ipcRenderer.invoke("backend:start"),
    stop: () => electron.ipcRenderer.invoke("backend:stop"),
    status: () => electron.ipcRenderer.invoke("backend:status"),
    onStatus: (callback) => {
      electron.ipcRenderer.on("backend:status", (_, status) => callback(status));
    },
    onLog: (callback) => {
      electron.ipcRenderer.on("backend:log", (_, log) => callback(log));
    }
  },
  api: {
    get: (endpoint) => electron.ipcRenderer.invoke("api:get", endpoint),
    post: (endpoint, data) => electron.ipcRenderer.invoke("api:post", endpoint, data),
    stream: (endpoint, data) => electron.ipcRenderer.invoke("api:stream", endpoint, data)
  },
  app: {
    getVersion: () => electron.ipcRenderer.invoke("app:getVersion"),
    getPath: (name) => electron.ipcRenderer.invoke("app:getPath", name),
    getHomeDir: () => electron.ipcRenderer.invoke("app:getHomeDir")
  },
  system: {
    getConfigDir: () => electron.ipcRenderer.invoke("system:getConfigDir"),
    getModelsDir: () => electron.ipcRenderer.invoke("system:getModelsDir"),
    setModelsDir: (path) => electron.ipcRenderer.invoke("system:setModelsDir", path)
  },
  window: {
    minimize: () => electron.ipcRenderer.invoke("window:minimize"),
    maximize: () => electron.ipcRenderer.invoke("window:maximize"),
    close: () => electron.ipcRenderer.invoke("window:close"),
    isMaximized: () => electron.ipcRenderer.invoke("window:isMaximized")
  }
};
electron.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
