import { describe, it, expect } from 'vitest';
import { detectFairValueGaps, detectOrderBlocks, analyzeSMC } from '../utils/smcAnalysis';
import { KLineData } from 'klinecharts';

describe('SMC Analysis - 價值失衡區 (Fair Value Gap, FVG) 演算法測試', () => {
  it('應精準識別三根 K 線模型之看漲 FVG 與 50% 核心中軸吸引線 (CE)', () => {
    // 構造看漲 FVG: Bar 1 High (100) < Bar 3 Low (105), Bar 2 為實體大陽線
    const candles: KLineData[] = [
      { timestamp: 1000, open: 98, high: 100, low: 97, close: 99, volume: 1000 },
      { timestamp: 2000, open: 99, high: 108, low: 99, close: 107, volume: 5000 },
      { timestamp: 3000, open: 107, high: 110, low: 105, close: 109, volume: 2000 },
    ];

    const fvgs = detectFairValueGaps(candles);
    expect(fvgs).toHaveLength(1);
    expect(fvgs[0].type).toBe('bullish');
    expect(fvgs[0].bottomPrice).toBe(100);
    expect(fvgs[0].topPrice).toBe(105);
    // CE 50% = (100 + 105) / 2 = 102.5
    expect(fvgs[0].consequentEncroachment).toBe(102.5);
    expect(fvgs[0].isMitigated).toBe(false);
  });

  it('當後續價格回踩 50% CE 水位時，應正確標記為已回踩補缺 (Mitigated)', () => {
    const candles: KLineData[] = [
      { timestamp: 1000, open: 98, high: 100, low: 97, close: 99, volume: 1000 },
      { timestamp: 2000, open: 99, high: 108, low: 99, close: 107, volume: 5000 },
      { timestamp: 3000, open: 107, high: 110, low: 105, close: 109, volume: 2000 },
      // 第 4 根 K 線下影線回測至 101 (低於 CE 102.5)
      { timestamp: 4000, open: 109, high: 110, low: 101, close: 108, volume: 1500 },
    ];

    const fvgs = detectFairValueGaps(candles);
    expect(fvgs).toHaveLength(1);
    expect(fvgs[0].isMitigated).toBe(true);
  });

  it('應精準識別看跌 FVG (Bar 1 Low > Bar 3 High)', () => {
    const candles: KLineData[] = [
      { timestamp: 1000, open: 115, high: 116, low: 112, close: 113, volume: 1000 },
      { timestamp: 2000, open: 113, high: 113, low: 102, close: 103, volume: 5000 },
      { timestamp: 3000, open: 103, high: 105, low: 100, close: 101, volume: 2000 },
    ];

    const fvgs = detectFairValueGaps(candles);
    expect(fvgs).toHaveLength(1);
    expect(fvgs[0].type).toBe('bearish');
    expect(fvgs[0].topPrice).toBe(112);
    expect(fvgs[0].bottomPrice).toBe(105);
    expect(fvgs[0].consequentEncroachment).toBe(108.5);
  });

  it('應能正確檢測機構訂單塊 (Order Blocks) 結構', () => {
    const candles: KLineData[] = [];
    for (let i = 0; i < 25; i++) {
      candles.push({ timestamp: i * 1000, open: 100 + i, high: 102 + i, low: 99 + i, close: 101 + i, volume: 1000 });
    }
    const obs = detectOrderBlocks(candles);
    expect(Array.isArray(obs)).toBe(true);
  });
});

describe('SMC Analysis - 機構結構與共振綜合分析測試', () => {
  it('資料不足時應安全回傳中性結構狀態', () => {
    const res = analyzeSMC([]);
    expect(res.structureStatus).toBe('盤整流動性聚集');
    expect(res.fvgs).toEqual([]);
    expect(res.orderBlocks).toEqual([]);
  });

  it('存在看漲失衡且價格高於失衡區時應正確識別最近機構核心支撐', () => {
    const candles: KLineData[] = [
      { timestamp: 1000, open: 98, high: 100, low: 97, close: 99, volume: 1000 },
      { timestamp: 2000, open: 99, high: 108, low: 99, close: 107, volume: 5000 },
      { timestamp: 3000, open: 107, high: 110, low: 105, close: 109, volume: 2000 },
      { timestamp: 4000, open: 109, high: 115, low: 108, close: 114, volume: 2500 },
      { timestamp: 5000, open: 114, high: 118, low: 113, close: 117, volume: 3000 },
      { timestamp: 6000, open: 117, high: 120, low: 116, close: 119, volume: 2800 },
      { timestamp: 7000, open: 119, high: 122, low: 118, close: 121, volume: 2900 },
      { timestamp: 8000, open: 121, high: 123, low: 120, close: 122, volume: 3100 },
      { timestamp: 9000, open: 122, high: 125, low: 121, close: 124, volume: 3200 },
      { timestamp: 10000, open: 124, high: 126, low: 123, close: 125, volume: 3300 },
    ];

    const res = analyzeSMC(candles);
    expect(res.nearestSupport).toBeDefined();
    // 應精準抓出最靠近現價的未補缺看漲 FVG 核心支撐 (115.5)
    expect(res.nearestSupport).toBe(115.5);
    expect(res.structureStatus).toBe('強勢機構推進');
  });
});
