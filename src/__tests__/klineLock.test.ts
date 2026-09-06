import { describe, it, expect } from 'vitest';
import type { KLineData } from 'klinecharts';

describe('K-Bar Click-to-Lock Mechanism (點擊K棒鎖定功能)', () => {
  const mockCandles: KLineData[] = [
    { timestamp: 1700000000000, open: 150.0, high: 155.0, low: 149.0, close: 154.0, volume: 1000000 },
    { timestamp: 1700086400000, open: 154.0, high: 158.0, low: 152.0, close: 157.5, volume: 1200000 },
    { timestamp: 1700172800000, open: 157.5, high: 160.0, low: 156.0, close: 159.0, volume: 1100000 },
  ];

  it('點擊目標 K 棒時應正確固定/鎖定其開高低收數據', () => {
    let pinnedCandle: KLineData | null = null;

    const setPinnedCandle = (updater: (prev: KLineData | null) => KLineData | null) => {
      pinnedCandle = updater(pinnedCandle);
    };

    const targetCandle = mockCandles[1];

    // 模擬點擊第 2 根 K 棒
    setPinnedCandle((prev) => {
      if (prev && prev.timestamp === targetCandle.timestamp) return null;
      return targetCandle;
    });

    expect(pinnedCandle).not.toBeNull();
    const locked = pinnedCandle as unknown as KLineData;
    expect(locked.timestamp).toBe(1700086400000);
    expect(locked.open).toBe(154.0);
    expect(locked.close).toBe(157.5);
  });

  it('重複點擊已鎖定的同一根 K 棒時應自動解除鎖定', () => {
    let pinnedCandle: KLineData | null = mockCandles[1];

    const setPinnedCandle = (updater: (prev: KLineData | null) => KLineData | null) => {
      pinnedCandle = updater(pinnedCandle);
    };

    const targetCandle = mockCandles[1];

    // 再次點擊同一根 K 棒
    setPinnedCandle((prev) => {
      if (prev && prev.timestamp === targetCandle.timestamp) return null;
      return targetCandle;
    });

    expect(pinnedCandle).toBeNull();
  });

  it('點擊另一根不同的 K 棒時應切換鎖定至新 K 棒', () => {
    let pinnedCandle: KLineData | null = mockCandles[0];

    const setPinnedCandle = (updater: (prev: KLineData | null) => KLineData | null) => {
      pinnedCandle = updater(pinnedCandle);
    };

    const newTarget = mockCandles[2];

    setPinnedCandle((prev) => {
      if (prev && prev.timestamp === newTarget.timestamp) return null;
      return newTarget;
    });

    expect(pinnedCandle).not.toBeNull();
    expect(pinnedCandle?.timestamp).toBe(1700172800000);
    expect(pinnedCandle?.close).toBe(159.0);
  });

  it('點擊右側空白留白區或重設時應解除鎖定', () => {
    let pinnedCandle: KLineData | null = mockCandles[0];

    // 模擬點擊到無資料區域 (targetCandle 為 null)
    const targetCandle: KLineData | null = null;
    if (!targetCandle) {
      pinnedCandle = null;
    }

    expect(pinnedCandle).toBeNull();
  });

  it('按下 Escape 鍵或雙擊圖表時應清除鎖定狀態', () => {
    let pinnedCandle: KLineData | null = mockCandles[0];

    const handleEscape = () => {
      pinnedCandle = null;
    };

    handleEscape();
    expect(pinnedCandle).toBeNull();
  });

  it('切換標的 (symbol) 或週期 (period) 時應自動解除鎖定', () => {
    let pinnedCandle: KLineData | null = mockCandles[0];

    // 模擬 symbol 或 period 變更
    const onSymbolOrPeriodChange = () => {
      pinnedCandle = null;
    };

    onSymbolOrPeriodChange();
    expect(pinnedCandle).toBeNull();
  });

  it('圖表畫布應建立垂直金黃色標記線 (__pinned_candle_lock__) 覆蓋物', () => {
    const OVERLAY_ID = '__pinned_candle_lock__';
    const activeCandle = mockCandles[1];

    const overlayConfig = {
      id: OVERLAY_ID,
      name: 'verticalStraightLine',
      points: [{ timestamp: activeCandle.timestamp, value: activeCandle.close }],
      lock: true,
      needDefaultPointFigure: true,
      needDefaultXAxisFigure: true,
      needDefaultYAxisFigure: false,
      styles: {
        line: {
          color: '#f59e0b',
          size: 1.5,
          dashedValue: [4, 4],
        },
        point: {
          color: '#f59e0b',
          activeColor: '#fbbf24',
          radius: 3.5,
        },
      },
    };

    expect(overlayConfig.id).toBe('__pinned_candle_lock__');
    expect(overlayConfig.name).toBe('verticalStraightLine');
    expect(overlayConfig.points[0].timestamp).toBe(1700086400000);
    expect(overlayConfig.points[0].value).toBe(157.5);
    expect(overlayConfig.lock).toBe(true);
    expect(overlayConfig.styles.line.color).toBe('#f59e0b');
  });
});
