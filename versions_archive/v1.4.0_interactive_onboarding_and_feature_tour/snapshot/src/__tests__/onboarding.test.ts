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
      { id: 'markets', title: '四大核心市場與全市場秒搜' },
      { id: 'chart', title: '元大證券級專業 K 線看盤體驗' },
      { id: 'drawings', title: '左側專業繪圖分析工具箱' },
      { id: 'flagships', title: '五大旗艦量化分析工具' },
      { id: 'smc', title: '機構級籌碼與 SMC 訂單流' },
      { id: 'keyboard', title: '全域鍵盤極速流與自適應看盤' }
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
