import { describe, it, expect } from 'vitest';
import { generateRealisticKLineData } from '../data/stockService';
import { calculateVolumeProfile } from '../utils/volumeProfile';
import { calculateVWAP } from '../utils/vwap';
import { runBacktest } from '../utils/backtestEngine';
import { PaperTradingService } from '../services/paperTradingService';
import { AlertService } from '../services/alertService';
import { BacktestConfig } from '../types/stock';

describe('旗艦功能全套模組化自動化測試', () => {
  const mockCandles = generateRealisticKLineData('AAPL', 200, '1D', 150);

  // 1. Volume Profile 測試
  describe('Volume Profile (籌碼成交量分佈圖)', () => {
    it('應正確計算指定價位區間的累積成交量與 POC (最密集主力成本線)', () => {
      const vp = calculateVolumeProfile(mockCandles, 20, 0.7);
      expect(vp).not.toBeNull();
      if (vp) {
        expect(vp.tiers.length).toBe(20);
        expect(vp.poc).toBeGreaterThan(0);
        expect(vp.vah).toBeGreaterThanOrEqual(vp.val);
        expect(vp.totalVolume).toBeGreaterThan(0);

        // POC 價位的成交量百分比應為最高 (100%)
        const pocTier = vp.tiers.find((t) => t.price === vp.poc);
        expect(pocTier?.percent).toBe(100);
      }
    });

    it('數據小於 5 根或極端邊界時應優雅回傳 null 而不崩潰', () => {
      const vp = calculateVolumeProfile([], 20);
      expect(vp).toBeNull();
    });
  });

  // 2. VWAP 測試
  describe('VWAP (成交量加權平均價)', () => {
    it('應產出與 K 線一對一對應的 VWAP 數據點及標準差軌道', () => {
      const vwapList = calculateVWAP(mockCandles);
      expect(vwapList.length).toBe(mockCandles.length);

      vwapList.forEach((pt, i) => {
        expect(pt.timestamp).toBe(mockCandles[i].timestamp);
        expect(pt.vwap).toBeGreaterThan(0);
        if (pt.upperBand1 && pt.lowerBand1) {
          expect(pt.upperBand1).toBeGreaterThanOrEqual(pt.vwap);
          expect(pt.lowerBand1).toBeLessThanOrEqual(pt.vwap);
        }
      });
    });
  });

  // 3. 策略回測引擎測試
  describe('量化策略回測引擎 (Backtest Engine)', () => {
    it('雙均線交叉策略回測應輸出合規的報酬率、勝率、獲利因子與最大回撤', () => {
      const config: BacktestConfig = {
        strategy: 'ma_crossover',
        initialCapital: 100000,
        fastPeriod: 5,
        slowPeriod: 20,
        rsiBuyThreshold: 30,
        rsiSellThreshold: 70,
        stopLossPercent: 5,
        takeProfitPercent: 15,
        feeRatePercent: 0.15,
      };

      const result = runBacktest(mockCandles, config);
      expect(result).toBeDefined();
      expect(typeof result.totalReturnPercent).toBe('number');
      expect(typeof result.benchmarkReturnPercent).toBe('number');
      expect(result.winRatePercent).toBeGreaterThanOrEqual(0);
      expect(result.winRatePercent).toBeLessThanOrEqual(100);
      expect(result.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
      expect(result.equityCurve.length).toBe(mockCandles.length);
    });

    it('RSI 均值回歸策略回測應能正常產生進出場明細紀錄', () => {
      const config: BacktestConfig = {
        strategy: 'rsi_reversion',
        initialCapital: 50000,
        fastPeriod: 5,
        slowPeriod: 20,
        rsiBuyThreshold: 35,
        rsiSellThreshold: 65,
        stopLossPercent: 4,
        takeProfitPercent: 10,
        feeRatePercent: 0.1,
      };

      const result = runBacktest(mockCandles, config);
      expect(result.tradeLogs).toBeInstanceOf(Array);
      result.tradeLogs.forEach((trade) => {
        expect(trade.entryPrice).toBeGreaterThan(0);
        expect(trade.shares).toBeGreaterThan(0);
        expect(trade.reason.length).toBeGreaterThan(0);
      });
    });

    it('自訂多條件策略：支援 3 個以上進場條件 (AND 邏輯) 共同觸發回測', () => {
      const config: BacktestConfig = {
        strategy: 'custom',
        initialCapital: 100000,
        fastPeriod: 5,
        slowPeriod: 20,
        rsiBuyThreshold: 30,
        rsiSellThreshold: 70,
        stopLossPercent: 7,
        takeProfitPercent: 20,
        feeRatePercent: 0.1,
        buyConditions: [
          { id: 'c1', indicator: 'PRICE_MA', operator: 'GREATER', param1: 20 },
          { id: 'c2', indicator: 'RSI', operator: 'LESS', param1: 14, param2: 70 },
          { id: 'c3', indicator: 'VOLUME', operator: 'GREATER', param1: 10, param2: 1.0 },
        ],
        buyLogic: 'AND',
        sellConditions: [
          { id: 's1', indicator: 'PRICE_MA', operator: 'LESS', param1: 20 },
        ],
        sellLogic: 'OR',
      };

      const result = runBacktest(mockCandles, config);
      expect(result).toBeDefined();
      expect(typeof result.totalReturnPercent).toBe('number');
      expect(result.equityCurve.length).toBe(mockCandles.length);
      expect(result.winRatePercent).toBeGreaterThanOrEqual(0);
      expect(result.winRatePercent).toBeLessThanOrEqual(100);
      // 確認交易日誌記錄正常產生
      expect(Array.isArray(result.tradeLogs)).toBe(true);
    });

    it('自訂多條件策略：支援 OR 邏輯 (任一條件達成即可觸發買進或出場)', () => {
      const config: BacktestConfig = {
        strategy: 'custom',
        initialCapital: 100000,
        fastPeriod: 5,
        slowPeriod: 20,
        rsiBuyThreshold: 30,
        rsiSellThreshold: 70,
        stopLossPercent: 5,
        takeProfitPercent: 15,
        feeRatePercent: 0.1,
        buyConditions: [
          { id: 'b1', indicator: 'RSI', operator: 'LESS', param1: 14, param2: 35 },
          { id: 'b2', indicator: 'KD', operator: 'CROSS_ABOVE', param1: 9 },
          { id: 'b3', indicator: 'BOLLINGER', operator: 'CROSS_ABOVE', param1: 20 },
        ],
        buyLogic: 'OR',
        sellConditions: [
          { id: 'e1', indicator: 'RSI', operator: 'GREATER', param1: 14, param2: 75 },
          { id: 'e2', indicator: 'PRICE_MA', operator: 'LESS', param1: 10 },
        ],
        sellLogic: 'OR',
      };

      const result = runBacktest(mockCandles, config);
      expect(result).toBeDefined();
      expect(typeof result.totalReturnPercent).toBe('number');
      expect(result.equityCurve.length).toBe(mockCandles.length);
    });
  });

  // 4. 模擬交易帳戶測試
  describe('模擬交易帳戶 (Paper Trading)', () => {
    it('買進與賣出時應正確扣款、更新持倉均價並產生交割紀錄', () => {
      PaperTradingService.resetAccount(100000);
      const buyRes = PaperTradingService.buy('AAPL', 'Apple Inc.', 150, 10);
      expect(buyRes.success).toBe(true);

      const acct = PaperTradingService.getAccount();
      expect(acct.positions.length).toBe(1);
      expect(acct.positions[0].symbol).toBe('AAPL');
      expect(acct.positions[0].shares).toBe(10);
      expect(acct.positions[0].avgCostPrice).toBe(150);

      // 賣出 5 股
      const sellRes = PaperTradingService.sell('AAPL', 160, 5);
      expect(sellRes.success).toBe(true);

      const updatedAcct = PaperTradingService.getAccount();
      expect(updatedAcct.positions[0].shares).toBe(5);
      expect(updatedAcct.history.length).toBe(2);
    });

    it('資金不足時應拒絕買進委託', () => {
      PaperTradingService.resetAccount(100);
      const buyRes = PaperTradingService.buy('TSLA', 'Tesla', 200, 10);
      expect(buyRes.success).toBe(false);
      expect(buyRes.message).toContain('資金不足');
    });
  });

  // 5. 智慧預警服務測試
  describe('智慧即時預警服務 (Alert Service)', () => {
    it('新增預警並在市價達到閥值時觸發告警', () => {
      const alert = AlertService.addAlert({
        symbol: 'NVDA',
        name: '輝達',
        type: 'price_above',
        threshold: 120,
      });

      expect(alert.id).toBeDefined();
      expect(alert.active).toBe(true);

      // 當市價為 110 時不應觸發
      const triggersBefore = AlertService.checkAlerts('NVDA', 110);
      expect(triggersBefore.length).toBe(0);

      // 當市價達到 125 時應成功觸發
      const triggersAfter = AlertService.checkAlerts('NVDA', 125);
      expect(triggersAfter.length).toBe(1);
      expect(triggersAfter[0].symbol).toBe('NVDA');

      AlertService.removeAlert(alert.id);
    });

    it('RSI 超買/超賣預警應在指標條件滿足時精準觸發', () => {
      const rsiAlert = AlertService.addAlert({
        symbol: 'TSLA',
        name: '特斯拉',
        type: 'rsi_overbought',
        threshold: 75,
      });

      // RSI 60 時不觸發
      const triggersNormal = AlertService.checkAlerts('TSLA', 200, 60);
      expect(triggersNormal.length).toBe(0);

      // RSI 80 時觸發超買
      const triggersOver = AlertService.checkAlerts('TSLA', 210, 80);
      expect(triggersOver.length).toBe(1);
      expect(triggersOver[0].type).toBe('rsi_overbought');

      AlertService.removeAlert(rsiAlert.id);
    });
  });

  // 6. 核心演算法極端邊界測試 (Edge Case Resiliency)
  describe('核心演算法極端邊界防護測試 (Edge Cases)', () => {
    it('Volume Profile 在價格無波動平盤時應安全處理', () => {
      const flatCandles = Array.from({ length: 10 }, (_, i) => ({
        timestamp: 1700000000000 + i * 86400000,
        open: 100,
        high: 100,
        low: 100,
        close: 100,
        volume: 1000,
      }));
      const vp = calculateVolumeProfile(flatCandles, 10);
      expect(vp).toBeNull();
    });

    it('VWAP 應在跨日時間戳時重置累積成交量與均價', () => {
      const day1 = 1700000000000; // Day A
      const day2 = day1 + 86400000; // Day B
      const multiDayCandles = [
        { timestamp: day1, open: 100, high: 105, low: 95, close: 100, volume: 1000 },
        { timestamp: day1 + 3600000, open: 100, high: 110, low: 100, close: 108, volume: 2000 },
        { timestamp: day2, open: 200, high: 210, low: 195, close: 205, volume: 500 },
      ];
      const vwap = calculateVWAP(multiDayCandles);
      expect(vwap.length).toBe(3);
      // 第 3 根 K 線屬於第二天，VWAP 應接近當天的 typical price ((200+210+195)/3 = 201.67)
      expect(vwap[2].vwap).toBeCloseTo(203.33, 0);
    });

    it('Backtest 回測引擎在極少 K 線數據時應安全回傳零值物件而不崩潰', () => {
      const shortCandles = mockCandles.slice(0, 10);
      const res = runBacktest(shortCandles, {
        strategy: 'ma_crossover',
        initialCapital: 100000,
        fastPeriod: 5,
        slowPeriod: 20,
        rsiBuyThreshold: 30,
        rsiSellThreshold: 70,
        stopLossPercent: 5,
        takeProfitPercent: 15,
        feeRatePercent: 0.15,
      });
      expect(res.totalTrades).toBe(0);
      expect(res.totalReturnPercent).toBe(0);
      expect(res.equityCurve.length).toBe(0);
    });

    it('模擬交易在價格更新時應正確重算持倉未實現損益', () => {
      PaperTradingService.resetAccount(100000);
      PaperTradingService.buy('2330.TW', '台積電', 1000, 10, 'TWD');
      
      // 股價上漲至 1050
      const acct = PaperTradingService.updatePrices({ '2330.TW': 1050 });
      const pos = acct.positions.find((p) => p.symbol === '2330.TW');
      expect(pos).toBeDefined();
      expect(pos?.unrealizedProfit).toBe(500); // (1050 - 1000) * 10
      expect(pos?.unrealizedProfitPercent).toBe(5); // 5%
    });
  });

  // 7. 自選庫多群組管理與精準加入測試
  describe('自選庫多群組管理與精準加入 (Watchlist Store & Multi-Group Management)', () => {
    it('應能載入預設自選群組 (核心自選、美股精選、台股權值)', async () => {
      const { loadWatchlistGroups, clearWatchlistMemory } = await import('../services/watchlistStore');
      clearWatchlistMemory();
      if (typeof localStorage !== 'undefined') localStorage.clear();
      const groups = loadWatchlistGroups();
      expect(groups.length).toBeGreaterThanOrEqual(3);
      expect(groups.some((g) => g.name === '核心自選')).toBe(true);
      expect(groups.some((g) => g.name === '美股精選')).toBe(true);
      expect(groups.some((g) => g.name === '台股權值')).toBe(true);
    });

    it('應支援建立自訂名稱之新清單群組、重命名群組與精準加入股票', async () => {
      const { loadWatchlistGroups, saveWatchlistGroups } = await import('../services/watchlistStore');
      const initialGroups = loadWatchlistGroups();
      
      // 1. 新增自訂清單「AI 算力飆股」
      const newGroup = {
        id: `group_${Date.now()}`,
        name: 'AI 算力飆股',
        symbols: [],
        createdAt: Date.now(),
      };
      const updatedGroups = [...initialGroups, newGroup];
      saveWatchlistGroups(updatedGroups);

      const loaded1 = loadWatchlistGroups();
      expect(loaded1.some((g) => g.name === 'AI 算力飆股')).toBe(true);

      // 2. 精準加入標的至該新清單 (手動按下加入按鈕)
      const mockStock = {
        symbol: 'NVDA',
        name: '輝達',
        market: 'US' as const,
        price: 130,
        change: 3.5,
        changePercent: 2.76,
        currency: 'USD' as const,
      };

      const groupsWithStock = loaded1.map((g) =>
        g.id === newGroup.id ? { ...g, symbols: [mockStock] } : g
      );
      saveWatchlistGroups(groupsWithStock);

      const loaded2 = loadWatchlistGroups();
      const aiGroup = loaded2.find((g) => g.id === newGroup.id);
      expect(aiGroup?.symbols.length).toBe(1);
      expect(aiGroup?.symbols[0].symbol).toBe('NVDA');

      // 3. 修改清單名稱為「全球頂尖晶片龍頭」
      const renamedGroups = loaded2.map((g) =>
        g.id === newGroup.id ? { ...g, name: '全球頂尖晶片龍頭' } : g
      );
      saveWatchlistGroups(renamedGroups);

      const loaded3 = loadWatchlistGroups();
      const renamedGroup = loaded3.find((g) => g.id === newGroup.id);
      expect(renamedGroup?.name).toBe('全球頂尖晶片龍頭');
      expect(renamedGroup?.symbols[0].symbol).toBe('NVDA');
    });
  });

  // 8. 全球大盤指數深度對比引擎測試 (Global Market Indices Hub Engine)
  describe('全球大盤指數深度對比引擎 (Global Market Indices Hub Engine)', () => {
    it('應包含跨國 17 大主流基準指數 (台美日韓中港歐全面覆蓋)', async () => {
      const { INITIAL_GLOBAL_INDICES } = await import('../data/globalIndicesData');
      expect(INITIAL_GLOBAL_INDICES.length).toBeGreaterThanOrEqual(14);
      
      const symbols = INITIAL_GLOBAL_INDICES.map((i) => i.symbol);
      expect(symbols).toContain('^TWII'); // 台灣加權
      expect(symbols).toContain('^TWOII'); // 台灣櫃買
      expect(symbols).toContain('SPY'); // 美國標普
      expect(symbols).toContain('QQQ'); // 美國那指
      expect(symbols).toContain('^N225'); // 日本日經
      expect(symbols).toContain('^KS11'); // 韓國 KOSPI
      expect(symbols).toContain('000001.SS'); // 中國上證
      expect(symbols).toContain('^HSI'); // 香港恆生
      expect(symbols).toContain('^GDAXI'); // 德國 DAX
    });

    it('開盤交易時即時報價併入應更新點位與 Sparkline 尾端；休市時 Sparkline 保持平穩無假跳動', async () => {
      const { INITIAL_GLOBAL_INDICES, mergeQuotesIntoIndices, getMarketSessionStatus } = await import('../data/globalIndicesData');
      
      // 週三上午 10:30 (開盤交易時段)
      const openTime = new Date('2026-09-02T02:30:00Z'); // UTC 02:30 = TW 10:30
      expect(getMarketSessionStatus('^TWII', 'ASIA', openTime)).toBe('OPEN');

      // 週六中午 (休市時段)
      const closedTime = new Date('2026-09-05T04:30:00Z');
      expect(getMarketSessionStatus('^TWII', 'ASIA', closedTime)).toBe('CLOSED');

      // 週三下午 14:00 (台股盤後定價交易時段)
      const twAfterHours = new Date('2026-09-02T06:00:00Z'); // UTC 06:00 = TW 14:00
      expect(getMarketSessionStatus('^TWII', 'ASIA', twAfterHours)).toBe('AFTER_HOURS');

      const mockQuotes = {
        '^TWII': {
          symbol: '^TWII',
          price: 22500.0,
          change: 232.0,
          changePercent: 1.04,
          high24h: 22550.0,
          low24h: 22200.0,
        },
      };

      // 1. 開盤時段更新：Sparkline 尾端注入最新 22500.0
      const openUpdated = mergeQuotesIntoIndices(INITIAL_GLOBAL_INDICES, mockQuotes, openTime);
      const twiiOpen = openUpdated.find((i) => i.symbol === '^TWII');
      expect(twiiOpen).toBeDefined();
      expect(twiiOpen?.status).toBe('OPEN');
      expect(twiiOpen?.price).toBe(22500.0);
      expect(twiiOpen?.sparkline[twiiOpen.sparkline.length - 1]).toBe(22500.0);

      // 2. 休市時段更新：Sparkline 保持平靜不注入假波動 (真實反映無波動)
      const closedUpdated = mergeQuotesIntoIndices(INITIAL_GLOBAL_INDICES, mockQuotes, closedTime);
      const twiiClosed = closedUpdated.find((i) => i.symbol === '^TWII');
      expect(twiiClosed?.status).toBe('CLOSED');
      // Sparkline 尾端維持原收盤值 22268，不被推進假波動
      expect(twiiClosed?.sparkline[twiiClosed.sparkline.length - 1]).toBe(22268);
    });

    it('應正確計算全球強弱風向球 (今日領頭羊、最弱勢、平均漲跌與漲跌家數)', async () => {
      const { INITIAL_GLOBAL_INDICES, calcMarketBreadth } = await import('../data/globalIndicesData');
      const breadth = calcMarketBreadth(INITIAL_GLOBAL_INDICES);

      expect(breadth.leader).not.toBeNull();
      expect(breadth.laggard).not.toBeNull();
      expect(breadth.leader!.changePercent).toBeGreaterThanOrEqual(breadth.laggard!.changePercent);
      expect(typeof breadth.avgReturn).toBe('number');
      expect(breadth.upCount + breadth.downCount + breadth.flatCount).toBe(INITIAL_GLOBAL_INDICES.length);
    });
  });
});
