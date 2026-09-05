import { TechnicalSummary } from '../types/stock';
import { KLineData } from 'klinecharts';
import { analyzeSMC } from './smcAnalysis';

/**
 * 智慧盤面診斷小幫手：
 * 專為股票新手打造，將複雜的多指標數值自動轉譯成通俗易懂的繁體中文白話文
 */
export function analyzeMarketStatus(data: KLineData[]): TechnicalSummary {
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
  const rs = lossSum === 0 ? 100 : gainSum / lossSum;
  const rsi14 = Math.round(100 - (100 / (1 + rs)));

  // 3. 布林中軌與標準差 (BOLL 20, 2)
  const bollMid = ma20;
  const variance = data.slice(-20).reduce((acc, curr) => acc + Math.pow(curr.close - bollMid, 2), 0) / 20;
  const stdDev = Math.sqrt(variance);
  const bollUpper = bollMid + 2 * stdDev;
  const bollLower = bollMid - 2 * stdDev;

  // 4. 多空評分系統 (0 ~ 100)
  let score = 50;
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  let trendText = '';
  let momentumText = '';
  let warningText = '';

  // 趨勢判定
  if (latest.close > ma5 && ma5 > ma20) {
    trend = 'bullish';
    score += 25;
    const isSuperBull = ma20 > ma60;
    trendText = `股價 (${latest.close.toFixed(2)}) 站穩 5 日短均線與 20 日月線之上，呈現${isSuperBull ? '極為強勢的長短期均線多頭' : '健康多頭'}排列。`;
  } else if (latest.close < ma5 && ma5 < ma20) {
    trend = 'bearish';
    score -= 25;
    trendText = `股價弱於 5 日與 20 日均線，短期均線下彎，處於空方修正或回檔格局。`;
  } else {
    trend = 'neutral';
    trendText = `股價在 5 日均線與 20 日均線之間來回拉鋸，目前多空未明，屬於區間震盪整理。`;
  }

  // 動能判定 (RSI 與 蠟燭形態)
  if (rsi14 > 75) {
    score += 10;
    momentumText = `短線買氣極度強盛（RSI 為 ${rsi14}），呈現強勢噴發動能。`;
    warningText = `【超買警戒】：RSI 數值已高於 75，進入過熱超買區。短線追高風險極高，切忌盲目追價，建議等待拉回均線再尋找切入點！`;
  } else if (rsi14 < 25) {
    score -= 10;
    momentumText = `賣盤力道衰竭（RSI 僅為 ${rsi14}），市場極度恐慌並處於超賣區。`;
    warningText = `【超賣反彈契機】：超賣指標通常預告空方殺盤接近尾聲，若伴隨長下影線紅K，隨時有報復性強彈機會，可開始分批關注。`;
  } else if (rsi14 >= 50) {
    score += 10;
    momentumText = `RSI 為 ${rsi14}，位於 50 多空分水嶺上方，多方力道略佔優勢。`;
    warningText = `【操作提示】：持股者可將 20 日月線 (${ma20.toFixed(2)}) 設為關鍵防守停利點。`;
  } else {
    score -= 10;
    momentumText = `RSI 為 ${rsi14}，位於 50 分水嶺下方，空方力道仍稍具主控權。`;
    warningText = `【操作提示】：反彈遇壓力宜減碼，靜待帶量突破均線再行進場。`;
  }

  // 布林通道警示
  if (latest.close >= bollUpper) {
    warningText += ` 股價已觸碰布林上軌 (${bollUpper.toFixed(2)})，面臨統計學常態分佈上緣壓力。`;
  } else if (latest.close <= bollLower) {
    warningText += ` 股價已落於布林下軌 (${bollLower.toFixed(2)})，具備強烈的統計學均值回歸反彈支撐。`;
  }

  // 機構訂單流與估值共振診斷
  let institutionalNote = '';
  try {
    const smc = analyzeSMC(data);
    let smcText = `【SMC 機構態勢】：處於「${smc.structureStatus}」`;
    if (smc.nearestSupport) smcText += `，下方核心支撐 FVG CE 位於 $${smc.nearestSupport}`;
    if (smc.nearestResistance) smcText += `，上方機構拋壓阻力位於 $${smc.nearestResistance}`;

    institutionalNote = smcText;
  } catch {
    // fallback gracefully
  }

  // 總結評等
  let overallRating: TechnicalSummary['overallRating'] = '中立觀望';
  if (score >= 80) overallRating = '強烈看多';
  else if (score >= 60) overallRating = '偏多震盪';
  else if (score <= 25) overallRating = '空方主導';
  else if (score <= 40) overallRating = '偏空震盪';

  return {
    trend,
    trendText,
    momentumText,
    warningText,
    overallRating,
    score: Math.max(5, Math.min(95, score)),
    institutionalNote,
  };
}
