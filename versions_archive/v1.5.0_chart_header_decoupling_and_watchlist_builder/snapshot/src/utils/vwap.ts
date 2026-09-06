import { KLineData } from 'klinecharts';

export interface VwapPoint {
  timestamp: number;
  vwap: number;
  upperBand1?: number; // +1 StdDev
  lowerBand1?: number; // -1 StdDev
  upperBand2?: number; // +2 StdDev
  lowerBand2?: number; // -2 StdDev
}

/**
 * 成交量加權平均價 (VWAP, Volume-Weighted Average Price) 計算引擎
 * 支援日內基準線與標準差通道（機構常用波動率界限）
 */
export function calculateVWAP(data: KLineData[]): VwapPoint[] {
  if (!data || data.length === 0) return [];

  const points: VwapPoint[] = [];
  let cumulativeTypicalVol = 0;
  let cumulativeVol = 0;
  let cumulativeSquaredDiffVol = 0;

  let lastDay = -1;

  for (let i = 0; i < data.length; i++) {
    const bar = data[i];
    const date = new Date(bar.timestamp);
    const day = date.getUTCDate();

    // 日內重置機制 (新交易日自動歸零重算)
    if (day !== lastDay) {
      cumulativeTypicalVol = 0;
      cumulativeVol = 0;
      cumulativeSquaredDiffVol = 0;
      lastDay = day;
    }

    const typicalPrice = (bar.high + bar.low + bar.close) / 3;
    const vol = bar.volume || 1;

    cumulativeTypicalVol += typicalPrice * vol;
    cumulativeVol += vol;

    const currentVwap = cumulativeTypicalVol / cumulativeVol;

    // 計算加權方差與標準差
    const diff = typicalPrice - currentVwap;
    cumulativeSquaredDiffVol += diff * diff * vol;
    const variance = cumulativeSquaredDiffVol / cumulativeVol;
    const stdDev = Math.sqrt(variance);

    points.push({
      timestamp: bar.timestamp,
      vwap: Number(currentVwap.toFixed(2)),
      upperBand1: Number((currentVwap + stdDev).toFixed(2)),
      lowerBand1: Number((currentVwap - stdDev).toFixed(2)),
      upperBand2: Number((currentVwap + 2 * stdDev).toFixed(2)),
      lowerBand2: Number((currentVwap - 2 * stdDev).toFixed(2)),
    });
  }

  return points;
}
