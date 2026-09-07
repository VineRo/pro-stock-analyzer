import { describe, it, expect } from 'vitest';
import { 
  compareSemVer, 
  isEligibleUpdate, 
  isCriticalUpdate, 
  formatFileSize, 
  estimateRemainingSeconds,
  cleanReleaseNotes,
  isWindowsPlatform,
  isMacPlatform,
  getPlatformDownloadInfo,
  getFriendlyErrorMessage,
  sanitizeErrorMessage
} from '../utils/updaterUtils';

describe('軟體自動更新核心安全演算法測試 (Updater Security & SemVer)', () => {
  describe('語意化版本比對與防降級回滾檢驗 (SemVer & Anti-Rollback)', () => {
    it('新版版號大於現有版號時應正確識別為可更新', () => {
      expect(compareSemVer('1.0.1', '1.0.0')).toBe(1);
      expect(compareSemVer('1.1.0', '1.0.9')).toBe(1);
      expect(compareSemVer('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemVer('v1.2.0', '1.1.0')).toBe(1);
      expect(compareSemVer('vv1.2.0', '1.2.0')).toBe(0);
    });

    it('新版版號等於現有版號時應判定為無須更新', () => {
      expect(compareSemVer('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemVer('v1.0.0', '1.0.0')).toBe(0);
      expect(compareSemVer('vv1.0.0', 'v1.0.0')).toBe(0);
      expect(compareSemVer('1.2.3', 'v1.2.3')).toBe(0);
    });

    it('目標版本小於現行版本時應嚴格拒絕更新（防範降級攻擊 Rollback Attack）', () => {
      expect(compareSemVer('0.9.0', '1.0.0')).toBe(-1);
      expect(compareSemVer('1.0.0', '1.0.1')).toBe(-1);
      expect(isEligibleUpdate('1.0.0', '0.9.9')).toBe(false);
      expect(isEligibleUpdate('1.0.0', '1.0.0')).toBe(false);
    });

    it('isEligibleUpdate 僅在遠端真正高於本地時回傳 true', () => {
      expect(isEligibleUpdate('1.0.0', '1.0.1')).toBe(true);
      expect(isEligibleUpdate('1.0.0', '2.0.0')).toBe(true);
      expect(isEligibleUpdate('1.5.2', '1.5.1')).toBe(false);
    });

    it('空值或未定義版號能安全處置不崩潰', () => {
      expect(compareSemVer(null, '1.0.0')).toBe(-1);
      expect(compareSemVer('1.0.0', null)).toBe(1);
      expect(compareSemVer(undefined, undefined)).toBe(0);
    });

    it('遵循 SemVer 先行發布版本比對規範 (Pre-release lower than Release)', () => {
      // 正式版高於相同主版號之 beta/rc
      expect(compareSemVer('1.7.0', '1.7.0-beta.1')).toBe(1);
      expect(compareSemVer('1.7.0-beta.1', '1.7.0')).toBe(-1);
      expect(compareSemVer('1.7.0-rc.2', '1.7.0-rc.1')).toBe(1);
      // 數字序列自然排序 (beta.10 大於 beta.2)
      expect(compareSemVer('1.7.0-beta.10', '1.7.0-beta.2')).toBe(1);
      expect(compareSemVer('1.7.0-beta.2', '1.7.0-beta.10')).toBe(-1);
    });

    it('SemVer 應正確忽略構建元數據 (Build Metadata)', () => {
      expect(compareSemVer('1.7.0+build1', '1.7.0+build2')).toBe(0);
      expect(compareSemVer('1.7.1+build1', '1.7.0+build999')).toBe(1);
    });
  });

  describe('緊急資安修補標記檢驗 (Critical Security Update Detection)', () => {
    it('字串日誌中包含 [CRITICAL] 或重大安全更新標籤時應判定為緊急更新', () => {
      expect(isCriticalUpdate('### [CRITICAL] 修正即時行情 API 加密相容性')).toBe(true);
      expect(isCriticalUpdate('【重大安全更新】修復特定雜湊校驗邏輯')).toBe(true);
      expect(isCriticalUpdate('【緊急修補】防禦端點連線異常')).toBe(true);
      expect(isCriticalUpdate('Security Update: Patch memory leak')).toBe(true);
    });

    it('一般日常功能升級應判定為非緊急更新', () => {
      expect(isCriticalUpdate('新增台股加權指數 5 分 K 棒支援')).toBe(false);
      expect(isCriticalUpdate(undefined)).toBe(false);
    });

    it('陣列結構的 releaseNotes (物件或純字串) 也能正確偵測緊急更新', () => {
      const notesObj = [
        { version: '1.0.1', note: '新增畫線顏色' },
        { version: '1.0.2', note: '[CRITICAL] 升級依賴' }
      ];
      expect(isCriticalUpdate(notesObj)).toBe(true);

      const notesArr = ['一般優化', '[critical] 安全修補'];
      expect(isCriticalUpdate(notesArr)).toBe(true);
    });
  });

  describe('傳輸容量格式化與下載預估時間測試', () => {
    it('檔案容量格式化應精確至 B, KB, MB, GB, TB', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(-100)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024 * 15.5)).toBe('15.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1024 * 2.5)).toBe('2.5 TB');
      expect(formatFileSize(NaN)).toBe('0 B');
      expect(formatFileSize(Infinity)).toBe('0 B');
    });

    it('預估下載剩餘時間應正確計算秒數並處理邊界極值', () => {
      // 總量 100MB，已傳 50MB，速度 10MB/s => 剩餘 5 秒
      const total = 100 * 1024 * 1024;
      const transferred = 50 * 1024 * 1024;
      const speed = 10 * 1024 * 1024;
      expect(estimateRemainingSeconds(transferred, total, speed)).toBe(5);

      // 已下載完成時應為 0 秒
      expect(estimateRemainingSeconds(total, total, speed)).toBe(0);

      // 速度為 0 時應回傳 0 秒避免除以零
      expect(estimateRemainingSeconds(transferred, total, 0)).toBe(0);

      // 異常非數字或總量 <= 0 時應回傳 0 秒
      expect(estimateRemainingSeconds(NaN, total, speed)).toBe(0);
      expect(estimateRemainingSeconds(transferred, 0, speed)).toBe(0);
    });
  });

  describe('發布說明文字清洗測試 (Clean Release Notes HTML Tags & Entities)', () => {
    it('應能將帶有 <p> 與 <br> 標籤及 HTML 實體的日誌過濾為乾淨純文字', () => {
      const dirty = '<p>Release v1.4.0 &amp; v1.5.0: &lt;Important&gt; TWSE Registry Sync&#39;s HUD</p>';
      const cleaned = cleanReleaseNotes(dirty);
      expect(cleaned).not.toContain('<p>');
      expect(cleaned).not.toContain('</p>');
      expect(cleaned).toContain('&');
      expect(cleaned).toContain('<Important>');
      expect(cleaned).toContain("Sync's");

      const withApos = 'Line 1\r\nIt&apos;s a &quot;great&quot; release';
      expect(cleanReleaseNotes(withApos)).toBe('Line 1\nIt\'s a "great" release');
    });

    it('空值或未定義時應回傳空字串', () => {
      expect(cleanReleaseNotes(undefined)).toBe('');
      expect(cleanReleaseNotes('')).toBe('');
    });
  });

  describe('跨平台作業系統判定測試 (Platform Detection)', () => {
    it('能正確依自訂參數判斷 Windows 與 macOS', () => {
      expect(isWindowsPlatform('win32')).toBe(true);
      expect(isWindowsPlatform('Windows 11')).toBe(true);
      expect(isWindowsPlatform('darwin')).toBe(false);

      expect(isMacPlatform('darwin')).toBe(true);
      expect(isMacPlatform('macOS')).toBe(true);
      expect(isMacPlatform('win32')).toBe(false);
    });
  });

  describe('依作業系統動態產出二進位下載資訊與按鈕文字 (getPlatformDownloadInfo)', () => {
    it('Windows 平台應動態產出 Setup .exe 與 Portable .exe 下載連結及中文按鈕', () => {
      const info = getPlatformDownloadInfo('1.7.0', 'win32');
      expect(info.isWindows).toBe(true);
      expect(info.isMac).toBe(false);
      expect(info.platformName).toBe('Windows');
      expect(info.primaryDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-Setup-1.7.0.exe');
      expect(info.primaryButtonText).toContain('Windows');
      expect(info.primaryButtonText).toContain('.exe');
      expect(info.portableDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-1.7.0.exe');
      expect(info.portableButtonText).toContain('Portable');
      expect(info.officialWebsiteUrl).toBe('https://vinero.github.io/pro-stock-analyzer/');
    });

    it('macOS 預設 Apple Silicon 平台應動態產出 arm64 .dmg 並提供 Intel x64 作為備選按鈕', () => {
      const info = getPlatformDownloadInfo('1.7.0', 'darwin', 'arm64');
      expect(info.isWindows).toBe(false);
      expect(info.isMac).toBe(true);
      expect(info.platformName).toBe('macOS');
      expect(info.primaryDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-1.7.0-arm64.dmg');
      expect(info.primaryButtonText).toContain('macOS');
      expect(info.primaryButtonText).toContain('.dmg');
      expect(info.portableDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-1.7.0.dmg');
      expect(info.portableButtonText).toContain('Intel');
    });

    it('macOS Intel x64 平台應動態產出 x64 .dmg 作為主要下載並提供 Apple Silicon 作為備選', () => {
      const info = getPlatformDownloadInfo('1.7.0', 'darwin', 'x64');
      expect(info.isWindows).toBe(false);
      expect(info.isMac).toBe(true);
      expect(info.platformName).toBe('macOS');
      expect(info.primaryDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-1.7.0.dmg');
      expect(info.primaryButtonText).toContain('Intel x64');
      expect(info.portableDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-1.7.0-arm64.dmg');
      expect(info.portableButtonText).toContain('Apple Silicon');
    });

    it('非 Windows/macOS 平台 (如 Linux/Other) 應正確回傳 Other 與通用 Releases 連結，而非誤植為 macOS', () => {
      const info = getPlatformDownloadInfo('1.7.0', 'linux');
      expect(info.isWindows).toBe(false);
      expect(info.isMac).toBe(false);
      expect(info.platformName).toBe('Other');
      expect(info.primaryDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/tag/v1.7.0');
      expect(info.primaryButtonText).toContain('GitHub Releases');
      expect(info.portableDownloadUrl).toBeUndefined();
    });

    it('版本號帶有前導多個 v 字元或未傳入版本號時應健全正規化為合法版號', () => {
      const withV = getPlatformDownloadInfo('vv1.7.0', 'win32');
      expect(withV.primaryDownloadUrl).toBe('https://github.com/VineRo/pro-stock-analyzer/releases/download/v1.7.0/ProStock-Analyzer-Setup-1.7.0.exe');

      const emptyVer = getPlatformDownloadInfo(undefined, 'darwin');
      expect(emptyVer.primaryDownloadUrl).toContain('/v1.7.0/ProStock-Analyzer-1.7.0-arm64.dmg');
    });
  });

  describe('異常防禦與資安友善錯誤轉譯測試 (getFriendlyErrorMessage)', () => {
    it('macOS 簽名限制應轉譯為清晰的憑證說明並引導直接下載 DMG', () => {
      const err = new Error('Could not get code signature for app');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('macOS 系統安全簽名限制');
      expect(msg).toContain('DMG');
    });

    it('Windows 增量 blockmap 下載失敗應轉譯為全量切換提示', () => {
      const err = new Error('Cannot download differentially, 416 range error');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('Windows 差異增量更新校驗異常');
    });

    it('密碼學 SHA-512 雜湊驗證失敗應轉譯為完整性損毀防護提示', () => {
      const err = new Error('sha512 checksum mismatch, expected abc..., got def...');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('密碼學完整性驗證');
      expect(msg).toContain('SHA-512');
      expect(msg).not.toContain('abc...'); // 不外洩原始錯誤日誌
    });

    it('Windows 數位簽章驗證未通過 (ERR_UPDATER_INVALID_SIGNATURE) 應轉譯為簽章安全提示', () => {
      const err = new Error('ERR_UPDATER_INVALID_SIGNATURE: not signed by the application owner');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('應用程式數位簽章驗證未通過');
    });

    it('Windows 檔案寫入權限不足 (EPERM / EACCES) 應提示管理員權限', () => {
      const err = new Error('EPERM: operation not permitted, unlink elevate.exe');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('權限不足');
      expect(msg).toContain('系統管理員身分');
    });

    it('磁碟儲存空間不足 (ENOSPC) 應提示清理磁碟空間', () => {
      const err = new Error('ENOSPC: no space left on device, write');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('磁碟儲存空間不足');
    });

    it('使用者取消 UAC 提權 (ERROR_CANCELLED / 1223) 應轉譯為友善取消提示', () => {
      const err = new Error('The operation was canceled by the user (1223)');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('已取消更新安裝程序');
    });

    it('檔案被鎖定 (EBUSY) 應提示防毒軟體或其它程序佔用', () => {
      const err = new Error('EBUSY: resource busy or locked');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('防毒軟體');
    });

    it('網路超時或斷線應提示檢查連線', () => {
      const err = new Error('net::ERR_CONNECTION_TIMED_OUT');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('無法連線至 GitHub 官方更新伺服器');

      const fetchErr = new TypeError('Failed to fetch');
      expect(getFriendlyErrorMessage(fetchErr)).toContain('無法連線至 GitHub 官方更新伺服器');

      const refusedErr = new Error('connect ECONNREFUSED 127.0.0.1:443');
      expect(getFriendlyErrorMessage(refusedErr)).toContain('無法連線至 GitHub 官方更新伺服器');
    });

    it('遠端 404 或未釋出檔案時應提示前往官網確認', () => {
      const err = new Error('ERR_UPDATER_ZIP_FILE_NOT_FOUND (404 Not Found)');
      const msg = getFriendlyErrorMessage(err);
      expect(msg).toContain('尚未發布符合當前平台之更新套件');
    });

    it('未預期之底層錯誤路徑應予以遮蔽防護，杜絕本機目錄與帳號洩漏 (反斜線與正斜線路徑)', () => {
      const err = new Error("EINVAL: invalid path 'C:\\Users\\Administrator\\AppData\\Local\\Temp\\test.exe'");
      const msg = getFriendlyErrorMessage(err);
      expect(msg).not.toContain('Administrator');
      expect(msg).not.toContain('AppData');
      expect(msg).toContain('[本機目錄路徑]');

      const sanitizedWinSlash = sanitizeErrorMessage("Error reading C:/Users/AdminUser/Desktop/secret.txt");
      expect(sanitizedWinSlash).not.toContain('AdminUser');
      expect(sanitizedWinSlash).toContain('[本機目錄路徑]');

      const sanitizedUnix = sanitizeErrorMessage("/Users/viberorob/Desktop/secret/app.exe");
      expect(sanitizedUnix).not.toContain('viberorob');
      expect(sanitizedUnix).toContain('[本機目錄路徑]');

      const sanitizedLinuxRoot = sanitizeErrorMessage("Failed to write to /root/.cache/updater/temp.bin");
      expect(sanitizedLinuxRoot).not.toContain('/root/');
      expect(sanitizedLinuxRoot).toContain('[本機目錄路徑]');

      const sanitizedFileUri = sanitizeErrorMessage("Failed opening file:///Users/viberorob/Downloads/ProStock.dmg");
      expect(sanitizedFileUri).not.toContain('viberorob');
      expect(sanitizedFileUri).toContain('[本機目錄路徑]');
    });
  });

  describe('版本一致性與雲端發布狀態校驗邏輯 (Version Consistency & Cloud Release Alignment)', () => {
    it('本地版本號與雲端發布版本均為 1.7.0 時應判定已是最新版本', () => {
      const localVersion = '1.7.0';
      const cloudVersion = '1.7.0';
      expect(compareSemVer(cloudVersion, localVersion)).toBe(0);
      expect(isEligibleUpdate(localVersion, cloudVersion)).toBe(false);
    });

    it('當遠端發布更高版本 (如 v1.7.7 或更高版本) 時應觸發更新可用判定', () => {
      const localVersion = '1.7.0';
      const futureCloudVersion = '1.7.7';
      expect(compareSemVer(futureCloudVersion, localVersion)).toBe(1);
      expect(isEligibleUpdate(localVersion, futureCloudVersion)).toBe(true);

      const futureMajorVersion = '2.0.0';
      expect(isEligibleUpdate(localVersion, futureMajorVersion)).toBe(true);
    });

    it('支援多段版號與修訂版號 (SemVer Revision Handling)', () => {
      expect(compareSemVer('1.7.0.1', '1.7.0.0')).toBe(1);
      expect(compareSemVer('1.7.0', '1.7.0.1')).toBe(-1);
    });
  });
});
