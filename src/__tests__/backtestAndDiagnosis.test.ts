import { describe, it, expect } from 'vitest';
import { runBacktest } from '../utils/backtestEngine';
import { analyzeMarketStatus } from '../utils/smartDiagnosis';
import { formatPrice, formatPercent, formatVolume } from '../utils/formatters';
import { generateRealisticKLineData } from '../data/stockService';
import { KLineData } from 'klinecharts';
import { BacktestConfig } from '../types/stock';

describe('核心引擎與數值穩健性測試 (Backtest, Diagnosis & Formatters)', () => {
  it('回測引擎在 benchmarkInitialPrice 或 initialCapital 為 0 時不應拋出異常或產生 NaN/Infinity', () => {
    // 構造 >= 30 根走勢
    const mockCandles: KLineData[] = [];
    for (let i = 0; i < 35; i++) {
      mockCandles.push({
        timestamp: 1000 + i * 1000,
        open: 100,
        high: 105,
        low: 98,
        close: 102,
        volume: 1000,
      });
    }

    const config: BacktestConfig = {
      strategy: 'custom',
      initialCapital: 0, // 邊界值：資金為 0
      fastPeriod: 5,
      slowPeriod: 20,
      rsiBuyThreshold: 30,
      rsiSellThreshold: 70,
      stopLossPercent: 5,
      takeProfitPercent: 15,
      feeRatePercent: 0.1,
      buyConditions: [],
      sellConditions: [],
      buyLogic: 'AND',
      sellLogic: 'AND',
    };

    const result = runBacktest(mockCandles, config);
    expect(result).toBeDefined();
    expect(Number.isFinite(result.totalReturnPercent)).toBe(true);
    expect(Number.isFinite(result.annualizedReturnPercent)).toBe(true);
    expect(Number.isFinite(result.benchmarkReturnPercent)).toBe(true);
    expect(result.equityCurve.every((pt) => Number.isFinite(pt.equity) && Number.isFinite(pt.benchmarkEquity))).toBe(true);
  });

  it('布林通道 CROSS_ABOVE 只在真正由下往上突破上軌當下觸發，非持續超軌觸發', () => {
    // 構造 35 根走勢：前 32 根盤整在 100 元，第 33 根突破上軌 (118)，第 34 根續漲 (124)
    const candles: KLineData[] = [];
    const baseTime = Date.now() - 35 * 86400000;
    for (let i = 0; i < 32; i++) {
      candles.push({
        timestamp: baseTime + i * 86400000,
        open: 100,
        high: 101,
        low: 99,
        close: 100,
        volume: 1000,
      });
    }
    // 突破日 (第 33 根，索引 32)
    candles.push({
      timestamp: baseTime + 32 * 86400000,
      open: 100,
      high: 120,
      low: 100,
      close: 118,
      volume: 5000,
    });
    // 續漲日 (第 34 根，索引 33，已在上軌上方，但非交叉瞬間)
    candles.push({
      timestamp: baseTime + 33 * 86400000,
      open: 118,
      high: 125,
      low: 117,
      close: 124,
      volume: 4000,
    });

    const config: BacktestConfig = {
      strategy: 'custom',
      initialCapital: 100000,
      fastPeriod: 5,
      slowPeriod: 20,
      rsiBuyThreshold: 30,
      rsiSellThreshold: 70,
      stopLossPercent: 10,
      takeProfitPercent: 30,
      feeRatePercent: 0.1,
      buyConditions: [
        { id: 'b1', indicator: 'BOLLINGER', operator: 'CROSS_ABOVE', param1: 20 },
      ],
      sellConditions: [
        { id: 's1', indicator: 'BOLLINGER', operator: 'CROSS_BELOW', param1: 20 },
      ],
      buyLogic: 'AND',
      sellLogic: 'AND',
    };

    const result = runBacktest(candles, config);
    expect(result).toBeDefined();
    // 應該在第 33 根 (索引 32) 成功買進，回測結束強制結算
    expect(result.tradeLogs.length).toBeGreaterThanOrEqual(1);
    expect(result.tradeLogs[0].entryPrice).toBe(118);
  });

  it('智慧盤面診斷在連續無跌幅行情時 RSI 計算應為 100 而非 99', () => {
    // 構造 35 根持續單邊上漲 K 棒 (無任何下跌)
    const candles: KLineData[] = [];
    const baseTime = Date.now() - 35 * 86400000;
    for (let i = 0; i < 35; i++) {
      const price = 100 + i * 2;
      candles.push({
        timestamp: baseTime + i * 86400000,
        open: price - 1,
        high: price + 1,
        low: price - 2,
        close: price,
        volume: 2000,
      });
    }

    const diagnosis = analyzeMarketStatus(candles);
    expect(diagnosis).toBeDefined();
    // momentumText 應包含 RSI 為 100
    expect(diagnosis.momentumText).toContain('RSI 為 100');
    expect(diagnosis.score).toBeGreaterThan(60);
  });

  it('格式化函式 formatPrice、formatPercent 與 formatVolume 在極端邊界與低價標的下應保持優異表現', () => {
    // 1. 低價幣種與水餃股自動調適小數位數
    expect(formatPrice(0.000456, 'USDT')).toBe('₮0.000456');
    expect(formatPrice(0.045, 'USD')).toBe('$0.0450');
    expect(formatPrice(125.5, 'USD')).toBe('$125.50');

    // 2. NaN 與 Infinity 安全防護
    expect(formatPrice(NaN)).toBe('0.00');
    expect(formatPrice(Infinity)).toBe('0.00');
    expect(formatPercent(NaN)).toBe('0.00%');
    expect(formatPercent(Infinity)).toBe('0.00%');
    expect(formatVolume(NaN)).toBe('0');
    expect(formatVolume(Infinity)).toBe('0');

    // 3. 常規交易數值
    expect(formatPercent(5.678)).toBe('+5.68%');
    expect(formatPercent(-3.21)).toBe('-3.21%');
    expect(formatVolume(1_250_000)).toBe('1.25M');
  });

  it('generateRealisticKLineData 生成的所有 K 棒（包含最後一根校準價格）高低點皆嚴格包裹收盤價與開盤價', () => {
    const testSymbols = ['AAPL', '2330.TW', 'BTCUSDT', '8299.TWO'];
    testSymbols.forEach((sym) => {
      const candles = generateRealisticKLineData(sym, 1234.56, '1D', 150);
      expect(candles.length).toBe(150);
      const lastBar = candles[candles.length - 1];
      expect(lastBar.close).toBe(1234.56);
      expect(lastBar.high).toBeGreaterThanOrEqual(1234.56);
      expect(lastBar.low).toBeLessThanOrEqual(1234.56);

      candles.forEach((bar, idx) => {
        expect(bar.high, `Bar ${idx} high must be >= max(open, close)`).toBeGreaterThanOrEqual(Math.max(bar.open, bar.close));
        expect(bar.low, `Bar ${idx} low must be <= min(open, close)`).toBeLessThanOrEqual(Math.min(bar.open, bar.close));
      });
    });
  });
});
