const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const updater = require('./updater.cjs');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#131722',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // 可按需要開關 DevTools: mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 攔截外鏈，使用使用者的預設瀏覽器開啟
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // 註冊無 CORS 限制的金融數據獲取處理器 (支援雙通道自動切換與逾時防護)
  ipcMain.handle('fetch-market-data', async (_event, url) => {
    async function requestWithHeaders(targetUrl) {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    }

    try {
      const json = await requestWithHeaders(url);
      return { data: json };
    } catch (err) {
      // 雙通道備援：若 query1 遭遇限流或異常，自動平滑切換至 query2
      if (url.includes('query1.finance.yahoo.com')) {
        try {
          const fallbackUrl = url.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com');
          const json = await requestWithHeaders(fallbackUrl);
          return { data: json };
        } catch (fallbackErr) {
          return { error: fallbackErr.message || 'Fallback request failed' };
        }
      }
      return { error: err.message || 'Network request failed' };
    }
  });

  // 註冊安全更新隔離 IPC (遵循零參數防注入原則)
  ipcMain.handle('updater:check', async () => {
    return await updater.checkForUpdates();
  });

  ipcMain.handle('updater:download', async () => {
    return await updater.startDownloadUpdate();
  });

  ipcMain.handle('updater:install', () => {
    return updater.quitAndInstall();
  });

  ipcMain.handle('updater:get-state', () => {
    return updater.getCurrentState();
  });

  ipcMain.handle('updater:get-version', () => {
    return app.getVersion();
  });

  createWindow();
  updater.initUpdater(mainWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      updater.initUpdater(mainWindow);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
