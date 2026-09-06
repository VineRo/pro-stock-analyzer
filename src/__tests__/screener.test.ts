import { describe, it, expect } from 'vitest';
import { STOCK_DIRECTORY } from '../data/stockDirectory';
import { getFundamentalData } from '../data/stockService';

describe('Screener Multi-Factor Logic Tests', () => {
  it('STOCK_DIRECTORY 應包含標的且均能確定性豐富化基本面與技術指標', () => {
    expect(STOCK_DIRECTORY.length).toBeGreaterThan(50);

    const enriched = STOCK_DIRECTORY.map((stock) => {
      const fd = getFundamentalData(stock.symbol, stock.price);
      const hash = stock.symbol.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
      const rsiBase = Math.round(50 + stock.changePercent * 3.5 + ((hash % 21) - 10));
      const rsi = Math.min(88, Math.max(18, rsiBase));

      return {
        ...stock,
        rsi,
        peRatio: fd.peRatio,
        dividendYield: fd.dividendYield,
        revenueGrowthYoY: fd.revenueGrowthYoY,
        healthScore: fd.healthScore,
      };
    });

    expect(enriched.length).toBe(STOCK_DIRECTORY.length);
    enriched.forEach((s) => {
      expect(s.rsi).toBeGreaterThanOrEqual(18);
      expect(s.rsi).toBeLessThanOrEqual(88);
      expect(typeof s.peRatio).toBe('number');
      expect(typeof s.healthScore).toBe('number');
      expect(isNaN(s.healthScore)).toBe(false);
    });
  });

  it('所有標的數據完整性驗證 (無 NaN / undefined)', () => {
    STOCK_DIRECTORY.forEach((stock) => {
      expect(typeof stock.symbol).toBe('string');
      expect(stock.symbol.length).toBeGreaterThan(0);
      expect(typeof stock.name).toBe('string');
      expect(typeof stock.price).toBe('number');
      expect(isNaN(stock.price)).toBe(false);
      expect(typeof stock.changePercent).toBe('number');
      expect(isNaN(stock.changePercent)).toBe(false);
      expect(typeof stock.currency).toBe('string');
    });
  });
});
