const { app, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GITHUB_OWNER = 'VineRo';
const GITHUB_REPO = 'pro-stock-analyzer';
const CACHE_DIR_NAME = 'pro-stock-analyzer-updater';

const DEFAULT_UPDATE_CONFIG = [
  `owner: ${GITHUB_OWNER}`,
  `repo: ${GITHUB_REPO}`,
  `provider: github`,
  `updaterCacheDirName: ${CACHE_DIR_NAME}`
].join('\n') + '\n';

const logger = {
  info: (msg, ...args) => console.log(`[Updater][INFO] [${new Date().toISOString()}]`, msg, ...args),
  warn: (msg, ...args) => console.warn(`[Updater][WARN] [${new Date().toISOString()}]`, msg, ...args),
  error: (msg, ...args) => console.error(`[Updater][ERROR] [${new Date().toISOString()}]`, msg, ...args),
  debug: (msg, ...args) => console.log(`[Updater][DEBUG] [${new Date().toISOString()}]`, msg, ...args),
};
autoUpdater.logger = logger;

let mainWindowRef = null;
let lastCheckTime = 0;
const CHECK_COOLDOWN_MS = 2000; // 2 秒防連點節流
let checkIntervalTimer = null;
let isInitialized = false;

// 當前內部狀態緩存
let currentUpdateState = {
  status: 'idle',
  currentVersion: app.getVersion?.() || '1.7.0',
  info: null,
  progress: null,
  error: null,
  lastCheckedTime: null
};

let isCheckingUpdate = false;

/**
 * 消除底層本機私有路徑與使用者名稱，避免洩漏隱私資訊
 */
function sanitizeErrorMessage(msg) {
  if (!msg) return '';
  // 濾除 file:// 協議 URL 包含之檔案路徑
  let cleaned = msg.replace(/file:\/\/[^\s"'<>]+/gi, '[本機目錄路徑]');
  // 濾除 Windows 絕對路徑 (e.g. C:\Users\xxx\... 或 C:/Users/xxx/...)
  cleaned = cleaned.replace(/[a-zA-Z]:[\\/][^"'\n\r<>]+/g, '[本機目錄路徑]');
  // 濾除 Unix / Linux 絕對路徑 (e.g. /Users/xxx/..., /home/xxx/..., /root/xxx/..., /opt/xxx/...)
  cleaned = cleaned.replace(/\/(Users|home|root|opt|private|tmp|var|etc|usr)[\\/][^"'\n\r<>]+/gi, '[本機目錄路徑]');
  return cleaned.trim();
}

/**
 * 語意化版本號比對 (SemVer Comparison)
 */
function compareSemVer(v1, v2) {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  const cleanV1 = String(v1).replace(/^v+/i, '').trim();
  const cleanV2 = String(v2).replace(/^v+/i, '').trim();

  // 移除 build metadata (e.g. "1.7.0+20260906" => "1.7.0")
  const noBuild1 = cleanV1.split('+')[0];
  const noBuild2 = cleanV2.split('+')[0];

  const [main1, pre1] = noBuild1.split('-');
  const [main2, pre2] = noBuild2.split('-');

  const parts1 = main1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = main2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }

  if (!pre1 && pre2) return 1;
  if (pre1 && !pre2) return -1;
  if (pre1 && pre2) {
    const cmp = pre1.localeCompare(pre2, undefined, { numeric: true });
    if (cmp > 0) return 1;
    if (cmp < 0) return -1;
    return 0;
  }

  return 0;
}

/**
 * 檢查是否屬於重大安全性或相容性修補 (Critical Update)
 */
function isCriticalUpdate(releaseNotes) {
  if (!releaseNotes) return false;
  if (typeof releaseNotes === 'string') {
    const lower = releaseNotes.toLowerCase();
    return (
      lower.includes('[critical]') ||
      releaseNotes.includes('【重大安全更新】') ||
      releaseNotes.includes('【緊急修補】') ||
      lower.includes('security update') ||
      lower.includes('critical fix')
    );
  }
  if (Array.isArray(releaseNotes)) {
    return releaseNotes.some((n) => isCriticalUpdate(n?.note || n));
  }
  return false;
}

/**
 * 轉譯為對使用者友善且不洩漏底層路徑的資安錯誤訊息
 */
function getFriendlyErrorMessage(err) {
  const raw = err?.message || String(err || '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('code signature') ||
    lower.includes('did not pass validation') ||
    lower.includes('shipit') ||
    lower.includes('could not get code signature') ||
    raw.includes('代碼不包含資源但簽名顯示必須包含資源')
  ) {
    return '偵測到 macOS 系統安全簽名限制（未購買 Apple 付費開發者憑證環境下，系統禁止背景靜默替換）。系統已提供最新版 DMG 安裝檔，請點擊按鈕直接下載安裝。';
  }
  if (
    lower.includes('cannot download differentially') ||
    lower.includes('blockmap') ||
    lower.includes('err_updater_diff_download_failed') ||
    lower.includes('416')
  ) {
    return '偵測到 Windows 差異增量更新校驗異常，系統已自動切換為完整安裝套件下載模式。請稍候重試或至官網下載。';
  }
  if (
    lower.includes('sha512') ||
    lower.includes('checksum mismatch') ||
    lower.includes('err_checksum_mismatch') ||
    lower.includes('integrity')
  ) {
    return '檔案密碼學完整性驗證 (SHA-512) 失敗，下載的更新套件可能已損毀，為確保安全已中止安裝。請稍候重試或至官網下載。';
  }
  if (
    lower.includes('err_updater_invalid_signature') ||
    lower.includes('not signed by the application owner') ||
    lower.includes('invalid signature')
  ) {
    return '應用程式數位簽章驗證未通過，為保護系統安全已中止安裝。建議前往官方網站下載最新已簽章版本。';
  }
  if (
    lower.includes('eperm') ||
    lower.includes('eacces') ||
    lower.includes('permission denied') ||
    lower.includes('elevate.exe')
  ) {
    return '更新檔案寫入或執行權限不足（請嘗試以「系統管理員身分」執行本軟體或至官網下載安裝檔）。';
  }
  if (lower.includes('ebusy') || lower.includes('file is locked') || lower.includes('resource busy')) {
    return '更新暫存檔案正被防毒軟體或其它程序佔用，請稍候重試。';
  }
  if (lower.includes('enospc') || lower.includes('no space left on device') || lower.includes('disk full')) {
    return '磁碟儲存空間不足，無法完成更新下載。請清理磁碟空間後稍後重試。';
  }
  if (
    lower.includes('canceled by the user') ||
    lower.includes('operation was canceled by the user') ||
    lower.includes('error_cancelled') ||
    lower.includes('1223') ||
    lower.includes('user did not grant permission')
  ) {
    return '已取消更新安裝程序。您可隨時再次點擊安裝套件完成更新。';
  }
  if (lower.includes('app-update.yml') || lower.includes('dev-app-update.yml')) {
    return '更新設定檔初始化中，請稍候重試';
  }
  if (
    lower.includes('net::err') ||
    lower.includes('enotfound') ||
    lower.includes('etimedout') ||
    lower.includes('timeout') ||
    lower.includes('econnreset') ||
    lower.includes('econnrefused') ||
    lower.includes('failed to fetch') ||
    lower.includes('could not resolve host') ||
    lower.includes('network error')
  ) {
    return '無法連線至 GitHub 官方更新伺服器，請確認網路連線是否暢通或稍候重試';
  }
  if (lower.includes('err_updater_zip_file_not_found') || lower.includes('404') || lower.includes('not found')) {
    return 'GitHub 伺服器尚未發布符合當前平台之更新套件，建議前往官方網站確認';
  }
  if (lower.includes('rate limit') || lower.includes('403')) {
    return 'GitHub API 請求頻率達到上限，請稍候 5 分鐘後重試';
  }
  if (lower.includes('download is already in progress')) {
    return '更新套件已在背景下載中，請稍候';
  }

  const sanitized = sanitizeErrorMessage(raw);
  return sanitized || '自動更新檢查失敗，請稍後重試';
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
        logger.warn('Dev config warning:', err);
      }
    }

    if (targetConfigPath) {
      logger.info(`Update config path active at: ${targetConfigPath}`);
      autoUpdater.updateConfigPath = targetConfigPath;
    }

    autoUpdater.setFeedURL({
      provider: 'github',
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      updaterCacheDirName: CACHE_DIR_NAME
    });
  } catch (err) {
    logger.error('setupUpdateConfig error:', err);
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
    currentVersion: app.getVersion?.() || '1.7.0'
  };
  sendToRenderer('updater:status-changed', currentUpdateState);
}

/**
 * 初始化更新核心與安全事件監聽
 */
function initUpdater(window) {
  mainWindowRef = window;
  if (isInitialized) {
    logger.info('autoUpdater already initialized, updated mainWindowRef');
    return;
  }
  isInitialized = true;

  logger.info(`Initializing autoUpdater: platform=${process.platform}, arch=${process.arch}, version=${app.getVersion?.() || '1.7.0'}, isPackaged=${app.isPackaged}, temp=${app.getPath('temp')}, userData=${app.getPath('userData')}`);

  // 1. 資安與使用者意願配置
  autoUpdater.autoDownload = false; // 嚴格禁止私自下載，必須經由使用者點擊確認
  autoUpdater.autoInstallOnAppQuit = true; // 下載完成後若使用者選擇稍後，在正常關閉時安全套用
  autoUpdater.allowDowngrade = false; // 嚴格防回滾 (Anti-Rollback)，禁止安裝舊版
  autoUpdater.allowPrerelease = false;
  autoUpdater.disableWebInstaller = true; // 鎖定標準 NSIS 單一安裝套件，避免 Web Installer 依賴異常

  // 確保更新設定已就緒
  setupUpdateConfig();

  // 2. 註冊 autoUpdater 生命週期監聽
  autoUpdater.on('checking-for-update', () => {
    logger.info('autoUpdater event: checking-for-update');
    updateStateAndBroadcast({
      status: 'checking',
      error: null,
      lastCheckedTime: Date.now()
    });
  });

  autoUpdater.on('update-available', (info) => {
    const targetVer = info?.version || '1.7.0';
    logger.info(`autoUpdater event: update-available -> targetVersion=${targetVer}, releaseDate=${info?.releaseDate}`);
    updateStateAndBroadcast({
      status: 'available',
      info: {
        version: targetVer,
        releaseDate: info?.releaseDate,
        releaseNotes: info?.releaseNotes,
        files: info?.files?.map(f => ({
          url: f.url,
          size: f.size,
          sha512: f.sha512
        })),
        sha512: info?.sha512 || (info?.files && info.files[0] ? info.files[0].sha512 : undefined),
        isCritical: isCriticalUpdate(info?.releaseNotes)
      },
      lastCheckedTime: Date.now(),
      error: null
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    logger.info(`autoUpdater event: update-not-available -> currentVersion=${app.getVersion()}, remoteVersion=${info?.version || 'same'}`);
    updateStateAndBroadcast({
      status: 'not-available',
      info: {
        version: info?.version || app.getVersion?.() || '1.7.0'
      },
      lastCheckedTime: Date.now(),
      error: null
    });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    logger.debug(`autoUpdater event: download-progress ${Math.round(progressObj.percent || 0)}%`);
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
    const downloadedVer = info?.version || currentUpdateState.info?.version || '1.7.0';
    logger.info(`autoUpdater event: update-downloaded -> version=${downloadedVer}`);
    updateStateAndBroadcast({
      status: 'downloaded',
      info: {
        ...currentUpdateState.info,
        version: downloadedVer,
        releaseNotes: info?.releaseNotes || currentUpdateState.info?.releaseNotes
      },
      lastCheckedTime: Date.now(),
      error: null
    });
  });

  autoUpdater.on('error', (err) => {
    logger.error('autoUpdater event: error ->', err);
    if (isCheckingUpdate) {
      logger.info('autoUpdater check error intercepted; awaiting GitHub API fallback in checkForUpdates()');
      return;
    }
    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg,
      lastCheckedTime: Date.now()
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
  if (currentUpdateState.status === 'checking') {
    return { status: 'checking', message: '正在檢查更新中' };
  }
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
          version: '1.8.0',
          releaseDate: new Date().toISOString(),
          releaseNotes: '### ✨ ProStock v1.8.0 重大升級\n- 🛡️ 全面導入 SHA-512 密碼學完整性驗證\n- 📈 新增機構級 VWAP 與成交量分佈 (Volume Profile)\n- ⚡ 圖表效能全面提升 30%',
          sha512: '3a812b1...validated_mock_hash',
          isCritical: false
        },
        lastCheckedTime: Date.now()
      });
      return { status: 'available', devMode: true };
    }

    updateStateAndBroadcast({
      status: 'not-available',
      info: { version: app.getVersion?.() || '1.7.0' },
      lastCheckedTime: Date.now()
    });
    return { status: 'not-available', devMode: true };
  }

  try {
    isCheckingUpdate = true;
    updateStateAndBroadcast({
      status: 'checking',
      error: null,
      lastCheckedTime: now
    });
    const result = await autoUpdater.checkForUpdates();
    return { status: 'checking', updateInfo: result?.updateInfo };
  } catch (err) {
    logger.warn('autoUpdater.checkForUpdates threw, attempting GitHub Releases API fallback:', err);
    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`, {
        headers: { 'User-Agent': 'Mozilla/5.0 ProStock-Analyzer-Updater' },
        signal: AbortSignal.timeout(6000)
      });
      if (response.ok) {
        const release = await response.json();
        const remoteVersion = (release.tag_name || release.name || '').replace(/^v+/i, '').trim();
        const currentVersion = (app.getVersion?.() || '1.7.0').replace(/^v+/i, '').trim();

        const cmp = compareSemVer(remoteVersion, currentVersion);
        if (cmp > 0) {
          const isArm64 = process.arch === 'arm64';
          const isMac = process.platform === 'darwin';
          const assets = release.assets || [];
          const matchedAsset = assets.find(a => {
            const name = (a.name || '').toLowerCase();
            if (isMac) {
              return name.endsWith('.dmg') && (isArm64 ? name.includes('arm64') : !name.includes('arm64'));
            }
            return name.endsWith('.exe') && name.includes('setup');
          }) || assets.find(a => isMac ? (a.name || '').toLowerCase().endsWith('.dmg') : (a.name || '').toLowerCase().endsWith('.exe'));

          const info = {
            version: remoteVersion,
            releaseDate: release.published_at,
            releaseNotes: release.body,
            files: assets.map(a => ({
              url: a.browser_download_url,
              size: a.size
            })),
            sha512: undefined,
            isCritical: isCriticalUpdate(release.body)
          };

          updateStateAndBroadcast({
            status: 'available',
            info,
            lastCheckedTime: Date.now(),
            error: null
          });
          return { status: 'available', updateInfo: info };
        } else {
          updateStateAndBroadcast({
            status: 'not-available',
            info: { version: remoteVersion || currentVersion },
            lastCheckedTime: Date.now(),
            error: null
          });
          return { status: 'not-available' };
        }
      }
    } catch (fallbackErr) {
      logger.error('GitHub API fallback also failed:', fallbackErr);
    }

    logger.error('checkForUpdates failed:', err);
    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg,
      lastCheckedTime: Date.now()
    });
    return { status: 'error', error: friendlyMsg };
  } finally {
    isCheckingUpdate = false;
  }
}

/**
 * 在 macOS 上直接下載最新版 DMG 安裝檔
 * 解決 Squirrel.Mac (ShipIt) 在開源無證書 (Ad-hoc) 環境下因 SecCodeCheckValidity 必定報錯之架構限制
 */
async function downloadMacDmgDirectly() {
  const info = currentUpdateState.info;
  if (!info || !info.version) {
    const errorMsg = '未取得有效之新版本資訊';
    updateStateAndBroadcast({ status: 'error', error: errorMsg, lastCheckedTime: Date.now() });
    return { success: false, error: errorMsg };
  }

  const isArm64 = process.arch === 'arm64';
  const version = (info.version || '').replace(/^v+/i, '');
  const files = info.files || [];
  let matchedDmg = files.find(f => f.url && f.url.endsWith('.dmg') && (isArm64 ? f.url.includes('arm64') : !f.url.includes('arm64')));
  if (!matchedDmg) {
    matchedDmg = files.find(f => f.url && f.url.endsWith('.dmg'));
  }

  let fileName = `ProStock-Analyzer-${version}${isArm64 ? '-arm64' : ''}.dmg`;
  if (matchedDmg?.url) {
    try {
      fileName = path.basename(new URL(matchedDmg.url, 'https://dummy.com').pathname);
    } catch {
      fileName = path.basename(matchedDmg.url);
    }
  }

  const downloadUrl = matchedDmg?.url && matchedDmg.url.startsWith('http')
    ? matchedDmg.url
    : `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/v${version}/${fileName}`;

  const targetDir = app.getPath('downloads');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const targetPath = path.join(targetDir, fileName);
  const tempPath = `${targetPath}.downloading`;

  updateStateAndBroadcast({
    status: 'downloading',
    progress: { percent: 0, bytesPerSecond: 0, transferred: 0, total: matchedDmg?.size || 100 * 1024 * 1024 },
    lastCheckedTime: Date.now()
  });

  let fileStream = null;
  try {
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 ProStock-Analyzer-Updater'
      }
    });

    if (!response.ok) {
      throw new Error(`下載 DMG 失敗 HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('下載 DMG 失敗：未取得遠端回應內容 (Empty response body)');
    }

    const total = Number(response.headers.get('content-length')) || matchedDmg?.size || 100 * 1024 * 1024;
    let transferred = 0;
    let lastTime = Date.now();
    let lastBytes = 0;

    fileStream = fs.createWriteStream(tempPath);
    const hash = crypto.createHash('sha512');

    const writePromise = new Promise((resolve, reject) => {
      fileStream.on('error', reject);
      fileStream.on('finish', resolve);
    });
    // 防禦未捕捉之 Promise Rejection，確保流異常時主進程不崩潰
    writePromise.catch(() => {});

    const reader = response.body.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      hash.update(value);
      if (!fileStream.write(Buffer.from(value))) {
        await new Promise((resolve) => fileStream.once('drain', resolve));
      }
      transferred += value.length;

      const now = Date.now();
      if (now - lastTime >= 250) {
        const duration = (now - lastTime) / 1000;
        const speed = Math.round((transferred - lastBytes) / duration);
        const percent = Math.min(99, Math.round((transferred / total) * 100));
        lastTime = now;
        lastBytes = transferred;

        updateStateAndBroadcast({
          status: 'downloading',
          progress: { percent, bytesPerSecond: speed, transferred, total }
        });
      }
    }

    fileStream.end();
    await writePromise;

    // 執行 SHA-512 密碼學完整性驗證 (支援 hex, base64 與 sha512- 前綴)
    const rawSha512 = (matchedDmg?.sha512 || info.sha512 || '').trim();
    const expectedSha512 = rawSha512.replace(/^sha512-/i, '').trim();
    if (expectedSha512) {
      const digestBuf = hash.digest();
      const computedBase64 = digestBuf.toString('base64');
      const computedHex = digestBuf.toString('hex');
      if (expectedSha512 !== computedBase64 && expectedSha512.toLowerCase() !== computedHex.toLowerCase()) {
        logger.error(`DMG SHA-512 checksum mismatch! expected=${expectedSha512}, computedBase64=${computedBase64}`);
        throw new Error('sha512 checksum mismatch, DMG 檔案完整性驗證失敗');
      }
      logger.info('DMG SHA-512 integrity check passed successfully.');
    }

    if (fs.existsSync(targetPath)) {
      try { fs.unlinkSync(targetPath); } catch {}
    }
    fs.renameSync(tempPath, targetPath);

    updateStateAndBroadcast({
      status: 'downloaded',
      info: {
        ...info,
        isDmg: true,
        dmgPath: targetPath,
        fileName
      },
      lastCheckedTime: Date.now(),
      error: null
    });

    return { success: true, isDmg: true, targetPath };
  } catch (err) {
    if (fileStream) {
      try {
        fileStream.destroy();
      } catch {}
      try {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      } catch {}
    }
    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg,
      lastCheckedTime: Date.now()
    });
    return { success: false, error: friendlyMsg };
  }
}

/**
 * 啟動下載更新檔 (由使用者確認後點擊觸發)
 */
async function startDownloadUpdate() {
  if (currentUpdateState.status === 'downloading') {
    logger.warn('Download already in progress, ignoring duplicate trigger.');
    return { success: true, message: '下載已在進行中' };
  }

  if (!app.isPackaged) {
    // 開發模式模擬下載進度
    if (process.env.SIMULATE_UPDATE === 'true') {
      updateStateAndBroadcast({ status: 'downloading', progress: { percent: 10, bytesPerSecond: 1024000, transferred: 5000000, total: 50000000 }, lastCheckedTime: Date.now() });
      setTimeout(() => updateStateAndBroadcast({ status: 'downloading', progress: { percent: 50, bytesPerSecond: 2048000, transferred: 25000000, total: 50000000 } }), 800);
      setTimeout(() => updateStateAndBroadcast({ status: 'downloading', progress: { percent: 90, bytesPerSecond: 3072000, transferred: 45000000, total: 50000000 } }), 1600);
      setTimeout(() => updateStateAndBroadcast({ status: 'downloaded', info: { ...currentUpdateState.info, isDmg: process.platform === 'darwin' }, lastCheckedTime: Date.now() }), 2400);
      return { success: true, devMode: true };
    }
    return { success: false, message: '開發模式無法下載實際更新包' };
  }

  // macOS 平臺：使用直接下載 DMG 方案，繞過 ShipIt 嚴格簽名限制
  if (process.platform === 'darwin') {
    return await downloadMacDmgDirectly();
  }

  // Windows 平臺：使用 NSIS autoUpdater
  try {
    logger.info(`Starting autoUpdater downloadUpdate for platform: ${process.platform}, arch: ${process.arch}`);
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    logger.error('autoUpdater.downloadUpdate failed:', err);
    const raw = (err?.message || String(err || '')).toLowerCase();

    // 若因 Windows 差異增量 blockmap 下載失敗，自動切換至全量下載重試
    if (
      !autoUpdater.disableDifferentialDownload &&
      (raw.includes('differential') || raw.includes('blockmap') || raw.includes('416') || raw.includes('range'))
    ) {
      logger.warn('Differential download failed, disabling differential download and retrying full download...');
      autoUpdater.disableDifferentialDownload = true;
      try {
        await autoUpdater.downloadUpdate();
        return { success: true, fallbackToFull: true };
      } catch (retryErr) {
        logger.error('Fallback full download failed:', retryErr);
        const friendlyMsg = getFriendlyErrorMessage(retryErr);
        updateStateAndBroadcast({
          status: 'error',
          error: friendlyMsg,
          lastCheckedTime: Date.now()
        });
        return { success: false, error: friendlyMsg };
      }
    }

    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg,
      lastCheckedTime: Date.now()
    });
    return { success: false, error: friendlyMsg };
  }
}

/**
 * 立即重啟軟體並安裝新版本 (零參數防注入)
 */
async function quitAndInstall() {
  if (!app.isPackaged) {
    if (process.env.SIMULATE_UPDATE === 'true') {
      updateStateAndBroadcast({ status: 'idle', lastCheckedTime: Date.now() });
      return { success: true, devMode: true };
    }
    return { success: false, message: '開發環境不執行重啟替換' };
  }

  if (currentUpdateState.status !== 'downloaded') {
    logger.warn(`Cannot quitAndInstall while state is ${currentUpdateState.status}`);
    return { success: false, message: '尚未完成更新套件下載' };
  }

  if (currentUpdateState.info?.isDmg && currentUpdateState.info?.dmgPath) {
    try {
      logger.info(`Opening macOS DMG for manual install: ${currentUpdateState.info.dmgPath}`);
      const openErr = await shell.openPath(currentUpdateState.info.dmgPath);
      if (openErr) {
        throw new Error(`無法開啟 DMG: ${openErr}`);
      }
      setTimeout(() => {
        app.quit();
      }, 800);
      return { success: true };
    } catch (err) {
      logger.error('Failed to open DMG path:', err);
      const friendlyMsg = '無法開啟 DMG 安裝檔，請手動前往「下載項目」資料夾開啟。';
      updateStateAndBroadcast({
        status: 'error',
        error: friendlyMsg,
        lastCheckedTime: Date.now()
      });
      return { success: false, error: friendlyMsg };
    }
  }

  try {
    logger.info('Executing autoUpdater.quitAndInstall(isSilent=false, isForceRunAfter=true)');
    // isSilent: false (顯示安裝進度), isForceRunAfter: true (安裝完立即啟動新版本)
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  } catch (err) {
    logger.error('autoUpdater.quitAndInstall failed:', err);
    const friendlyMsg = getFriendlyErrorMessage(err);
    updateStateAndBroadcast({
      status: 'error',
      error: friendlyMsg,
      lastCheckedTime: Date.now()
    });
    return { success: false, error: friendlyMsg };
  }
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
