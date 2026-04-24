const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  detectTools: () => ipcRenderer.invoke('detect-tools'),
  startProxy: (config) => ipcRenderer.invoke('start-proxy', config),
  configureTools: (config) => ipcRenderer.invoke('configure-tools', config),
  stopProxy: () => ipcRenderer.invoke('stop-proxy'),
  openDownloadUrl: (url) => ipcRenderer.invoke('open-download-url', url),
  dismissUpdate: (version) => ipcRenderer.invoke('dismiss-update', version),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (_event, data) => callback(data)),
});
