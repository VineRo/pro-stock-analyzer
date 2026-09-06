import { KLineData } from 'klinecharts';
import { Period, DataStatus } from '../types/stock';
import { CacheService } from './cacheService';
import { generateRealisticKLineData } from './stockService';
import { ElectronWindowAPI } from '../types/updater';
import twseRegistryJson from './twseFullRegistry.json';
import tpexRegistryJson from './tpexFullRegistry.json';

declare global {
  interface Window {
    electronAPI?: ElectronWindowAPI;
  }
}

// 建立官方上櫃與上市代碼集合，用於智慧後綴自動糾偏
const TPEX_CODES = new Set((tpexRegistryJson as Array<{ c: string }>).map((x) => x.c));
const TWSE_CODES = new Set((twseRegistryJson as Array<{ c: string }>).map((x) => x.c));

// 建立全市場官方最新收盤價基準快查表
const OFFICIAL_PRICE_MAP = new Map<string, number>();
for (const item of twseRegistryJson as Array<{ s: string; c: string; p?: number }>) {
  if (item.p && item.p > 0) {
    OFFICIAL_PRICE_MAP.set(item.s, item.p);
    OFFICIAL_PRICE_MAP.set(item.c, item.p);
  }
}
for (const item of tpexRegistryJson as Array<{ s: string; c: string; p?: number }>) {
  if (item.p && item.p > 0) {
    OFFICIAL_PRICE_MAP.set(item.s, item.p);
    OFFICIAL_PRICE_MAP.set(item.c, item.p);
  }
}

/**
 * 將系統代碼轉換為 Yahoo Finance 標準查詢代碼
 * 支援台股上市櫃智慧糾偏（如 8299.TW 自動導正為 8299.TWO，杜絕 404 delisted 錯誤）
 */
export function toYahooSymbol(symbol: string): string {
  const upper = symbol.trim().toUpperCase();
  if (upper === 'BTCUSDT') return 'BTC-USD';
  if (upper === 'ETHUSDT') return 'ETH-USD';

  // 匹配純代號或含有 .TW / .TWO 後綴之台股代碼
  const twMatch = upper.match(/^(\d{4,5}[A-Z]?)(?:\.(TW|TWO))?$/);
  if (twMatch) {
    const code = twMatch[1];
    // 櫃買中心標的 (如 8299 群聯、3260 威剛、6488 環球晶) 嚴格使用 .TWO
    if (TPEX_CODES.has(code)) {
      return `${code}.TWO`;
    }
    // 臺灣證券交易所標的 (如 2330 台積電、2454 聯發科) 使用 .TW
    if (TWSE_CODES.has(code)) {
      return `${code}.TW`;
    }
  }

  return upper;
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
    case '1D': return { interval: '1d', range: '10y' }; // 10 年日 K 真實完整歷史數據
    case '1W': return { interval: '1wk', range: '10y' }; // 10 年週 K 數據
    case '1M': return { interval: '1mo', range: 'max' }; // 自上市以來的全部月 K 數據
    default: return { interval: '1d', range: '10y' };
  }
}

/**
 * 週期轉換為幣安 (Binance) K 線參數
 */
function mapPeriodToBinanceInterval(period: Period): string {
  switch (period) {
    case '1m': return '1m';
    case '5m': return '5m';
    case '15m': return '15m';
    case '30m': return '30m';
    case '1h': return '1h';
    case '4h': return '4h';
    case '1D': return '1d';
    case '1W': return '1w';
    case '1M': return '1M';
    default: return '1d';
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
 * 1. 支援幣安加密貨幣原生無跨域超高速串接
 * 2. 優先透過真實 API 抓取（在 Electron 內無跨域限制，支援 query1/query2 智慧容錯）
 * 3. 支援除權息還原（Adjusted Close）精確權息重算
 * 4. 具備本地快取層、官方最新行情基準定錨與智慧離線回退機制
 */
export async function fetchStockCandles(
  symbol: string,
  basePrice: number,
  period: Period,
  isAdjusted = false
): Promise<FetchStockResult> {
  const yahooSym = toYahooSymbol(symbol);
  // 若傳入的 basePrice 偏離過大或為舊值，優先採用官方登記最新收盤價進行校準
  const officialPrice = OFFICIAL_PRICE_MAP.get(yahooSym) || OFFICIAL_PRICE_MAP.get(symbol);
  const effectiveBasePrice = officialPrice && officialPrice > 0 ? officialPrice : basePrice;

  // ========== A. 加密貨幣：直接透過幣安公開 REST API (天然支援 CORS，0延遲) ==========
  const isCrypto = symbol.endsWith('USDT') || symbol === 'BTCUSDT' || symbol === 'ETHUSDT';
  if (isCrypto) {
    try {
      const bInterval = mapPeriodToBinanceInterval(period);
      const bUrl = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${bInterval}&limit=1000`;
      const res = await fetch(bUrl, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const rawBars: any[] = await res.json();
        const list: KLineData[] = rawBars.map((b) => ({
          timestamp: b[0],
          open: parseFloat(b[1]),
          high: parseFloat(b[2]),
          low: parseFloat(b[3]),
          close: parseFloat(b[4]),
          volume: Math.round(parseFloat(b[5])),
          turnover: Number(parseFloat(b[7]).toFixed(2)),
        }));

        if (list.length > 0) {
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
    } catch (e) {
      console.warn(`[stockApi] Binance klines fetch failed for ${symbol}:`, e);
    }
  }

  // ========== B. 股票與大盤指數：Yahoo Finance 雙通道串接 ==========
  const { interval, range } = mapPeriodToYahooParams(period);
  const encodedSym = encodeURIComponent(yahooSym);
  const primaryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSym}?range=${range}&interval=${interval}&includeAdjustedClose=true`;
  const secondaryUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSym}?range=${range}&interval=${interval}&includeAdjustedClose=true`;

  try {
    let json: any = null;

    // 6 秒網路請求逾時防護機制 (超時自動平滑回退，防止 UI 卡死)
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 6000)
    );

    const fetchPromise = (async () => {
      // 1. 若在 Electron 環境中，調用主行程 IPC 繞過 CORS (支援 query1/query2 自動容錯)
      if (typeof window !== 'undefined' && window.electronAPI?.fetchMarketData) {
        let resp = await window.electronAPI.fetchMarketData(primaryUrl);
        if (resp.data && !resp.error) {
          return resp.data;
        }
        // 若 primaryUrl 失敗，切換至 secondaryUrl
        resp = await window.electronAPI.fetchMarketData(secondaryUrl);
        if (resp.data && !resp.error) {
          return resp.data;
        }
      } else {
        // 2. 純網頁瀏覽器環境：多節點代理嘗試
        const proxyCandidates = [
          `https://corsproxy.io/?url=${encodeURIComponent(primaryUrl)}`,
          `https://proxy.cors.sh/${primaryUrl}`,
          `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(secondaryUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`,
        ];

        for (const proxyUrl of proxyCandidates) {
          try {
            const proxyRes = await fetch(proxyUrl, {
              signal: AbortSignal.timeout(3500),
              headers: { Accept: 'application/json' },
            });
            if (proxyRes.ok) {
              const data = await proxyRes.json();
              if (data?.chart?.result?.[0]) {
                return data;
              }
            }
          } catch {
            // 嘗試下一組代理
          }
        }
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

  // 最終兜底：高擬真布朗運動數據（基於官方權威價格定錨，保證 8299 群聯客觀反映 2015 元）
  const simulated = generateRealisticKLineData(symbol, effectiveBasePrice, period);
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
