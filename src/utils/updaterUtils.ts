/**
 * 語意化版本號比對 (SemVer Comparison)
 * 回傳值:
 *  1: v1 > v2 (有更高新版本)
 *  0: v1 == v2 (版本相同)
 * -1: v1 < v2 (目標版本低於現行版本，嚴格防回滾)
 */
export function compareSemVer(v1: string, v2: string): number {
  const cleanV1 = v1.replace(/^v/i, '').trim();
  const cleanV2 = v2.replace(/^v/i, '').trim();

  const parts1 = cleanV1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = cleanV2.split('.').map((p) => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
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
export function isCriticalUpdate(releaseNotes?: string | { version: string; note: string }[]): boolean {
  if (!releaseNotes) return false;
  if (typeof releaseNotes === 'string') {
    return (
      releaseNotes.includes('[CRITICAL]') ||
      releaseNotes.includes('【重大安全更新】') ||
      releaseNotes.includes('【緊急修補】')
    );
  }
  return releaseNotes.some((n) =>
    n.note.includes('[CRITICAL]') ||
    n.note.includes('【重大安全更新】') ||
    n.note.includes('【緊急修補】')
  );
}

/**
 * 格式化檔案大小
 */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * 計算預估下載剩餘秒數
 */
export function estimateRemainingSeconds(transferred: number, total: number, bytesPerSec: number): number {
  if (!bytesPerSec || bytesPerSec <= 0 || transferred >= total) return 0;
  const remainingBytes = total - transferred;
  return Math.ceil(remainingBytes / bytesPerSec);
}
