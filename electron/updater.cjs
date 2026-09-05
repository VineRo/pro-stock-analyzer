const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');

const GITHUB_OWNER = 'VineRo';
const GITHUB_REPO = 'pro-stock-analyzer';
const CACHE_DIR_NAME = 'pro-stock-analyzer-updater';

const DEFAULT_UPDATE_CONFIG = [
  `owner: ${GITHUB_OWNER}`,
  `repo: ${GITHUB_REPO}`,
  `provider: github`,
  `updaterCacheDirName: ${CACHE_DIR_NAME}`
].join('\n') + '\n';

let mainWindowRef = null;
let lastCheckTime = 0;
const CHECK_COOLDOWN_MS = 5000; // 5 秒防連點節流
let checkIntervalTimer = null;

// 當前內部狀態緩存
let currentUpdateState = {
  status: 'idle',
  currentVersion: app.getVersion(),
  info: null,
  progress: null,
  error: null,
  lastCheckedTime: null
};

/**
 * 轉譯為對使用者友善且不洩漏底層路徑的資安錯誤訊息
 */
function getFriendlyErrorMessage(err) {
  const raw = err?.message || String(err || '');
  if (raw.includes('app-update.yml') || raw.includes('ENOENT')) {
    return '更新設定檔初始化中，請稍候重試';
  }
  if (raw.includes('net::ERR') || raw.includes('ENOTFOUND') || raw.includes('ETIMEDOUT') || raw.includes('timeout')) {
    return '無法連線至 GitHub 官方更新伺服器，請確認網路連線是否暢通';
  }
  if (raw.includes('Could not get code signature')) {
    return '偵測到本機測試環境公證限制，建議前往官方網站下載最新版本安裝';
  }
  if (raw.includes('ERR_UPDATER_ZIP_FILE_NOT_FOUND')) {
    return '伺服器尚未發布適用於本平台之更新包，建議前往官方網站確認';
  }
  if (raw.includes('rate limit')) {
    return 'GitHub API 請求頻率達到上限，請稍候 5 分鐘後重試';
  }
  return raw || '自動更新檢查失敗，請稍後重試';
}

/**
 * 自動確保 app-update.yml 存在且配置有效，雙重保險防禦 ENOENT
 */
function setupUpdateConfig() {
  try {
    let targetConfigPath = null;

    if (app.isPackaged) {
      const resourcesConfigPath = path.join(process.resourcesPath, 'app-update.yml');
      let isResourcesValid = false;

      try {
        if (fs.existsSync(resourcesConfigPath) && fs.statSync(resourcesConfigPath).size > 10) {
          isResourcesValid = true;
          targetConfigPath = resourcesConfigPath;
        }
      } catch {
        isResourcesValid = false;
      }

      if (!isResourcesValid) {
        let written = false;
        try {
          fs.writeFileSync(resourcesConfigPath, DEFAULT_UPDATE_CONFIG, 'utf-8');
          written = true;
          targetConfigPath = resourcesConfigPath;
        } catch {
          written = false;
        }

        // 若 process.resourcesPath 為唯讀（如掛載 DMG 或系統目錄權限限制），回退至 userData
        if (!written) {
          const userDataDir = app.getPath('userData');
          if (!fs.existsSync(userDataDir)) {
            fs.mkdirSync(userDataDir, { recursive: true });
          }
          const userDataConfig = path.join(userDataDir, 'app-update.yml');
          fs.writeFileSync(userDataConfig, DEFAULT_UPDATE_CONFIG, 'utf-8');
          targetConfigPath = userDataConfig;
        }
      }
    } else {
      const devConfig = path.join(app.getAppPath(), 'dev-app-update.yml');
      try {
        if (!fs.existsSync(devConfig) || fs.statSync(devConfig).size < 10) {
          fs.writeFileSync(devConfig, DEFAULT_UPDATE_CONFIG, 'utf-8');
        }
        targetConfigPath = devConfig;
      } catch (err) {
        console.warn('[Updater] Dev config warning:', err);
      }
    }

    if (targetConfigPath) {
      autoUpdater.updateConfigPath = targetConfigPath;
    }

    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO
    });
  } catch (err) {
    console.warn('[Updater] setupUpdateConfig error:', err);
  }
}

/**
 * 安全廣播更新事件至渲染進程 (React)
 */
function sendToRenderer(channel, data) {
  if (mainWindowRef && !mainWindowRef.isDestroyed() && mainWindowRef.webContents) {
    mainWindowRef.webContents.send(channel, data);
  }
}

function updateStateAndBroadcast(newState) {
  currentUpdateState = {
    ...currentUpdateState,
    ...newState,
    currentVersion: app.getVersion()
  };
  sendToRenderer('updater:status-changed', currentUpdateState);
}

/**
 * 初始化更新核心與安全事件監聽
 */
function initUpdater(window) {
  mainWindowRef = window;

  // 1. 資安與使用者意願配置
  autoUpdater.autoDownload = false; // 嚴格禁止私自下載，必須經由使用者點擊確認
  autoUpdater.autoInstallOnAppQuit = true; // 下載完成後若使用者選擇稍後，在正常關閉時安全套用
  autoUpdater.allowDowngrade = false; // 嚴格防回滾 (Anti-Rollback)，禁止安裝舊版
  autoUpdater.allowPrerelease = false;

  // 確保更新設定已就緒
  setupUpdateConfig();

  // 2. 註冊 autoUpdater 生命週期監聽
  autoUpdater.on('checking-for-update', () => {
    updateStateAndBroadcast({
      status: 'checking',
      error: null,
      lastCheckedTime: Date.now()
    });
  });

  autoUpdater.on('update-available', (info) => {
    updateStateAndBroadcast({
      status: 'available',
      info: {
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes,
        files: info.files?.map(f => ({
          url: f.url,
          size: f.size,
          sha512: f.sha512
        })),
        sha512: info.sha512 || (info.files && info.files[0] ? info.files[0].sha512 : undefined),
        isCritical: !!(info.releaseNotes && typeof info.releaseNotes === 'string' && info.releaseNotes.includes('[CRITICAL]'))
      },
      error: null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    updateStateAndBroadcast({
      status: 'not-available',
      info: {
        version: info?.version || app.getVersion()
      },
      error: null
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    updateStateAndBroadcast({
      status: 'downloading',
      progress: {
        percent: Math.min(100, Math.max(0, progressObj.percent || 0)),
        bytesPerSecond: progressObj.bytesPerSecond || 0,
        transferred: progressObj.transferred || 0,
        total: progressObj.total || 0
      }
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    updateStateAndBroadcast({
      status: 'downloaded',
      info: {
        version: info.version,
        releaseNotes: info.releaseNotes
      },
      error: null
    });
  });

  autoUpdater.on('error', (err) => {
    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg
    });
  });

  // 3. 啟動排程：
  // 啟動 10 秒後執行第一次背景靜默檢查 (避免搶奪渲染與開盤初期的運算頻寬)
  setTimeout(() => {
    checkForUpdatesSilently();
  }, 10000);

  // 4. 定期輪詢：每 4 小時自動在背景檢測一次新版本
  if (checkIntervalTimer) clearInterval(checkIntervalTimer);
  checkIntervalTimer = setInterval(() => {
    checkForUpdatesSilently();
  }, 4 * 60 * 60 * 1000);
}

/**
 * 靜默檢查 (不彈出「已是最新版本」的侵入性提示)
 */
async function checkForUpdatesSilently() {
  if (!app.isPackaged) {
    // 開發模式下不執行未打包的遠端更新查詢
    return;
  }
  try {
    setupUpdateConfig();
    await autoUpdater.checkForUpdates();
  } catch {
    // 靜默捕捉背景網路錯誤，避免打擾正常看盤
  }
}

/**
 * 手動主動檢查更新 (使用者點擊「檢查更新」時觸發)
 */
async function checkForUpdates() {
  const now = Date.now();
  if (now - lastCheckTime < CHECK_COOLDOWN_MS) {
    return { status: currentUpdateState.status, message: '檢查頻率過於頻繁，請稍候' };
  }
  lastCheckTime = now;

  setupUpdateConfig();

  // 開發環境下的友善模擬回饋
  if (!app.isPackaged) {
    updateStateAndBroadcast({
      status: 'checking',
      lastCheckedTime: now
    });

    await new Promise(r => setTimeout(r, 1200));

    // 如果設置了環境變量 SIMULATE_UPDATE=true，可供開發測試 UI
    if (process.env.SIMULATE_UPDATE === 'true') {
      updateStateAndBroadcast({
        status: 'available',
        info: {
          version: '1.1.0',
          releaseDate: new Date().toISOString(),
          releaseNotes: '### ✨ ProStock v1.1.0 重大升級\n- 🛡️ 全面導入 SHA-512 密碼學完整性驗證\n- 📈 新增機構級 VWAP 與成交量分佈 (Volume Profile)\n- ⚡ 圖表效能全面提升 30%',
          sha512: '3a812b1...validated_mock_hash',
          isCritical: false
        }
      });
      return { status: 'available', devMode: true };
    }

    updateStateAndBroadcast({
      status: 'not-available',
      info: { version: app.getVersion() }
    });
    return { status: 'not-available', devMode: true };
  }

  try {
    updateStateAndBroadcast({
      status: 'checking',
      error: null,
      lastCheckedTime: now
    });
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checking', updateInfo: result?.updateInfo };
  } catch (err) {
    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg
    });
    return { status: 'error', error: friendlyMsg };
  }
}

/**
 * 啟動下載更新檔 (由使用者確認後點擊觸發)
 */
async function startDownloadUpdate() {
  if (!app.isPackaged) {
    // 開發模式模擬下載進度
    if (process.env.SIMULATE_UPDATE === 'true') {
      updateStateAndBroadcast({ status: 'downloading', progress: { percent: 10, bytesPerSecond: 1024000, transferred: 5000000, total: 50000000 } });
      setTimeout(() => updateStateAndBroadcast({ status: 'downloading', progress: { percent: 50, bytesPerSecond: 2048000, transferred: 25000000, total: 50000000 } }), 800);
      setTimeout(() => updateStateAndBroadcast({ status: 'downloading', progress: { percent: 90, bytesPerSecond: 3072000, transferred: 45000000, total: 50000000 } }), 1600);
      setTimeout(() => updateStateAndBroadcast({ status: 'downloaded', info: currentUpdateState.info }), 2400);
      return { success: true, devMode: true };
    }
    return { success: false, message: '開發模式無法下載實際更新包' };
  }

  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    updateStateAndBroadcast({
      status: 'error',
      error: err.message || '更新檔案下載失敗'
    });
    return { success: false, error: err.message };
  }
}

/**
 * 立即重啟軟體並安裝新版本 (零參數防注入)
 */
function quitAndInstall() {
  if (!app.isPackaged) {
    if (process.env.SIMULATE_UPDATE === 'true') {
      updateStateAndBroadcast({ status: 'idle' });
      return { success: true, devMode: true };
    }
    return { success: false, message: '開發環境不執行重啟替換' };
  }
  // isSilent: false (顯示安裝進度), isForceRunAfter: true (安裝完立即啟動新版本)
  autoUpdater.quitAndInstall(false, true);
  return { success: true };
}

function getCurrentState() {
  return currentUpdateState;
}

module.exports = {
  initUpdater,
  checkForUpdates,
  startDownloadUpdate,
  quitAndInstall,
  getCurrentState
};
