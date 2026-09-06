import { describe, it, expect, beforeEach } from 'vitest';
import { PaperTradingService } from '../services/paperTradingService';

describe('台股法定交易模式 (整張 / 盤中零股 / 盤後零股 / 盤後定價)', () => {
  beforeEach(() => {
    PaperTradingService.resetAccount(3000000);
  });

  it('整張交易 (ROUND_LOT) 應正確以 1,000 股為單位並執行撮合', () => {
    const res = PaperTradingService.placeOrder({
      symbol: '2330.TW',
      name: '台積電',
      side: 'BUY',
      orderPrice: 1025.0,
      shares: 1000,
      currentMarketPrice: 1025.0,
      sessionMode: 'ROUND_LOT',
      bypassMarketHoursCheck: true,
    });

    expect(res.success).toBe(true);
    expect(res.order?.shares).toBe(1000);
    expect(res.order?.sessionMode).toBe('ROUND_LOT');

    const account = PaperTradingService.getAccount();
    const pos = account.positions.find((p) => p.symbol === '2330.TW');
    expect(pos).toBeDefined();
    expect(pos?.shares).toBe(1000);
  });

  it('盤中零股 (INTRADAY_ODD) 應自動標記為 ODD_LOT 並支援 1~999 股', () => {
    const res = PaperTradingService.placeOrder({
      symbol: '2330.TW',
      name: '台積電',
      side: 'BUY',
      orderPrice: 1025.0,
      shares: 250,
      currentMarketPrice: 1025.0,
      sessionMode: 'INTRADAY_ODD',
      bypassMarketHoursCheck: true,
    });

    expect(res.success).toBe(true);
    expect(res.order?.shares).toBe(250);
    expect(res.order?.tradeType).toBe('ODD_LOT');
    expect(res.order?.sessionMode).toBe('INTRADAY_ODD');

    const account = PaperTradingService.getAccount();
    const pos = account.positions.find((p) => p.symbol === '2330.TW');
    expect(pos?.shares).toBe(250);
  });

  it('盤後定價交易 (AFTER_HOURS_FIXED) 應自動鎖定委託價格為收盤價', () => {
    const res = PaperTradingService.placeOrder({
      symbol: '2330.TW',
      name: '台積電',
      side: 'BUY',
      orderPrice: 900.0, // 使用者輸入非收盤價
      shares: 1000,
      currentMarketPrice: 1025.0,
      referenceClosePrice: 1025.0,
      sessionMode: 'AFTER_HOURS_FIXED',
      bypassMarketHoursCheck: true,
    });

    expect(res.success).toBe(true);
    // 應自動校準為收盤價 $1,025.00
    expect(res.order?.orderPrice).toBe(1025.0);
    expect(res.order?.sessionMode).toBe('AFTER_HOURS_FIXED');
  });

  it('盤後零股 (AFTER_HOURS_ODD) 應以零股標記排入預約或成交', () => {
    const res = PaperTradingService.placeOrder({
      symbol: '2330.TW',
      name: '台積電',
      side: 'BUY',
      orderPrice: 1025.0,
      shares: 75,
      currentMarketPrice: 1025.0,
      sessionMode: 'AFTER_HOURS_ODD',
      bypassMarketHoursCheck: true,
    });

    expect(res.success).toBe(true);
    expect(res.order?.tradeType).toBe('ODD_LOT');
    expect(res.order?.sessionMode).toBe('AFTER_HOURS_ODD');
  });
});
