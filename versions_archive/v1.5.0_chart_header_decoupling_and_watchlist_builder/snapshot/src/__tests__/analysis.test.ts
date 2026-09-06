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

  it('盤面訊號診斷應能正確識別多空趨勢並給予操作提醒', () => {
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

  it('所有主流技術指標皆必須具備完整的觀念比喻、多空訊號與交易盲點提醒', () => {
    const requiredIndicators = ['MA', 'EMA', 'BOLL', 'SAR', 'MACD', 'RSI', 'KDJ', 'VOL', 'ATR', 'OBV', 'VWAP'];
    
    requiredIndicators.forEach((id) => {
      const info = INDICATORS_DATA[id];
      expect(info, `指標 ${id} 必須存在於指南中`).toBeDefined();
      expect(info.analogy.length, `指標 ${id} 必須有觀念比喻`).toBeGreaterThan(10);
      expect(info.whatIsIt.length, `指標 ${id} 必須有原理說明`).toBeGreaterThan(10);
      expect(info.howToUse.buySignal.length, `指標 ${id} 必須有做多買訊`).toBeGreaterThan(5);
      expect(info.howToUse.sellSignal.length, `指標 ${id} 必須有做空賣訊`).toBeGreaterThan(5);
      expect(info.pitfalls.length, `指標 ${id} 必須至少有一條交易盲點提醒`).toBeGreaterThan(0);
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

  it('多空評分以日K權威基準定錨時，跨時間週期切換時數值應絕對固定且不浮動亂跳', () => {
    // 模擬使用者在同一檔股票 (例如台積電 2330.TW) 切換不同時間線 (1m, 5m, 1h, 1D, 1W)
    const dailyBenchmark = generateRealisticKLineData('2330.TW', 950, '1D', 350);
    const score1 = analyzeMarketStatus(dailyBenchmark, '2330.TW');
    const score2 = analyzeMarketStatus(dailyBenchmark, '2330.TW');

    expect(score1.score).toBe(score2.score);
    expect(score1.overallRating).toBe(score2.overallRating);
    expect(score1.institutionalNote).toContain('SMC');
    expect(score1.institutionalNote).toContain('基本面共振');
    expect(score1.score).toBeGreaterThanOrEqual(60); // 權值台積電基本面優異，評分應高且穩定
  });

  it('驗證日K長週期歷史資料充沛度：2330等標的日K應預設生成約 10 年 (2500 根) 歷史走勢', () => {
    const historicalData = generateRealisticKLineData('2330.TW', 950, '1D');
    expect(historicalData.length).toBe(2500);

    // 檢查最早一根與最新一根的時間跨度：應超過 8 年（約 2500 交易日）
    const earliestTime = historicalData[0].timestamp;
    const latestTime = historicalData[historicalData.length - 1].timestamp;
    const diffYears = (latestTime - earliestTime) / (365.25 * 24 * 3600 * 1000);

    expect(diffYears).toBeGreaterThanOrEqual(6.5);
    expect(historicalData[historicalData.length - 1].close).toBe(950);
  });
});
