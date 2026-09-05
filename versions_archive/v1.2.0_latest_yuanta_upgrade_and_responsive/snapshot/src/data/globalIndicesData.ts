import { MarketType } from '../types/stock';
import { RealtimeQuote } from '../services/quoteService';

export type MarketRegion = 'ALL' | 'ASIA' | 'AMERICAS' | 'EUROPE';

export type MarketSessionStatus = 'OPEN' | 'AFTER_HOURS' | 'CLOSED';

export interface GlobalIndexItem {
  symbol: string;
  name: string;
  shortName: string;
  country: string;
  flag: string;
  region: 'ASIA' | 'AMERICAS' | 'EUROPE';
  market: MarketType;
  currency: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  volume: string;
  turnover: string;
  peRatio?: number;
  sparkline: number[];
  returns: {
    d5: number;
    m1: number;
    m3: number;
    ytd: number;
    y1: number;
  };
  tradingHours: string;
  exchangeName: string;
  status: MarketSessionStatus;
  isAfterHours?: boolean;
  afterHoursPrice?: number;
  afterHoursChange?: number;
  afterHoursChangePercent?: number;
}

/**
 * 完整全球大盤基準指數資料庫 (17 大跨國主流指標)
 */
const RAW_GLOBAL_INDICES: GlobalIndexItem[] = [
  // ================= 🇹🇼 台灣市場 =================
  {
    symbol: '^TWII',
    name: '台灣加權股價指數 (TAIEX)',
    shortName: '台股加權',
    country: '台灣',
    flag: '🇹🇼',
    region: 'ASIA',
    market: 'TW',
    currency: 'TWD',
    price: 22268.0,
    change: 145.0,
    changePercent: 0.65,
    open: 22180.0,
    high: 22310.5,
    low: 22150.0,
    prevClose: 22123.0,
    volume: '3,850 億',
    turnover: 'NT$ 3,850 億',
    peRatio: 21.5,
    sparkline: [22123, 22150, 22140, 22180, 22210, 22190, 22240, 22260, 22230, 22270, 22290, 22310, 22280, 22260, 22270, 22268],
    returns: { d5: 1.45, m1: 3.82, m3: 8.65, ytd: 24.12, y1: 32.5 },
    tradingHours: '09:00 - 13:30 (UTC+8)',
    exchangeName: '台灣證券交易所 (TWSE)',
    status: 'CLOSED',
  },
  {
    symbol: '^TWOII',
    name: '台灣櫃檯買賣指數 (TPEx 50)',
    shortName: '台灣櫃買',
    country: '台灣',
    flag: '🇹🇼',
    region: 'ASIA',
    market: 'TW',
    currency: 'TWD',
    price: 271.85,
    change: 1.95,
    changePercent: 0.72,
    open: 270.2,
    high: 272.5,
    low: 269.8,
    prevClose: 269.9,
    volume: '980 億',
    turnover: 'NT$ 980 億',
    peRatio: 24.2,
    sparkline: [269.9, 270.1, 270.4, 270.2, 270.8, 271.2, 271.0, 271.6, 271.9, 272.1, 272.5, 272.2, 271.9, 271.8, 271.9, 271.85],
    returns: { d5: 2.10, m1: 4.15, m3: 9.80, ytd: 18.60, y1: 28.3 },
    tradingHours: '09:00 - 13:30 (UTC+8)',
    exchangeName: '證券櫃檯買賣中心 (TPEx)',
    status: 'CLOSED',
  },

  // ================= 🇺🇸 美洲市場 =================
  {
    symbol: 'SPY',
    name: '標普 500 指數 ETF (S&P 500)',
    shortName: '標普 500',
    country: '美國',
    flag: '🇺🇸',
    region: 'AMERICAS',
    market: 'US',
    currency: 'USD',
    price: 562.40,
    change: 4.80,
    changePercent: 0.86,
    open: 558.90,
    high: 563.80,
    low: 558.20,
    prevClose: 557.60,
    volume: '5,420 萬股',
    turnover: '$ 304 億',
    peRatio: 26.8,
    sparkline: [557.6, 558.1, 558.5, 559.2, 560.1, 559.8, 560.9, 561.4, 562.0, 561.8, 562.6, 563.5, 563.8, 563.1, 562.7, 562.4],
    returns: { d5: 1.82, m1: 4.25, m3: 7.90, ytd: 19.45, y1: 26.8 },
    tradingHours: '09:30 - 16:00 (EST)',
    exchangeName: '紐約證券交易所 (NYSE)',
    status: 'OPEN',
  },
  {
    symbol: 'QQQ',
    name: '那斯達克 100 指數 ETF (Nasdaq 100)',
    shortName: '那斯達克',
    country: '美國',
    flag: '🇺🇸',
    region: 'AMERICAS',
    market: 'US',
    currency: 'USD',
    price: 486.30,
    change: 6.20,
    changePercent: 1.29,
    open: 481.50,
    high: 488.20,
    low: 480.90,
    prevClose: 480.10,
    volume: '4,180 萬股',
    turnover: '$ 203 億',
    peRatio: 31.4,
    sparkline: [480.1, 481.0, 481.8, 482.9, 484.2, 483.7, 484.9, 485.6, 486.4, 487.1, 488.0, 488.2, 487.4, 486.8, 486.5, 486.3],
    returns: { d5: 2.65, m1: 5.60, m3: 11.20, ytd: 22.80, y1: 34.2 },
    tradingHours: '09:30 - 16:00 (EST)',
    exchangeName: '那斯達克交易所 (NASDAQ)',
    status: 'OPEN',
  },
  {
    symbol: 'DIA',
    name: '道瓊工業平均指數 ETF (Dow Jones)',
    shortName: '道瓊工業',
    country: '美國',
    flag: '🇺🇸',
    region: 'AMERICAS',
    market: 'US',
    currency: 'USD',
    price: 412.80,
    change: 1.90,
    changePercent: 0.46,
    open: 411.20,
    high: 413.60,
    low: 410.80,
    prevClose: 410.90,
    volume: '2,950 萬股',
    turnover: '$ 121 億',
    peRatio: 22.1,
    sparkline: [410.9, 411.1, 411.4, 411.8, 412.3, 412.0, 412.5, 412.9, 413.2, 413.6, 413.4, 413.1, 412.9, 412.7, 412.8, 412.8],
    returns: { d5: 0.85, m1: 2.90, m3: 5.40, ytd: 12.10, y1: 18.9 },
    tradingHours: '09:30 - 16:00 (EST)',
    exchangeName: '紐約證券交易所 (NYSE)',
    status: 'OPEN',
  },
  {
    symbol: 'SOXX',
    name: '費城半導體指數 ETF (PHLX Semiconductor)',
    shortName: '費城半導體',
    country: '美國',
    flag: '🇺🇸',
    region: 'AMERICAS',
    market: 'US',
    currency: 'USD',
    price: 238.50,
    change: 4.85,
    changePercent: 2.08,
    open: 234.0,
    high: 240.2,
    low: 233.5,
    prevClose: 233.65,
    volume: '3,800 萬股',
    turnover: '$ 90 億',
    peRatio: 35.6,
    sparkline: [233.65, 234.2, 235.1, 236.4, 237.2, 236.8, 237.9, 238.5, 239.1, 239.8, 240.2, 239.6, 239.1, 238.7, 238.6, 238.5],
    returns: { d5: 3.90, m1: 7.80, m3: 14.50, ytd: 28.60, y1: 42.1 },
    tradingHours: '09:30 - 16:00 (EST)',
    exchangeName: '那斯達克交易所 (NASDAQ)',
    status: 'OPEN',
  },

  // ================= 🇯🇵 日本市場 =================
  {
    symbol: '^N225',
    name: '日經 225 平均指數 (Nikkei 225)',
    shortName: '日經 225',
    country: '日本',
    flag: '🇯🇵',
    region: 'ASIA',
    market: 'JP',
    currency: 'JPY',
    price: 38700.0,
    change: 285.0,
    changePercent: 0.74,
    open: 38450.0,
    high: 38850.0,
    low: 38390.0,
    prevClose: 38415.0,
    volume: '15.8 億股',
    turnover: '¥ 4.2 兆',
    peRatio: 17.8,
    sparkline: [38415, 38480, 38550, 38620, 38580, 38650, 38710, 38760, 38820, 38850, 38810, 38770, 38730, 38720, 38710, 38700],
    returns: { d5: 1.15, m1: 2.80, m3: 6.40, ytd: 16.50, y1: 24.2 },
    tradingHours: '09:00 - 15:00 (JST)',
    exchangeName: '東京證券交易所 (TSE)',
    status: 'CLOSED',
  },
  {
    symbol: '^TOPX',
    name: '東證股票指數 (TOPIX)',
    shortName: '日本東證',
    country: '日本',
    flag: '🇯🇵',
    region: 'ASIA',
    market: 'JP',
    currency: 'JPY',
    price: 2715.0,
    change: 18.2,
    changePercent: 0.67,
    open: 2700.5,
    high: 2724.0,
    low: 2698.0,
    prevClose: 2696.8,
    volume: '12.4 億股',
    turnover: '¥ 3.1 兆',
    peRatio: 16.2,
    sparkline: [2696.8, 2701, 2705, 2710, 2708, 2714, 2718, 2722, 2724, 2721, 2719, 2717, 2716, 2715, 2715.5, 2715.0],
    returns: { d5: 0.95, m1: 2.40, m3: 5.80, ytd: 14.80, y1: 21.6 },
    tradingHours: '09:00 - 15:00 (JST)',
    exchangeName: '東京證券交易所 (TSE)',
    status: 'CLOSED',
  },

  // ================= 🇰🇷 韓國市場 =================
  {
    symbol: '^KS11',
    name: '韓國綜合股價指數 (KOSPI)',
    shortName: '韓國 KOSPI',
    country: '韓國',
    flag: '🇰🇷',
    region: 'ASIA',
    market: 'KR',
    currency: 'KRW',
    price: 2680.5,
    change: 12.8,
    changePercent: 0.48,
    open: 2671.0,
    high: 2692.0,
    low: 2668.5,
    prevClose: 2667.7,
    volume: '4.8 億股',
    turnover: '₩ 9.5 兆',
    peRatio: 18.4,
    sparkline: [2667.7, 2670, 2674, 2678, 2682, 2680, 2685, 2689, 2692, 2688, 2686, 2683, 2682, 2681, 2680.8, 2680.5],
    returns: { d5: 0.65, m1: 1.85, m3: 4.20, ytd: 8.40, y1: 14.5 },
    tradingHours: '09:00 - 15:30 (KST)',
    exchangeName: '韓國交易所 (KRX)',
    status: 'CLOSED',
  },
  {
    symbol: '^KQ11',
    name: '韓國科斯達克指數 (KOSDAQ)',
    shortName: '韓國科斯達克',
    country: '韓國',
    flag: '🇰🇷',
    region: 'ASIA',
    market: 'KR',
    currency: 'KRW',
    price: 775.2,
    change: -3.4,
    changePercent: -0.44,
    open: 779.0,
    high: 781.5,
    low: 773.0,
    prevClose: 778.6,
    volume: '7.2 億股',
    turnover: '₩ 6.8 兆',
    peRatio: 22.8,
    sparkline: [778.6, 779.2, 780.1, 781.5, 780.0, 778.5, 777.1, 776.2, 775.0, 773.8, 773.0, 774.2, 774.8, 775.0, 775.1, 775.2],
    returns: { d5: -0.80, m1: -1.20, m3: 1.50, ytd: -3.20, y1: 4.8 },
    tradingHours: '09:00 - 15:30 (KST)',
    exchangeName: '韓國交易所 (KRX)',
    status: 'CLOSED',
  },

  // ================= 🇨🇳 中國大陸市場 =================
  {
    symbol: '000001.SS',
    name: '上證綜合指數 (SSE Composite)',
    shortName: '上證指數',
    country: '中國',
    flag: '🇨🇳',
    region: 'ASIA',
    market: 'CN',
    currency: 'CNY',
    price: 2842.2,
    change: 15.6,
    changePercent: 0.55,
    open: 2830.0,
    high: 2855.0,
    low: 2825.4,
    prevClose: 2826.6,
    volume: '3.1 億手',
    turnover: '¥ 3,450 億',
    peRatio: 12.8,
    sparkline: [2826.6, 2829, 2833, 2838, 2842, 2840, 2846, 2851, 2855, 2852, 2848, 2845, 2843, 2842.5, 2842.8, 2842.2],
    returns: { d5: 0.45, m1: 1.20, m3: 3.10, ytd: -2.80, y1: 1.5 },
    tradingHours: '09:30 - 15:00 (CST)',
    exchangeName: '上海證券交易所 (SSE)',
    status: 'CLOSED',
  },
  {
    symbol: '000300.SS',
    name: '滬深 300 指數 (CSI 300)',
    shortName: '滬深 300',
    country: '中國',
    flag: '🇨🇳',
    region: 'ASIA',
    market: 'CN',
    currency: 'CNY',
    price: 3320.8,
    change: 22.4,
    changePercent: 0.68,
    open: 3305.0,
    high: 3336.0,
    low: 3298.5,
    prevClose: 3298.4,
    volume: '1.8 億手',
    turnover: '¥ 2,890 億',
    peRatio: 11.9,
    sparkline: [3298.4, 3303, 3310, 3316, 3322, 3318, 3325, 3330, 3336, 3332, 3328, 3324, 3322, 3321, 3320.5, 3320.8],
    returns: { d5: 0.85, m1: 1.65, m3: 4.50, ytd: -1.20, y1: 3.2 },
    tradingHours: '09:30 - 15:00 (CST)',
    exchangeName: '中證指數公司 (CSI)',
    status: 'CLOSED',
  },
  {
    symbol: '399001.SZ',
    name: '深證成份指數 (SZSE Component)',
    shortName: '深證成指',
    country: '中國',
    flag: '🇨🇳',
    region: 'ASIA',
    market: 'CN',
    currency: 'CNY',
    price: 8350.0,
    change: 48.0,
    changePercent: 0.58,
    open: 8310.0,
    high: 8390.0,
    low: 8295.0,
    prevClose: 8302.0,
    volume: '2.4 億手',
    turnover: '¥ 4,120 億',
    peRatio: 19.5,
    sparkline: [8302, 8312, 8325, 8340, 8355, 8350, 8368, 8379, 8390, 8382, 8370, 8362, 8355, 8352, 8351, 8350.0],
    returns: { d5: 0.70, m1: 1.10, m3: 2.80, ytd: -5.40, y1: -1.8 },
    tradingHours: '09:30 - 15:00 (CST)',
    exchangeName: '深圳證券交易所 (SZSE)',
    status: 'CLOSED',
  },

  // ================= 🇭🇰 香港市場 =================
  {
    symbol: '^HSI',
    name: '香港恆生指數 (Hang Seng Index)',
    shortName: '香港恆生',
    country: '香港',
    flag: '🇭🇰',
    region: 'ASIA',
    market: 'HK',
    currency: 'HKD',
    price: 17650.0,
    change: 180.0,
    changePercent: 1.03,
    open: 17520.0,
    high: 17730.0,
    low: 17480.0,
    prevClose: 17470.0,
    volume: '22.5 億股',
    turnover: 'HK$ 1,020 億',
    peRatio: 9.8,
    sparkline: [17470, 17510, 17550, 17610, 17650, 17630, 17680, 17710, 17730, 17700, 17680, 17665, 17655, 17652, 17651, 17650],
    returns: { d5: 1.95, m1: 4.80, m3: 8.20, ytd: 3.50, y1: 6.8 },
    tradingHours: '09:30 - 16:00 (HKT)',
    exchangeName: '香港交易所 (HKEX)',
    status: 'CLOSED',
  },
  {
    symbol: '^HSTECH',
    name: '恆生科技指數 (Hang Seng TECH)',
    shortName: '恆生科技',
    country: '香港',
    flag: '🇭🇰',
    region: 'ASIA',
    market: 'HK',
    currency: 'HKD',
    price: 3520.0,
    change: 55.0,
    changePercent: 1.59,
    open: 3480.0,
    high: 3545.0,
    low: 3470.0,
    prevClose: 3465.0,
    volume: '14.8 億股',
    turnover: 'HK$ 680 億',
    peRatio: 21.0,
    sparkline: [3465, 3478, 3492, 3508, 3520, 3515, 3528, 3538, 3545, 3540, 3532, 3526, 3523, 3521, 3520.5, 3520.0],
    returns: { d5: 3.20, m1: 6.90, m3: 12.40, ytd: -2.10, y1: 5.4 },
    tradingHours: '09:30 - 16:00 (HKT)',
    exchangeName: '香港交易所 (HKEX)',
    status: 'CLOSED',
  },

  // ================= 🇪🇺 歐洲市場 =================
  {
    symbol: '^GDAXI',
    name: '德國法蘭克福 DAX 指數 (DAX 40)',
    shortName: '德國 DAX',
    country: '德國',
    flag: '🇩🇪',
    region: 'EUROPE',
    market: 'US', // 標註國際
    currency: 'EUR',
    price: 18650.0,
    change: 95.0,
    changePercent: 0.51,
    open: 18580.0,
    high: 18710.0,
    low: 18560.0,
    prevClose: 18555.0,
    volume: '8,200 萬股',
    turnover: '€ 45 億',
    peRatio: 14.5,
    sparkline: [18555, 18575, 18600, 18625, 18640, 18635, 18660, 18685, 18710, 18695, 18680, 18670, 18660, 18655, 18652, 18650],
    returns: { d5: 0.90, m1: 2.15, m3: 5.30, ytd: 11.20, y1: 17.8 },
    tradingHours: '09:00 - 17:30 (CET)',
    exchangeName: '德意志交易所 (Deutsche Börse)',
    status: 'CLOSED',
  },
  {
    symbol: '^FTSE',
    name: '英國富時 100 指數 (FTSE 100)',
    shortName: '英國富時',
    country: '英國',
    flag: '🇬🇧',
    region: 'EUROPE',
    market: 'US',
    currency: 'GBP',
    price: 8375.0,
    change: 32.5,
    changePercent: 0.39,
    open: 8350.0,
    high: 8395.0,
    low: 8342.0,
    prevClose: 8342.5,
    volume: '6,400 萬股',
    turnover: '£ 38 億',
    peRatio: 13.2,
    sparkline: [8342.5, 8350, 8358, 8366, 8372, 8369, 8378, 8386, 8395, 8390, 8385, 8380, 8378, 8376, 8375.5, 8375.0],
    returns: { d5: 0.65, m1: 1.80, m3: 4.10, ytd: 8.90, y1: 12.4 },
    tradingHours: '08:00 - 16:30 (GMT)',
    exchangeName: '倫敦證券交易所 (LSE)',
    status: 'CLOSED',
  },
  {
    symbol: '^FCHI',
    name: '法國 CAC 40 指數 (CAC 40)',
    shortName: '法國 CAC',
    country: '法國',
    flag: '🇫🇷',
    region: 'EUROPE',
    market: 'US',
    currency: 'EUR',
    price: 7620.0,
    change: 28.0,
    changePercent: 0.37,
    open: 7600.0,
    high: 7648.0,
    low: 7592.0,
    prevClose: 7592.0,
    volume: '5,800 萬股',
    turnover: '€ 32 億',
    peRatio: 15.1,
    sparkline: [7592, 7601, 7610, 7619, 7625, 7622, 7632, 7640, 7648, 7642, 7636, 7630, 7626, 7623, 7621, 7620],
    returns: { d5: 0.55, m1: 1.50, m3: 3.80, ytd: 6.40, y1: 10.9 },
    tradingHours: '09:00 - 17:30 (CET)',
    exchangeName: '泛歐交易所巴黎分所 (Euronext Paris)',
    status: 'CLOSED',
  },
];

/**
 * 依據國際交易所真實時區與當前時間計算市場狀態：
 * - OPEN: 正常盤中交易
 * - AFTER_HOURS: 盤後交易 / 盤後定價交易
 * - CLOSED: 已收盤 / 週末休市
 */
export function getMarketSessionStatus(
  symbol: string,
  region: 'ASIA' | 'AMERICAS' | 'EUROPE',
  now: Date = new Date()
): MarketSessionStatus {
  const utcDay = now.getUTCDay(); // 0 = Sun, 6 = Sat
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  // 1. 🇹🇼 台灣市場 (TWSE / TPEx): UTC+8
  if (symbol === '^TWII' || symbol === '^TWOII') {
    const twMinutesTotal = utcMinutes + 8 * 60;
    const twDay = (twMinutesTotal >= 1440 ? (utcDay + 1) % 7 : (twMinutesTotal < 0 ? (utcDay + 6) % 7 : utcDay));
    const twMinutes = ((twMinutesTotal % 1440) + 1440) % 1440;

    if (twDay === 0 || twDay === 6) return 'CLOSED';

    // 09:00 - 13:30 (540 - 810): 正常盤中交易
    if (twMinutes >= 540 && twMinutes <= 810) return 'OPEN';

    // 13:30 - 14:30 (810 - 870): 盤後定價交易
    if (twMinutes > 810 && twMinutes <= 870) return 'AFTER_HOURS';

    return 'CLOSED';
  }

  // 2. 🇺🇸 美國市場 (SPY, QQQ, DIA, SOXX): 美東 EDT (UTC-4)
  if (region === 'AMERICAS' || symbol === 'SPY' || symbol === 'QQQ' || symbol === 'DIA' || symbol === 'SOXX') {
    const edtMinutesTotal = utcMinutes - 4 * 60;
    const edtDay = (edtMinutesTotal < 0 ? (utcDay + 6) % 7 : (edtMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay));
    const edtMinutes = ((edtMinutesTotal % 1440) + 1440) % 1440;

    if (edtDay === 0 || edtDay === 6) return 'CLOSED';

    // 09:30 - 16:00 (570 - 960): 常規盤中交易 (Regular)
    if (edtMinutes >= 570 && edtMinutes <= 960) return 'OPEN';

    // 16:00 - 20:00 (960 - 1200): 盤後交易 (After-Hours)
    // 04:00 - 09:30 (240 - 570): 盤前交易 (Pre-Market)
    if ((edtMinutes > 960 && edtMinutes <= 1200) || (edtMinutes >= 240 && edtMinutes < 570)) {
      return 'AFTER_HOURS';
    }

    return 'CLOSED';
  }

  // 3. 🇯🇵 日本東京證券交易所 (^N225, ^TOPX): UTC+9
  if (symbol === '^N225' || symbol === '^TOPX') {
    const jstMinutesTotal = utcMinutes + 9 * 60;
    const jstDay = (jstMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay);
    const jstMinutes = ((jstMinutesTotal % 1440) + 1440) % 1440;

    if (jstDay === 0 || jstDay === 6) return 'CLOSED';

    // 09:00 - 11:30 (540 - 690) 與 12:30 - 15:30 (750 - 930)
    if ((jstMinutes >= 540 && jstMinutes <= 690) || (jstMinutes >= 750 && jstMinutes <= 930)) {
      return 'OPEN';
    }

    return 'CLOSED';
  }

  // 4. 🇰🇷 韓國證券交易所 (^KS11): UTC+9
  if (symbol === '^KS11') {
    const kstMinutesTotal = utcMinutes + 9 * 60;
    const kstDay = (kstMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay);
    const kstMinutes = ((kstMinutesTotal % 1440) + 1440) % 1440;

    if (kstDay === 0 || kstDay === 6) return 'CLOSED';

    // 09:00 - 15:30 (540 - 930)
    if (kstMinutes >= 540 && kstMinutes <= 930) return 'OPEN';

    // 盤後交易: 15:40 - 18:00 (940 - 1080)
    if (kstMinutes > 940 && kstMinutes <= 1080) return 'AFTER_HOURS';

    return 'CLOSED';
  }

  // 5. 🇨🇳 中國 A 股 (000001.SS, 399001.SZ): UTC+8
  if (symbol === '000001.SS' || symbol === '399001.SZ') {
    const cstMinutesTotal = utcMinutes + 8 * 60;
    const cstDay = (cstMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay);
    const cstMinutes = ((cstMinutesTotal % 1440) + 1440) % 1440;

    if (cstDay === 0 || cstDay === 6) return 'CLOSED';

    // 09:30 - 11:30 (570 - 690) 與 13:00 - 15:00 (780 - 900)
    if ((cstMinutes >= 570 && cstMinutes <= 690) || (cstMinutes >= 780 && cstMinutes <= 900)) {
      return 'OPEN';
    }

    return 'CLOSED';
  }

  // 6. 🇭🇰 香港證券交易所 (^HSI): UTC+8
  if (symbol === '^HSI') {
    const hktMinutesTotal = utcMinutes + 8 * 60;
    const hktDay = (hktMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay);
    const hktMinutes = ((hktMinutesTotal % 1440) + 1440) % 1440;

    if (hktDay === 0 || hktDay === 6) return 'CLOSED';

    // 09:30 - 12:00 (570 - 720) 與 13:00 - 16:00 (780 - 960)
    if ((hktMinutes >= 570 && hktMinutes <= 720) || (hktMinutes >= 780 && hktMinutes <= 960)) {
      return 'OPEN';
    }

    // 恒指夜期/延時交易: 17:15 - 23:59 (1035 - 1439)
    if (hktMinutes >= 1035 && hktMinutes <= 1439) {
      return 'AFTER_HOURS';
    }

    return 'CLOSED';
  }

  // 7. 🇪🇺 歐洲市場 (^GDAXI, ^FTSE, ^FCHI): CEST (UTC+2) / BST (UTC+1)
  if (region === 'EUROPE') {
    const cestMinutesTotal = utcMinutes + 2 * 60;
    const cestDay = (cestMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay);
    const cestMinutes = ((cestMinutesTotal % 1440) + 1440) % 1440;

    if (cestDay === 0 || cestDay === 6) return 'CLOSED';

    // 09:00 - 17:30 (540 - 1050)
    if (cestMinutes >= 540 && cestMinutes <= 1050) return 'OPEN';

    // 德股 Xetra 晚盤延時: 17:30 - 22:00 (1050 - 1320)
    if (cestMinutes > 1050 && cestMinutes <= 1320) return 'AFTER_HOURS';

    return 'CLOSED';
  }

  return 'CLOSED';
}

/**
 * 依據國際交易所即時時區狀態初始化之全球大盤基準指數資料庫
 */
export const INITIAL_GLOBAL_INDICES: GlobalIndexItem[] = RAW_GLOBAL_INDICES.map((item) => ({
  ...item,
  status: getMarketSessionStatus(item.symbol, item.region),
}));

/**
 * 將最新即時報價併入全球指數資料集：
 * - 若未在交易中 (CLOSED)：
 *   保持收盤靜止狀態，不追加跳動點位至 Sparkline，維持真實無波動。
 * - 若處於盤後交易 (AFTER_HOURS)：
 *   顯示狀態為「盤後交易」，實時追蹤盤後成交點位並平滑更新波動。
 * - 若處於正常交易中 (OPEN)：
 *   顯示狀態為「交易中」，實時更新盤中跳價與 Sparkline 波動。
 */
export function mergeQuotesIntoIndices(
  indices: GlobalIndexItem[],
  quotes: Record<string, RealtimeQuote>,
  now: Date = new Date(),
  forceUpdate?: boolean
): GlobalIndexItem[] {
  return indices.map((idx) => {
    const quote = quotes[idx.symbol];
    const sessionStatus = getMarketSessionStatus(idx.symbol, idx.region, now);
    const effectiveStatus = forceUpdate ? 'OPEN' : sessionStatus;

    if (!quote || typeof quote.price !== 'number') {
      return {
        ...idx,
        status: effectiveStatus,
      };
    }

    const newPrice = quote.price;
    const newChange = quote.change ?? idx.change;
    const newPercent = quote.changePercent ?? idx.changePercent;
    const newHigh = quote.high24h ? Math.max(idx.high, quote.high24h) : Math.max(idx.high, newPrice);
    const newLow = quote.low24h ? Math.min(idx.low, quote.low24h) : Math.min(idx.low, newPrice);

    // 若市場已收盤且非強制更新：
    // 不更新 Sparkline，維持既有平穩收盤線，不注入假跳動
    if (effectiveStatus === 'CLOSED') {
      return {
        ...idx,
        status: 'CLOSED',
        price: newPrice,
        change: newChange,
        changePercent: newPercent,
        high: newHigh,
        low: newLow,
        sparkline: idx.sparkline,
        isAfterHours: false,
      };
    }

    // 交易中 (OPEN) 或 盤後交易 (AFTER_HOURS)：真實更新 Sparkline 走勢
    const newSparkline = [...idx.sparkline.slice(1), newPrice];

    return {
      ...idx,
      status: effectiveStatus,
      price: newPrice,
      change: newChange,
      changePercent: newPercent,
      high: newHigh,
      low: newLow,
      sparkline: newSparkline,
      isAfterHours: effectiveStatus === 'AFTER_HOURS',
      afterHoursPrice: effectiveStatus === 'AFTER_HOURS' ? newPrice : undefined,
    };
  });
}

/**
 * 計算全球市場大盤強弱總覽統計
 */
export function calcMarketBreadth(indices: GlobalIndexItem[]) {
  if (indices.length === 0) {
    return {
      leader: null,
      laggard: null,
      avgReturn: 0,
      upCount: 0,
      downCount: 0,
      flatCount: 0,
    };
  }

  let leader = indices[0];
  let laggard = indices[0];
  let sumReturn = 0;
  let upCount = 0;
  let downCount = 0;
  let flatCount = 0;

  for (const idx of indices) {
    sumReturn += idx.changePercent;
    if (idx.changePercent > leader.changePercent) leader = idx;
    if (idx.changePercent < laggard.changePercent) laggard = idx;

    if (idx.changePercent > 0.05) upCount++;
    else if (idx.changePercent < -0.05) downCount++;
    else flatCount++;
  }

  return {
    leader,
    laggard,
    avgReturn: Number((sumReturn / indices.length).toFixed(2)),
    upCount,
    downCount,
    flatCount,
  };
}
