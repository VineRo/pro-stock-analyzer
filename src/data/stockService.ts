import { KLineData } from 'klinecharts';
import { FundamentalData, Period, StockSymbol } from '../types/stock';

export const POPULAR_SYMBOLS: StockSymbol[] = [
  // 美股核心標的
  { symbol: 'AAPL', name: '蘋果 (Apple Inc.)', market: 'US', price: 321.0, change: -3.95, changePercent: -1.22, currency: 'USD' },
  { symbol: 'NVDA', name: '輝達 (NVIDIA Corp.)', market: 'US', price: 231.15, change: 6.74, changePercent: 3.00, currency: 'USD' },
  { symbol: 'TSLA', name: '特斯拉 (Tesla Inc.)', market: 'US', price: 352.15, change: -4.85, changePercent: -1.36, currency: 'USD' },
  { symbol: 'MSFT', name: '微軟 (Microsoft Corp.)', market: 'US', price: 500.90, change: 4.10, changePercent: 0.83, currency: 'USD' },
  { symbol: 'SPY', name: '標普500 ETF (SPDR)', market: 'US', price: 770.60, change: 5.45, changePercent: 0.71, currency: 'USD' },
  { symbol: 'QQQ', name: '那斯達克100 ETF (Invesco)', market: 'US', price: 718.35, change: 9.10, changePercent: 1.28, currency: 'USD' },

  // 台股熱門權值
  { symbol: '2330.TW', name: '台積電 (TSMC)', market: 'TW', price: 2410.0, change: 20.0, changePercent: 0.84, currency: 'TWD' },
  { symbol: '2317.TW', name: '鴻海 (Hon Hai)', market: 'TW', price: 256.0, change: 8.5, changePercent: 3.43, currency: 'TWD' },
  { symbol: '2454.TW', name: '聯發科 (MediaTek)', market: 'TW', price: 4415.0, change: 75.0, changePercent: 1.73, currency: 'TWD' },
  { symbol: '0050.TW', name: '元大台灣50 (ETF)', market: 'TW', price: 107.9, change: 1.7, changePercent: 1.60, currency: 'TWD' },

  // 主流加密資產
  { symbol: 'BTCUSDT', name: '比特幣 (Bitcoin)', market: 'CRYPTO', price: 79450.0, change: -1820.0, changePercent: -2.24, currency: 'USDT' },
  { symbol: 'ETHUSDT', name: '以太坊 (Ethereum)', market: 'CRYPTO', price: 2450.0, change: -56.8, changePercent: -2.27, currency: 'USDT' },
  { symbol: 'SOLUSDT', name: '索拉納 (Solana)', market: 'CRYPTO', price: 142.50, change: 4.80, changePercent: 3.49, currency: 'USDT' },
  { symbol: 'BNBUSDT', name: '幣安幣 (Binance Coin)', market: 'CRYPTO', price: 585.20, change: 8.30, changePercent: 1.44, currency: 'USDT' },
];

/**
 * 根據時間週期換算毫秒間隔
 */
function getPeriodInterval(period: Period): number {
  switch (period) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '4h': return 4 * 60 * 60 * 1000;
    case '1D': return 24 * 60 * 60 * 1000;
    case '1W': return 7 * 24 * 60 * 60 * 1000;
    case '1M': return 30 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

/**
 * 高擬真真實波動 K 線生成演算法：
 * 生成符合金融幾何布朗運動與動量趨勢的標準 OHLCV 歷史數據
 */
export function generateRealisticKLineData(
  _symbol: string,
  basePrice: number,
  period: Period,
  count = 350
): KLineData[] {
  const list: KLineData[] = [];
  const interval = getPeriodInterval(period);
  const now = Date.now();
  let startTime = now - count * interval;

  let currentClose = basePrice * 0.85; // 模擬前段起漲點

  // 動態隨機波動率與趨勢波長
  const volatility = basePrice > 1000 ? 0.012 : 0.018;

  for (let i = 0; i < count; i++) {
    const timestamp = startTime + i * interval;
    
    // 週期性波浪運動 + 隨機行走向上的趨勢
    const cycle = Math.sin(i / 15) * (basePrice * 0.015);
    const noise = (Math.random() - 0.485) * (currentClose * volatility);
    
    const open = currentClose;
    let close = open + noise + cycle * 0.1;
    if (close <= 0.5) close = 0.5;

    const high = Math.max(open, close) + Math.random() * (open * volatility * 0.7);
    const low = Math.min(open, close) - Math.random() * (open * volatility * 0.7);

    // 成交量（大陽線或破底時爆量）
    const isBigMove = Math.abs(close - open) / open > 0.015;
    const baseVolume = 15000 + Math.floor(Math.random() * 30000);
    const volume = isBigMove ? baseVolume * (1.8 + Math.random() * 2) : baseVolume;
    const turnover = volume * close;

    list.push({
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.round(volume),
      turnover: Number(turnover.toFixed(2)),
    });

    currentClose = close;
  }

  return list;
}

/**
 * 主流標的之基本面財務深度數據庫
 */
export const FUNDAMENTAL_DATA_MAP: Record<string, FundamentalData> = {
  AAPL: {
    symbol: 'AAPL',
    name: '蘋果 (Apple Inc.)',
    peRatio: 33.8,
    pbRatio: 48.2,
    dividendYield: 0.45,
    eps: 6.57,
    revenueGrowthYoY: 6.1,
    high52w: 237.23,
    low52w: 164.08,
    marketCap: '$3.52T',
    sector: '消費電子 / 科技',
    healthScore: 92,
    analystConsensus: '買進',
    freeCashFlow: 1080,        // 1080 億美元
    netDebt: 450,              // 450 億美元
    sharesOutstanding: 15.2,   // 15.2 億股
    beta: 1.12,
    wacc: 8.8,
    growthRateNext5Y: 10.5,
    dividendPerShare: 1.00,
    terminalGrowthRate: 2.5,
    analystTargetPrice: 248.0,
  },
  NVDA: {
    symbol: 'NVDA',
    name: '輝達 (NVIDIA Corp.)',
    peRatio: 45.6,
    pbRatio: 38.4,
    dividendYield: 0.08,
    eps: 2.82,
    revenueGrowthYoY: 122.4,
    high52w: 140.76,
    low52w: 39.23,
    marketCap: '$3.16T',
    sector: '半導體 / 人工智慧',
    healthScore: 95,
    analystConsensus: '強烈買進',
    freeCashFlow: 600,         // 600 億美元
    netDebt: -150,             // 淨現金 150 億美元
    sharesOutstanding: 24.5,
    beta: 1.75,
    wacc: 10.5,
    growthRateNext5Y: 32.0,
    dividendPerShare: 0.16,
    terminalGrowthRate: 3.0,
    analystTargetPrice: 165.0,
  },
  TSLA: {
    symbol: 'TSLA',
    name: '特斯拉 (Tesla Inc.)',
    peRatio: 64.2,
    pbRatio: 10.5,
    dividendYield: 0.0,
    eps: 3.40,
    revenueGrowthYoY: -3.0,
    high52w: 271.00,
    low52w: 138.80,
    marketCap: '$698B',
    sector: '電動車 / 乾淨能源',
    healthScore: 78,
    analystConsensus: '持有',
    freeCashFlow: 85,
    netDebt: -180,
    sharesOutstanding: 3.19,
    beta: 2.05,
    wacc: 11.5,
    growthRateNext5Y: 18.0,
    dividendPerShare: 0,
    terminalGrowthRate: 2.5,
    analystTargetPrice: 275.0,
  },
  MSFT: {
    symbol: 'MSFT',
    name: '微軟 (Microsoft Corp.)',
    peRatio: 35.1,
    pbRatio: 12.8,
    dividendYield: 0.72,
    eps: 11.80,
    revenueGrowthYoY: 15.2,
    high52w: 468.35,
    low52w: 309.45,
    marketCap: '$3.34T',
    sector: '軟體 / 雲端運算',
    healthScore: 94,
    analystConsensus: '強烈買進',
    freeCashFlow: 740,
    netDebt: -250,
    sharesOutstanding: 7.43,
    beta: 1.15,
    wacc: 8.5,
    growthRateNext5Y: 14.0,
    dividendPerShare: 3.00,
    terminalGrowthRate: 2.8,
    analystTargetPrice: 505.0,
  },
  SPY: {
    symbol: 'SPY',
    name: '標普500 ETF (SPDR)',
    peRatio: 26.5,
    pbRatio: 4.8,
    dividendYield: 1.28,
    eps: 21.20,
    revenueGrowthYoY: 7.8,
    high52w: 565.16,
    low52w: 420.18,
    marketCap: '$560B',
    sector: '大盤指數型基金',
    healthScore: 90,
    analystConsensus: '買進',
    freeCashFlow: 350,
    netDebt: 0,
    sharesOutstanding: 9.5,
    beta: 1.0,
    wacc: 8.2,
    growthRateNext5Y: 9.5,
    dividendPerShare: 7.2,
    terminalGrowthRate: 2.5,
    analystTargetPrice: 580.0,
  },
  QQQ: {
    symbol: 'QQQ',
    name: '那斯達克100 ETF (Invesco)',
    peRatio: 31.4,
    pbRatio: 7.2,
    dividendYield: 0.58,
    eps: 15.40,
    revenueGrowthYoY: 11.5,
    high52w: 503.52,
    low52w: 351.36,
    marketCap: '$285B',
    sector: '科技指數型基金',
    healthScore: 91,
    analystConsensus: '買進',
    freeCashFlow: 220,
    netDebt: 0,
    sharesOutstanding: 6.2,
    beta: 1.18,
    wacc: 8.6,
    growthRateNext5Y: 12.5,
    dividendPerShare: 2.8,
    terminalGrowthRate: 2.5,
    analystTargetPrice: 520.0,
  },
  '2330.TW': {
    symbol: '2330.TW',
    name: '台積電 (TSMC)',
    peRatio: 26.8,
    pbRatio: 6.9,
    dividendYield: 1.64,
    eps: 38.50,
    revenueGrowthYoY: 34.0,
    high52w: 1080.0,
    low52w: 516.0,
    marketCap: 'NT$ 25.2T',
    sector: '半導體晶圓代工',
    healthScore: 96,
    analystConsensus: '強烈買進',
    freeCashFlow: 8500,        // 8500 億新台幣
    netDebt: -4000,            // 淨現金 4000 億
    sharesOutstanding: 25.93,  // 259.3 億股 (以 10 億股為單位換算)
    beta: 1.15,
    wacc: 8.9,
    growthRateNext5Y: 21.0,
    dividendPerShare: 16.0,
    terminalGrowthRate: 3.0,
    analystTargetPrice: 1220.0,
  },
  '2317.TW': {
    symbol: '2317.TW',
    name: '鴻海 (Hon Hai)',
    peRatio: 15.8,
    pbRatio: 1.68,
    dividendYield: 2.95,
    eps: 10.25,
    revenueGrowthYoY: 16.2,
    high52w: 234.5,
    low52w: 96.5,
    marketCap: 'NT$ 2.53T',
    sector: '電子代工 / AI伺服器',
    healthScore: 86,
    analystConsensus: '買進',
    freeCashFlow: 1200,
    netDebt: 800,
    sharesOutstanding: 13.86,
    beta: 1.05,
    wacc: 8.2,
    growthRateNext5Y: 12.5,
    dividendPerShare: 5.4,
    terminalGrowthRate: 2.2,
    analystTargetPrice: 255.0,
  },
  '2454.TW': {
    symbol: '2454.TW',
    name: '聯發科 (MediaTek)',
    peRatio: 21.2,
    pbRatio: 4.85,
    dividendYield: 4.43,
    eps: 55.40,
    revenueGrowthYoY: 29.5,
    high52w: 1500.0,
    low52w: 685.0,
    marketCap: 'NT$ 1.98T',
    sector: 'IC設計 / 手機晶片',
    healthScore: 89,
    analystConsensus: '買進',
    freeCashFlow: 850,
    netDebt: -1200,
    sharesOutstanding: 1.60,
    beta: 1.25,
    wacc: 9.4,
    growthRateNext5Y: 16.0,
    dividendPerShare: 55.0,
    terminalGrowthRate: 2.5,
    analystTargetPrice: 1600.0,
  },
  '0050.TW': {
    symbol: '0050.TW',
    name: '元大台灣50 (ETF)',
    peRatio: 21.5,
    pbRatio: 3.2,
    dividendYield: 2.52,
    eps: 8.20,
    revenueGrowthYoY: 18.4,
    high52w: 198.5,
    low52w: 125.0,
    marketCap: 'NT$ 412B',
    sector: '台股藍籌旗艦基金',
    healthScore: 92,
    analystConsensus: '買進',
    freeCashFlow: 200,
    netDebt: 0,
    sharesOutstanding: 3.5,
    beta: 1.0,
    wacc: 8.0,
    growthRateNext5Y: 10.0,
    dividendPerShare: 4.8,
    terminalGrowthRate: 2.2,
    analystTargetPrice: 205.0,
  },
  BTCUSDT: {
    symbol: 'BTCUSDT',
    name: '比特幣 (Bitcoin)',
    peRatio: 0,
    pbRatio: 0,
    dividendYield: 0,
    eps: 0,
    revenueGrowthYoY: 0,
    high52w: 73777.0,
    low52w: 24900.0,
    marketCap: '$1.21T',
    sector: '數位黃金 / 區塊鏈',
    healthScore: 85,
    analystConsensus: '買進',
  },
  ETHUSDT: {
    symbol: 'ETHUSDT',
    name: '以太坊 (Ethereum)',
    peRatio: 0,
    pbRatio: 0,
    dividendYield: 3.2, // 質押收益率
    eps: 0,
    revenueGrowthYoY: 0,
    high52w: 4093.0,
    low52w: 1520.0,
    marketCap: '$322B',
    sector: '智慧合約公鏈',
    healthScore: 82,
    analystConsensus: '買進',
  },
};

/**
 * 取得個股基本面資料 (若無精確配置則產生標準合規體質數據)
 */
export function getFundamentalData(symbol: string, currentPrice?: number): FundamentalData {
  if (FUNDAMENTAL_DATA_MAP[symbol]) {
    return FUNDAMENTAL_DATA_MAP[symbol];
  }

  const base = currentPrice || 100;
  const shares = Number((base > 500 ? 5.0 : 15.0).toFixed(1));
  const eps = Number((base * (0.03 + Math.random() * 0.04)).toFixed(2));
  const pe = Number((18 + Math.random() * 15).toFixed(1));
  const growth = Number((8 + Math.random() * 14).toFixed(1));

  return {
    symbol,
    name: symbol,
    peRatio: pe,
    pbRatio: Number((1.5 + Math.random() * 3).toFixed(2)),
    dividendYield: Number((1.2 + Math.random() * 3.5).toFixed(2)),
    eps,
    revenueGrowthYoY: growth,
    high52w: Number((base * 1.25).toFixed(2)),
    low52w: Number((base * 0.75).toFixed(2)),
    marketCap: `$${(base * 1.5).toFixed(0)}B`,
    sector: '綜合產業',
    healthScore: 85,
    analystConsensus: '買進',
    freeCashFlow: Number((base * 0.045 * shares).toFixed(1)),
    netDebt: 0,
    sharesOutstanding: shares,
    beta: 1.1,
    wacc: 8.5,
    growthRateNext5Y: growth,
    dividendPerShare: Number((base * 0.018).toFixed(2)),
    terminalGrowthRate: 2.5,
    analystTargetPrice: Number((base * 1.15).toFixed(2)),
  };
}

