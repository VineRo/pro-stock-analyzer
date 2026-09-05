const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  ping: () => 'pong',
  fetchMarketData: (url) => ipcRenderer.invoke('fetch-market-data', url),
  updater: {
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    startDownloadUpdate: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:install'),
    getCurrentState: () => ipcRenderer.invoke('updater:get-state'),
    getAppVersion: () => ipcRenderer.invoke('updater:get-version'),
    onStatusChanged: (callback) => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('updater:status-changed', listener);
      return () => {
        ipcRenderer.removeListener('updater:status-changed', listener);
      };
    }
  }
});
