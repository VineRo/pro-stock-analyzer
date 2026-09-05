import { describe, it, expect } from 'vitest';
import { 
  compareSemVer, 
  isEligibleUpdate, 
  isCriticalUpdate, 
  formatFileSize, 
  estimateRemainingSeconds 
} from '../utils/updaterUtils';

describe('軟體自動更新核心安全演算法測試 (Updater Security & SemVer)', () => {
  describe('語意化版本比對與防降級回滾檢驗 (SemVer & Anti-Rollback)', () => {
    it('新版版號大於現有版號時應正確識別為可更新', () => {
      expect(compareSemVer('1.0.1', '1.0.0')).toBe(1);
      expect(compareSemVer('1.1.0', '1.0.9')).toBe(1);
      expect(compareSemVer('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemVer('v1.2.0', '1.1.0')).toBe(1);
    });

    it('新版版號等於現有版號時應判定為無須更新', () => {
      expect(compareSemVer('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemVer('v1.0.0', '1.0.0')).toBe(0);
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
  });

  describe('緊急資安修補標記檢驗 (Critical Security Update Detection)', () => {
    it('字串日誌中包含 [CRITICAL] 或重大安全更新標籤時應判定為緊急更新', () => {
      expect(isCriticalUpdate('### [CRITICAL] 修正即時行情 API 加密相容性')).toBe(true);
      expect(isCriticalUpdate('【重大安全更新】修復特定雜湊校驗邏輯')).toBe(true);
      expect(isCriticalUpdate('【緊急修補】防禦端點連線異常')).toBe(true);
    });

    it('一般日常功能升級應判定為非緊急更新', () => {
      expect(isCriticalUpdate('新增台股加權指數 5 分 K 棒支援')).toBe(false);
      expect(isCriticalUpdate(undefined)).toBe(false);
    });

    it('陣列結構的 releaseNotes 也能正確偵測緊急更新', () => {
      const notes = [
        { version: '1.0.1', note: '新增畫線顏色' },
        { version: '1.0.2', note: '[CRITICAL] 升級依賴' }
      ];
      expect(isCriticalUpdate(notes)).toBe(true);
    });
  });

  describe('傳輸容量格式化與下載預估時間測試', () => {
    it('檔案容量格式化應精確至 B, KB, MB, GB', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.0 KB');
      expect(formatFileSize(1024 * 1024 * 15.5)).toBe('15.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024 * 1.2)).toBe('1.2 GB');
    });

    it('預估下載剩餘時間應正確計算秒數', () => {
      // 總量 100MB，已傳 50MB，速度 10MB/s => 剩餘 5 秒
      const total = 100 * 1024 * 1024;
      const transferred = 50 * 1024 * 1024;
      const speed = 10 * 1024 * 1024;
      expect(estimateRemainingSeconds(transferred, total, speed)).toBe(5);

      // 已下載完成時應為 0 秒
      expect(estimateRemainingSeconds(total, total, speed)).toBe(0);

      // 速度為 0 時應回傳 0 秒避免除以零
      expect(estimateRemainingSeconds(transferred, total, 0)).toBe(0);
    });
  });
});
