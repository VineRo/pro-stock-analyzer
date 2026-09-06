import { KLineData } from 'klinecharts';
import { 
  BacktestConfig, 
  BacktestResult, 
  EquityPoint, 
  TradeLog, 
  BacktestCondition 
} from '../types/stock';

/**
 * 輔助計算簡單移動平均線 (SMA)
 */
export function calculateSMA(data: KLineData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    if (i >= period) {
      sum -= data[i - period].close;
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }

  return result;
}

/**
 * 輔助計算成交量均線
 */
export function calculateVolumeSMA(data: KLineData[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const vol = data[i].volume || 1;
    sum += vol;
    if (i >= period) {
      sum -= (data[i - period].volume || 1);
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(null);
    }
  }

  return result;
}

/**
 * 輔助計算指數移動平均線 (EMA)
 */
export function calculateEMA(data: KLineData[], period: number): number[] {
  const result: number[] = [];
  if (!data.length) return result;
  const k = 2 / (period + 1);
  let ema = data[0].close;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(ema);
    } else {
      ema = data[i].close * k + ema * (1 - k);
      result.push(ema);
    }
  }

  return result;
}

/**
 * 輔助計算數值陣列的 EMA
 */
function calculateArrayEMA(values: number[], period: number): number[] {
  const result: number[] = [];
  if (!values.length) return result;
  const k = 2 / (period + 1);
  let ema = values[0];

  for (let i = 0; i < values.length; i++) {
    if (i === 0) {
      result.push(ema);
    } else {
      ema = values[i] * k + ema * (1 - k);
      result.push(ema);
    }
  }

  return result;
}

/**
 * 輔助計算 RSI (相對強弱指標)
 */
function calculateRSIArray(data: KLineData[], period = 14): (number | null)[] {
  const rsis: (number | null)[] = [];
  if (data.length < period + 1) return data.map(() => null);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = 0; i < period; i++) {
    rsis.push(null);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsis.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsis.push(100 - 100 / (1 + rs));
  }

  return rsis;
}

/**
 * 輔助計算 KD (隨機指標 9, 3, 3)
 */
function calculateKDArray(data: KLineData[], period = 9): { k: (number | null)[]; d: (number | null)[] } {
  const kList: (number | null)[] = [];
  const dList: (number | null)[] = [];

  let lastK = 50;
  let lastD = 50;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      kList.push(null);
      dList.push(null);
      continue;
    }

    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      if (data[j].high > highest) highest = data[j].high;
      if (data[j].low < lowest) lowest = data[j].low;
    }

    const diff = highest - lowest;
    const rsv = diff === 0 ? 50 : ((data[i].close - lowest) / diff) * 100;
    lastK = (2 / 3) * lastK + (1 / 3) * rsv;
    lastD = (2 / 3) * lastD + (1 / 3) * lastK;

    kList.push(Number(lastK.toFixed(2)));
    dList.push(Number(lastD.toFixed(2)));
  }

  return { k: kList, d: dList };
}

/**
 * 輔助計算 MACD (12, 26, 9)
 */
function calculateMACDArray(data: KLineData[]): {
  dif: number[];
  dea: number[];
  macd: number[];
} {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const dif = ema12.map((v, i) => v - ema26[i]);
  const dea = calculateArrayEMA(dif, 9);
  const macd = dif.map((v, i) => (v - dea[i]) * 2);

  return { dif, dea, macd };
}

/**
 * 輔助計算布林通道 (Bollinger Bands 20, 2)
 */
function calculateBollingerArray(data: KLineData[], period = 20, multiplier = 2): {
  mid: (number | null)[];
  upper: (number | null)[];
  lower: (number | null)[];
} {
  const mid = calculateSMA(data, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    const m = mid[i];
    if (m == null || i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }

    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += Math.pow(data[j].close - m, 2);
    }
    const std = Math.sqrt(sumSq / period);
    upper.push(Number((m + multiplier * std).toFixed(2)));
    lower.push(Number((m - multiplier * std).toFixed(2)));
  }

  return { mid, upper, lower };
}

/**
 * 條件評估快取池 (避免重複計算指標)
 */
class IndicatorCache {
  private data: KLineData[];
  private smaCache = new Map<number, (number | null)[]>();
  private volSmaCache = new Map<number, (number | null)[]>();
  private rsiCache = new Map<number, (number | null)[]>();
  private kdData: { k: (number | null)[]; d: (number | null)[] } | null = null;
  private macdData: { dif: number[]; dea: number[]; macd: number[] } | null = null;
  private bbData: { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } | null = null;

  constructor(data: KLineData[]) {
    this.data = data;
  }

  getSMA(period: number): (number | null)[] {
    if (!this.smaCache.has(period)) {
      this.smaCache.set(period, calculateSMA(this.data, period));
    }
    return this.smaCache.get(period)!;
  }

  getVolSMA(period: number): (number | null)[] {
    if (!this.volSmaCache.has(period)) {
      this.volSmaCache.set(period, calculateVolumeSMA(this.data, period));
    }
    return this.volSmaCache.get(period)!;
  }

  getRSI(period: number): (number | null)[] {
    if (!this.rsiCache.has(period)) {
      this.rsiCache.set(period, calculateRSIArray(this.data, period));
    }
    return this.rsiCache.get(period)!;
  }

  getKD(period = 9) {
    if (!this.kdData) {
      this.kdData = calculateKDArray(this.data, period);
    }
    return this.kdData;
  }

  getMACD() {
    if (!this.macdData) {
      this.macdData = calculateMACDArray(this.data);
    }
    return this.macdData;
  }

  getBB(period = 20, multiplier = 2) {
    if (!this.bbData) {
      this.bbData = calculateBollingerArray(this.data, period, multiplier);
    }
    return this.bbData;
  }
}

/**
 * 評估單一自訂技術指標條件於第 i 根 K 線是否滿足
 */
function evaluateSingleCondition(
  cond: BacktestCondition,
  i: number,
  data: KLineData[],
  cache: IndicatorCache
): boolean {
  if (i <= 0) return false;
  const bar = data[i];
  const prevBar = data[i - 1];

  switch (cond.indicator) {
    case 'PRICE_MA': {
      const p1 = cond.param1 || 20;
      const ma = cache.getSMA(p1);
      const curMA = ma[i];
      const prevMA = ma[i - 1];
      if (curMA == null) return false;

      if (cond.operator === 'GREATER') return bar.close > curMA;
      if (cond.operator === 'LESS') return bar.close < curMA;
      if (cond.operator === 'CROSS_ABOVE') return prevMA != null && prevBar.close <= prevMA && bar.close > curMA;
      if (cond.operator === 'CROSS_BELOW') return prevMA != null && prevBar.close >= prevMA && bar.close < curMA;
      return false;
    }

    case 'MA_CROSS': {
      const fastP = cond.param1 || 5;
      const slowP = cond.param2 || 20;
      const fast = cache.getSMA(fastP);
      const slow = cache.getSMA(slowP);
      if (fast[i] == null || slow[i] == null || fast[i - 1] == null || slow[i - 1] == null) return false;

      if (cond.operator === 'CROSS_ABOVE') return fast[i - 1]! <= slow[i - 1]! && fast[i]! > slow[i]!;
      if (cond.operator === 'CROSS_BELOW') return fast[i - 1]! >= slow[i - 1]! && fast[i]! < slow[i]!;
      if (cond.operator === 'GREATER') return fast[i]! > slow[i]!;
      if (cond.operator === 'LESS') return fast[i]! < slow[i]!;
      return false;
    }

    case 'RSI': {
      const period = cond.param1 || 14;
      const threshold = cond.param2 ?? 50;
      const rsi = cache.getRSI(period);
      const curRSI = rsi[i];
      const prevRSI = rsi[i - 1];
      if (curRSI == null) return false;

      if (cond.operator === 'LESS') return curRSI < threshold;
      if (cond.operator === 'GREATER') return curRSI > threshold;
      if (cond.operator === 'CROSS_ABOVE') return prevRSI != null && prevRSI <= threshold && curRSI > threshold;
      if (cond.operator === 'CROSS_BELOW') return prevRSI != null && prevRSI >= threshold && curRSI < threshold;
      return false;
    }

    case 'KD': {
      const { k, d } = cache.getKD(cond.param1 || 9);
      const curK = k[i];
      const curD = d[i];
      const prevK = k[i - 1];
      const prevD = d[i - 1];
      if (curK == null || curD == null) return false;

      if (cond.operator === 'CROSS_ABOVE') return prevK != null && prevD != null && prevK <= prevD && curK > curD;
      if (cond.operator === 'CROSS_BELOW') return prevK != null && prevD != null && prevK >= prevD && curK < curD;
      if (cond.operator === 'GREATER') return curK > curD;
      if (cond.operator === 'LESS') return curK < (cond.param2 ?? 30);
      return false;
    }

    case 'MACD': {
      const { dif, dea, macd } = cache.getMACD();
      const curDif = dif[i];
      const curDea = dea[i];
      const prevDif = dif[i - 1];
      const prevDea = dea[i - 1];

      if (cond.operator === 'CROSS_ABOVE') return prevDif <= prevDea && curDif > curDea;
      if (cond.operator === 'CROSS_BELOW') return prevDif >= prevDea && curDif < curDea;
      if (cond.operator === 'GREATER') return macd[i] > 0;
      if (cond.operator === 'LESS') return macd[i] < 0;
      return false;
    }

    case 'BOLLINGER': {
      const bb = cache.getBB(cond.param1 || 20, 2);
      const upper = bb.upper[i];
      const lower = bb.lower[i];
      const mid = bb.mid[i];
      if (upper == null || lower == null || mid == null) return false;

      if (cond.operator === 'CROSS_ABOVE' || cond.operator === 'GREATER') return bar.close > upper;
      if (cond.operator === 'CROSS_BELOW') return bar.close < lower;
      if (cond.operator === 'LESS') return bar.close < mid;
      return false;
    }

    case 'VOLUME': {
      const period = cond.param1 || 5;
      const multiplier = cond.param2 || 1.5;
      const volSma = cache.getVolSMA(period);
      const curVolSMA = volSma[i];
      if (curVolSMA == null) return false;
      const vol = bar.volume || 1;

      if (cond.operator === 'GREATER') return vol >= curVolSMA * multiplier;
      if (cond.operator === 'LESS') return vol <= curVolSMA * multiplier;
      return false;
    }

    case 'PRICE_BREAK': {
      const lookback = cond.param1 || 20;
      if (i < lookback) return false;

      let highest = -Infinity;
      let lowest = Infinity;
      for (let j = i - lookback; j < i; j++) {
        if (data[j].high > highest) highest = data[j].high;
        if (data[j].low < lowest) lowest = data[j].low;
      }

      if (cond.operator === 'GREATER' || cond.operator === 'CROSS_ABOVE') return bar.close > highest;
      if (cond.operator === 'LESS' || cond.operator === 'CROSS_BELOW') return bar.close < lowest;
      return false;
    }

    default:
      return false;
  }
}

/**
 * 核心量化策略回測執行引擎 (支援 2 個以上自訂多條件組合策略)
 */
export function runBacktest(data: KLineData[], config: BacktestConfig): BacktestResult {
  if (!data || data.length < 30) {
    return {
      totalReturnPercent: 0,
      annualizedReturnPercent: 0,
      benchmarkReturnPercent: 0,
      winRatePercent: 0,
      profitFactor: 0,
      maxDrawdownPercent: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      tradeLogs: [],
      equityCurve: [],
    };
  }

  let capital = config.initialCapital;
  const initialCapital = config.initialCapital;
  const benchmarkInitialPrice = data[0].close;

  let currentPosition: {
    entryPrice: number;
    shares: number;
    entryDate: string;
    entryIndex: number;
  } | null = null;

  const tradeLogs: TradeLog[] = [];
  const equityCurve: EquityPoint[] = [];

  let grossProfit = 0;
  let grossLoss = 0;
  let winningTrades = 0;
  let losingTrades = 0;

  // 預計算指標快取池
  const cache = new IndicatorCache(data);
  const fastSMA = cache.getSMA(config.fastPeriod || 5);
  const slowSMA = cache.getSMA(config.slowPeriod || 20);
  const rsi = cache.getRSI(14);

  let peakEquity = initialCapital;
  let maxDrawdown = 0;

  // 判斷是否為自訂多條件策略
  const isCustom = config.strategy === 'custom' && config.buyConditions && config.buyConditions.length > 0;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const dateStr = new Date(bar.timestamp).toLocaleDateString('zh-TW');

    let buySignal = false;
    let sellSignal = false;
    let exitReason = '';

    if (isCustom) {
      // 1. 自訂多條件策略：評估進場條件
      const buyConds = config.buyConditions || [];
      const buyLogic = config.buyLogic || 'AND';
      
      if (buyConds.length > 0) {
        if (buyLogic === 'AND') {
          buySignal = buyConds.every((c) => evaluateSingleCondition(c, i, data, cache));
        } else {
          buySignal = buyConds.some((c) => evaluateSingleCondition(c, i, data, cache));
        }
      }

      // 2. 自訂多條件策略：評估出場條件
      const sellConds = config.sellConditions || [];
      const sellLogic = config.sellLogic || 'OR';
      if (sellConds.length > 0) {
        let isSellTriggered = false;
        if (sellLogic === 'AND') {
          isSellTriggered = sellConds.every((c) => evaluateSingleCondition(c, i, data, cache));
        } else {
          isSellTriggered = sellConds.some((c) => evaluateSingleCondition(c, i, data, cache));
        }
        if (isSellTriggered) {
          sellSignal = true;
          exitReason = '觸發自訂賣出條件組合';
        }
      }
    } else if (config.strategy === 'ma_crossover') {
      if (i > 0 && fastSMA[i] != null && slowSMA[i] != null && fastSMA[i - 1] != null && slowSMA[i - 1] != null) {
        if (fastSMA[i - 1]! <= slowSMA[i - 1]! && fastSMA[i]! > slowSMA[i]!) {
          buySignal = true;
        } else if (fastSMA[i - 1]! >= slowSMA[i - 1]! && fastSMA[i]! < slowSMA[i]!) {
          sellSignal = true;
          exitReason = '均線死亡交叉出場';
        }
      }
    } else if (config.strategy === 'rsi_reversion') {
      const currentRSI = rsi[i];
      if (currentRSI != null) {
        if (currentRSI < (config.rsiBuyThreshold || 30)) {
          buySignal = true;
        } else if (currentRSI > (config.rsiSellThreshold || 70)) {
          sellSignal = true;
          exitReason = 'RSI 超買獲利出場';
        }
      }
    } else if (config.strategy === 'bollinger_break') {
      const sma = slowSMA[i];
      if (i >= 20 && sma != null) {
        let sumSquares = 0;
        for (let j = i - 19; j <= i; j++) {
          sumSquares += Math.pow(data[j].close - sma, 2);
        }
        const stdDev = Math.sqrt(sumSquares / 20);
        const upper = sma + 2 * stdDev;

        if (bar.close > upper) {
          buySignal = true;
        } else if (bar.close < sma) {
          sellSignal = true;
          exitReason = '跌破布林中軌出場';
        }
      }
    } else {
      // 預設動能追蹤
      if (i > 0 && fastSMA[i] != null && slowSMA[i] != null) {
        if (bar.close > fastSMA[i]! && fastSMA[i]! > slowSMA[i]!) {
          buySignal = true;
        } else if (bar.close < slowSMA[i]!) {
          sellSignal = true;
          exitReason = '跌破慢線止損';
        }
      }
    }

    // 檢查持倉停損與停利條件
    if (currentPosition) {
      const pnlPct = ((bar.close - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;
      if (config.stopLossPercent > 0 && pnlPct <= -config.stopLossPercent) {
        sellSignal = true;
        exitReason = `達到停損位 (-${config.stopLossPercent}%)`;
      } else if (config.takeProfitPercent > 0 && pnlPct >= config.takeProfitPercent) {
        sellSignal = true;
        exitReason = `達到停利位 (+${config.takeProfitPercent}%)`;
      }
    }

    // 執行出場
    if (sellSignal && currentPosition) {
      const fee = currentPosition.shares * bar.close * (config.feeRatePercent / 100);
      const proceeds = currentPosition.shares * bar.close - fee;
      const profit = proceeds - (currentPosition.shares * currentPosition.entryPrice);
      const profitPercent = Number(((profit / (currentPosition.shares * currentPosition.entryPrice)) * 100).toFixed(2));

      capital += proceeds;

      if (profit > 0) {
        grossProfit += profit;
        winningTrades++;
      } else {
        grossLoss += Math.abs(profit);
        losingTrades++;
      }

      tradeLogs.push({
        id: `trade_${tradeLogs.length + 1}`,
        type: 'BUY',
        entryDate: currentPosition.entryDate,
        entryPrice: currentPosition.entryPrice,
        exitDate: dateStr,
        exitPrice: bar.close,
        shares: currentPosition.shares,
        profit: Number(profit.toFixed(2)),
        profitPercent,
        reason: exitReason || '策略信號出場',
      });

      currentPosition = null;
    }

    // 執行買入進場 (若目前無持倉)
    if (buySignal && !currentPosition && capital > bar.close) {
      const availableCapital = capital * 0.95; // 預留手續費緩衝
      const fee = availableCapital * (config.feeRatePercent / 100);
      const investable = availableCapital - fee;
      const shares = Math.floor(investable / bar.close);

      if (shares > 0) {
        const totalCost = shares * bar.close + (shares * bar.close * (config.feeRatePercent / 100));
        capital -= totalCost;

        currentPosition = {
          entryPrice: bar.close,
          shares,
          entryDate: dateStr,
          entryIndex: i,
        };
      }
    }

    // 計算當日總權益 (現金 + 持倉市值)
    const positionValue = currentPosition ? currentPosition.shares * bar.close : 0;
    const currentEquity = capital + positionValue;

    // 計算基準 (Buy & Hold 買進持有) 權益
    const benchmarkEquity = (initialCapital / benchmarkInitialPrice) * bar.close;

    equityCurve.push({
      date: dateStr,
      equity: Number(currentEquity.toFixed(2)),
      benchmarkEquity: Number(benchmarkEquity.toFixed(2)),
    });

    // 最大回撤計算
    if (currentEquity > peakEquity) {
      peakEquity = currentEquity;
    }
    const currentDrawdown = ((peakEquity - currentEquity) / peakEquity) * 100;
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }
  }

  // 若回測結束仍有持倉，按最後一日收盤價強制作結算統計
  if (currentPosition) {
    const lastBar = data[data.length - 1];
    const fee = currentPosition.shares * lastBar.close * (config.feeRatePercent / 100);
    const proceeds = currentPosition.shares * lastBar.close - fee;
    const profit = proceeds - (currentPosition.shares * currentPosition.entryPrice);
    const profitPercent = Number(((profit / (currentPosition.shares * currentPosition.entryPrice)) * 100).toFixed(2));

    capital += proceeds;

    if (profit > 0) {
      grossProfit += profit;
      winningTrades++;
    } else {
      grossLoss += Math.abs(profit);
      losingTrades++;
    }

    tradeLogs.push({
      id: `trade_${tradeLogs.length + 1}`,
      type: 'BUY',
      entryDate: currentPosition.entryDate,
      entryPrice: currentPosition.entryPrice,
      exitDate: new Date(lastBar.timestamp).toLocaleDateString('zh-TW'),
      exitPrice: lastBar.close,
      shares: currentPosition.shares,
      profit: Number(profit.toFixed(2)),
      profitPercent,
      reason: '回測週期結束結算',
    });
  }

  const finalEquity = capital;
  const totalReturnPercent = Number((((finalEquity - initialCapital) / initialCapital) * 100).toFixed(2));
  const benchmarkReturnPercent = Number((((data[data.length - 1].close - benchmarkInitialPrice) / benchmarkInitialPrice) * 100).toFixed(2));

  // 年化報酬率 (以 252 交易日換算)
  const totalTradingDays = data.length;
  const years = totalTradingDays / 252;
  const annualizedReturnPercent = years > 0
    ? Number((((Math.pow(Math.max(0.01, finalEquity / initialCapital), 1 / years) - 1) * 100)).toFixed(2))
    : totalReturnPercent;

  const totalTrades = winningTrades + losingTrades;
  const winRatePercent = totalTrades > 0 ? Number(((winningTrades / totalTrades) * 100).toFixed(2)) : 0;
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  return {
    totalReturnPercent,
    annualizedReturnPercent,
    benchmarkReturnPercent,
    winRatePercent,
    profitFactor,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    tradeLogs,
    equityCurve,
  };
}
