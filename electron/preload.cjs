const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  ping: () => 'pong',
  fetchMarketData: (url) => ipcRenderer.invoke('fetch-market-data', url),
});
