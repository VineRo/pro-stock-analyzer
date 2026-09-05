import { describe, it, expect, beforeEach } from 'vitest';
import {
  getNextDrawingColor,
  adjustDrawingsForData,
  enrichPointsWithCandles,
  saveDrawingsForSymbol,
  getDrawingsForSymbol,
  removeDrawingForSymbol,
  clearDrawingsForSymbol,
  StoredDrawing,
  TOOL_DEFAULT_COLORS,
} from '../services/drawingStore';
import { mergeQuotesIntoSymbols } from '../services/quoteService';
import { KLineData } from 'klinecharts';
import { StockSymbol } from '../types/stock';

const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('drawingStore & quoteService Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('應針對不同劃線工具給予專屬語意顏色', () => {
    const trendColor = getNextDrawingColor('trendLine', []);
    const hLineColor = getNextDrawingColor('horizontalStraightLine', []);
    const fibColor = getNextDrawingColor('fibonacciLine', []);
    const channelColor = getNextDrawingColor('priceChannelLine', []);

    expect(trendColor).toBe(TOOL_DEFAULT_COLORS.trendLine);
    expect(hLineColor).toBe(TOOL_DEFAULT_COLORS.horizontalStraightLine);
    expect(fibColor).toBe(TOOL_DEFAULT_COLORS.fibonacciLine);
    expect(channelColor).toBe(TOOL_DEFAULT_COLORS.priceChannelLine);

    // 確認各主要工具色彩互斥不重疊
    const colors = [trendColor, hLineColor, fibColor, channelColor];
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });

  it('當同款工具連續劃線時，應自動輪播不同高對比色彩防止重疊混淆', () => {
    const line1Color = getNextDrawingColor('horizontalStraightLine', []);
    const existing: StoredDrawing[] = [
      {
        id: 'd1',
        name: 'horizontalStraightLine',
        color: line1Color,
        points: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const line2Color = getNextDrawingColor('horizontalStraightLine', existing);
    expect(line2Color).not.toBe(line1Color);

    existing.push({
      id: 'd2',
      name: 'horizontalStraightLine',
      color: line2Color,
      points: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const line3Color = getNextDrawingColor('horizontalStraightLine', existing);
    expect(line3Color).not.toBe(line2Color);
    expect(line3Color).not.toBe(line1Color);
  });

  it('當股價發生除權息還原或每日價格修正時，線段應自動等比調整點位數值', () => {
    const timestamp = 1700000000000;
    // 原始 K 線：收盤價 1000
    const initialCandles: KLineData[] = [
      { timestamp, open: 990, high: 1010, low: 985, close: 1000, volume: 10000 },
    ];

    // 在收盤價 1000 之上劃一條 1020 的壓力線 (比率 1.02)
    const rawPoints = [{ timestamp, value: 1020 }];
    const enriched = enrichPointsWithCandles(rawPoints, initialCandles);
    expect(enriched[0].priceRatio).toBe(1.02);
    expect(enriched[0].refCandleClose).toBe(1000);

    const testDrawing: StoredDrawing = {
      id: 'd_test',
      name: 'horizontalStraightLine',
      color: '#f59e0b',
      points: enriched,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 模擬除權息還原：同一天收盤價修正為 950 (例如除息 50 元)
    const adjustedCandles: KLineData[] = [
      { timestamp, open: 940, high: 960, low: 935, close: 950, volume: 10000 },
    ];

    const { adjustedDrawings, hasChanges } = adjustDrawingsForData([testDrawing], adjustedCandles);
    expect(hasChanges).toBe(true);
    expect(adjustedDrawings[0].points[0].refCandleClose).toBe(950);
    // 新點位應精準等於 950 * 1.02 = 969.00，完美貼合下移後的 K 線
    expect(adjustedDrawings[0].points[0].value).toBe(969.0);
  });

  it('股票分割 (如 1 拆 10) 時，線段數值應等比自動修正', () => {
    const timestamp = 1700000000000;
    const initialCandles: KLineData[] = [
      { timestamp, open: 1200, high: 1250, low: 1190, close: 1200, volume: 5000 },
    ];

    const rawPoints = [{ timestamp, value: 1200 }];
    const enriched = enrichPointsWithCandles(rawPoints, initialCandles);

    const testDrawing: StoredDrawing = {
      id: 'split_test',
      name: 'trendLine',
      color: '#3b82f6',
      points: enriched,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 分割後股價由 1200 變為 120
    const splitCandles: KLineData[] = [
      { timestamp, open: 120, high: 125, low: 119, close: 120, volume: 50000 },
    ];

    const { adjustedDrawings } = adjustDrawingsForData([testDrawing], splitCandles);
    expect(adjustedDrawings[0].points[0].value).toBe(120.0);
  });

  it('支援跨標的獨立儲存與隔離讀取記憶庫', () => {
    const d1: StoredDrawing = {
      id: 'tsmc_line',
      name: 'trendLine',
      color: '#3b82f6',
      points: [{ timestamp: 1000, value: 2400 }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const d2: StoredDrawing = {
      id: 'aapl_box',
      name: 'rect',
      color: '#6366f1',
      points: [{ timestamp: 2000, value: 320 }],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    saveDrawingsForSymbol('2330.TW', [d1]);
    saveDrawingsForSymbol('AAPL', [d2]);

    const tsmcSaved = getDrawingsForSymbol('2330.TW');
    const aaplSaved = getDrawingsForSymbol('AAPL');

    expect(tsmcSaved.length).toBe(1);
    expect(tsmcSaved[0].id).toBe('tsmc_line');

    expect(aaplSaved.length).toBe(1);
    expect(aaplSaved[0].id).toBe('aapl_box');

    // 刪除 2330 畫線不應影響 AAPL
    removeDrawingForSymbol('2330.TW', 'tsmc_line');
    expect(getDrawingsForSymbol('2330.TW').length).toBe(0);
    expect(getDrawingsForSymbol('AAPL').length).toBe(1);

    // 清空 AAPL
    clearDrawingsForSymbol('AAPL');
    expect(getDrawingsForSymbol('AAPL').length).toBe(0);
  });

  it('mergeQuotesIntoSymbols 應準確同步自選股即時價格與漲跌幅', () => {
    const initialSymbols: StockSymbol[] = [
      { symbol: '2330.TW', name: '台積電', market: 'TW', price: 975.0, change: 18.0, changePercent: 1.88, currency: 'TWD' },
      { symbol: 'AAPL', name: '蘋果', market: 'US', price: 232.5, change: 3.42, changePercent: 1.49, currency: 'USD' },
    ];

    const quotes = {
      '2330.TW': { symbol: '2330.TW', price: 2410.0, change: 20.0, changePercent: 0.84 },
      'AAPL': { symbol: 'AAPL', price: 321.05, change: -3.95, changePercent: -1.22 },
    };

    const merged = mergeQuotesIntoSymbols(initialSymbols, quotes);
    expect(merged[0].price).toBe(2410.0);
    expect(merged[0].changePercent).toBe(0.84);
    expect(merged[1].price).toBe(321.05);
    expect(merged[1].changePercent).toBe(-1.22);
  });
});
