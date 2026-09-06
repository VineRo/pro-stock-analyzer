import { KLineData } from 'klinecharts';
import { DrawingToolType } from '../types/stock';

export interface DrawingPoint {
  timestamp: number;
  value: number;
  dataIndex?: number;
  refCandleClose?: number; // 錨定時對應 K 線的收盤價
  priceRatio?: number;     // 點位價格 / 錨定收盤價比率，用於除權息與數據修正時自動等比縮放
}

export interface StoredDrawing {
  id: string;
  name: DrawingToolType;
  color: string;
  points: DrawingPoint[];
  styles?: any;
  extendData?: any;
  createdAt: number;
  updatedAt: number;
}

// 8 色專業交易員高對比度光譜
export const DISTINCT_DRAWING_COLORS = [
  { id: 'auto', name: '智能自動換色', value: 'auto' },
  { id: 'blue', name: '曜石藍', value: '#3b82f6' },
  { id: 'amber', name: '琥珀金', value: '#f59e0b' },
  { id: 'emerald', name: '翡翠綠', value: '#10b981' },
  { id: 'rose', name: '玫瑰紅', value: '#f43f5e' },
  { id: 'purple', name: '紫羅蘭', value: '#8b5cf6' },
  { id: 'cyan', name: '天青藍', value: '#06b6d4' },
  { id: 'orange', name: '活力橘', value: '#f97316' },
  { id: 'white', name: '月光銀', value: '#e2e8f0' },
];

// 各劃線工具的專屬語意主色
export const TOOL_DEFAULT_COLORS: Record<string, string> = {
  trendLine: '#3b82f6',              // 趨勢線：曜石藍
  horizontalStraightLine: '#f59e0b', // 支撐/壓力線：琥珀金
  priceChannelLine: '#8b5cf6',       // 平行通道：紫羅蘭
  fibonacciLine: '#10b981',          // 斐波那契回撤：翡翠綠
  rayLine: '#06b6d4',                // 射線：天青藍
  segment: '#ec4899',                // 線段：玫瑰紅
  rect: '#6366f1',                   // 矩形箱體：靛青
  text: '#f97316',                   // 文字標註：活力橘
};

// 連續畫線輪播高對比色庫
const ROTATING_PALETTE = [
  '#3b82f6', // 藍
  '#f59e0b', // 金
  '#10b981', // 綠
  '#f43f5e', // 紅
  '#8b5cf6', // 紫
  '#06b6d4', // 青
  '#f97316', // 橘
  '#ec4899', // 粉
];

/**
 * 依據工具類型、既有線條與使用者自選模式，取得下一個互不重複的高對比顏色
 */
export function getNextDrawingColor(
  tool: DrawingToolType,
  existingDrawings: StoredDrawing[],
  selectedColor?: string
): string {
  // 1. 若使用者指定了具體顏色且非 auto，直接使用
  if (selectedColor && selectedColor !== 'auto' && selectedColor.startsWith('#')) {
    return selectedColor;
  }

  // 2. 計算同款工具已經畫了幾條
  const sameToolCount = existingDrawings.filter((d) => d.name === tool).length;
  if (sameToolCount === 0) {
    return TOOL_DEFAULT_COLORS[tool] || '#3b82f6';
  }

  // 3. 連續繪製多條線時，透過輪播色彩庫提供高對比互斥顏色
  const baseIdx = ROTATING_PALETTE.indexOf(TOOL_DEFAULT_COLORS[tool] || '#3b82f6');
  const nextIdx = ((baseIdx >= 0 ? baseIdx : 0) + sameToolCount) % ROTATING_PALETTE.length;
  return ROTATING_PALETTE[nextIdx];
}

const STORAGE_PREFIX = 'prostock_drawings_v2_';

/**
 * 從 LocalStorage 載入指定標的之畫線紀錄
 */
export function getDrawingsForSymbol(symbol: string): StoredDrawing[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${symbol}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn(`[drawingStore] Failed to load drawings for ${symbol}:`, e);
  }
  return [];
}

/**
 * 將指定標的之畫線紀錄寫入 LocalStorage
 */
export function saveDrawingsForSymbol(symbol: string, drawings: StoredDrawing[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${symbol}`, JSON.stringify(drawings));
  } catch (e) {
    console.warn(`[drawingStore] Failed to save drawings for ${symbol}:`, e);
  }
}

/**
 * 新增或更新單一畫線
 */
export function upsertDrawingForSymbol(symbol: string, drawing: StoredDrawing): void {
  const list = getDrawingsForSymbol(symbol);
  const idx = list.findIndex((d) => d.id === drawing.id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...drawing, updatedAt: Date.now() };
  } else {
    list.push(drawing);
  }
  saveDrawingsForSymbol(symbol, list);
}

/**
 * 刪除單一畫線
 */
export function removeDrawingForSymbol(symbol: string, drawingId: string): void {
  const list = getDrawingsForSymbol(symbol);
  const filtered = list.filter((d) => d.id !== drawingId);
  saveDrawingsForSymbol(symbol, filtered);
}

/**
 * 清空指定標的之所有畫線
 */
export function clearDrawingsForSymbol(symbol: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${symbol}`);
  } catch (e) {
    console.warn(`[drawingStore] Failed to clear drawings for ${symbol}:`, e);
  }
}

/**
 * 尋找與點位時間戳最接近的 K 線燭線
 */
function findClosestCandle(klineData: KLineData[], timestamp: number): KLineData | null {
  if (!klineData || klineData.length === 0) return null;
  
  // 快速二分搜尋
  let low = 0;
  let high = klineData.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midTime = klineData[mid].timestamp;
    if (midTime === timestamp) return klineData[mid];
    if (midTime < timestamp) low = mid + 1;
    else high = mid - 1;
  }

  // 若未精確匹配，挑選最靠近的相鄰燭線
  const idx = Math.max(0, Math.min(klineData.length - 1, low));
  return klineData[idx] || null;
}

/**
 * 核心演算法：針對每日股價修正、除權息還原或分割進行自動動態校準
 * 當燭線歷史價格變動時，按錨定比率自動重新計算點位數值，保持線條與 K 線完美貼合
 */
export function adjustDrawingsForData(
  drawings: StoredDrawing[],
  klineData: KLineData[]
): { adjustedDrawings: StoredDrawing[]; hasChanges: boolean } {
  if (!drawings.length || !klineData.length) {
    return { adjustedDrawings: drawings, hasChanges: false };
  }

  let hasChanges = false;

  const adjustedDrawings = drawings.map((drawing) => {
    let drawingChanged = false;

    const newPoints = drawing.points.map((p) => {
      const candle = findClosestCandle(klineData, p.timestamp);
      if (!candle) return p;

      // 若初次記錄，初始化錨定收盤價與比率
      if (p.refCandleClose == null || p.refCandleClose <= 0) {
        drawingChanged = true;
        hasChanges = true;
        return {
          ...p,
          refCandleClose: candle.close,
          priceRatio: Number((p.value / candle.close).toFixed(4)),
        };
      }

      // 檢查收盤價是否發生修正 (如除權息還原、數據校正、股票分割)
      const priceDiff = Math.abs(candle.close - p.refCandleClose);
      if (priceDiff > 0.001) {
        // 等比動態調整數值
        const ratio = p.priceRatio ?? (p.value / p.refCandleClose);
        const adjustedVal = Number((candle.close * ratio).toFixed(2));
        
        drawingChanged = true;
        hasChanges = true;

        return {
          ...p,
          value: adjustedVal,
          refCandleClose: candle.close,
          priceRatio: Number((adjustedVal / candle.close).toFixed(4)),
        };
      }

      return p;
    });

    if (drawingChanged) {
      return {
        ...drawing,
        points: newPoints,
        updatedAt: Date.now(),
      };
    }
    return drawing;
  });

  return { adjustedDrawings, hasChanges };
}

/**
 * 為點位補充錨定資訊 (於畫線結束時調用)
 */
export function enrichPointsWithCandles(
  points: Array<{ timestamp?: number; value?: number; dataIndex?: number }>,
  klineData: KLineData[]
): DrawingPoint[] {
  return points.map((p) => {
    const timestamp = p.timestamp || Date.now();
    const value = p.value || 0;
    const candle = findClosestCandle(klineData, timestamp);
    const refClose = candle ? candle.close : value;
    const priceRatio = refClose > 0 ? Number((value / refClose).toFixed(4)) : 1;

    return {
      timestamp,
      value,
      dataIndex: p.dataIndex,
      refCandleClose: refClose,
      priceRatio,
    };
  });
}
