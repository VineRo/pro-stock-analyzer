import { MarketType } from '../types/stock';

export interface MarketInfo {
  label: string;
  shortCode: string;
  flag: string;
  badgeClass: string;
}

/**
 * 取得跨國市場標準繁體中文名稱、縮寫與 Tailwind 視覺徽章樣式
 */
export function getMarketInfo(market?: MarketType): MarketInfo {
  switch (market) {
    case 'TW':
      return {
        label: '台股',
        shortCode: 'TW',
        flag: '🇹🇼',
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      };
    case 'US':
      return {
        label: '美股',
        shortCode: 'US',
        flag: '🇺🇸',
        badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      };
    case 'JP':
      return {
        label: '日股',
        shortCode: 'JP',
        flag: '🇯🇵',
        badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      };
    case 'KR':
      return {
        label: '韓股',
        shortCode: 'KR',
        flag: '🇰🇷',
        badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      };
    case 'CN':
      return {
        label: '陸股',
        shortCode: 'CN',
        flag: '🇨🇳',
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      };
    case 'HK':
      return {
        label: '港股',
        shortCode: 'HK',
        flag: '🇭🇰',
        badgeClass: 'bg-red-500/20 text-red-300 border-red-500/30',
      };
    case 'CRYPTO':
      return {
        label: '加密',
        shortCode: 'CRYPTO',
        flag: '🪙',
        badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      };
    default:
      return {
        label: '其他',
        shortCode: market || 'GLOBAL',
        flag: '🌐',
        badgeClass: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      };
  }
}

/**
 * 取得貨幣前綴符號
 */
export function getCurrencySymbol(currency?: string): string {
  if (!currency) return '';
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'TWD': return 'NT$';
    case 'JPY': return '¥';
    case 'KRW': return '₩';
    case 'CNY': return '¥';
    case 'HKD': return 'HK$';
    case 'USDT': return '₮';
    default: return `${currency} `;
  }
}

/**
 * 格式化股票價格（含貨幣符號與千分位小數）
 */
export function formatPrice(price: number, currency?: string, decimals = 2): string {
  if (isNaN(price) || !isFinite(price)) return '0.00';
  const symbol = getCurrencySymbol(currency);
  const resolvedDecimals = (decimals === 2 && price > 0 && price < 0.1)
    ? (price < 0.001 ? 6 : 4)
    : decimals;
  const formattedNumber = price.toLocaleString('en-US', {
    minimumFractionDigits: resolvedDecimals,
    maximumFractionDigits: resolvedDecimals,
  });
  return `${symbol}${formattedNumber}`;
}

/**
 * 格式化漲跌幅百分比字串 (例如 "+1.25%", "-0.48%")
 */
export function formatPercent(percent: number, includeSign = true): string {
  if (isNaN(percent) || !isFinite(percent)) return '0.00%';
  const sign = includeSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * 格式化成交量 (例如 "27.82M", "1.45K", "850")
 */
export function formatVolume(volume?: number): string {
  if (volume == null || isNaN(volume) || !isFinite(volume)) return '0';
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`;
  }
  return volume.toLocaleString();
}
