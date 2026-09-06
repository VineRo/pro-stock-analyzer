import { KLineData } from 'klinecharts';
import { FairValueGap, OrderBlock, SMCAnalysisResult } from '../types/stock';

/**
 * Smart Money Concepts (SMC) 機構訂單流演算法引擎
 * 
 * 1. 價值失衡區 (Fair Value Gap, FVG):
 *    三根 K 線模型，當強勁推升使得 Bar 1 High < Bar 3 Low（看漲 FVG）
 *    或強烈下殺使得 Bar 1 Low > Bar 3 High（看跌 FVG）。
 *    CE (Consequent Encroachment) 為 50% 核心吸引中軸線。
 * 
 * 2. 機構訂單塊 (Order Block, OB):
 *    在一波急劇突破（BOS / 結構破位）之前，機構進行最後誘敵或吸籌的反向 K 線。
 * 
 * 3. 支撐與壓力位動態辨識與回踩狀態 (Mitigation) 檢測。
 */

/**
 * 自動識別歷史 K 線中的價值失衡區 (Fair Value Gaps)
 */
export function detectFairValueGaps(data: KLineData[], maxGaps = 12): FairValueGap[] {
  if (!data || data.length < 3) return [];

  const gaps: FairValueGap[] = [];
  const len = data.length;

  // 掃描近 150 根 K 線中的三根失衡結構
  const startIdx = Math.max(2, len - 150);

  for (let i = startIdx; i < len; i++) {
    const bar1 = data[i - 2];
    const bar2 = data[i - 1];
    const bar3 = data[i];

    // 1. 看漲失衡 (Bullish FVG)：中間為長陽線，Bar1 High < Bar3 Low
    if (bar1.high < bar3.low && bar2.close > bar2.open) {
      const topPrice = bar3.low;
      const bottomPrice = bar1.high;
      const ce = Number(((topPrice + bottomPrice) / 2).toFixed(2));

      // 檢查後續 K 線是否已回踩補缺 (Mitigated)
      let isMitigated = false;
      for (let j = i + 1; j < len; j++) {
        if (data[j].low <= ce) {
          isMitigated = true;
          break;
        }
      }

      gaps.push({
        id: `fvg-bull-${i}`,
        type: 'bullish',
        startIndex: i - 2,
        endIndex: i,
        topPrice: Number(topPrice.toFixed(2)),
        bottomPrice: Number(bottomPrice.toFixed(2)),
        consequentEncroachment: ce,
        isMitigated,
      });
    }

    // 2. 看跌失衡 (Bearish FVG)：中間為長黑線，Bar1 Low > Bar3 High
    if (bar1.low > bar3.high && bar2.close < bar2.open) {
      const topPrice = bar1.low;
      const bottomPrice = bar3.high;
      const ce = Number(((topPrice + bottomPrice) / 2).toFixed(2));

      let isMitigated = false;
      for (let j = i + 1; j < len; j++) {
        if (data[j].high >= ce) {
          isMitigated = true;
          break;
        }
      }

      gaps.push({
        id: `fvg-bear-${i}`,
        type: 'bearish',
        startIndex: i - 2,
        endIndex: i,
        topPrice: Number(topPrice.toFixed(2)),
        bottomPrice: Number(bottomPrice.toFixed(2)),
        consequentEncroachment: ce,
        isMitigated,
      });
    }
  }

  // 優先保留未補缺 (Unmitigated) 且最靠近當前的關鍵缺口
  const unmitigated = gaps.filter((g) => !g.isMitigated);
  const mitigated = gaps.filter((g) => g.isMitigated);

  return [...unmitigated.slice(-maxGaps), ...mitigated.slice(-4)];
}

/**
 * 自動識別機構訂單塊 (Order Blocks, OB)
 */
export function detectOrderBlocks(data: KLineData[], maxOB = 6): OrderBlock[] {
  if (!data || data.length < 15) return [];

  const orderBlocks: OrderBlock[] = [];
  const len = data.length;
  const startIdx = Math.max(5, len - 100);

  // 尋找局部波段極值突破
  for (let i = startIdx; i < len - 3; i++) {
    const curr = data[i];
    const next1 = data[i + 1];
    const next2 = data[i + 2];

    // 1. 看漲訂單塊 (Bullish OB)：
    // 突破前最後一根陰線 (curr.close < curr.open)，隨後 2 根強烈大陽線向上突破
    const isDownCandle = curr.close < curr.open;
    const isStrongPushUp = next1.close > next1.open && (next2.close - curr.open) / curr.open > 0.018;

    if (isDownCandle && isStrongPushUp) {
      // 檢驗是否被跌破
      let isMitigated = false;
      for (let j = i + 3; j < len; j++) {
        if (data[j].low < curr.low) {
          isMitigated = true;
          break;
        }
      }

      orderBlocks.push({
        id: `ob-bull-${i}`,
        type: 'bullish',
        index: i,
        topPrice: curr.high,
        bottomPrice: curr.low,
        volume: curr.volume || 0,
        isMitigated,
      });
    }

    // 2. 看跌訂單塊 (Bearish OB)：
    // 下殺前最後一根陽線 (curr.close > curr.open)，隨後連續大黑線灌破
    const isUpCandle = curr.close > curr.open;
    const isStrongPushDown = next1.close < next1.open && (curr.open - next2.close) / curr.open > 0.018;

    if (isUpCandle && isStrongPushDown) {
      let isMitigated = false;
      for (let j = i + 3; j < len; j++) {
        if (data[j].high > curr.high) {
          isMitigated = true;
          break;
        }
      }

      orderBlocks.push({
        id: `ob-bear-${i}`,
        type: 'bearish',
        index: i,
        topPrice: curr.high,
        bottomPrice: curr.low,
        volume: curr.volume || 0,
        isMitigated,
      });
    }
  }

  return orderBlocks.slice(-maxOB);
}

/**
 * 執行全面 SMC 機構結構分析
 */
export function analyzeSMC(data: KLineData[]): SMCAnalysisResult {
  if (!data || data.length < 10) {
    return {
      fvgs: [],
      orderBlocks: [],
      structureStatus: '盤整流動性聚集',
    };
  }

  const fvgs = detectFairValueGaps(data);
  const orderBlocks = detectOrderBlocks(data);
  const latestClose = data[data.length - 1].close;

  // 尋找最近未回踩支撐 (Bullish FVG，其核心中軸 CE 或頂部位於現價下方或在現價震盪區間)
  const unmitigatedBullGaps = fvgs.filter(
    (g) => g.type === 'bullish' && !g.isMitigated && (g.topPrice <= latestClose || g.consequentEncroachment <= latestClose)
  );
  const nearestSupport = unmitigatedBullGaps.length > 0
    ? Math.max(...unmitigatedBullGaps.map((g) => g.consequentEncroachment))
    : undefined;

  // 尋找最近未回踩壓力 (Bearish FVG，其核心中軸 CE 或底部位於現價上方或在現價震盪區間)
  const unmitigatedBearGaps = fvgs.filter(
    (g) => g.type === 'bearish' && !g.isMitigated && (g.bottomPrice >= latestClose || g.consequentEncroachment >= latestClose)
  );
  const nearestResistance = unmitigatedBearGaps.length > 0
    ? Math.min(...unmitigatedBearGaps.map((g) => g.consequentEncroachment))
    : undefined;

  // 判斷當前機構結構狀態
  let structureStatus: SMCAnalysisResult['structureStatus'] = '盤整流動性聚集';

  // 檢查是否正處於某個看漲 FVG 內部（回踩吸籌中）
  const inBullGap = fvgs.some((g) => g.type === 'bullish' && latestClose >= g.bottomPrice && latestClose <= g.topPrice);
  const inBearGap = fvgs.some((g) => g.type === 'bearish' && latestClose >= g.bottomPrice && latestClose <= g.topPrice);

  if (inBullGap) {
    structureStatus = '回踩失衡區吸籌';
  } else if (inBearGap) {
    structureStatus = '遇壓力受阻';
  } else if (unmitigatedBullGaps.length > unmitigatedBearGaps.length) {
    structureStatus = '強勢機構推進';
  }

  return {
    fvgs,
    orderBlocks,
    nearestSupport,
    nearestResistance,
    structureStatus,
  };
}
