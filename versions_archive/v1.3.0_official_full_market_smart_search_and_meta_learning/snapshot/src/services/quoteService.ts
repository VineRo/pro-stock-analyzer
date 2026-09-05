import { StockSymbol } from '../types/stock';
import { toYahooSymbol } from '../data/stockApi';

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

// 記憶體短期報價快取 (15 秒內不重複向 API 發送同一代碼請求)
const quoteCache = new Map<string, { quote: RealtimeQuote; expireAt: number }>();
const CACHE_TTL_MS = 15 * 1000;

/**
 * 獲取單一標的之即時市場報價
 */
export async function fetchSingleQuote(symbol: string): Promise<RealtimeQuote | null> {
  const cached = quoteCache.get(symbol);
  if (cached && cached.expireAt > Date.now()) {
    return cached.quote;
  }

  const yahooSym = toYahooSymbol(symbol);
  const encoded = encodeURIComponent(yahooSym);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=2d&interval=1d`;

  try {
    let json: any = null;

    // 1. Electron 環境 IPC 調用
    if (typeof window !== 'undefined' && window.electronAPI?.fetchMarketData) {
      const resp = await window.electronAPI.fetchMarketData(url);
      if (resp.data && !resp.error) {
        json = resp.data;
      }
    } else {
      // 2. 瀏覽器端直接 fetch (超時 4 秒)
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      try {
        const res = await fetch(url, {
          headers: { 'Accept': 'application/json' },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          json = await res.json();
        }
      } catch {
        clearTimeout(timer);
      }
    }

    if (json?.chart?.result?.[0]?.meta) {
      const meta = json.chart.result[0].meta;
      const curPrice = meta.regularMarketPrice;
      const prevClose = meta.chartPreviousClose || meta.previousClose || curPrice;
      
      if (typeof curPrice === 'number' && !isNaN(curPrice) && curPrice > 0) {
        const change = Number((curPrice - prevClose).toFixed(2));
        const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;
        const officialName = meta.shortName || meta.longName;

        const quote: RealtimeQuote = {
          symbol,
          price: curPrice,
          change,
          changePercent,
          high24h: meta.regularMarketDayHigh,
          low24h: meta.regularMarketDayLow,
          timestamp: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
          name: officialName,
        };

        quoteCache.set(symbol, { quote, expireAt: Date.now() + CACHE_TTL_MS });
        return quote;
      }
    }
  } catch (error) {
    console.warn(`[quoteService] Failed to fetch quote for ${symbol}:`, error);
  }

  return null;
}

/**
 * 批次並發獲取多檔自選股即時報價 (每次最多 5 檔同時查詢，避免頻率限制)
 */
export async function fetchBatchQuotes(
  symbols: string[],
  concurrency = 5
): Promise<Record<string, RealtimeQuote>> {
  const results: Record<string, RealtimeQuote> = {};
  const uniqueSymbols = Array.from(new Set(symbols));

  // 分批次並發執行
  for (let i = 0; i < uniqueSymbols.length; i += concurrency) {
    const chunk = uniqueSymbols.slice(i, i + concurrency);
    const promises = chunk.map((sym) => fetchSingleQuote(sym));
    const quotes = await Promise.all(promises);

    quotes.forEach((q) => {
      if (q) {
        results[q.symbol] = q;
      }
    });

    // 禮貌性間隔 100ms
    if (i + concurrency < uniqueSymbols.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
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
