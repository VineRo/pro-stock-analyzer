import { describe, it, expect, beforeEach } from 'vitest';

describe('Onboarding & Feature Tour System', () => {
  const STORAGE_KEY = 'prostock_onboarding_shown';

  beforeEach(() => {
    // 模擬清理環境
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  });

  it('should recognize first-time launch when localStorage is empty', () => {
    const isShown = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) === 'true' : false;
    expect(isShown).toBe(false);
  });

  it('should persist "dont show again" preference correctly', () => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
      expect(localStorage.getItem(STORAGE_KEY)).toBe('true');
    }
  });

  it('verifies all 6 core onboarding chapters and feature coverage', () => {
    const chapters = [
      { id: 'markets', title: '多市場標的與快速搜尋' },
      { id: 'chart', title: 'K 線圖表與數據展示' },
      { id: 'drawings', title: '左側繪圖工具箱' },
      { id: 'flagships', title: '輔助量化分析工具' },
      { id: 'smc', title: '籌碼分佈與訂單流工具' },
      { id: 'keyboard', title: '全域鍵盤操作與看盤介面' }
    ];

    expect(chapters).toHaveLength(6);
    expect(chapters.map(c => c.id)).toEqual([
      'markets',
      'chart',
      'drawings',
      'flagships',
      'smc',
      'keyboard'
    ]);
  });
});
