import { TechnicalSummary } from '../types/stock';
import { KLineData } from 'klinecharts';
import { analyzeSMC } from './smcAnalysis';
import { getFundamentalData } from '../data/stockService';

/**
 * 盤面即時訊號診斷：
 * 整合多維度技術指標、量價結構與基本面體質，轉化為直觀的實戰觀察數據。
 * 支援以股票代碼與日線基準數據進行定錨，確保評分客觀穩定，不因切換分時週期而頻繁跳動。
 */
export function analyzeMarketStatus(data: KLineData[], symbol?: string): TechnicalSummary {
  if (!data || data.length < 30) {
    return {
      trend: 'neutral',
      trendText: '正在收集充足的市場數據以進行多週期運算...',
      momentumText: '數據量累積中，請稍候。',
      warningText: '建議至少觀察 30 根以上 K 線再進行趨勢判讀。',
      overallRating: '中立觀望',
      score: 50,
    };
  }

  const latest = data[data.length - 1];

  // 1. 計算簡易均線 (MA5, MA20, MA60)
  const calcMA = (period: number) => {
    const slice = data.slice(-period);
    const sum = slice.reduce((acc, curr) => acc + curr.close, 0);
    return sum / slice.length;
  };

  const ma5 = calcMA(5);
  const ma20 = calcMA(20);
  const ma60 = data.length >= 60 ? calcMA(60) : ma20;

  // 2. 簡易 RSI(14) 估算
  let gainSum = 0;
  let lossSum = 0;
  for (let i = data.length - 14; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gainSum += diff;
    else lossSum += Math.abs(diff);
  }
  const rsi14 = lossSum === 0
    ? (gainSum === 0 ? 50 : 100)
    : Math.round(100 - (100 / (1 + (gainSum / lossSum))));

  // 3. 布林中軌與標準差 (BOLL 20, 2)
  const bollMid = ma20;
  const variance = data.slice(-20).reduce((acc, curr) => acc + Math.pow(curr.close - bollMid, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  const bollUpper = bollMid + 2 * stdDev;
  const bollLower = bollMid - 2 * stdDev;

  // 4. 多空評分系統 (0 ~ 100)
  let techScore = 50;
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let trendText = '';
  let momentumText = '';
  let warningText = '';

  // 趨勢判定 (權重核心)
  const isSuperBull = ma20 > ma60;
  const isSuperBear = ma20 < ma60;

  if (latest.close > ma5 && ma5 > ma20) {
    trend = 'bullish';
    techScore += isSuperBull ? 25 : 20;
    trendText = `股價 (${latest.close.toFixed(2)}) 站穩 5 日短均線與 20 日月線之上，呈現${isSuperBull ? '極為強勢的長短期均線多頭' : '健康多頭'}排列。`;
  } else if (latest.close < ma5 && ma5 < ma20) {
    trend = 'bearish';
    techScore -= isSuperBear ? 25 : 20;
    trendText = `股價弱於 5 日與 20 日均線，短期均線下彎，處於空方修正或回檔格局。`;
  } else {
    trend = 'neutral';
    trendText = `股價在 5 日均線與 20 日均線之間來回拉鋸，目前多空未明，屬於區間震盪整理。`;
  }

  // 動能判定 (RSI 與 超買超賣)
  if (rsi14 > 75) {
    techScore += 10;
    momentumText = `短線買氣強盛（日線 RSI 為 ${rsi14}），呈現強勢動能。`;
    warningText = `【短線過熱提醒】：RSI 已高於 75 進入超買區，短線追高期望值偏低，建議耐心等待拉回均線支撐再評估切入。`;
  } else if (rsi14 < 25) {
    techScore -= 10;
    momentumText = `賣盤力道衰竭（日線 RSI 僅為 ${rsi14}），市場處於極度超賣區。`;
    warningText = `【超賣區觀察】：RSI 低於 25 進入超賣區，空方拋壓趨近竭盡，若出現下影線或止跌訊號，可留意技術性反彈機會。`;
  } else if (rsi14 >= 50) {
    techScore += 5;
    momentumText = `日線 RSI 為 ${rsi14}，位於 50 多空分水嶺上方，多方力道略佔優勢。`;
    warningText = `【操作參考】：持股者可將 20 日月線 (${ma20.toFixed(2)}) 設為關鍵防守參考點。`;
  } else {
    techScore -= 5;
    momentumText = `日線 RSI 為 ${rsi14}，位於 50 分水嶺下方，空方仍具主控權。`;
    warningText = `【操作參考】：反彈遇均線壓力宜適度調節，待放量站上關鍵位再行評估。`;
  }

  // 布林通道警示
  if (latest.close >= bollUpper) {
    warningText += ` 股價已觸碰布林上軌 (${bollUpper.toFixed(2)})，留意常態分佈上緣的壓回或整理震盪。`;
  } else if (latest.close <= bollLower) {
    warningText += ` 股價已觸及布林下軌 (${bollLower.toFixed(2)})，具備均值回歸的支撐條件。`;
  }

  // 機構訂單流與基本面共振診斷
  let institutionalNote = '';
  let smcBonus = 0;
  try {
    const smc = analyzeSMC(data);
    if (smc.structureStatus === '強勢機構推進' || smc.structureStatus === '回踩失衡區吸籌') {
      smcBonus += 5;
    } else if (smc.structureStatus === '遇壓力受阻') {
      smcBonus -= 5;
    }

    let smcText = `【SMC 機構態勢】：處於「${smc.structureStatus}」`;
    if (smc.nearestSupport) smcText += `，下方核心支撐 FVG 位於 $${smc.nearestSupport}`;
    if (smc.nearestResistance) smcText += `，上方機構拋壓阻力位於 $${smc.nearestResistance}`;

    if (symbol) {
      const fund = getFundamentalData(symbol, latest.close);
      smcText += ` ｜ 【基本面共振】：法人生態「${fund.analystConsensus}」，財務健全評分 ${fund.healthScore} 分`;
    }

    institutionalNote = smcText;
  } catch {
    // fallback gracefully
  }

  // 綜合評分定錨：融合技術面走勢 (60%)、基本面體質 (30%) 與機構流結構 (10%)
  let finalScore = techScore + smcBonus;
  if (symbol) {
    try {
      const fund = getFundamentalData(symbol, latest.close);
      if (fund && typeof fund.healthScore === 'number') {
        // 基本面體質權威融合
        finalScore = Math.round(finalScore * 0.65 + fund.healthScore * 0.35);
      }
    } catch {
      // ignore
    }
  }

  finalScore = Math.max(5, Math.min(95, finalScore));

  // 總結評等判定
  let overallRating: TechnicalSummary['overallRating'] = '中立觀望';
  if (finalScore >= 75) overallRating = '強烈看多';
  else if (finalScore >= 58) overallRating = '偏多震盪';
  else if (finalScore <= 30) overallRating = '空方主導';
  else if (finalScore <= 46) overallRating = '偏空震盪';

  return {
    trend,
    trendText,
    momentumText,
    warningText,
    overallRating,
    score: finalScore,
    institutionalNote,
  };
}
