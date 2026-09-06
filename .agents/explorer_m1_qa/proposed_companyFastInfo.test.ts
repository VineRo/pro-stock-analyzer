import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchCompanyFastInfo,
  calculateDaysRemaining,
  normalizeStockSymbol,
  detectMarket,
  parseRocDate,
  classifyAnnouncement,
  generateStatutoryCalendar,
  getBenchmarkSeed,
  clearCompanyFastInfoCache,
} from '../../src/services/mopsService';
import {
  CompanyFastInfoState,
  CalendarEventItem,
  CompanyAnnouncement,
  AnnouncementCategory,
  AnnouncementImportance,
} from '../../src/types/companyInfo';

// ============================================================================
// LocalStorage Mock 環境隔離設定 (遵循 Vitest 3 隔離標準)
// ============================================================================
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] || null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('公司資訊最速報與重大行事曆全套自動化測試 (Company Fast Info & MOPS)', () => {
  beforeEach(() => {
    localStorage.clear();
    clearCompanyFastInfoCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // 1. 代碼正規化與市場識別測試 (Symbol Normalization & Market Detection)
  // ==========================================================================
  describe('代碼正規化與市場識別 (Symbol Normalization & Market Detection)', () => {
    it('應正確將上市股票後綴 .TW 剝除 (如 2330.TW -> 2330)', () => {
      expect(normalizeStockSymbol('2330.TW')).toBe('2330');
      expect(normalizeStockSymbol('2317.TW')).toBe('2317');
      expect(normalizeStockSymbol('0050.TW')).toBe('0050');
    });

    it('應正確將上櫃股票後綴 .TWO 剝除 (如 8299.TWO -> 8299)', () => {
      expect(normalizeStockSymbol('8299.TWO')).toBe('8299');
      expect(normalizeStockSymbol('6488.TWO')).toBe('6488');
      expect(normalizeStockSymbol('3260.TWO')).toBe('3260');
    });

    it('傳入純數字台股代碼時應維持原樣', () => {
      expect(normalizeStockSymbol('2330')).toBe('2330');
      expect(normalizeStockSymbol('2454')).toBe('2454');
    });

    it('美股標的代碼應完整透傳不被誤切 (如 AAPL, NVDA, TSLA)', () => {
      expect(normalizeStockSymbol('AAPL')).toBe('AAPL');
      expect(normalizeStockSymbol('NVDA')).toBe('NVDA');
      expect(normalizeStockSymbol('TSLA')).toBe('TSLA');
      expect(normalizeStockSymbol('MSFT')).toBe('MSFT');
    });

    it('加密貨幣交易對代碼應完整透傳 (如 BTCUSDT, ETHUSDT)', () => {
      expect(normalizeStockSymbol('BTCUSDT')).toBe('BTCUSDT');
      expect(normalizeStockSymbol('ETHUSDT')).toBe('ETHUSDT');
    });

    it('應自動修剪前後空白並轉為大寫', () => {
      expect(normalizeStockSymbol('  2330.tw  ')).toBe('2330');
      expect(normalizeStockSymbol('  aapl  ')).toBe('AAPL');
      expect(normalizeStockSymbol('  8299.two  ')).toBe('8299');
    });

    it('空字串或異常輸入應安全防呆不崩潰', () => {
      expect(normalizeStockSymbol('')).toBe('');
      // @ts-expect-error test edge case
      expect(normalizeStockSymbol(null)).toBe('');
      // @ts-expect-error test edge case
      expect(normalizeStockSymbol(undefined)).toBe('');
    });

    it('市場分類檢測 detectMarket 應精確判斷 TW, US, CRYPTO', () => {
      expect(detectMarket('2330')).toBe('TW');
      expect(detectMarket('2330.TW')).toBe('TW');
      expect(detectMarket('8299.TWO')).toBe('TW');
      expect(detectMarket('0050.TW')).toBe('TW');
      expect(detectMarket('AAPL')).toBe('US');
      expect(detectMarket('NVDA')).toBe('US');
      expect(detectMarket('BTCUSDT')).toBe('CRYPTO');
      expect(detectMarket('ETHUSDT')).toBe('CRYPTO');
    });
  });

  // ==========================================================================
  // 2. 民國年 (ROC) 日期轉換測試 (ROC Date Parsing)
  // ==========================================================================
  describe('民國年日期轉換 (parseRocDate)', () => {
    it('應將 7 碼純數字民國日期正確轉換為西元 YYYY-MM-DD (1150906 -> 2026-09-06)', () => {
      expect(parseRocDate('1150906')).toBe('2026-09-06');
      expect(parseRocDate('1141231')).toBe('2025-12-31');
      expect(parseRocDate('1150101')).toBe('2026-01-01');
    });

    it('應將帶有斜線之民國日期轉換為西元格式 (115/09/06 -> 2026-09-06)', () => {
      expect(parseRocDate('115/09/06')).toBe('2026-09-06');
      expect(parseRocDate('114/05/15')).toBe('2025-05-15');
      expect(parseRocDate('114/8/14')).toBe('2025-08-14');
    });

    it('應支援歷史雙位數民國年轉換 (990906 -> 2010-09-06)', () => {
      expect(parseRocDate('990906')).toBe('2010-09-06');
      expect(parseRocDate('99/09/06')).toBe('2010-09-06');
    });

    it('若傳入已為西元格式字串應標準化輸出', () => {
      expect(parseRocDate('2026-09-06')).toBe('2026-09-06');
      expect(parseRocDate('2026/09/06')).toBe('2026-09-06');
    });

    it('傳入空字串或異常格式時應安全退回原字串或空值，不拋出未捕捉例外', () => {
      expect(parseRocDate('')).toBe('');
      // @ts-expect-error test edge case
      expect(parseRocDate(null)).toBe('');
      expect(parseRocDate('N/A')).toBe('N/A');
    });
  });

  // ==========================================================================
  // 3. 倒數天數計算測試 (Countdown Day Calculation)
  // ==========================================================================
  describe('倒數天數計算 (calculateDaysRemaining)', () => {
    it('當目標日期與基準日期相同（當天）時，倒數天數應精準為 0', () => {
      expect(calculateDaysRemaining('2026-09-06', '2026-09-06')).toBe(0);
      expect(calculateDaysRemaining('2026/09/06', '2026-09-06')).toBe(0);
    });

    it('當目標日期為同月份未來日期時，應返回正確差值', () => {
      expect(calculateDaysRemaining('2026-09-15', '2026-09-06')).toBe(9);
      expect(calculateDaysRemaining('2026-09-30', '2026-09-06')).toBe(24);
    });

    it('跨月份倒數計算應精確計算大月份 (31天) 與小月份 (30天)', () => {
      // 9月有30天。9/25 到 10/15：9月剩餘 5 天 + 10月 15 天 = 20 天
      expect(calculateDaysRemaining('2026-10-15', '2026-09-25')).toBe(20);
      // 7月有31天。7/20 到 8/10：7月剩餘 11 天 + 8月 10 天 = 21 天
      expect(calculateDaysRemaining('2026-08-10', '2026-07-20')).toBe(21);
    });

    it('跨年度倒數計算應跨越 12/31 至次年 1 月', () => {
      // 12/25 到次年 01/05：12月剩餘 6 天 + 1月 5 天 = 11 天
      expect(calculateDaysRemaining('2027-01-05', '2026-12-25')).toBe(11);
    });

    it('閏年 2 月 29 天邊界測試：2028 閏年與 2027 平年對比', () => {
      // 2028 為閏年，2 月有 29 天：2/28 到 3/1 差 2 天 (2/29, 3/1)
      expect(calculateDaysRemaining('2028-03-01', '2028-02-28')).toBe(2);
      // 2027 為平年，2 月有 28 天：2/28 到 3/1 差 1 天
      expect(calculateDaysRemaining('2027-03-01', '2027-02-28')).toBe(1);
    });

    it('過期事件處理：目標日期在基準日之前時，應返回負整數', () => {
      expect(calculateDaysRemaining('2026-09-01', '2026-09-06')).toBe(-5);
      expect(calculateDaysRemaining('2026-08-14', '2026-09-06')).toBe(-23);
    });

    it('時區與格式容錯：無視時間戳尾綴與斜線/橫線差異，純以行事曆自然日為準', () => {
      // 目標 14:00 基準 22:30，日曆天差距仍應精確為 4 天
      expect(calculateDaysRemaining('2026/09/10 14:00', '2026-09-06 22:30')).toBe(4);
      expect(calculateDaysRemaining('2026-09-10T14:00:00Z', '2026-09-06T22:30:00Z')).toBe(4);
    });
  });

  // ==========================================================================
  // 4. 重大訊息分類與重要度評級測試 (Announcement Classification & Importance)
  // ==========================================================================
  describe('重大訊息分類與重要度評級 (classifyAnnouncement)', () => {
    it('財務報告與季報公告應歸類為 financial 且重要度為 high', () => {
      const q2Report = classifyAnnouncement('公告本公司董事會通過 115 年第 2 季財務報告');
      expect(q2Report.category).toBe('financial');
      expect(q2Report.importance).toBe('high');

      const epsReport = classifyAnnouncement('公告115年第二季自結合併損益每股盈餘 9.5 元');
      expect(epsReport.category).toBe('financial');
      expect(epsReport.importance).toBe('high');
    });

    it('法人說明會公告應歸類為 conference 且重要度為 high', () => {
      const conf1 = classifyAnnouncement('本公司受邀參加外資證券舉辦之 2026 臺灣投資論壇線上法人說明會');
      expect(conf1.category).toBe('conference');
      expect(conf1.importance).toBe('high');

      const conf2 = classifyAnnouncement('公告本公司召開 115 年第 3 季法說會');
      expect(conf2.category).toBe('conference');
      expect(conf2.importance).toBe('high');
    });

    it('股利分派與除權息公告應歸類為 dividend 且重要度為 high', () => {
      const div1 = classifyAnnouncement('公告董事會決議發放現金股利每股新台幣 4.5 元及除息基準日');
      expect(div1.category).toBe('dividend');
      expect(div1.importance).toBe('high');

      const capInc = classifyAnnouncement('公告本公司辦理現金增資發行新股基準日');
      expect(capInc.category).toBe('dividend');
    });

    it('每月營業收入公告應歸類為 revenue 且重要度為 medium', () => {
      const rev = classifyAnnouncement('公告本公司 115 年 8 月份自結合併營業收入申報作業');
      expect(rev.category).toBe('revenue');
      expect(rev.importance).toBe('medium');
    });

    it('董事會決議與重要人事異動應歸類為 board 且重要度為 medium', () => {
      const boardMeeting = classifyAnnouncement('董事會決議召開 115 年股東常會相關事宜');
      expect(boardMeeting.category).toBe('board');
      expect(boardMeeting.importance).toBe('medium');

      const execChange = classifyAnnouncement('公告本公司總經理異動');
      expect(execChange.category).toBe('board');
      expect(execChange.importance).toBe('medium');
    });

    it('重大資產購置、擴廠合約或訴訟應歸類為 material 且重要度為 high', () => {
      const factory = classifyAnnouncement('公告本公司取得高雄晶圓廠擴產廠房興建重大工程合約');
      expect(factory.category).toBe('material');
      expect(factory.importance).toBe('high');

      const lawsuit = classifyAnnouncement('公告接獲智慧財產法院專利訴訟侵權判決主文');
      expect(lawsuit.category).toBe('material');
      expect(lawsuit.importance).toBe('high');
    });

    it('媒體澄清與例行公告應歸類為 other 且重要度為 normal', () => {
      const clarify = classifyAnnouncement('澄清 115/09/05 工商時報有關本公司營運展望之報導');
      expect(clarify.category).toBe('other');
      expect(clarify.importance).toBe('normal');

      const treasury = classifyAnnouncement('庫藏股買回轉讓員工之例行申報進度');
      expect(treasury.category).toBe('other');
      expect(treasury.importance).toBe('normal');
    });
  });

  // ==========================================================================
  // 5. 法定財報與營收行事曆生成測試 (Statutory Calendar Generation)
  // ==========================================================================
  describe('法定財報與營收行事曆生成 (generateStatutoryCalendar)', () => {
    it('以 2026-09-06 為基準日時，下一次法定季報截止應精確為 2026/11/14 (Q3 季報截止)', () => {
      const events = generateStatutoryCalendar('2330', '2026-09-06');
      const earningsEvent = events.find((e) => e.eventType === 'earnings');

      expect(earningsEvent).toBeDefined();
      expect(earningsEvent?.date).toBe('2026/11/14');
      expect(earningsEvent?.title).toContain('Q3');
      expect(earningsEvent?.title).toContain('財務報告');
      // 9/6 到 11/14 倒數應為 69 天 (9月剩餘24天 + 10月31天 + 11月14天 = 69)
      expect(earningsEvent?.daysRemaining).toBe(69);
      expect(earningsEvent?.status).toBe('estimated');
      expect(earningsEvent?.statusLabel).toBe('法定截止');
      expect(earningsEvent?.highlights.length).toBeGreaterThan(0);
    });

    it('以 2026-09-06 為基準日時，下一次每月營收申報截止應為 2026/09/10 (申報 8 月營收)', () => {
      const events = generateStatutoryCalendar('2330', '2026-09-06');
      const revenueEvent = events.find((e) => e.eventType === 'revenue');

      expect(revenueEvent).toBeDefined();
      expect(revenueEvent?.date).toBe('2026/09/10');
      expect(revenueEvent?.title).toContain('8');
      expect(revenueEvent?.title).toContain('營業收入');
      // 9/6 到 9/10 倒數應為 4 天
      expect(revenueEvent?.daysRemaining).toBe(4);
      expect(revenueEvent?.status).toBe('estimated');
    });

    it('以 2026-11-20 (Q3 已過) 為基準日時，下一次法定財報應跨年推進至 2027/03/31 (Q4 年報)', () => {
      const events = generateStatutoryCalendar('2330', '2026-11-20');
      const earningsEvent = events.find((e) => e.eventType === 'earnings');

      expect(earningsEvent).toBeDefined();
      expect(earningsEvent?.date).toBe('2027/03/31');
      expect(earningsEvent?.title).toContain('Q4');
      expect(earningsEvent?.daysRemaining).toBe(131);
    });

    it('當基準日剛好為每月 10 日當天時，營收申報倒數天數應為 0', () => {
      const events = generateStatutoryCalendar('2330', '2026-09-10');
      const revenueEvent = events.find((e) => e.eventType === 'revenue');

      expect(revenueEvent?.date).toBe('2026/09/10');
      expect(revenueEvent?.daysRemaining).toBe(0);
    });

    it('當基準日超過每月 10 日 (如 9/11) 時，營收申報截止應自動推進至次月 10 日 (10/10)', () => {
      const events = generateStatutoryCalendar('2330', '2026-09-11');
      const revenueEvent = events.find((e) => e.eventType === 'revenue');

      expect(revenueEvent?.date).toBe('2026/10/10');
      expect(revenueEvent?.title).toContain('9');
      // 9/11 到 10/10 倒數天數：9月剩餘 19 天 + 10月 10 天 = 29 天
      expect(revenueEvent?.daysRemaining).toBe(29);
    });

    it('美股標的 (如 AAPL) 應生成合規的 SEC 季度申報時程', () => {
      const events = generateStatutoryCalendar('AAPL', '2026-09-06');
      const earningsEvent = events.find((e) => e.eventType === 'earnings');

      expect(earningsEvent).toBeDefined();
      expect(earningsEvent?.statusLabel).toContain('預估');
      expect(earningsEvent?.daysRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // 6. 多層級備援與零白屏防護測試 (Multi-Tier Fallback Resilience)
  // ==========================================================================
  describe('多層級備援與零白屏防護 (Multi-Tier Fallback Resilience)', () => {
    it('當網路徹底中斷或 fetch 拋出例外時，主要權值股 (2330) 應回傳健全備援數據，嚴禁崩潰', async () => {
      // 模擬全域網路斷線拋出 TypeError
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

      const result = await fetchCompanyFastInfo('2330', '台積電');

      // 驗證承諾正常履約，不拋出未捕捉異常
      expect(result).toBeDefined();
      expect(result.symbol).toBe('2330');
      expect(result.name).toContain('台積電');
      expect(result.isLive).toBe(false);
      expect(result.dataSourceDesc).toContain('備援');

      // 驗證時間軸事件、公告清單與新聞均為合法陣列
      expect(Array.isArray(result.timelineEvents)).toBe(true);
      expect(result.timelineEvents.length).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result.announcements)).toBe(true);
      expect(result.announcements.length).toBeGreaterThan(0);
      expect(Array.isArray(result.news)).toBe(true);
      expect(result.news.length).toBeGreaterThan(0);

      // 驗證核心倒數卡片對象存在且結構完備
      expect(result.nextEarnings).toBeDefined();
      expect(result.nextEarnings?.title).toBeTruthy();
      expect(typeof result.nextEarnings?.daysRemaining).toBe('number');
    });

    it('未收錄於 Benchmark Seed 之冷門股票 (如 9999) 在斷網下亦能自動合成法定時程', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network timeout'));

      const result = await fetchCompanyFastInfo('9999', '未知科技');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('9999');
      expect(result.name).toBe('未知科技');
      expect(result.isLive).toBe(false);

      // 依然應生成法定財報與營收時程，確保 UI 倒數看板正常渲染
      expect(result.timelineEvents.length).toBeGreaterThanOrEqual(2);
      expect(result.announcements).toEqual([]);
      expect(result.news).toEqual([]);
    });

    it('伺服器回傳 HTTP 500 或非預期惡意/毀損 JSON 時，應平滑降級至備援而不引發白屏', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new SyntaxError('Unexpected token < in JSON at position 0');
        },
      } as unknown as Response);

      const result = await fetchCompanyFastInfo('2317', '鴻海');

      expect(result).toBeDefined();
      expect(result.symbol).toBe('2317');
      expect(result.isLive).toBe(false);
      expect(result.timelineEvents.length).toBeGreaterThan(0);
    });

    it('美股標的 (AAPL) 與加密貨幣 (BTCUSDT) 斷網時應回傳對應市場類型之備援', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('DNS resolution failed'));

      const aaplRes = await fetchCompanyFastInfo('AAPL', '蘋果');
      expect(aaplRes.market).toBe('US');
      expect(aaplRes.timelineEvents.length).toBeGreaterThan(0);

      const btcRes = await fetchCompanyFastInfo('BTCUSDT');
      expect(btcRes.market).toBe('CRYPTO');
    });
  });

  // ==========================================================================
  // 7. 快取機制與強制重新整理測試 (Cache Hit & Force Refresh Behavior)
  // ==========================================================================
  describe('快取機制與強制重新整理 (Cache Hit & Force Refresh Behavior)', () => {
    it('冷啟動首次查詢應將獲取結果寫入 localStorage，後續 15 分鐘內呼叫應直接命中快取', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      } as unknown as Response);

      // 第 1 次調用：快取未命中，觸發網路查詢
      const firstResult = await fetchCompanyFastInfo('2330', '台積電');
      const initialFetchCount = mockFetch.mock.calls.length;
      expect(firstResult).toBeDefined();

      // 檢查 localStorage 已儲存對應 key
      const cachedRaw = localStorage.getItem('prostock_fast_info_2330');
      expect(cachedRaw).not.toBeNull();

      // 第 2 次調用：未過期且未強制刷新，應直接讀取快取
      const secondResult = await fetchCompanyFastInfo('2330', '台積電');
      expect(secondResult.symbol).toBe('2330');
      expect(secondResult.lastUpdated).toBe(firstResult.lastUpdated);

      // 驗證 mockFetch 沒有增加呼叫次數
      expect(mockFetch.mock.calls.length).toBe(initialFetchCount);
    });

    it('當設定 forceRefresh = true 時，即使有有效快取亦應強制發起網路重取並更新快取', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      } as unknown as Response);

      // 首次獲取建立快取
      await fetchCompanyFastInfo('2330', '台積電');
      const countAfterFirst = mockFetch.mock.calls.length;

      // 帶入 forceRefresh = true
      const refreshed = await fetchCompanyFastInfo('2330', '台積電', true);

      // 驗證網路請求被再次發起
      expect(mockFetch.mock.calls.length).toBeGreaterThan(countAfterFirst);
      expect(refreshed.symbol).toBe('2330');
    });

    it('當快取超過 15 分鐘過期時，應自動失效並發起新請求', async () => {
      const mockFetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: [],
        }),
      } as unknown as Response);

      // 手動預先植入 20 分鐘前的過期快取
      const staleState: CompanyFastInfoState = {
        symbol: '2330',
        name: '台積電',
        market: 'TW',
        lastUpdated: Date.now() - 20 * 60 * 1000,
        isLive: true,
        dataSourceDesc: '舊快取',
        timelineEvents: [],
        announcements: [],
        news: [],
      };
      localStorage.setItem('prostock_fast_info_2330', JSON.stringify(staleState));

      // 呼叫查詢
      const res = await fetchCompanyFastInfo('2330', '台積電');

      // 驗證過期快取被旁路，重新執行 fetch
      expect(mockFetch).toHaveBeenCalled();
      expect(res.lastUpdated).toBeGreaterThan(staleState.lastUpdated);
    });

    it('當 localStorage 配額滿溢拋出 QuotaExceededError 時，系統仍能優雅執行不中斷', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: [] }),
      } as unknown as Response);

      vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      // 即使 setItem 報錯，調用依然正常返回資料
      const result = await fetchCompanyFastInfo('2330', '台積電');
      expect(result).toBeDefined();
      expect(result.symbol).toBe('2330');
    });
  });

  // ==========================================================================
  // 8. 基準種子資料檢驗 (Benchmark Seed Data Integrity)
  // ==========================================================================
  describe('基準種子資料完整性 (Benchmark Seed Data Integrity)', () => {
    it('台積電 2330 種子資料應具備法說會、季報、重訊與完整新聞結構', () => {
      const seed = getBenchmarkSeed('2330');
      expect(seed).not.toBeNull();
      if (seed) {
        expect(seed.symbol).toBe('2330');
        expect(seed.name).toBe('台積電');
        expect(seed.market).toBe('TW');
        expect(seed.nextEarnings).toBeDefined();
        expect(seed.nextConference).toBeDefined();
        expect(seed.timelineEvents.length).toBeGreaterThan(0);
        expect(seed.announcements.length).toBeGreaterThan(0);
        expect(seed.news.length).toBeGreaterThan(0);

        // 驗證重大訊息欄位齊全
        const ann = seed.announcements[0];
        expect(ann.id).toBeTruthy();
        expect(ann.title).toBeTruthy();
        expect(ann.category).toBeTruthy();
        expect(ann.importance).toBeTruthy();
        expect(Array.isArray(ann.summaryPoints)).toBe(true);

        // 驗證新聞欄位齊全
        const news = seed.news[0];
        expect(news.id).toBeTruthy();
        expect(news.title).toBeTruthy();
        expect(news.source).toBeTruthy();
        expect(news.publishedAt).toBeTruthy();
      }
    });

    it('鴻海 2317 種子資料應具備合規之法說會與重訊結構', () => {
      const seed = getBenchmarkSeed('2317');
      expect(seed).not.toBeNull();
      if (seed) {
        expect(seed.symbol).toBe('2317');
        expect(seed.name).toBe('鴻海');
        expect(seed.announcements.length).toBeGreaterThan(0);
      }
    });

    it('美股 AAPL 與 NVDA 種子資料應具備美股專屬財報會議時程', () => {
      const aaplSeed = getBenchmarkSeed('AAPL');
      expect(aaplSeed).not.toBeNull();
      expect(aaplSeed?.market).toBe('US');
      expect(aaplSeed?.nextEarnings).toBeDefined();

      const nvdaSeed = getBenchmarkSeed('NVDA');
      expect(nvdaSeed).not.toBeNull();
      expect(nvdaSeed?.market).toBe('US');
    });

    it('查詢不存在種子之代碼應返回 null', () => {
      expect(getBenchmarkSeed('99999')).toBeNull();
    });
  });
});
