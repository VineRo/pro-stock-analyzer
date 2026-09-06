import {
  PaperAccount,
  PaperOrder,
  PaperOrderCondition,
  PaperPriceType,
  PaperTradeRecord,
  PaperTradeType,
  SettlementEntry,
  TimeAndSalesTick,
  IntradayMinutePoint,
} from '../types/stock';

const PAPER_STORAGE_KEY = 'prostock_paper_account_v1';
const DEFAULT_CAPITAL = 1000000; // 模擬本金 100 萬 (更契合台股整張交易金額)

let memoryStore: Record<string, string> = {};

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val) return val;
    }
  } catch {}
  return memoryStore[key] || null;
}

function safeSet(key: string, val: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, val);
    }
  } catch {}
  memoryStore[key] = val;
}

// 台灣證券交易所標準跳動單位 (Tick Size)
export function getTickSize(price: number): number {
  if (price < 10) return 0.01;
  if (price < 50) return 0.05;
  if (price < 100) return 0.10;
  if (price < 500) return 0.50;
  if (price < 1000) return 1.00;
  return 5.00;
}

// 依跳動單位進行價格步進
export function stepPrice(currentPrice: number, direction: 'UP' | 'DOWN'): number {
  const p = Math.max(0.01, Number(currentPrice.toFixed(2)));
  if (direction === 'UP') {
    const tick = getTickSize(p);
    const next = p + tick;
    return Number(next.toFixed(2));
  } else {
    let tick = getTickSize(p);
    // 跨檔位邊界向下處理 (如 10.00 向下一檔為 9.99)
    if (p === 10) tick = 0.01;
    else if (p === 50) tick = 0.05;
    else if (p === 100) tick = 0.10;
    else if (p === 500) tick = 0.50;
    else if (p === 1000) tick = 1.00;

    const next = Math.max(0.01, p - tick);
    return Number(next.toFixed(2));
  }
}

// 四捨五入至符合規定的跳動檔位
export function roundToTick(price: number): number {
  if (price <= 0) return 0.01;
  const tick = getTickSize(price);
  const rounded = Math.round(price / tick) * tick;
  return Number(rounded.toFixed(2));
}

// 券商手續費：標準 0.1425%，最低 20 元
export function calculateFee(amount: number): number {
  if (amount <= 0) return 0;
  const rawFee = amount * 0.001425;
  return Math.max(20, Math.round(rawFee));
}

// 證券交易稅：賣出時收取 0.3%，買進為 0
export function calculateTax(amount: number, side: 'BUY' | 'SELL'): number {
  if (side === 'BUY' || amount <= 0) return 0;
  return Math.round(amount * 0.003);
}

// 試算預估金額
export function calculateEstimate(price: number, shares: number, side: 'BUY' | 'SELL') {
  const amount = Number((price * shares).toFixed(2));
  const fee = calculateFee(amount);
  const tax = calculateTax(amount, side);
  const total = side === 'BUY' ? amount + fee : Math.max(0, amount - fee - tax);
  return { amount, fee, tax, total };
}

// ==========================================
// 台灣證交所 T+2 資金交割與營業日推算系統
// ==========================================

export function calculateSettlementDates(tradeTime: Date = new Date()): {
  tradeDate: Date;
  tradeDateString: string;
  t1Date: Date;
  t1DateString: string;
  t2Date: Date;
  t2DateString: string;
} {
  const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

  const formatDateOnly = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const week = dayNames[d.getDay()];
    return `${y}/${m}/${day} (${week})`;
  };

  const addBusinessDays = (start: Date, count: number): Date => {
    const current = new Date(start.getTime());
    let added = 0;
    while (added < count) {
      current.setDate(current.getDate() + 1);
      const dow = current.getDay();
      if (dow !== 0 && dow !== 6) {
        added++;
      }
    }
    return current;
  };

  const tradeDate = new Date(tradeTime);
  const tradeDateString = formatDateOnly(tradeDate);

  const t1 = addBusinessDays(tradeDate, 1);
  const t1DateString = formatDateOnly(t1);

  const t2 = addBusinessDays(tradeDate, 2);
  t2.setHours(10, 0, 0, 0); // 台灣證交所規定：T+2 上午 10:00 前完成交割劃撥
  const t2DateString = `${formatDateOnly(t2)} 10:00`;

  return {
    tradeDate,
    tradeDateString,
    t1Date: t1,
    t1DateString,
    t2Date: t2,
    t2DateString,
  };
}

export interface SettlementAccountSummary {
  cashBalance: number;              // 銀行帳戶在手現金餘額
  availableForTrading: number;      // 目前可用於交易額度 (購買力)
  t1PendingNet: number;             // T+1 預計交割淨額
  t2PendingNet: number;             // T+2 預計交割淨額
  totalPendingPayables: number;     // 累計待扣交割款 (買進負數取絕對值)
  totalPendingReceivables: number;  // 累計待入帳交割款 (賣出正數)
  workingBuyReserved: number;       // 委託中排隊買單保留款
  settlementEntries: SettlementEntry[];
  isSafe: boolean;                  // 是否安全 (未違約交割)
}

export function getSettlementAccountSummary(account: PaperAccount): SettlementAccountSummary {
  const ledger = Array.isArray(account.settlementLedger) ? account.settlementLedger : [];
  const pendingEntries = ledger.filter((e) => e.status === 'PENDING');

  let totalPendingPayables = 0;
  let totalPendingReceivables = 0;
  let t1PendingNet = 0;
  let t2PendingNet = 0;

  const now = new Date();
  const dates = calculateSettlementDates(now);

  pendingEntries.forEach((entry) => {
    if (entry.netAmount < 0) {
      totalPendingPayables += Math.abs(entry.netAmount);
    } else {
      totalPendingReceivables += entry.netAmount;
    }

    const entryDateStr = entry.settlementDateString.slice(0, 10);
    const t1DateStr = dates.t1DateString.slice(0, 10);
    const t2DateStr = dates.t2DateString.slice(0, 10);

    if (entryDateStr === t1DateStr) {
      t1PendingNet += entry.netAmount;
    } else if (entryDateStr === t2DateStr) {
      t2PendingNet += entry.netAmount;
    }
  });

  // 委託中排隊買單保留款 (已送出尚未成交的 PENDING 買單)
  const workingBuyReserved = (account.orders || [])
    .filter((o) => o.status === 'PENDING' && o.side === 'BUY')
    .reduce((sum, o) => {
      const est = calculateEstimate(o.orderPrice, o.shares, 'BUY');
      return sum + est.total;
    }, 0);

  // 台灣券商購買力控管：可用於交易額度 = 銀行在手現金 + 待入帳交割款 - 待扣交割款 - 委託中買單保留款
  const availableForTrading = Math.max(
    0,
    account.balance + totalPendingReceivables - totalPendingPayables - workingBuyReserved
  );

  return {
    cashBalance: account.balance,
    availableForTrading,
    t1PendingNet,
    t2PendingNet,
    totalPendingPayables,
    totalPendingReceivables,
    workingBuyReserved,
    settlementEntries: ledger,
    isSafe: availableForTrading >= 0,
  };
}

// ==========================================
// 最佳五檔深度、委買委賣總量與多空比計算
// ==========================================

export interface DepthQuoteItem {
  price: number;
  vol: number;
  cumVol: number;
  percent: number;
}

export interface OrderBookDepthInfo {
  matchedPrice: number;
  matchedVolumeLots: number;
  asks: DepthQuoteItem[];
  bids: DepthQuoteItem[];
  totalBidVol: number;
  totalAskVol: number;
  totalDepthVol: number;
  longRatio: number;   // 0 ~ 100
  shortRatio: number;  // 0 ~ 100
  powerRatio: number;  // 委買 / 委賣
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentLabel: string;
}

export function calculateDepthAndRatio(
  symbol: string,
  currentPrice: number
): OrderBookDepthInfo {
  const baseP = currentPrice > 0 ? currentPrice : 100;
  const seed = (symbol || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const asks: DepthQuoteItem[] = [];
  const bids: DepthQuoteItem[] = [];

  // 賣五檔 (高於現價)
  let pAsk = baseP;
  let cumAskVol = 0;
  for (let i = 0; i < 5; i++) {
    pAsk = stepPrice(pAsk, 'UP');
    const vol = Math.floor(35 + ((i * 17 + Math.floor(baseP) + seed) % 95));
    cumAskVol += vol;
    asks.unshift({ price: pAsk, vol, cumVol: cumAskVol, percent: 0 });
  }

  // 買五檔 (低於或等於現價)
  let pBid = baseP;
  let cumBidVol = 0;
  for (let i = 0; i < 5; i++) {
    if (i > 0) pBid = stepPrice(pBid, 'DOWN');
    const vol = Math.floor(45 + ((i * 23 + Math.floor(baseP * 2) + seed) % 115));
    cumBidVol += vol;
    bids.push({ price: pBid, vol, cumVol: cumBidVol, percent: 0 });
  }

  const totalBidVol = bids.reduce((sum, b) => sum + b.vol, 0);
  const totalAskVol = asks.reduce((sum, a) => sum + a.vol, 0);
  const totalDepthVol = totalBidVol + totalAskVol;

  const maxVol = Math.max(
    ...asks.map((a) => a.vol),
    ...bids.map((b) => b.vol),
    1
  );
  asks.forEach((a) => (a.percent = Math.round((a.vol / maxVol) * 100)));
  bids.forEach((b) => (b.percent = Math.round((b.vol / maxVol) * 100)));

  const longRatio = totalDepthVol > 0 ? Math.round((totalBidVol / totalDepthVol) * 100) : 50;
  const shortRatio = 100 - longRatio;
  const powerRatio = Number((totalBidVol / Math.max(1, totalAskVol)).toFixed(2));

  let sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let sentimentLabel = '多空勢均力敵 (盤整)';
  if (powerRatio >= 1.2) {
    sentiment = 'BULLISH';
    sentimentLabel = `多方買盤積極 (多空比 ${powerRatio})`;
  } else if (powerRatio <= 0.8) {
    sentiment = 'BEARISH';
    sentimentLabel = `空方賣壓沉重 (多空比 ${powerRatio})`;
  }

  return {
    matchedPrice: currentPrice,
    matchedVolumeLots: Math.floor(15 + (Math.floor(currentPrice * 3) % 80)),
    asks,
    bids,
    totalBidVol,
    totalAskVol,
    totalDepthVol,
    longRatio,
    shortRatio,
    powerRatio,
    sentiment,
    sentimentLabel,
  };
}

// ==========================================
// 分時交易資料 (逐筆明細 Time & Sales 與 分時走勢)
// ==========================================

export function generateTimeAndSales(
  symbol: string,
  currentPrice: number,
  prevClose: number
): {
  ticks: TimeAndSalesTick[];
  totalInLots: number;
  totalOutLots: number;
  outRatio: number;
} {
  const ticks: TimeAndSalesTick[] = [];
  const baseP = currentPrice > 0 ? currentPrice : 100;
  const seed = (symbol || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const now = Date.now();

  let totalInLots = 0;
  let totalOutLots = 0;

  for (let i = 0; i < 20; i++) {
    const t = new Date(now - i * 4500);
    const timeStr = t.toTimeString().slice(0, 8);
    const tickDir = (i % 3 === 0) ? -1 : (i % 2 === 0) ? 1 : 0;
    const price = roundToTick(baseP + tickDir * getTickSize(baseP) * (i % 2));
    const lots = Math.floor(5 + ((i * 13 + Math.floor(baseP) + seed) % 55));
    const shares = lots * 1000;
    const change = Number((price - prevClose).toFixed(2));
    const changePercent = prevClose > 0 ? Number(((change / prevClose) * 100).toFixed(2)) : 0;

    const type: 'BUY_OUT' | 'SELL_IN' | 'NEUTRAL' =
      price > baseP ? 'BUY_OUT' : price < baseP ? 'SELL_IN' : (i % 2 === 0 ? 'BUY_OUT' : 'SELL_IN');

    if (type === 'BUY_OUT') totalOutLots += lots;
    else totalInLots += lots;

    ticks.push({
      id: `tick_${now}_${i}`,
      time: timeStr,
      timestamp: t.getTime(),
      price,
      change,
      changePercent,
      shares,
      volumeLots: lots,
      type,
      isBlockTrade: lots >= 30,
    });
  }

  const totalVol = totalInLots + totalOutLots;
  const outRatio = totalVol > 0 ? Math.round((totalOutLots / totalVol) * 100) : 50;

  return {
    ticks,
    totalInLots,
    totalOutLots,
    outRatio,
  };
}

export function generateIntradayMinuteData(
  symbol: string,
  currentPrice: number,
  prevClose: number
): IntradayMinutePoint[] {
  const points: IntradayMinutePoint[] = [];
  const baseP = currentPrice > 0 ? currentPrice : 100;
  const refClose = prevClose > 0 ? prevClose : baseP;
  const seed = (symbol || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

  const count = 40;
  let runningSum = 0;
  let runningVol = 0;

  for (let i = 0; i < count; i++) {
    const totalMinutes = 9 * 60 + i * 5;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    const progress = i / (count - 1);
    const noise = Math.sin(i * 0.45 + (seed % 10)) * (getTickSize(baseP) * 3);
    const price = roundToTick(refClose + (baseP - refClose) * progress + noise);
    const vol = Math.floor(25 + Math.abs(Math.sin(i * 0.7)) * 120);

    runningSum += price * vol;
    runningVol += vol;
    const avgPrice = runningVol > 0 ? Number((runningSum / runningVol).toFixed(2)) : price;

    points.push({
      time,
      price,
      avgPrice,
      volume: vol,
    });
  }

  return points;
}

// 市場交易時段與證交法規範資訊
export interface MarketSessionInfo {
  status: 'OPEN' | 'CALL_AUCTION' | 'AFTER_HOURS' | 'CLOSED';
  market: 'TWSE' | 'US' | 'CRYPTO';
  sessionName: string;
  canTradeMarketOrder: boolean;
  canMatchNow: boolean;
  description: string;
}

/**
 * 依據台灣與美國證交法規，判定目前所屬市場交易時段與委託限制
 */
export function getMarketSessionInfo(
  symbol: string,
  currency = 'TWD',
  now: Date = new Date()
): MarketSessionInfo {
  // 1. 加密貨幣：24/7 全時撮合
  const isCrypto =
    symbol.endsWith('USDT') ||
    symbol.startsWith('BTC') ||
    symbol.startsWith('ETH') ||
    symbol.startsWith('SOL') ||
    symbol.startsWith('BNB');

  if (isCrypto) {
    return {
      status: 'OPEN',
      market: 'CRYPTO',
      sessionName: '24/7 全天候撮合',
      canTradeMarketOrder: true,
      canMatchNow: true,
      description: '區塊鏈全天候即時逐筆撮合中',
    };
  }

  // 2. 判斷是否為台股 (純數字代碼如 2330，或包含 .TW / .TWO)
  const isTaiwan =
    /^\d{4,6}(\.TW|\.TWO)?$/i.test(symbol) ||
    symbol.endsWith('.TW') ||
    symbol.endsWith('.TWO') ||
    currency === 'TWD';

  const utcDay = now.getUTCDay(); // 0 = Sun, 6 = Sat
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();

  if (isTaiwan) {
    // 台灣時區 UTC+8
    const twMinutesTotal = utcMinutes + 8 * 60;
    const twDay = twMinutesTotal >= 1440 ? (utcDay + 1) % 7 : twMinutesTotal < 0 ? (utcDay + 6) % 7 : utcDay;
    const twMinutes = ((twMinutesTotal % 1440) + 1440) % 1440;

    if (twDay === 0 || twDay === 6) {
      return {
        status: 'CLOSED',
        market: 'TWSE',
        sessionName: '台股 週末休市',
        canTradeMarketOrder: false,
        canMatchNow: false,
        description: '依證交所規定休市期間不接受市價單，限價單保留為週一開盤預約單',
      };
    }

    // 08:30 - 09:00: 開盤集合競價收單
    if (twMinutes >= 510 && twMinutes < 540) {
      return {
        status: 'CALL_AUCTION',
        market: 'TWSE',
        sessionName: '台股 開盤集合競價 (收單中)',
        canTradeMarketOrder: false,
        canMatchNow: false,
        description: '08:30-09:00 只收單不撮合，09:00 開盤統一撮合產生第一筆成交價',
      };
    }

    // 09:00 - 13:25: 盤中連續逐筆撮合
    if (twMinutes >= 540 && twMinutes < 805) {
      return {
        status: 'OPEN',
        market: 'TWSE',
        sessionName: '台股 盤中逐筆撮合中',
        canTradeMarketOrder: true,
        canMatchNow: true,
        description: '連續交易時段 (09:00-13:25)，依價格優先、時間優先隨到隨撮',
      };
    }

    // 13:25 - 13:30: 收盤前集合競價
    if (twMinutes >= 805 && twMinutes <= 810) {
      return {
        status: 'CALL_AUCTION',
        market: 'TWSE',
        sessionName: '台股 收盤前集合競價 (收單中)',
        canTradeMarketOrder: false,
        canMatchNow: false,
        description: '暫停逐筆撮合，13:30 統一撮合收盤價',
      };
    }

    // 13:30 - 14:30: 盤後定價交易
    if (twMinutes > 810 && twMinutes <= 870) {
      return {
        status: 'AFTER_HOURS',
        market: 'TWSE',
        sessionName: '台股 盤後定價交易時段',
        canTradeMarketOrder: false,
        canMatchNow: false,
        description: '14:30 依今日收盤價集合競價撮合',
      };
    }

    // 其他時間：夜間/晨間休市
    return {
      status: 'CLOSED',
      market: 'TWSE',
      sessionName: '台股 非交易時段 (休市)',
      canTradeMarketOrder: false,
      canMatchNow: false,
      description: '非逐筆撮合時段，依證交法不接受市價單，限價單保留為開盤預約單',
    };
  }

  // 3. 美國股市 (NYSE / NASDAQ): EDT (UTC-4)
  const edtMinutesTotal = utcMinutes - 4 * 60;
  const edtDay = edtMinutesTotal < 0 ? (utcDay + 6) % 7 : edtMinutesTotal >= 1440 ? (utcDay + 1) % 7 : utcDay;
  const edtMinutes = ((edtMinutesTotal % 1440) + 1440) % 1440;

  if (edtDay === 0 || edtDay === 6) {
    return {
      status: 'CLOSED',
      market: 'US',
      sessionName: '美股 週末休市',
      canTradeMarketOrder: false,
      canMatchNow: false,
      description: '週末非交易時段，委託單保留為開盤預約單',
    };
  }

  // 09:30 - 16:00 EDT: 常規連續盤中交易 (570 - 960)
  if (edtMinutes >= 570 && edtMinutes <= 960) {
    return {
      status: 'OPEN',
      market: 'US',
      sessionName: '美股 常規盤中交易中',
      canTradeMarketOrder: true,
      canMatchNow: true,
      description: '美股常規交易時段 (09:30-16:00 EDT)',
    };
  }

  // 04:00 - 09:30 EDT: 盤前交易 (Pre-Market)
  if (edtMinutes >= 240 && edtMinutes < 570) {
    return {
      status: 'AFTER_HOURS',
      market: 'US',
      sessionName: '美股 盤前交易 (Pre-Market)',
      canTradeMarketOrder: false,
      canMatchNow: false,
      description: '盤前交易時段，限價單排隊等待撮合',
    };
  }

  // 16:00 - 20:00 EDT: 盤後交易 (After-Hours)
  if (edtMinutes > 960 && edtMinutes <= 1200) {
    return {
      status: 'AFTER_HOURS',
      market: 'US',
      sessionName: '美股 盤後交易 (After-Hours)',
      canTradeMarketOrder: false,
      canMatchNow: false,
      description: '盤後交易時段，依盤後報價撮合',
    };
  }

  return {
    status: 'CLOSED',
    market: 'US',
    sessionName: '美股 夜間非交易時段',
    canTradeMarketOrder: false,
    canMatchNow: false,
    description: '非交易時段，委託單保留為開盤預約單',
  };
}

export const PaperTradingService = {
  getAccount(): PaperAccount {
    try {
      const saved = safeGet(PAPER_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed.orders)) {
          parsed.orders = [];
        }
        if (!Array.isArray(parsed.positions)) {
          parsed.positions = [];
        }
        if (!Array.isArray(parsed.history)) {
          parsed.history = [];
        }
        if (!Array.isArray(parsed.settlementLedger)) {
          parsed.settlementLedger = [];
        }
        return parsed;
      }
    } catch {
      // ignore
    }

    const initial: PaperAccount = {
      balance: DEFAULT_CAPITAL,
      initialCapital: DEFAULT_CAPITAL,
      positions: [],
      history: [],
      orders: [],
      settlementLedger: [],
    };
    this.saveAccount(initial);
    return initial;
  },

  saveAccount(account: PaperAccount): void {
    try {
      safeSet(PAPER_STORAGE_KEY, JSON.stringify(account));
    } catch {
      // ignore
    }
  },

  resetAccount(capital = DEFAULT_CAPITAL): PaperAccount {
    const account: PaperAccount = {
      balance: capital,
      initialCapital: capital,
      positions: [],
      history: [],
      orders: [],
      settlementLedger: [],
    };
    this.saveAccount(account);
    return account;
  },

  // 遵循台灣《證交法》與美國 SEC/Reg NMS 規範之真實盤面撮合下單
  placeOrder(params: {
    symbol: string;
    name: string;
    side: 'BUY' | 'SELL';
    tradeType?: PaperTradeType;
    priceType?: PaperPriceType;
    orderPrice: number;
    shares: number;
    condition?: PaperOrderCondition;
    currentMarketPrice: number;
    currency?: string;
    referenceClosePrice?: number; // 昨收平盤價 (用於台股 10% 漲跌停檢核)
    simulatedNow?: Date;          // 允許自訂模擬時間 (測試用)
    bypassMarketHoursCheck?: boolean; // 演練測試模式 (允許強制模擬盤中撮合)
  }): { success: boolean; message: string; order?: PaperOrder } {
    const {
      symbol,
      name,
      side,
      tradeType = 'COMMON',
      priceType = 'LIMIT',
      orderPrice,
      shares,
      condition = 'ROD',
      currentMarketPrice,
      currency = 'TWD',
      referenceClosePrice,
      simulatedNow,
      bypassMarketHoursCheck = false,
    } = params;

    if (shares <= 0) {
      return { success: false, message: '委託股數必須大於 0' };
    }
    if (priceType === 'LIMIT' && orderPrice <= 0) {
      return { success: false, message: '委託價格必須大於 0' };
    }

    const session = getMarketSessionInfo(symbol, currency, simulatedNow || new Date());
    const isMarketOpen = bypassMarketHoursCheck || session.status === 'OPEN';

    // 1. 【台灣證券交易法規檢核】台股 ±10% 漲跌停邊界管制 (證交法第 60 條)
    if (session.market === 'TWSE' && priceType === 'LIMIT') {
      const refPrice = referenceClosePrice && referenceClosePrice > 0 ? referenceClosePrice : currentMarketPrice;
      const limitUp = roundToTick(refPrice * 1.10);
      const limitDown = roundToTick(refPrice * 0.90);

      if (orderPrice > limitUp) {
        return {
          success: false,
          message: `【證交法規則退單】委託價格 $${orderPrice.toFixed(2)} 超出今日法定漲停價 ($${limitUp.toFixed(2)}) 限制！交易所拒絕受理。`,
        };
      }
      if (orderPrice < limitDown) {
        return {
          success: false,
          message: `【證交法規則退單】委託價格 $${orderPrice.toFixed(2)} 低於今日法定跌停價 ($${limitDown.toFixed(2)}) 限制！交易所拒絕受理。`,
        };
      }
    }

    // 2. 【台灣與美國證交法規檢核】非連續逐筆撮合時段禁止送出市價單
    if (priceType === 'MARKET' && !isMarketOpen) {
      return {
        success: false,
        message: `【證交法規則退單】目前處於「${session.sessionName}」，依證交所營業細則不接受市價單委託！請改用限價單進行預約掛單。`,
      };
    }

    const account = this.getAccount();
    const effectivePrice = priceType === 'MARKET' ? currentMarketPrice : orderPrice;
    const est = calculateEstimate(effectivePrice, shares, side);

    // 3. 台灣證交法 T+2 額度與部位充足性檢查
    const summary = getSettlementAccountSummary(account);
    if (side === 'BUY') {
      if (summary.availableForTrading < est.total) {
        return {
          success: false,
          message: `【T+2交易資金不足】可用資金不足！預估需備款 $${est.total.toLocaleString()}，當前可用於交易額度僅剩 $${summary.availableForTrading.toLocaleString()}`,
        };
      }
    } else {
      const pos = account.positions.find((p) => p.symbol === symbol);
      const heldShares = pos ? pos.shares : 0;
      if (heldShares < shares) {
        return {
          success: false,
          message: `持股不足！當前持有 ${heldShares.toLocaleString()} 股，無法委託賣出 ${shares.toLocaleString()} 股`,
        };
      }
    }

    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const unitLabel = shares >= 1000 && shares % 1000 === 0 ? `${shares / 1000} 張` : `${shares} 股`;

    // 4. 【真實盤面撮合機制】判定是否立即成交
    // 只有在市場開盤 (OPEN) 且符合價格條件時才能立即成交！
    // 休市期間：一律為預約單 (PENDING)，絕不直接買入成交！
    if (!isMarketOpen) {
      const preOrder: PaperOrder = {
        id: orderId,
        timestamp: Date.now(),
        symbol,
        name,
        side,
        tradeType,
        priceType,
        orderPrice,
        shares,
        status: 'PENDING',
        condition,
        fee: est.fee,
        tax: est.tax,
        isPreOrder: true,
        note: `${session.sessionName}預約掛單`,
      };
      account.orders.unshift(preOrder);
      this.saveAccount(account);

      return {
        success: true,
        message: `【預約掛單成功】${session.sessionName}，限價${side === 'BUY' ? '買進' : '賣出'} ${name} (${symbol}) ${unitLabel} @ $${orderPrice.toFixed(2)} 已排入委託佇列，將於開盤後依盤面價格撮合。`,
        order: preOrder,
      };
    }

    // 5. 【盤中逐筆撮合】開盤時段限價撮合邏輯 (Price-Time Priority)
    // 買進限價單：若委託價 < 現價，屬於「低接掛單」，必須排隊等待盤面下殺，不可直接成交！
    // 賣出限價單：若委託價 > 現價，屬於「高掛單」，必須排隊等待盤面拉升，不可直接成交！
    const canFillImmediately =
      priceType === 'MARKET' ||
      (side === 'BUY' && orderPrice >= currentMarketPrice) ||
      (side === 'SELL' && orderPrice <= currentMarketPrice);

    if (!canFillImmediately) {
      // 進入委託簿排隊 (PENDING)
      const queueNote =
        side === 'BUY'
          ? `買盤低接排隊中 (限價 $${orderPrice} < 市價 $${currentMarketPrice})`
          : `賣盤高掛排隊中 (限價 $${orderPrice} > 市價 $${currentMarketPrice})`;

      const workingOrder: PaperOrder = {
        id: orderId,
        timestamp: Date.now(),
        symbol,
        name,
        side,
        tradeType,
        priceType,
        orderPrice,
        shares,
        status: 'PENDING',
        condition,
        fee: est.fee,
        tax: est.tax,
        note: queueNote,
      };
      account.orders.unshift(workingOrder);
      this.saveAccount(account);

      return {
        success: true,
        message: `【委託排隊中】限價${side === 'BUY' ? '買進' : '賣出'} ${name} (${symbol}) ${unitLabel} @ $${orderPrice.toFixed(2)} 已置入委託簿，等待盤面價格觸及委託價撮合。`,
        order: workingOrder,
      };
    }

    // 6. 達到盤面觸價條件，執行完全成交 (FILLED)
    const fillPrice = priceType === 'MARKET' ? currentMarketPrice : orderPrice;
    const fillEst = calculateEstimate(fillPrice, shares, side);

    if (side === 'BUY') {
      account.balance -= fillEst.total;

      const existingIndex = account.positions.findIndex((p) => p.symbol === symbol);
      if (existingIndex >= 0) {
        const existing = account.positions[existingIndex];
        const newShares = existing.shares + shares;
        const totalCost = existing.avgCostPrice * existing.shares + fillPrice * shares;
        const avgCostPrice = Number((totalCost / newShares).toFixed(2));

        account.positions[existingIndex] = {
          ...existing,
          shares: newShares,
          avgCostPrice,
          currentPrice: fillPrice,
          unrealizedProfit: Number(((fillPrice - avgCostPrice) * newShares).toFixed(2)),
          unrealizedProfitPercent: Number((((fillPrice - avgCostPrice) / avgCostPrice) * 100).toFixed(2)),
        };
      } else {
        account.positions.push({
          symbol,
          name,
          shares,
          avgCostPrice: fillPrice,
          currentPrice: fillPrice,
          unrealizedProfit: 0,
          unrealizedProfitPercent: 0,
          currency,
        });
      }
    } else {
      // 賣出扣庫存
      account.balance += fillEst.total;
      const posIndex = account.positions.findIndex((p) => p.symbol === symbol);
      if (posIndex >= 0) {
        const pos = account.positions[posIndex];
        if (pos.shares === shares) {
          account.positions.splice(posIndex, 1);
        } else {
          const remaining = pos.shares - shares;
          account.positions[posIndex] = {
            ...pos,
            shares: remaining,
            currentPrice: fillPrice,
            unrealizedProfit: Number(((fillPrice - pos.avgCostPrice) * remaining).toFixed(2)),
            unrealizedProfitPercent: Number((((fillPrice - pos.avgCostPrice) / pos.avgCostPrice) * 100).toFixed(2)),
          };
        }
      }
    }

    // 寫入成交紀錄
    const record: PaperTradeRecord = {
      id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      symbol,
      name,
      type: side,
      tradeType,
      shares,
      price: fillPrice,
      amount: fillEst.amount,
      fee: fillEst.fee,
      tax: fillEst.tax,
    };
    account.history.unshift(record);

    // 寫入委託回報單
    const filledOrder: PaperOrder = {
      id: orderId,
      timestamp: Date.now(),
      symbol,
      name,
      side,
      tradeType,
      priceType,
      orderPrice,
      shares,
      status: 'FILLED',
      condition,
      fee: fillEst.fee,
      tax: fillEst.tax,
      filledPrice: fillPrice,
      filledTimestamp: Date.now(),
      note: '盤面逐筆撮合成交',
    };
    account.orders.unshift(filledOrder);

    // 寫入台灣證交所 T+2 資金交割流水帳簿
    const dates = calculateSettlementDates(simulatedNow || new Date());
    const netAmount = side === 'BUY' ? -fillEst.total : fillEst.total;
    const settlementEntry: SettlementEntry = {
      id: `stl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orderId,
      tradeDate: dates.tradeDate.getTime(),
      tradeDateString: dates.tradeDateString,
      settlementDate: dates.t2Date.getTime(),
      settlementDateString: dates.t2DateString,
      symbol,
      name,
      side,
      shares,
      price: fillPrice,
      amount: fillEst.amount,
      fee: fillEst.fee,
      tax: fillEst.tax,
      netAmount,
      status: 'PENDING',
    };
    if (!Array.isArray(account.settlementLedger)) {
      account.settlementLedger = [];
    }
    account.settlementLedger.unshift(settlementEntry);

    this.saveAccount(account);
    return {
      success: true,
      message: `【委託完全成交】盤面逐筆撮合：${side === 'BUY' ? '買進' : '賣出'} ${name} (${symbol}) ${unitLabel} @ $${fillPrice.toFixed(2)}`,
      order: filledOrder,
    };
  },

  // 撤單 (取消指定委託單)
  cancelOrder(orderId: string): { success: boolean; message: string } {
    const account = this.getAccount();
    const order = account.orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: '找不到該筆委託單' };
    }
    if (order.status !== 'PENDING') {
      return { success: false, message: `該委託單狀態為「${order.status}」，無法撤單` };
    }

    order.status = 'CANCELLED';
    order.note = '使用者主動撤單';
    this.saveAccount(account);
    return { success: true, message: `已成功撤銷 ${order.name} (${order.symbol}) 之委託單` };
  },

  // 全部撤單
  cancelAllOrders(): { success: boolean; count: number } {
    const account = this.getAccount();
    let count = 0;
    account.orders.forEach((o) => {
      if (o.status === 'PENDING') {
        o.status = 'CANCELLED';
        o.note = '批次全數撤單';
        count++;
      }
    });

    if (count > 0) {
      this.saveAccount(account);
    }
    return { success: true, count };
  },

  // 即時盤面行情更新與排隊單自動撮合
  updatePrices(
    symbolPriceMap: Record<string, number>,
    forceMatching = false
  ): PaperAccount {
    const account = this.getAccount();
    let updated = false;

    // 1. 檢查並撮合 PENDING 委託單 (遵循盤面成交價與時段觸價規則)
    account.orders.forEach((order) => {
      if (order.status === 'PENDING') {
        const marketPrice = symbolPriceMap[order.symbol];
        if (marketPrice && marketPrice > 0) {
          const session = getMarketSessionInfo(order.symbol);
          const isMarketOpen = forceMatching || session.status === 'OPEN';

          // 若在開盤時段 (或手動演練模式) 且價格觸及委託限價
          if (isMarketOpen) {
            const shouldFill =
              order.priceType === 'MARKET' ||
              (order.side === 'BUY' && marketPrice <= order.orderPrice) ||
              (order.side === 'SELL' && marketPrice >= order.orderPrice);

            if (shouldFill) {
              const fillPrice = order.priceType === 'MARKET' ? marketPrice : order.orderPrice;
              const fillEst = calculateEstimate(fillPrice, order.shares, order.side);

              if (order.side === 'BUY') {
                if (account.balance >= fillEst.total) {
                  account.balance -= fillEst.total;
                  const posIndex = account.positions.findIndex((p) => p.symbol === order.symbol);
                  if (posIndex >= 0) {
                    const existing = account.positions[posIndex];
                    const newShares = existing.shares + order.shares;
                    const totalCost = existing.avgCostPrice * existing.shares + fillPrice * order.shares;
                    existing.shares = newShares;
                    existing.avgCostPrice = Number((totalCost / newShares).toFixed(2));
                    existing.currentPrice = marketPrice;
                    existing.unrealizedProfit = Number(((marketPrice - existing.avgCostPrice) * newShares).toFixed(2));
                    existing.unrealizedProfitPercent = Number((((marketPrice - existing.avgCostPrice) / existing.avgCostPrice) * 100).toFixed(2));
                  } else {
                    account.positions.push({
                      symbol: order.symbol,
                      name: order.name,
                      shares: order.shares,
                      avgCostPrice: fillPrice,
                      currentPrice: marketPrice,
                      unrealizedProfit: Number(((marketPrice - fillPrice) * order.shares).toFixed(2)),
                      unrealizedProfitPercent: Number((((marketPrice - fillPrice) / fillPrice) * 100).toFixed(2)),
                      currency: 'TWD',
                    });
                  }
                  order.status = 'FILLED';
                  order.filledPrice = fillPrice;
                  order.filledTimestamp = Date.now();
                  order.note = '盤面行情觸價撮合成交';
                  account.history.unshift({
                    id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    timestamp: Date.now(),
                    symbol: order.symbol,
                    name: order.name,
                    type: 'BUY',
                    tradeType: order.tradeType,
                    shares: order.shares,
                    price: fillPrice,
                    amount: fillEst.amount,
                    fee: fillEst.fee,
                    tax: fillEst.tax,
                  });

                  // 寫入台灣證交所 T+2 資金交割流水帳簿
                  const datesBuy = calculateSettlementDates(new Date());
                  const settlementEntryBuy: SettlementEntry = {
                    id: `stl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    orderId: order.id,
                    tradeDate: datesBuy.tradeDate.getTime(),
                    tradeDateString: datesBuy.tradeDateString,
                    settlementDate: datesBuy.t2Date.getTime(),
                    settlementDateString: datesBuy.t2DateString,
                    symbol: order.symbol,
                    name: order.name,
                    side: 'BUY',
                    shares: order.shares,
                    price: fillPrice,
                    amount: fillEst.amount,
                    fee: fillEst.fee,
                    tax: fillEst.tax,
                    netAmount: -fillEst.total,
                    status: 'PENDING',
                  };
                  if (!Array.isArray(account.settlementLedger)) {
                    account.settlementLedger = [];
                  }
                  account.settlementLedger.unshift(settlementEntryBuy);

                  updated = true;
                }
              } else {
                // 賣出撮合
                const posIndex = account.positions.findIndex((p) => p.symbol === order.symbol);
                if (posIndex >= 0 && account.positions[posIndex].shares >= order.shares) {
                  account.balance += fillEst.total;
                  const pos = account.positions[posIndex];
                  if (pos.shares === order.shares) {
                    account.positions.splice(posIndex, 1);
                  } else {
                    pos.shares -= order.shares;
                    pos.currentPrice = marketPrice;
                    pos.unrealizedProfit = Number(((marketPrice - pos.avgCostPrice) * pos.shares).toFixed(2));
                    pos.unrealizedProfitPercent = Number((((marketPrice - pos.avgCostPrice) / pos.avgCostPrice) * 100).toFixed(2));
                  }
                  order.status = 'FILLED';
                  order.filledPrice = fillPrice;
                  order.filledTimestamp = Date.now();
                  order.note = '盤面行情觸價撮合成交';
                  account.history.unshift({
                    id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    timestamp: Date.now(),
                    symbol: order.symbol,
                    name: order.name,
                    type: 'SELL',
                    tradeType: order.tradeType,
                    shares: order.shares,
                    price: fillPrice,
                    amount: fillEst.amount,
                    fee: fillEst.fee,
                    tax: fillEst.tax,
                  });

                  // 寫入台灣證交所 T+2 資金交割流水帳簿
                  const datesSell = calculateSettlementDates(new Date());
                  const settlementEntrySell: SettlementEntry = {
                    id: `stl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    orderId: order.id,
                    tradeDate: datesSell.tradeDate.getTime(),
                    tradeDateString: datesSell.tradeDateString,
                    settlementDate: datesSell.t2Date.getTime(),
                    settlementDateString: datesSell.t2DateString,
                    symbol: order.symbol,
                    name: order.name,
                    side: 'SELL',
                    shares: order.shares,
                    price: fillPrice,
                    amount: fillEst.amount,
                    fee: fillEst.fee,
                    tax: fillEst.tax,
                    netAmount: fillEst.total,
                    status: 'PENDING',
                  };
                  if (!Array.isArray(account.settlementLedger)) {
                    account.settlementLedger = [];
                  }
                  account.settlementLedger.unshift(settlementEntrySell);

                  updated = true;
                }
              }
            }
          }
        }
      }
    });

    // 2. 更新現有持倉之即時價格與未實現損益
    account.positions.forEach((pos) => {
      const newPrice = symbolPriceMap[pos.symbol];
      if (newPrice && newPrice !== pos.currentPrice) {
        pos.currentPrice = newPrice;
        pos.unrealizedProfit = Number(((newPrice - pos.avgCostPrice) * pos.shares).toFixed(2));
        pos.unrealizedProfitPercent = Number((((newPrice - pos.avgCostPrice) / pos.avgCostPrice) * 100).toFixed(2));
        updated = true;
      }
    });

    if (updated) {
      this.saveAccount(account);
    }

    return account;
  },

  // 演練模式：依最新盤面價格手動觸發撮合檢核
  triggerSimulatedMatching(symbolPriceMap: Record<string, number>): {
    success: boolean;
    filledCount: number;
    message: string;
  } {
    const accountBefore = this.getAccount();
    const pendingCount = accountBefore.orders.filter((o) => o.status === 'PENDING').length;
    if (pendingCount === 0) {
      return { success: false, filledCount: 0, message: '目前沒有任何排隊中的委託掛單' };
    }

    const accountAfter = this.updatePrices(symbolPriceMap, true);
    const remainingPending = accountAfter.orders.filter((o) => o.status === 'PENDING').length;
    const filledCount = pendingCount - remainingPending;

    if (filledCount > 0) {
      return {
        success: true,
        filledCount,
        message: `【盤面撮合成功】共有 ${filledCount} 筆排隊掛單符合最新盤面價格，已完全成交！`,
      };
    } else {
      return {
        success: false,
        filledCount: 0,
        message: `最新盤面成交價未觸及委託限價（或持倉/資金不足），${pendingCount} 筆委託單繼續保持排隊中。`,
      };
    }
  },

  // 相容既有快速買進方法 (預設使用盤中演練模式以確保測試相容)
  buy(symbol: string, name: string, price: number, shares: number, currency = 'TWD'): { success: boolean; message: string } {
    return this.placeOrder({
      symbol,
      name,
      side: 'BUY',
      orderPrice: price,
      shares,
      currentMarketPrice: price,
      currency,
      priceType: 'LIMIT',
      bypassMarketHoursCheck: true,
    });
  },

  // 相容既有快速賣出方法
  sell(symbol: string, price: number, shares: number): { success: boolean; message: string } {
    const account = this.getAccount();
    const pos = account.positions.find((p) => p.symbol === symbol);
    const name = pos ? pos.name : symbol;
    return this.placeOrder({
      symbol,
      name,
      side: 'SELL',
      orderPrice: price,
      shares,
      currentMarketPrice: price,
      priceType: 'LIMIT',
      bypassMarketHoursCheck: true,
    });
  },
};
