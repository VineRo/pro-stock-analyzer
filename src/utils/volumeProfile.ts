import { KLineData } from 'klinecharts';
import { VolumeProfileResult, VolumeProfileTier } from '../types/stock';

/**
 * 籌碼成交量分佈 (Volume Profile) 計算引擎：
 * 1. 計算指定 K 線區間內的價格級距 (Price Levels)
 * 2. 統計每個價位累積成交量
 * 3. 找出 POC (Point of Control 最密集主力成本線)
 * 4. 根據 70% 常態分佈算出 VAH (Value Area High) 與 VAL (Value Area Low) 價值區間
 */
export function calculateVolumeProfile(
  data: KLineData[],
  binsCount = 30,
  valueAreaRatio = 0.70
): VolumeProfileResult | null {
  if (!data || data.length < 5) return null;

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let totalVolume = 0;

  for (const bar of data) {
    if (bar.low < minPrice) minPrice = bar.low;
    if (bar.high > maxPrice) maxPrice = bar.high;
    totalVolume += bar.volume || 0;
  }

  if (minPrice >= maxPrice || totalVolume === 0) return null;

  const priceRange = maxPrice - minPrice;
  const binStep = priceRange / binsCount;

  // 初始化各檔位
  const bins: { price: number; volume: number }[] = [];
  for (let i = 0; i < binsCount; i++) {
    bins.push({
      price: Number((minPrice + (i + 0.5) * binStep).toFixed(2)),
      volume: 0,
    });
  }

  // 將每根蠟燭的成交量平攤至其涵蓋的價位區間
  for (const bar of data) {
    const barLow = bar.low;
    const barHigh = bar.high;
    const vol = bar.volume || 0;
    if (vol <= 0) continue;

    const startIdx = Math.max(0, Math.min(binsCount - 1, Math.floor((barLow - minPrice) / binStep)));
    const endIdx = Math.max(0, Math.min(binsCount - 1, Math.floor((barHigh - minPrice) / binStep)));

    const span = Math.max(1, endIdx - startIdx + 1);
    const volPerBin = vol / span;

    for (let i = startIdx; i <= endIdx; i++) {
      bins[i].volume += volPerBin;
    }
  }

  // 尋找最大成交量檔位 (POC)
  let maxVol = 0;
  let pocIdx = 0;
  for (let i = 0; i < binsCount; i++) {
    if (bins[i].volume > maxVol) {
      maxVol = bins[i].volume;
      pocIdx = i;
    }
  }

  const poc = bins[pocIdx].price;

  // 計算 70% 價值區間 (Value Area: VAH & VAL)
  const targetAreaVolume = totalVolume * valueAreaRatio;
  let currentAreaVol = bins[pocIdx].volume;
  let upIdx = pocIdx;
  let downIdx = pocIdx;

  while (currentAreaVol < targetAreaVolume && (upIdx < binsCount - 1 || downIdx > 0)) {
    const nextUpVol = upIdx < binsCount - 1 ? bins[upIdx + 1].volume : -1;
    const nextDownVol = downIdx > 0 ? bins[downIdx - 1].volume : -1;

    if (nextUpVol >= nextDownVol && upIdx < binsCount - 1) {
      upIdx++;
      currentAreaVol += bins[upIdx].volume;
    } else if (downIdx > 0) {
      downIdx--;
      currentAreaVol += bins[downIdx].volume;
    } else if (upIdx < binsCount - 1) {
      upIdx++;
      currentAreaVol += bins[upIdx].volume;
    } else {
      break;
    }
  }

  const vah = bins[upIdx].price;
  const val = bins[downIdx].price;

  // 轉換為百分比格式供圖表呈現
  const tiers: VolumeProfileTier[] = bins.map((b) => ({
    price: b.price,
    volume: Math.round(b.volume),
    percent: maxVol > 0 ? Number(((b.volume / maxVol) * 100).toFixed(1)) : 0,
  }));

  return {
    tiers,
    poc,
    vah,
    val,
    totalVolume,
  };
}
