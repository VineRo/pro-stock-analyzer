/**
 * 語意化版本號比對 (SemVer Comparison)
 * 回傳值:
 *  1: v1 > v2 (有更高新版本)
 *  0: v1 == v2 (版本相同)
 * -1: v1 < v2 (目標版本低於現行版本，嚴格防回滾)
 */
export function compareSemVer(v1?: string | null, v2?: string | null): number {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;

  const cleanV1 = String(v1).replace(/^v+/i, '').trim();
  const cleanV2 = String(v2).replace(/^v+/i, '').trim();

  // 移除 build metadata (e.g. "1.7.0+20260906" => "1.7.0")
  const noBuild1 = cleanV1.split('+')[0];
  const noBuild2 = cleanV2.split('+')[0];

  // 分離主版本與先行版本標籤 (e.g. "1.7.0-beta.1" => ["1.7.0", "beta.1"])
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

  // 若主版本相同，依據 SemVer 規範：正式發布版本 > 先行發布版本 (Pre-release)
  if (!pre1 && pre2) return 1;  // v1 是正式版，v2 是預覽版 => v1 > v2
  if (pre1 && !pre2) return -1; // v1 是預覽版，v2 是正式版 => v1 < v2
  if (pre1 && pre2) {
    const cmp = pre1.localeCompare(pre2, undefined, { numeric: true });
    if (cmp > 0) return 1;
    if (cmp < 0) return -1;
    return 0;
  }

  return 0;
}

/**
 * 檢查遠端版本是否符合安全升級條件 (防降級攻擊 Anti-Rollback)
 */
export function isEligibleUpdate(currentVersion: string, remoteVersion: string): boolean {
  return compareSemVer(remoteVersion, currentVersion) > 0;
}

/**
 * 檢查是否屬於重大安全性或相容性修補 (Critical Update)
 */
export function isCriticalUpdate(releaseNotes?: string | (string | { version?: string; note?: string })[]): boolean {
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
    return releaseNotes.some((n) => {
      if (typeof n === 'string') return isCriticalUpdate(n);
      return isCriticalUpdate(n?.note);
    });
  }
  return false;
}

/**
 * 格式化檔案大小
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0 || !Number.isFinite(bytes)) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 計算預估下載剩餘秒數
 */
export function estimateRemainingSeconds(transferred: number, total: number, bytesPerSec: number): number {
  if (!bytesPerSec || bytesPerSec <= 0 || !total || total <= 0 || !Number.isFinite(transferred) || transferred >= total) return 0;
  const remainingBytes = total - transferred;
  return Math.ceil(remainingBytes / bytesPerSec);
}

/**
 * 清理並格式化發布日誌 (過濾 GitHub/HTML 殘留之 <p>, <br>, <div>, <li> 等標籤與 HTML 實體)
 */
export function cleanReleaseNotes(notes?: string): string {
  if (!notes) return '';
  return notes
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1].length > 0))
    .join('\n')
    .trim();
}

/**
 * 判斷當前環境是否為 Windows 作業系統
 */
export function isWindowsPlatform(customPlatform?: string): boolean {
  if (customPlatform) {
    const p = customPlatform.toLowerCase();
    if (p === 'darwin' || p.includes('mac')) return false;
    return p === 'win32' || p === 'win64' || p.startsWith('win') || p.includes('windows');
  }
  if (typeof window !== 'undefined' && window.electronAPI?.platform) {
    return window.electronAPI.platform.toLowerCase() === 'win32';
  }
  if (typeof navigator !== 'undefined') {
    const userAgent = (navigator.userAgent || '').toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();
    if (platform.includes('darwin') || platform.includes('mac') || userAgent.includes('macintosh')) {
      return false;
    }
    return userAgent.includes('windows') || platform.startsWith('win') || platform === 'win32';
  }
  return false;
}

/**
 * 判斷當前環境是否為 macOS 作業系統
 */
export function isMacPlatform(customPlatform?: string): boolean {
  if (customPlatform) {
    const p = customPlatform.toLowerCase();
    return p === 'darwin' || p.includes('mac') || p.includes('darwin');
  }
  if (typeof window !== 'undefined' && window.electronAPI?.platform) {
    return window.electronAPI.platform.toLowerCase() === 'darwin';
  }
  if (typeof navigator !== 'undefined') {
    const userAgent = (navigator.userAgent || '').toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();
    return userAgent.includes('mac') || platform.includes('mac') || platform.includes('darwin');
  }
  return false;
}

export interface PlatformDownloadInfo {
  platformName: 'Windows' | 'macOS' | 'Other';
  isWindows: boolean;
  isMac: boolean;
  primaryDownloadUrl: string;
  primaryButtonText: string;
  portableDownloadUrl?: string;
  portableButtonText?: string;
  officialWebsiteUrl: string;
}

/**
 * 依據作業系統與晶片架構動態產出對應平台之二進位下載連結與按鈕說明
 */
export function getPlatformDownloadInfo(version?: string, customPlatform?: string, customArch?: string): PlatformDownloadInfo {
  const cleanVersion = version ? String(version).replace(/^v+/i, '').trim() : '1.7.0';
  const effectiveVersion = cleanVersion || '1.7.0';
  const isWin = isWindowsPlatform(customPlatform);
  const isMac = !isWin && isMacPlatform(customPlatform);
  const officialWebsiteUrl = 'https://vinero.github.io/pro-stock-analyzer/';

  // 偵測晶片架構 (支援 Apple Silicon arm64 與 Intel x64)
  const detectedArch = (
    customArch ||
    (typeof window !== 'undefined' && window.electronAPI?.arch) ||
    ''
  ).toLowerCase();
  const isIntelMac = isMac && detectedArch === 'x64';

  if (isWin) {
    return {
      platformName: 'Windows',
      isWindows: true,
      isMac: false,
      primaryDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/download/v${effectiveVersion}/ProStock-Analyzer-Setup-${effectiveVersion}.exe`,
      primaryButtonText: '一鍵下載 Windows 安裝引導檔 (.exe)',
      portableDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/download/v${effectiveVersion}/ProStock-Analyzer-${effectiveVersion}.exe`,
      portableButtonText: '下載免安裝 Portable 版 (.exe)',
      officialWebsiteUrl
    };
  }

  if (isMac) {
    if (isIntelMac) {
      return {
        platformName: 'macOS',
        isWindows: false,
        isMac: true,
        primaryDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/download/v${effectiveVersion}/ProStock-Analyzer-${effectiveVersion}.dmg`,
        primaryButtonText: '一鍵下載 macOS (Intel x64) 安裝檔 (.dmg)',
        portableDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/download/v${effectiveVersion}/ProStock-Analyzer-${effectiveVersion}-arm64.dmg`,
        portableButtonText: '下載 Apple Silicon (M1~M4) 版 (.dmg)',
        officialWebsiteUrl
      };
    }

    return {
      platformName: 'macOS',
      isWindows: false,
      isMac: true,
      primaryDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/download/v${effectiveVersion}/ProStock-Analyzer-${effectiveVersion}-arm64.dmg`,
      primaryButtonText: '一鍵下載 macOS 原生安裝檔 (.dmg)',
      portableDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/download/v${effectiveVersion}/ProStock-Analyzer-${effectiveVersion}.dmg`,
      portableButtonText: '下載 Intel (x64) 晶片版 (.dmg)',
      officialWebsiteUrl
    };
  }

  return {
    platformName: 'Other',
    isWindows: false,
    isMac: false,
    primaryDownloadUrl: `https://github.com/VineRo/pro-stock-analyzer/releases/tag/v${effectiveVersion}`,
    primaryButtonText: '前往 GitHub Releases 下載對應安裝檔',
    officialWebsiteUrl
  };
}

/**
 * 消除底層本機私有路徑與使用者名稱，避免洩漏隱私資訊
 */
export function sanitizeErrorMessage(msg: string): string {
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
 * 轉譯為對使用者友善且不洩漏底層路徑的資安錯誤訊息
 */
export function getFriendlyErrorMessage(err: unknown): string {
  const raw = typeof err === 'string' ? err : (err as Error)?.message || String(err || '');
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

