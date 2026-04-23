const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  detectTools: () => ipcRenderer.invoke('detect-tools'),
  startProxy: (config) => ipcRenderer.invoke('start-proxy', config),
  configureTools: (config) => ipcRenderer.invoke('configure-tools', config),
  stopProxy: () => ipcRenderer.invoke('stop-proxy'),
});
