import { KLineData } from 'klinecharts';
import { Period, DataStatus } from '../types/stock';
import { CacheService } from './cacheService';
import { generateRealisticKLineData } from './stockService';

import { ElectronWindowAPI } from '../types/updater';

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI;
  }
}

/**
 * 將系統代碼轉換為 Yahoo Finance 標準查詢代碼
 */
export function toYahooSymbol(symbol: string): string {
  if (symbol === 'BTCUSDT') return 'BTC-USD';
  if (symbol === 'ETHUSDT') return 'ETH-USD';
  return symbol;
}

/**
 * 週期轉換為 Yahoo API 參數
 */
function mapPeriodToYahooParams(period: Period): { interval: string; range: string } {
  switch (period) {
    case '1m': return { interval: '1m', range: '7d' };
    case '5m': return { interval: '5m', range: '60d' };
    case '15m': return { interval: '15m', range: '60d' };
    case '30m': return { interval: '30m', range: '60d' };
    case '1h': return { interval: '1h', range: '730d' };
    case '4h': return { interval: '1h', range: '730d' };
    case '1D': return { interval: '1d', range: '10y' }; // 10 年日 K 真實完整歷史數據 (約 2500 交易日)
    case '1W': return { interval: '1wk', range: '10y' }; // 10 年週 K 數據
    case '1M': return { interval: '1mo', range: 'max' }; // 自上市以來的全部月 K 數據
    default: return { interval: '1d', range: '10y' };
  }
}

export interface FetchStockResult {
  data: KLineData[];
  status: DataStatus;
  currentPrice?: number;
  change?: number;
  changePercent?: number;
}

/**
 * 核心金融數據獲取引擎：
 * 1. 優先透過真實 API 抓取（在 Electron 內無跨域限制）
 * 2. 支援除權息還原（Adjusted Close）精確權息重算
 * 3. 具備本地快取層與智慧離線回退機制
 */
export async function fetchStockCandles(
  symbol: string,
  basePrice: number,
  period: Period,
  isAdjusted = false
): Promise<FetchStockResult> {
  const { interval, range } = mapPeriodToYahooParams(period);
  const yahooSym = toYahooSymbol(symbol);
  const encodedSym = encodeURIComponent(yahooSym);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSym}?range=${range}&interval=${interval}&includeAdjustedClose=true`;

  try {
    let json: any = null;

    // 7 秒網路請求逾時防護機制 (超時自動平滑回退，防止 UI 卡死)
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 7000)
    );

    const fetchPromise = (async () => {
      // 1. 若在 Electron 環境中，調用主行程 IPC 繞過 CORS
      if (window.electronAPI?.fetchMarketData) {
        const resp = await window.electronAPI.fetchMarketData(url);
        if (resp.data && !resp.error) {
          return resp.data;
        }
      } else {
        // 2. 在常規瀏覽器環境嘗試直接 fetch
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6500);
        try {
          const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (res.ok) {
            return await res.json();
          }
        } catch {
          clearTimeout(timer);
        }

        // 3. 瀏覽器端 CORS 代理回退機制 (讓網頁版在純瀏覽器中亦可獲取真實金融數據)
        try {
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
          const proxyRes = await fetch(proxyUrl);
          if (proxyRes.ok) {
            return await proxyRes.json();
          }
        } catch {}
      }
      return null;
    })();

    const raceResult = await Promise.race([fetchPromise, timeoutPromise]);
    if (raceResult && !('timeout' in raceResult)) {
      json = raceResult;
    }

    if (json?.chart?.result?.[0]) {
      const result = json.chart.result[0];
      const timestamps: number[] = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const adjclose = result.indicators?.adjclose?.[0]?.adjclose || [];

      const opens = quote.open || [];
      const highs = quote.high || [];
      const lows = quote.low || [];
      const closes = quote.close || [];
      const volumes = quote.volume || [];

      const list: KLineData[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        let rawOpen = opens[i];
        let rawHigh = highs[i];
        let rawLow = lows[i];
        let rawClose = closes[i];
        const rawVol = volumes[i] || 0;

        // 濾除盤中休市或無效空值
        if (rawOpen == null || rawClose == null || rawHigh == null || rawLow == null) {
          continue;
        }

        // 除權息還原計算
        if (isAdjusted && adjclose[i] != null && rawClose > 0) {
          const adjRatio = adjclose[i] / rawClose;
          rawOpen = rawOpen * adjRatio;
          rawHigh = rawHigh * adjRatio;
          rawLow = rawLow * adjRatio;
          rawClose = adjclose[i];
        }

        const bar: KLineData = {
          timestamp: timestamps[i] * 1000,
          open: Number(rawOpen.toFixed(2)),
          high: Number(rawHigh.toFixed(2)),
          low: Number(rawLow.toFixed(2)),
          close: Number(rawClose.toFixed(2)),
          volume: Math.round(rawVol),
          turnover: Number((rawVol * rawClose).toFixed(2)),
        };

        list.push(bar);
      }

      if (list.length > 0) {
        // 更新快取
        CacheService.set(symbol, period, list, isAdjusted);

        const lastBar = list[list.length - 1];
        const prevBar = list.length > 1 ? list[list.length - 2] : lastBar;
        const change = Number((lastBar.close - prevBar.close).toFixed(2));
        const changePercent = Number(((change / prevBar.close) * 100).toFixed(2));

        return {
          data: list,
          status: 'live',
          currentPrice: lastBar.close,
          change,
          changePercent,
        };
      }
    }
  } catch (error) {
    console.warn(`[stockApi] Real-time fetch failed for ${symbol}, falling back to cache/simulation:`, error);
  }

  // 嘗試讀取本地快取
  const cached = CacheService.get(symbol, period, isAdjusted);
  if (cached && cached.length > 0) {
    const lastBar = cached[cached.length - 1];
    const prevBar = cached.length > 1 ? cached[cached.length - 2] : lastBar;
    return {
      data: cached,
      status: 'cache',
      currentPrice: lastBar.close,
      change: Number((lastBar.close - prevBar.close).toFixed(2)),
      changePercent: Number((((lastBar.close - prevBar.close) / prevBar.close) * 100).toFixed(2)),
    };
  }

  // 最終兜底：高擬真布朗運動數據（涵蓋完整多年歷史）
  const simulated = generateRealisticKLineData(symbol, basePrice, period);
  const lastBar = simulated[simulated.length - 1];
  const prevBar = simulated[simulated.length - 2];
  return {
    data: simulated,
    status: 'simulated',
    currentPrice: lastBar.close,
    change: Number((lastBar.close - prevBar.close).toFixed(2)),
    changePercent: Number((((lastBar.close - prevBar.close) / prevBar.close) * 100).toFixed(2)),
  };
}
