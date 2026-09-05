import { describe, it, expect } from 'vitest';
import { generateRealisticKLineData } from '../data/stockService';
import { analyzeMarketStatus } from '../utils/smartDiagnosis';
import { INDICATORS_DATA } from '../education/indicatorsData';

describe('技術分析與資料完整性自動化測試', () => {
  it('K 線數據生成器應產出符合金融常理的標準 OHLCV 棒線', () => {
    const data = generateRealisticKLineData('AAPL', 200, '1D', 100);
    expect(data.length).toBe(100);

    data.forEach((bar) => {
      expect(bar.open).toBeGreaterThan(0);
      expect(bar.close).toBeGreaterThan(0);
      expect(bar.high).toBeGreaterThanOrEqual(bar.low);
      expect(bar.high).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
      expect(bar.low).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
      expect(bar.volume).toBeGreaterThanOrEqual(0);
      expect(bar.turnover).toBeGreaterThanOrEqual(0);
    });
  });

  it('智慧盤面診斷小幫手應能正確識別多空趨勢並給予新手建議', () => {
    const data = generateRealisticKLineData('2330.TW', 900, '1D', 100);
    const summary = analyzeMarketStatus(data);

    expect(summary).toBeDefined();
    expect(['bullish', 'bearish', 'neutral']).toContain(summary.trend);
    expect(summary.score).toBeGreaterThanOrEqual(0);
    expect(summary.score).toBeLessThanOrEqual(100);
    expect(summary.trendText.length).toBeGreaterThan(5);
    expect(summary.momentumText.length).toBeGreaterThan(5);
    expect(summary.warningText.length).toBeGreaterThan(5);
  });

  it('所有主流技術指標皆必須具備完整的小白生活化比喻、買賣訊號與避坑指南', () => {
    const requiredIndicators = ['MA', 'EMA', 'BOLL', 'SAR', 'MACD', 'RSI', 'KDJ', 'VOL', 'ATR', 'OBV', 'VWAP'];
    
    requiredIndicators.forEach((id) => {
      const info = INDICATORS_DATA[id];
      expect(info, `指標 ${id} 必須存在於百科中`).toBeDefined();
      expect(info.analogy.length, `指標 ${id} 必須有生活化比喻`).toBeGreaterThan(10);
      expect(info.whatIsIt.length, `指標 ${id} 必須有原理說明`).toBeGreaterThan(10);
      expect(info.howToUse.buySignal.length, `指標 ${id} 必須有做多買訊`).toBeGreaterThan(5);
      expect(info.howToUse.sellSignal.length, `指標 ${id} 必須有做空賣訊`).toBeGreaterThan(5);
      expect(info.pitfalls.length, `指標 ${id} 必須至少有一條避坑盲點`).toBeGreaterThan(0);
    });
  });

  it('智慧盤面診斷在數據不足 (<30 根) 時應回傳中立觀望狀態而不崩潰', () => {
    const emptySummary = analyzeMarketStatus([]);
    expect(emptySummary.trend).toBe('neutral');
    expect(emptySummary.score).toBe(50);
    expect(emptySummary.overallRating).toBe('中立觀望');

    const shortData = generateRealisticKLineData('AAPL', 200, '1D', 15);
    const shortSummary = analyzeMarketStatus(shortData);
    expect(shortSummary.trend).toBe('neutral');
    expect(shortSummary.overallRating).toBe('中立觀望');
  });
});
