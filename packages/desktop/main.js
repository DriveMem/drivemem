const { app, BrowserWindow, Tray, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const { startProxy, stopProxy } = require('./proxy');
const { detectTools, configureTools } = require('./config');

let mainWindow = null;
let tray = null;
let proxyRunning = false;
let stats = { contextInjections: 0, harvests: 0 };
let dismissedVersion = null; // dismissed version for this session

const API_BASE = 'https://drivemem.cloud';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24h

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pb[i] || 0) - (pa[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function checkForUpdate() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE}/api/desktop/latest-version`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    if (!data.version) return;

    const currentVersion = app.getVersion();
    if (compareVersions(currentVersion, data.version) > 0 && data.version !== dismissedVersion) {
      // Send update info to renderer
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', data);
      }
    }
  } catch {
    // Silent skip on network failure
  }
}

// 单实例锁
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); }

app.whenReady().then(() => {
  // 创建系统托盘
  tray = new Tray(path.join(__dirname, 'assets', 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'DriveMem Desktop', enabled: false },
    { type: 'separator' },
    { label: 'Status: Running', id: 'status', enabled: false },
    { label: `Injections: ${stats.contextInjections}`, id: 'injections', enabled: false },
    { label: `Harvests: ${stats.harvests}`, id: 'harvests', enabled: false },
    { type: 'separator' },
    { label: 'Open Setup', click: () => showWindow() },
    { label: 'Quit', click: () => { stopProxy(); app.quit(); } },
  ]);
  tray.setToolTip('DriveMem — AI Memory Layer');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => showWindow());

  // 显示配置窗口
  showWindow();

  // Version update check: 5s after ready, then every 24h
  setTimeout(() => checkForUpdate(), 5000);
  setInterval(() => checkForUpdate(), CHECK_INTERVAL_MS);
});

function showWindow() {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  mainWindow = new BrowserWindow({
    width: 480,
    height: 600,
    resizable: false,
    title: 'DriveMem Setup',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('close', (e) => {
    if (proxyRunning) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// IPC handlers
ipcMain.handle('detect-tools', async () => {
  return await detectTools();
});

ipcMain.handle('start-proxy', async (_, { driveMemApiKey, llmProvider, llmApiKey }) => {
  const upstreamUrls = {
    openai: 'https://api.openai.com',
    deepseek: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    anthropic: 'https://api.anthropic.com',
    custom: '',
  };
  const upstream = upstreamUrls[llmProvider] || upstreamUrls.openai;
  await startProxy(driveMemApiKey, 7879, upstream);
  proxyRunning = true;
  return { port: 7879, upstream };
});

ipcMain.handle('configure-tools', async (_, { tools, port }) => {
  return await configureTools(tools, port);
});

ipcMain.handle('stop-proxy', () => {
  stopProxy();
  proxyRunning = false;
});

ipcMain.handle('open-download-url', async (_, url) => {
  if (url) await shell.openExternal(url);
});

ipcMain.handle('dismiss-update', async (_, version) => {
  dismissedVersion = version;
});

app.on('window-all-closed', () => {
  // Don't quit on macOS — keep running in tray
  if (process.platform !== 'darwin' && !proxyRunning) app.quit();
});
// trigger desktop build
