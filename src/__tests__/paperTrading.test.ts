import { describe, it, expect, beforeEach } from 'vitest';
import {
  PaperTradingService,
  getTickSize,
  stepPrice,
  roundToTick,
  calculateFee,
  calculateTax,
  calculateEstimate,
  getMarketSessionInfo,
  calculateSettlementDates,
  getSettlementAccountSummary,
  calculateDepthAndRatio,
  generateTimeAndSales,
  generateIntradayMinuteData,
} from '../services/paperTradingService';

describe('Yuanta Securities Paper Trading System & Real-Market Matching Engine', () => {
  beforeEach(() => {
    PaperTradingService.resetAccount(1000000);
  });

  describe('TWSE Tick Size Regulations', () => {
    it('returns exact tick size across all standard price tiers', () => {
      expect(getTickSize(5)).toBe(0.01);
      expect(getTickSize(9.99)).toBe(0.01);
      expect(getTickSize(10)).toBe(0.05);
      expect(getTickSize(49.95)).toBe(0.05);
      expect(getTickSize(50)).toBe(0.10);
      expect(getTickSize(99.9)).toBe(0.10);
      expect(getTickSize(100)).toBe(0.50);
      expect(getTickSize(499.5)).toBe(0.50);
      expect(getTickSize(500)).toBe(1.00);
      expect(getTickSize(999)).toBe(1.00);
      expect(getTickSize(1000)).toBe(5.00);
      expect(getTickSize(2500)).toBe(5.00);
    });

    it('steps price up and down accurately across tier boundaries', () => {
      // 9.99 -> 10.00
      expect(stepPrice(9.99, 'UP')).toBe(10.00);
      // 10.00 -> 9.99
      expect(stepPrice(10.00, 'DOWN')).toBe(9.99);
      // 10.00 -> 10.05
      expect(stepPrice(10.00, 'UP')).toBe(10.05);

      // 50.00 -> 49.95
      expect(stepPrice(50.00, 'DOWN')).toBe(49.95);
      // 50.00 -> 50.10
      expect(stepPrice(50.00, 'UP')).toBe(50.10);

      // 100.00 -> 99.90
      expect(stepPrice(100.00, 'DOWN')).toBe(99.90);
      // 100.00 -> 100.50
      expect(stepPrice(100.00, 'UP')).toBe(100.50);

      // 500.00 -> 499.50
      expect(stepPrice(500.00, 'DOWN')).toBe(499.50);
      // 500.00 -> 501.00
      expect(stepPrice(500.00, 'UP')).toBe(501.00);

      // 1000.00 -> 999.00
      expect(stepPrice(1000.00, 'DOWN')).toBe(999.00);
      // 1000.00 -> 1005.00
      expect(stepPrice(1000.00, 'UP')).toBe(1005.00);
    });

    it('rounds arbitrary numbers to valid ticks', () => {
      expect(roundToTick(23.47)).toBe(23.45);
      expect(roundToTick(55.27)).toBe(55.30);
      expect(roundToTick(103.2)).toBe(103.00);
      expect(roundToTick(601.7)).toBe(602.00);
    });
  });

  describe('Fee & Tax Estimator', () => {
    it('calculates brokerage fee at 0.1425% with 20 NTD minimum', () => {
      // 10,000 * 0.001425 = 14.25 -> clamped to 20
      expect(calculateFee(10000)).toBe(20);
      // 100,000 * 0.001425 = 142.5 -> rounds to 143
      expect(calculateFee(100000)).toBe(143);
    });

    it('calculates transaction tax at 0.3% only for sells', () => {
      expect(calculateTax(100000, 'BUY')).toBe(0);
      expect(calculateTax(100000, 'SELL')).toBe(300);
    });

    it('estimates total order requirements correctly', () => {
      const buyEst = calculateEstimate(100, 1000, 'BUY');
      expect(buyEst.amount).toBe(100000);
      expect(buyEst.fee).toBe(143);
      expect(buyEst.tax).toBe(0);
      expect(buyEst.total).toBe(100143);

      const sellEst = calculateEstimate(100, 1000, 'SELL');
      expect(sellEst.amount).toBe(100000);
      expect(sellEst.fee).toBe(143);
      expect(sellEst.tax).toBe(300);
      expect(sellEst.total).toBe(99557);
    });
  });

  describe('Market Session & Securities Exchange Law Rules', () => {
    it('identifies Crypto as 24/7 continuous matching', () => {
      const btcSession = getMarketSessionInfo('BTCUSDT', 'USD');
      expect(btcSession.status).toBe('OPEN');
      expect(btcSession.market).toBe('CRYPTO');
      expect(btcSession.canTradeMarketOrder).toBe(true);
      expect(btcSession.canMatchNow).toBe(true);
    });

    it('determines TWSE trading sessions correctly based on simulated dates', () => {
      // Wednesday 10:30 AM TW time (UTC 02:30 AM)
      const twContinuousTime = new Date(Date.UTC(2026, 8, 2, 2, 30)); // 2026-09-02 Wed 10:30 UTC+8
      const sessionOpen = getMarketSessionInfo('2330', 'TWD', twContinuousTime);
      expect(sessionOpen.status).toBe('OPEN');
      expect(sessionOpen.canTradeMarketOrder).toBe(true);
      expect(sessionOpen.canMatchNow).toBe(true);

      // Wednesday 08:45 AM TW time (UTC 00:45 AM) -> Call Auction
      const twCallAuctionTime = new Date(Date.UTC(2026, 8, 2, 0, 45));
      const sessionCall = getMarketSessionInfo('2330', 'TWD', twCallAuctionTime);
      expect(sessionCall.status).toBe('CALL_AUCTION');
      expect(sessionCall.canTradeMarketOrder).toBe(false);
      expect(sessionCall.canMatchNow).toBe(false);

      // Wednesday 13:45 TW time -> After Hours
      const twAfterHoursTime = new Date(Date.UTC(2026, 8, 2, 5, 45));
      const sessionAfter = getMarketSessionInfo('2330', 'TWD', twAfterHoursTime);
      expect(sessionAfter.status).toBe('AFTER_HOURS');
      expect(sessionAfter.canTradeMarketOrder).toBe(false);

      // Sunday 11:00 AM TW time -> Weekend Closed
      const twSunTime = new Date(Date.UTC(2026, 8, 6, 3, 0));
      const sessionWeekend = getMarketSessionInfo('2330', 'TWD', twSunTime);
      expect(sessionWeekend.status).toBe('CLOSED');
      expect(sessionWeekend.canTradeMarketOrder).toBe(false);
    });

    it('determines US stock sessions correctly based on simulated dates', () => {
      // Wednesday 10:30 AM EDT (UTC 14:30)
      const usOpenTime = new Date(Date.UTC(2026, 8, 2, 14, 30));
      const sessionOpen = getMarketSessionInfo('AAPL', 'USD', usOpenTime);
      expect(sessionOpen.status).toBe('OPEN');
      expect(sessionOpen.market).toBe('US');
      expect(sessionOpen.canTradeMarketOrder).toBe(true);

      // Sunday -> Closed
      const usSunTime = new Date(Date.UTC(2026, 8, 6, 14, 30));
      const sessionClosed = getMarketSessionInfo('AAPL', 'USD', usSunTime);
      expect(sessionClosed.status).toBe('CLOSED');
      expect(sessionClosed.canTradeMarketOrder).toBe(false);
    });

    it('strictly enforces TWSE ±10% Price Limit Rule (證交法第60條)', () => {
      const wednesdayOpenTime = new Date(Date.UTC(2026, 8, 2, 2, 30));
      // Reference close price = 1000. Limit Up = 1100, Limit Down = 900.

      // Order above 10% limit up: 1105 -> REJECTED
      const orderAbove = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        orderPrice: 1105,
        shares: 1000,
        currentMarketPrice: 1000,
        referenceClosePrice: 1000,
        simulatedNow: wednesdayOpenTime,
      });
      expect(orderAbove.success).toBe(false);
      expect(orderAbove.message).toContain('【證交法規則退單】');
      expect(orderAbove.message).toContain('超出今日法定漲停價');

      // Order below 10% limit down: 895 -> REJECTED
      const orderBelow = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        orderPrice: 895,
        shares: 1000,
        currentMarketPrice: 1000,
        referenceClosePrice: 1000,
        simulatedNow: wednesdayOpenTime,
      });
      expect(orderBelow.success).toBe(false);
      expect(orderBelow.message).toContain('【證交法規則退單】');
      expect(orderBelow.message).toContain('低於今日法定跌停價');
    });

    it('strictly rejects market orders during off-hours according to TWSE regulations', () => {
      const sundayTime = new Date(Date.UTC(2026, 8, 6, 3, 0));
      const marketRes = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        priceType: 'MARKET',
        orderPrice: 1000,
        shares: 1000,
        currentMarketPrice: 1000,
        simulatedNow: sundayTime,
      });

      expect(marketRes.success).toBe(false);
      expect(marketRes.message).toContain('【證交法規則退單】');
      expect(marketRes.message).toContain('不接受市價單');
    });

    it('places limit orders as pre-orders (PENDING) during off-hours without immediate fill', () => {
      const sundayTime = new Date(Date.UTC(2026, 8, 6, 3, 0));
      const res = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 1000,
        shares: 500,
        currentMarketPrice: 1000,
        referenceClosePrice: 1000,
        simulatedNow: sundayTime,
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('預約掛單成功');
      expect(res.order?.status).toBe('PENDING');
      expect(res.order?.isPreOrder).toBe(true);

      const account = PaperTradingService.getAccount();
      expect(account.positions).toHaveLength(0); // MUST NOT fill immediately
      expect(account.orders[0].status).toBe('PENDING');
    });
  });

  describe('Real Price-Time Queueing & Touch Matching Engine', () => {
    const wednesdayOpenTime = new Date(Date.UTC(2026, 8, 2, 2, 30));

    it('queues buy limit order as PENDING when orderPrice < marketPrice (never fills instantly)', () => {
      const res = PaperTradingService.placeOrder({
        symbol: '2454',
        name: '聯發科',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 1200,
        shares: 500,
        currentMarketPrice: 1250,
        referenceClosePrice: 1250,
        simulatedNow: wednesdayOpenTime,
      });

      expect(res.success).toBe(true);
      expect(res.order?.status).toBe('PENDING');
      expect(res.order?.note).toContain('買盤低接排隊中');

      const account = PaperTradingService.getAccount();
      expect(account.positions).toHaveLength(0); // Not filled
      expect(account.orders[0].status).toBe('PENDING');
    });

    it('fills buy limit order immediately when orderPrice >= marketPrice during open session', () => {
      const res = PaperTradingService.placeOrder({
        symbol: '2454',
        name: '聯發科',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 1250,
        shares: 500,
        currentMarketPrice: 1250,
        referenceClosePrice: 1250,
        simulatedNow: wednesdayOpenTime,
      });

      expect(res.success).toBe(true);
      expect(res.order?.status).toBe('FILLED');

      const account = PaperTradingService.getAccount();
      expect(account.positions).toHaveLength(1);
      expect(account.positions[0].symbol).toBe('2454');
      expect(account.positions[0].shares).toBe(500);
      expect(account.positions[0].avgCostPrice).toBe(1250);
    });

    it('matches queued order when market price drops and triggers simulated matching', () => {
      // 1. Place low buy limit order @ 180 (current market price is 185)
      PaperTradingService.placeOrder({
        symbol: '2317',
        name: '鴻海',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 180,
        shares: 1000,
        currentMarketPrice: 185,
        referenceClosePrice: 185,
        simulatedNow: wednesdayOpenTime,
      });

      let account = PaperTradingService.getAccount();
      expect(account.orders[0].status).toBe('PENDING');

      // 2. Market price touches 180 or drops below -> triggers simulated matching
      const matchRes = PaperTradingService.triggerSimulatedMatching({ '2317': 179 });
      expect(matchRes.success).toBe(true);
      expect(matchRes.filledCount).toBe(1);

      account = PaperTradingService.getAccount();
      expect(account.orders[0].status).toBe('FILLED');
      expect(account.positions).toHaveLength(1);
      expect(account.positions[0].symbol).toBe('2317');
      expect(account.positions[0].shares).toBe(1000);
      expect(account.positions[0].avgCostPrice).toBe(180);
    });

    it('supports bypassMarketHoursCheck mode for continuous simulation testing', () => {
      // Test buy
      const buyRes = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        priceType: 'MARKET',
        orderPrice: 100,
        shares: 1000,
        currentMarketPrice: 100,
        bypassMarketHoursCheck: true,
      });
      expect(buyRes.success).toBe(true);
      expect(buyRes.order?.status).toBe('FILLED');

      // Test sell
      const sellRes = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'SELL',
        priceType: 'MARKET',
        orderPrice: 120,
        shares: 1000,
        currentMarketPrice: 120,
        bypassMarketHoursCheck: true,
      });
      expect(sellRes.success).toBe(true);
      expect(sellRes.order?.status).toBe('FILLED');

      const account = PaperTradingService.getAccount();
      expect(account.positions).toHaveLength(0); // closed
      expect(account.balance).toBeGreaterThan(900000);
    });
  });

  describe('Taiwan Securities Exchange Law T+2 Settlement & Fund Management', () => {
    it('calculates settlement dates skipping weekends properly', () => {
      // Wednesday trade -> Friday 10:00 AM settlement
      const wedTrade = new Date('2026-09-02T10:00:00+08:00');
      const wedRes = calculateSettlementDates(wedTrade);
      expect(wedRes.t2Date.getDay()).toBe(5); // Friday
      expect(wedRes.t2Date.getHours()).toBe(10);
      expect(wedRes.t2Date.getMinutes()).toBe(0);

      // Thursday trade -> Monday 10:00 AM settlement (skips Sat, Sun)
      const thuTrade = new Date('2026-09-03T10:00:00+08:00');
      const thuRes = calculateSettlementDates(thuTrade);
      expect(thuRes.t2Date.getDay()).toBe(1); // Monday
      expect(thuRes.t2Date.getHours()).toBe(10);

      // Friday trade -> Tuesday 10:00 AM settlement (skips Sat, Sun)
      const friTrade = new Date('2026-09-04T10:00:00+08:00');
      const friRes = calculateSettlementDates(friTrade);
      expect(friRes.t2Date.getDay()).toBe(2); // Tuesday
      expect(friRes.t2Date.getHours()).toBe(10);
    });

    it('accurately calculates availableForTrading purchasing power with pending buy reserves and settlements', () => {
      const account = PaperTradingService.getAccount();
      expect(account.balance).toBe(1000000);

      const summary = getSettlementAccountSummary(account);
      expect(summary.cashBalance).toBe(1000000);
      expect(summary.availableForTrading).toBe(1000000);
      expect(summary.workingBuyReserved).toBe(0);
      expect(summary.totalPendingPayables).toBe(0);
      expect(summary.totalPendingReceivables).toBe(0);
    });

    it('records settlement ledger entry when an order is filled', () => {
      const buyRes = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 500,
        shares: 1000,
        currentMarketPrice: 500,
        referenceClosePrice: 500,
        bypassMarketHoursCheck: true,
      });

      expect(buyRes.success).toBe(true);
      expect(buyRes.order?.status).toBe('FILLED');

      const account = PaperTradingService.getAccount();
      const ledger = account.settlementLedger || [];
      expect(ledger.length).toBeGreaterThanOrEqual(1);

      const entry = ledger[0];
      expect(entry.symbol).toBe('2330');
      expect(entry.side).toBe('BUY');
      expect(entry.netAmount).toBeLessThan(0); // Payable is negative net
      expect(entry.status).toBe('PENDING');
    });

    it('enforces available purchasing power constraint on new buy orders', () => {
      // Reset account with 10,000 NTD
      PaperTradingService.resetAccount(10000);

      // Try to buy 1,000 shares @ 100 NTD = 100,000 NTD (exceeds 10,000)
      const res = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 100,
        shares: 1000,
        currentMarketPrice: 100,
        bypassMarketHoursCheck: true,
      });

      expect(res.success).toBe(false);
      expect(res.message).toContain('可用資金不足');
    });
  });

  describe('Order Book 5-Depth, Long/Short Ratio & Intraday Trading Data', () => {
    it('generates 5 bid and 5 ask levels with valid prices and volumes', () => {
      const depth = calculateDepthAndRatio('2330', 500);
      expect(depth.asks).toHaveLength(5);
      expect(depth.bids).toHaveLength(5);

      // Asks in terminal order: 賣五(top, highest) down to 賣一(bottom, lowest ask)
      for (let i = 0; i < depth.asks.length - 1; i++) {
        expect(depth.asks[i].price).toBeGreaterThan(depth.asks[i + 1].price);
      }

      // Bids in terminal order: 買一(top, highest bid) down to 買五(bottom, lowest bid)
      for (let i = 0; i < depth.bids.length - 1; i++) {
        expect(depth.bids[i].price).toBeGreaterThan(depth.bids[i + 1].price);
      }

      // Lowest ask (賣一) should be strictly greater than highest bid (買一)
      expect(depth.asks[depth.asks.length - 1].price).toBeGreaterThan(depth.bids[0].price);

      // Long/Short ratio must sum to 100%
      expect(depth.longRatio + depth.shortRatio).toBeCloseTo(100, 1);
      expect(depth.totalBidVol).toBeGreaterThan(0);
      expect(depth.totalAskVol).toBeGreaterThan(0);
      expect(['BULLISH', 'BEARISH', 'NEUTRAL']).toContain(depth.sentiment);
    });

    it('generates intraday time & sales ticks with in/out trade detection and block trades', () => {
      const data = generateTimeAndSales('2330', 500, 495);
      expect(data.ticks.length).toBeGreaterThan(0);
      expect(data.totalInLots).toBeGreaterThanOrEqual(0);
      expect(data.totalOutLots).toBeGreaterThanOrEqual(0);

      const firstTick = data.ticks[0];
      expect(firstTick).toHaveProperty('time');
      expect(firstTick).toHaveProperty('price');
      expect(firstTick).toHaveProperty('shares');
      expect(firstTick).toHaveProperty('type');
      expect(['BUY_OUT', 'SELL_IN', 'NEUTRAL']).toContain(firstTick.type);
      expect(typeof firstTick.isBlockTrade).toBe('boolean');
    });

    it('generates intraday minute curve with running VWAP line', () => {
      const minutes = generateIntradayMinuteData('2330', 500, 495);
      expect(minutes.length).toBeGreaterThan(0);

      const midPoint = minutes[Math.floor(minutes.length / 2)];
      expect(midPoint).toHaveProperty('time');
      expect(midPoint).toHaveProperty('price');
      expect(midPoint).toHaveProperty('avgPrice');
      expect(midPoint).toHaveProperty('volume');
      expect(midPoint.avgPrice).toBeGreaterThan(0);
      expect(midPoint.price).toBeGreaterThan(0);
    });

    it('retains remaining availableForTrading after buy order execution and auto-settles when T+2 arrives', () => {
      PaperTradingService.resetAccount(1000000);
      const buyRes = PaperTradingService.placeOrder({
        symbol: '2330',
        name: '台積電',
        side: 'BUY',
        priceType: 'LIMIT',
        orderPrice: 100,
        shares: 1000, // 100,000 NTD + fee ~100,143
        currentMarketPrice: 100,
        referenceClosePrice: 100,
        bypassMarketHoursCheck: true,
      });
      expect(buyRes.success).toBe(true);

      const account = PaperTradingService.getAccount();
      // Available trading power must be approx 900,000, NOT 0 or double-deducted
      expect(account.balance).toBeLessThan(900000);
      expect(account.balance).toBeGreaterThan(899000);

      const summary = getSettlementAccountSummary(account);
      expect(summary.availableForTrading).toBe(account.balance);
      expect(summary.availableForTrading).toBeGreaterThan(899000);
      expect(summary.settlementEntries[0].status).toBe('PENDING');

      // Fast forward 5 days later (past T+2)
      const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const futureSummary = getSettlementAccountSummary(account, futureDate);
      expect(futureSummary.settlementEntries[0].status).toBe('SETTLED');
    });
  });
});
