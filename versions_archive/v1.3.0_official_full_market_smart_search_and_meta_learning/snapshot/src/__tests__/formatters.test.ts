import { describe, it, expect } from 'vitest';
import { getMarketInfo, getCurrencySymbol, formatPrice, formatPercent } from '../utils/formatters';

describe('跨國金融格式化工具測試 (Formatters Test)', () => {
  it('各國市場標籤與徽章應正確對應', () => {
    expect(getMarketInfo('TW').label).toBe('台股');
    expect(getMarketInfo('TW').flag).toBe('🇹🇼');

    expect(getMarketInfo('US').label).toBe('美股');
    expect(getMarketInfo('US').flag).toBe('🇺🇸');

    expect(getMarketInfo('JP').label).toBe('日股');
    expect(getMarketInfo('JP').flag).toBe('🇯🇵');

    expect(getMarketInfo('KR').label).toBe('韓股');
    expect(getMarketInfo('KR').flag).toBe('🇰🇷');

    expect(getMarketInfo('CN').label).toBe('陸股');
    expect(getMarketInfo('CN').flag).toBe('🇨🇳');

    expect(getMarketInfo('HK').label).toBe('港股');
    expect(getMarketInfo('HK').flag).toBe('🇭🇰');

    expect(getMarketInfo('CRYPTO').label).toBe('加密');
    expect(getMarketInfo('CRYPTO').flag).toBe('🪙');

    // 未知兜底
    expect(getMarketInfo(undefined).label).toBe('其他');
  });

  it('各國法定貨幣與加密幣符號應精確對應', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
    expect(getCurrencySymbol('usd')).toBe('$');
    expect(getCurrencySymbol('TWD')).toBe('NT$');
    expect(getCurrencySymbol('JPY')).toBe('¥');
    expect(getCurrencySymbol('KRW')).toBe('₩');
    expect(getCurrencySymbol('CNY')).toBe('¥');
    expect(getCurrencySymbol('HKD')).toBe('HK$');
    expect(getCurrencySymbol('USDT')).toBe('₮');
    expect(getCurrencySymbol('EUR')).toBe('EUR ');
    expect(getCurrencySymbol('')).toBe('');
    expect(getCurrencySymbol(undefined)).toBe('');
  });

  it('股票價格格式化 (formatPrice) 應含千分位逗號與正確貨幣前綴', () => {
    expect(formatPrice(1234.56, 'USD')).toBe('$1,234.56');
    expect(formatPrice(22268, 'TWD')).toBe('NT$22,268.00');
    expect(formatPrice(38700, 'JPY')).toBe('¥38,700.00');
    expect(formatPrice(2680.5, 'KRW')).toBe('₩2,680.50');
    expect(formatPrice(17650, 'HKD')).toBe('HK$17,650.00');
    expect(formatPrice(61450.2, 'USDT')).toBe('₮61,450.20');
  });

  it('漲跌幅百分比格式化 (formatPercent) 應正確附加符號與小數位', () => {
    expect(formatPercent(2.35)).toBe('+2.35%');
    expect(formatPercent(-1.48)).toBe('-1.48%');
    expect(formatPercent(0)).toBe('0.00%');
    expect(formatPercent(2.35, false)).toBe('2.35%');
  });
});
