/**
 * 本地 K 線與股票數據快取管理服務
 * 優先讀取本地快取實現零延遲秒開，並在背景自動刷新
 */
import { KLineData } from 'klinecharts';

const CACHE_PREFIX = 'prostock_kline_cache_';
const CACHE_EXPIRY_MS = 10 * 60 * 1000; // 10 分鐘快取有效

interface CachedPayload {
  timestamp: number;
  data: KLineData[];
  isAdjusted?: boolean;
}

export const CacheService = {
  get(symbol: string, period: string, isAdjusted = false): KLineData[] | null {
    try {
      const key = `${CACHE_PREFIX}${symbol}_${period}_${isAdjusted ? 'adj' : 'raw'}`;
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const payload: CachedPayload = JSON.parse(cached);
      // 只要有快取就可先用作即時渲染
      return payload.data;
    } catch {
      return null;
    }
  },

  set(symbol: string, period: string, data: KLineData[], isAdjusted = false): void {
    try {
      const key = `${CACHE_PREFIX}${symbol}_${period}_${isAdjusted ? 'adj' : 'raw'}`;
      const payload: CachedPayload = {
        timestamp: Date.now(),
        data: data.slice(-500), // 保留最新 500 根以節約存儲空間
        isAdjusted,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      console.warn('Cache storage failed, clearing old cache:', e);
      // 若配額已滿，清空過期快取
      this.clearOld();
    }
  },

  clearOld(): void {
    try {
      const now = Date.now();
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          const item = localStorage.getItem(key);
          if (item) {
            const payload: CachedPayload = JSON.parse(item);
            if (now - payload.timestamp > CACHE_EXPIRY_MS) {
              localStorage.removeItem(key);
            }
          }
        }
      }
    } catch {
      // ignore
    }
  },
};
