import { StockSymbol } from '../types/stock';
import { toYahooSymbol } from '../data/stockApi';
import twseRegistryJson from '../data/twseFullRegistry.json';
import tpexRegistryJson from '../data/tpexFullRegistry.json';

export interface RealtimeQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h?: number;
  low24h?: number;
  timestamp?: number;
  name?: string;
}

// 建立官方上櫃與上市最新行情快速字典，確保離線或限流時能 100% 兜底真實股價
const OFFICIAL_QUOTES = new Map<string, RealtimeQuote>();
for (const item of twseRegistryJson as Array<{ s: string; c: string; n: string; p?: number; ch?: number; cp?: number }>) {
  if (item.p && item.p > 0) {
    const quote: RealtimeQuote = {
      symbol: item.s,
      price: item.p,
      change: item.ch || 0,
      changePercent: item.cp || 0,
      name: item.n,
      timestamp: Date.now(),
    };
    OFFICIAL_QUOTES.set(item.s, quote);
    OFFICIAL_QUOTES.set(item.c, quote);
  }
}
for (const item of tpexRegistryJson as Array<{ s: string; c: string; n: string; p?: number; ch?: number; cp?: number }>) {
  if (item.p && item.p > 0) {
    const quote: RealtimeQuote = {
      symbol: item.s,
      price: item.p,
      change: item.ch || 0,
      changePercent: item.cp || 0,
      name: item.n,
      timestamp: Date.now(),
    };
    OFFICIAL_QUOTES.set(item.s, quote);
    OFFICIAL_QUOTES.set(item.c, quote);
  }
}

// 記憶體短期報價快取 (30 秒內不重複向外部 API 發送同一代碼請求，防範 429 限流)
const quoteCache = new Map<string, { quote: RealtimeQuote; expireAt: number }>();
const CACHE_TTL_MS = 30 * 1000;

/**
 * 獲取單一標的之即時市場報價
 */
export async function fetchSingleQuote(symbol: string): Promise<RealtimeQuote | null> {
  const cached = quoteCache.get(symbol);
  if (cached && cached.expireAt > Date.now()) {
    return cached.quote;
  }

  // 1. 加密貨幣：直接走幣安公開 REST API (全瀏覽器 CORS 支援)
  const isCrypto = symbol.endsWith('USDT') || symbol === 'BTCUSDT' || symbol === 'ETHUSDT';
  if (isCrypto) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const data = await res.json();
        const price = parseFloat(data.lastPrice);
        const change = parseFloat(data.priceChange);
        const changePercent = parseFloat(data.priceChangePercent);
        const quote: RealtimeQuote = {
          symbol,
          price,
          change,
          changePercent,
          high24h: parseFloat(data.highPrice),
          low24h: parseFloat(data.lowPrice),
          timestamp: data.closeTime,
          name: symbol,
        };
        quoteCache.set(symbol, { quote, expireAt: Date.now() + CACHE_TTL_MS });
        return quote;
      }
    } catch {
      // 降級處理
    }
  }

  // 2. 股票與指數：透過 Yahoo Finance 獲取
  const yahooSym = toYahooSymbol(symbol);
  const encoded = encodeURIComponent(yahooSym);
  const primaryUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=2d&interval=1d`;
  const secondaryUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${encoded}?range=2d&interval=1d`;

  try {
    let json: any = null;

    // Electron 環境 IPC 調用 (支援雙端點自動容錯)
    if (typeof window !== 'undefined' && window.electronAPI?.fetchMarketData) {
      let resp = await window.electronAPI.fetchMarketData(primaryUrl);
      if (resp.data && !resp.error) {
        json = resp.data;
      } else {
        resp = await window.electronAPI.fetchMarketData(secondaryUrl);
        if (resp.data && !resp.error) {
          json = resp.data;
        }
      }
    } else {
      // 純網頁瀏覽器環境：代理請求
      const proxyCandidates = [
        `https://corsproxy.io/?url=${encodeURIComponent(primaryUrl)}`,
        `https://proxy.cors.sh/${primaryUrl}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(secondaryUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`,
      ];

      for (const pUrl of proxyCandidates) {
        try {
          const proxyRes = await fetch(pUrl, {
            signal: AbortSignal.timeout(3000),
            headers: { Accept: 'application/json' },
          });
          if (proxyRes.ok) {
            json = await proxyRes.json();
            if (json?.chart?.result?.[0]?.meta) break;
          }
        } catch {
          // 嘗試下一個代理
        }
      }
    }

    if (json?.chart?.result?.[0]?.meta) {
      const meta = json.chart.result[0].meta;
      const curPrice = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || curPrice;

      if (typeof curPrice === 'number' && !isNaN(curPrice) && curPrice > 0) {
        const change = Number((curPrice - prevClose).toFixed(2));
        const changePercent = Number(((change / prevClose) * 100).toFixed(2));

        const quote: RealtimeQuote = {
          symbol,
          price: curPrice,
          change,
          changePercent,
          high24h: meta.regularMarketDayHigh,
          low24h: meta.regularMarketDayLow,
          timestamp: (meta.regularMarketTime || Math.floor(Date.now() / 1000)) * 1000,
          name: meta.shortName || meta.symbol,
        };

        quoteCache.set(symbol, {
          quote,
          expireAt: Date.now() + CACHE_TTL_MS,
        });

        return quote;
      }
    }
  } catch (error) {
    console.warn(`[quoteService] Failed to fetch quote for ${symbol}:`, error);
  }

  // 3. 兜底保障：若外部網路受阻，但屬於台股官方名冊（如 8299 群聯），回傳官方最新收盤價基準
  const official = OFFICIAL_QUOTES.get(yahooSym) || OFFICIAL_QUOTES.get(symbol);
  if (official) {
    return { ...official, symbol };
  }

  return null;
}

/**
 * 批次並發獲取多檔自選股即時報價 (每次最多 2 檔同時查詢，間隔 250ms，杜絕觸發防爬蟲 429 限流)
 */
export async function fetchBatchQuotes(
  symbols: string[],
  concurrency = 2
): Promise<Record<string, RealtimeQuote>> {
  const results: Record<string, RealtimeQuote> = {};
  const uniqueSymbols = Array.from(new Set(symbols));

  for (let i = 0; i < uniqueSymbols.length; i += concurrency) {
    const chunk = uniqueSymbols.slice(i, i + concurrency);
    const promises = chunk.map((sym) => fetchSingleQuote(sym));
    const quotes = await Promise.all(promises);

    quotes.forEach((q) => {
      if (q) {
        results[q.symbol] = q;
      }
    });

    if (i + concurrency < uniqueSymbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }

  return results;
}

/**
 * 將批次報價合併入自選股列表 (具備名稱自動學習更新)
 */
export function mergeQuotesIntoSymbols(
  symbols: StockSymbol[],
  quotes: Record<string, RealtimeQuote>
): StockSymbol[] {
  let hasChanged = false;
  const updated = symbols.map((item) => {
    const q = quotes[item.symbol];
    if (q) {
      const isPlaceholder =
        !item.name ||
        item.name === item.symbol ||
        item.name.includes('(自訂代號)') ||
        item.name.includes('(台股上市標的)') ||
        item.name.includes('(台股上櫃/櫃買標的)');
      const nextName = isPlaceholder && q.name ? q.name : item.name;
      const priceChanged =
        item.price !== q.price || item.change !== q.change || item.changePercent !== q.changePercent;
      const nameChanged = nextName !== item.name;

      if (priceChanged || nameChanged) {
        hasChanged = true;
        return {
          ...item,
          name: nextName,
          price: q.price,
          change: q.change,
          changePercent: q.changePercent,
          high24h: q.high24h ?? item.high24h,
          low24h: q.low24h ?? item.low24h,
        };
      }
    }
    return item;
  });

  return hasChanged ? updated : symbols;
}
