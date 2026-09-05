import { describe, it, expect } from 'vitest';
import { getOverlayClass } from 'klinecharts';
import '../utils/customOverlays';

describe('customOverlays', () => {
  it('應成功在 KlineCharts 註冊矩形箱體 (rect) 覆蓋物', () => {
    const RectClass = getOverlayClass('rect');
    expect(RectClass).not.toBeNull();
    expect(typeof RectClass).toBe('function');
  });

  it('應成功在 KlineCharts 註冊趨勢線 (trendLine) 覆蓋物', () => {
    const TrendClass = getOverlayClass('trendLine');
    expect(TrendClass).not.toBeNull();
    expect(typeof TrendClass).toBe('function');
  });

  it('應成功在 KlineCharts 註冊文字標註 (text) 覆蓋物', () => {
    const TextClass = getOverlayClass('text');
    expect(TextClass).not.toBeNull();
    expect(typeof TextClass).toBe('function');
  });

  it('矩形箱體 (rect) 應正確根據兩點座標計算閉合 4 角多邊形', () => {
    const RectClass = getOverlayClass('rect');
    expect(RectClass).not.toBeNull();
    if (!RectClass) return;

    const rectInstance: any = new RectClass();
    expect(rectInstance.totalStep).toBe(3);
    expect(rectInstance.needDefaultPointFigure).toBe(true);

    // 模擬使用者點擊左上角 (100, 50) 到右下角 (300, 150)
    const p0 = { x: 100, y: 50 };
    const p1 = { x: 300, y: 150 };

    const figures = rectInstance.createPointFigures({
      coordinates: [p0, p1],
      overlay: {
        styles: {
          rect: { color: '#6366f126', borderColor: '#6366f1' },
        },
      },
    });

    expect(figures.length).toBe(1);
    expect(figures[0].type).toBe('polygon');
    expect(figures[0].attrs.coordinates).toEqual([
      { x: 100, y: 50 },
      { x: 300, y: 50 },
      { x: 300, y: 150 },
      { x: 100, y: 150 },
    ]);
  });

  it('若尚未點選第二點 (只有一個座標)，矩形不應繪製任何圖形', () => {
    const RectClass = getOverlayClass('rect');
    if (!RectClass) return;

    const rectInstance: any = new RectClass();
    const figures = rectInstance.createPointFigures({
      coordinates: [{ x: 100, y: 50 }],
      overlay: {},
    });

    expect(figures.length).toBe(0);
  });
});
