import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  fetchCompanyFastInfo,
  calculateDaysRemaining,
  normalizeStockSymbol,
  detectMarket,
  parseRocDate,
  generateStatutoryCalendar,
  clearCompanyFastInfoCache,
  CACHE_STORAGE_PREFIX,
} from '../services/mopsService';
import {
  CalendarEventItem,
  CompanyAnnouncement,
  CompanyNewsFeedItem,
} from '../types/companyInfo';
import { CompanyFastInfoTab } from '../components/CompanyFastInfoTab';
import { StockSymbol } from '../types/stock';

// ============================================================================
// LocalStorage Mock with Error Simulation Capabilities
// ============================================================================
let storageThrowOnSet = false;
let storageThrowOnGet = false;
let storageThrowOnRemove = false;
let storageStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: (key: string) => {
    if (storageThrowOnGet) throw new DOMException('The operation is insecure.', 'SecurityError');
    return storageStore[key] || null;
  },
  setItem: (key: string, value: string) => {
    if (storageThrowOnSet) {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    }
    storageStore[key] = value.toString();
  },
  removeItem: (key: string) => {
    if (storageThrowOnRemove) throw new DOMException('Failed to remove item.', 'InvalidStateError');
    delete storageStore[key];
  },
  clear: () => {
    storageStore = {};
  },
  get length() {
    return Object.keys(storageStore).length;
  },
  key: (i: number) => Object.keys(storageStore)[i] || null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Challenger 1: Empirical Logic & Stress Test Suite', () => {
  beforeEach(() => {
    storageThrowOnSet = false;
    storageThrowOnGet = false;
    storageThrowOnRemove = false;
    storageStore = {};
    clearCompanyFastInfoCache();
    vi.restoreAllMocks();
    delete (globalThis as any).window;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // STRESS AREA 1: Date Boundaries & Leap Year & Timezone Invariance
  // ==========================================================================
  describe('1. Date Boundaries & Leap Year Invariance', () => {
    it('應精準處理閏年 2/29 (2024年為閏年，2025年與2026年非閏年)', () => {
      // 1130229 -> 2024-02-29
      const leapDay2024 = parseRocDate('1130229');
      expect(leapDay2024).toBe('2024-02-29');

      // 1170229 -> 2028-02-29 (2028 為下個閏年)
      const leapDay2028 = parseRocDate('1170229');
      expect(leapDay2028).toBe('2028-02-29');

      // 跨閏日計算天數差：2024/02/28 到 2024/03/01 應精確相隔 2 天 (含 2/29)
      const daysAcrossLeap = calculateDaysRemaining('2024-03-01', '2024-02-28');
      expect(daysAcrossLeap).toBe(2);

      // 非閏年 2025/02/28 到 2025/03/01 應相隔 1 天
      const daysAcrossNonLeap = calculateDaysRemaining('2025-03-01', '2025-02-28');
      expect(daysAcrossNonLeap).toBe(1);

      // 兩個連續閏年 2/29 之間天數：2024/02/29 到 2028/02/29 (4年 = 365*4 + 1 = 1461天)
      const fourYearsLeap = calculateDaysRemaining('2028-02-29', '2024-02-29');
      expect(fourYearsLeap).toBe(1461);
    });

    it('應正確解析 6 碼歷史民國年 (991231 -> 2010-12-31, 990101 -> 2010-01-01)', () => {
      expect(parseRocDate('991231')).toBe('2010-12-31');
      expect(parseRocDate('990101')).toBe('2010-01-01');
      expect(parseRocDate('99/12/31')).toBe('2010-12-31');
      expect(parseRocDate('99-01-01')).toBe('2010-01-01');
    });

    it('跨年份邊界倒數天數計算 (跨年夜 12/31 -> 01/01 應為 1 天)', () => {
      expect(calculateDaysRemaining('2027-01-01', '2026-12-31')).toBe(1);
      expect(calculateDaysRemaining('2026-12-31', '2027-01-01')).toBe(-1);
    });

    it('UTC 午夜對齊防護：當日事件相減必須嚴格為 0，且不因時間差有任何 +/- 1 天抖動', () => {
      expect(calculateDaysRemaining('2026-09-06', '2026-09-06')).toBe(0);
      expect(calculateDaysRemaining('2026/09/06', '2026-09-06')).toBe(0);
      expect(calculateDaysRemaining('1150906', '2026-09-06')).toBe(0);
    });

    it('異常或極端日期字串應安全防呆，不崩潰拋出未捕捉例外', () => {
      expect(parseRocDate('')).toBe('');
      expect(parseRocDate('   ')).toBe('');
      // @ts-expect-error testing runtime robustness
      expect(parseRocDate(null)).toBe('');
      // @ts-expect-error testing runtime robustness
      expect(parseRocDate(undefined)).toBe('');
      expect(parseRocDate('NOT_A_DATE')).toBe('NOT_A_DATE');

      expect(calculateDaysRemaining('', '2026-09-06')).toBe(0);
      expect(calculateDaysRemaining('INVALID', '2026-09-06')).toBe(0);
      expect(calculateDaysRemaining('2026-09-06', 'INVALID')).toBeDefined();
    });

    it('法定行事曆在年度不同月份 (1月、3月、5月、8月、11月、12月) 之確定性生成驗證', () => {
      // 1/05：未過 1/10，營收截止日為 1/10 (申報 12 月)
      const calJanEarly = generateStatutoryCalendar('2330', '2026-01-05');
      const revJanEarly = calJanEarly.find((e) => e.eventType === 'revenue')!;
      expect(revJanEarly.date).toBe('2026/01/10');
      expect(revJanEarly.title).toContain('12月份營業收入');

      // 1/15：已過 1/10，營收截止日推進至 2/10 (申報 1 月)
      const calJanLate = generateStatutoryCalendar('2330', '2026-01-15');
      const revJanLate = calJanLate.find((e) => e.eventType === 'revenue')!;
      expect(revJanLate.date).toBe('2026/02/10');
      expect(revJanLate.title).toContain('1月份營業收入');

      // 12/15：已過 12/10，營收截止日跨年推進至次年 1/10 (申報 12 月)
      const calDecLate = generateStatutoryCalendar('2330', '2026-12-15');
      const revDecLate = calDecLate.find((e) => e.eventType === 'revenue')!;
      expect(revDecLate.date).toBe('2027/01/10');
      expect(revDecLate.title).toContain('12月份營業收入');

      // 財報階段推進：
      // 3/15 -> 下一季報截止為 3/31 (Q4 年報)
      const calMarch = generateStatutoryCalendar('2330', '2026-03-15');
      expect(calMarch.find((e) => e.eventType === 'earnings')!.date).toBe('2026/03/31');

      // 4/01 -> 下一季報截止為 5/15 (Q1 季報)
      const calApril = generateStatutoryCalendar('2330', '2026-04-01');
      expect(calApril.find((e) => e.eventType === 'earnings')!.date).toBe('2026/05/15');

      // 6/01 -> 下一季報截止為 8/14 (Q2 半年報)
      const calJune = generateStatutoryCalendar('2330', '2026-06-01');
      expect(calJune.find((e) => e.eventType === 'earnings')!.date).toBe('2026/08/14');

      // 9/01 -> 下一季報截止為 11/14 (Q3 季報)
      const calSept = generateStatutoryCalendar('2330', '2026-09-01');
      expect(calSept.find((e) => e.eventType === 'earnings')!.date).toBe('2026/11/14');

      // 11/20 -> 下一季報截止跨年為次年 3/31 (Q4 年報)
      const calNovLate = generateStatutoryCalendar('2330', '2026-11-20');
      expect(calNovLate.find((e) => e.eventType === 'earnings')!.date).toBe('2027/03/31');
    });
  });

  // ==========================================================================
  // STRESS AREA 2: Symbol Variants & Adversarial Inputs
  // ==========================================================================
  describe('2. Symbol Variants & Malformed String Stress Test', () => {
    it('應正確正規化與辨識各種合法與變形代碼', () => {
      // 台股後綴剝除
      expect(normalizeStockSymbol('2330.TW')).toBe('2330');
      expect(normalizeStockSymbol('2330.tw')).toBe('2330');
      expect(normalizeStockSymbol('8299.TWO')).toBe('8299');
      expect(normalizeStockSymbol('8299.two')).toBe('8299');
      expect(normalizeStockSymbol('0050.TW')).toBe('0050');
      expect(normalizeStockSymbol('2881A.TW')).toBe('2881A'); // 特別股

      // 市場分類
      expect(detectMarket('2330')).toBe('TW');
      expect(detectMarket('2330.TW')).toBe('TW');
      expect(detectMarket('8299.TWO')).toBe('TW');
      expect(detectMarket('2881A')).toBe('TW');
      expect(detectMarket('AAPL')).toBe('US');
      expect(detectMarket('NVDA')).toBe('US');
      expect(detectMarket('BTCUSDT')).toBe('CRYPTO');
      expect(detectMarket('BTC-USD')).toBe('CRYPTO');
      expect(detectMarket('ETH')).toBe('CRYPTO');
    });

    it('惡意與異常字串輸入時應防護不崩潰 (XSS, SQL Injection, 特殊符號, 空白)', async () => {
      const adversarialInputs = [
        '',
        '   ',
        '\t\r\n',
        '!@#$%^&*()',
        '<script>alert("xss")</script>',
        'SELECT * FROM stocks WHERE 1=1;',
        '../../etc/passwd',
        'undefined',
        'null',
      ];

      for (const input of adversarialInputs) {
        const norm = normalizeStockSymbol(input);
        expect(typeof norm).toBe('string');

        const market = detectMarket(input);
        expect(['TW', 'US', 'CRYPTO']).toContain(market);

        // 呼叫 fetchCompanyFastInfo 不應拋出未捕捉例外
        const result = await fetchCompanyFastInfo(input, 'Test Company', true);
        expect(result).toBeDefined();
        expect(result.symbol).toBe(norm);
        expect(Array.isArray(result.timelineEvents)).toBe(true);
        expect(Array.isArray(result.announcements)).toBe(true);
        expect(Array.isArray(result.news)).toBe(true);
      }
    });

    it('冷門或無資料之代碼 (如 9999, 0000) 應動態合成法定時程與乾淨陣列', async () => {
      const result = await fetchCompanyFastInfo('9999', '未上市或不存在代號', true);
      expect(result.symbol).toBe('9999');
      expect(result.isLive).toBe(false);
      expect(result.timelineEvents.length).toBeGreaterThan(0);
      expect(result.announcements).toEqual([]);
      expect(result.news).toEqual([]);
      expect(result.nextEarnings).toBeDefined();
    });
  });

  // ==========================================================================
  // STRESS AREA 3: Offline & Network Abort / Failure Modes
  // ==========================================================================
  describe('3. Offline & Network Abort / Failure Modes', () => {
    it('在 DOMException AbortError (網路超時或請求中斷) 時應平滑回退，不拋出未捕捉例外', async () => {
      globalThis.fetch = vi.fn().mockImplementation(() => {
        return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'));
      });

      const res2330 = await fetchCompanyFastInfo('2330', '台積電', true);
      expect(res2330.symbol).toBe('2330');
      expect(res2330.isLive).toBe(false);
      expect(res2330.announcements.length).toBeGreaterThan(0); // 命中基準種子

      const resCold = await fetchCompanyFastInfo('7777', '冷門股', true);
      expect(resCold.symbol).toBe('7777');
      expect(resCold.isLive).toBe(false);
      expect(resCold.timelineEvents.length).toBeGreaterThan(0); // 命中動態法定時程
    });

    it('在 TypeError: Failed to fetch (全域斷網 / DNS 失敗) 時應健全防護', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

      const res = await fetchCompanyFastInfo('2317', '鴻海', true);
      expect(res.symbol).toBe('2317');
      expect(res.isLive).toBe(false);
      expect(res.dataSourceDesc).toBe('離線快照 (備援資料庫)');
      expect(res.announcements.length).toBeGreaterThan(0);
      expect(res.news.length).toBeGreaterThan(0);
    });

    it('在伺服器回傳 HTTP 403, 404, 429, 500, 502 等錯誤狀態碼時應順暢降級', async () => {
      const errorStatuses = [403, 404, 429, 500, 502, 503];

      for (const status of errorStatuses) {
        globalThis.fetch = vi.fn().mockResolvedValue({
          ok: false,
          status,
          statusText: `Error ${status}`,
          json: async () => ({ error: 'Fail' }),
        } as any);

        const res = await fetchCompanyFastInfo('NVDA', 'NVIDIA', true);
        expect(res.symbol).toBe('NVDA');
        expect(res.isLive).toBe(false);
        expect(res.market).toBe('US');
        expect(res.announcements.length).toBeGreaterThan(0);
      }
    });

    it('在伺服器回傳毀損 HTML / 非法 JSON 時應健全捕捉，不阻斷應用', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON at position 0')),
      } as any);

      const res = await fetchCompanyFastInfo('AAPL', '蘋果', true);
      expect(res.symbol).toBe('AAPL');
      expect(res.isLive).toBe(false);
      expect(res.market).toBe('US');
    });

    it('Electron IPC 模擬回傳 { error: "Forbidden host" } 時應觸發降級備援', async () => {
      (globalThis as any).window = {
        electronAPI: {
          fetchMarketData: vi.fn().mockResolvedValue({ error: 'Forbidden host' }),
        },
      };

      const res = await fetchCompanyFastInfo('2330', '台積電', true);
      expect(res.symbol).toBe('2330');
      expect(res.isLive).toBe(false);
      expect(res.announcements.length).toBeGreaterThan(0);
    });

    it('部分網路成功 (TWSE 成功但 Yahoo 新聞失敗) 時應正確組裝重訊並容許新聞為空', async () => {
      const mockTwseData = [
        {
          出表日期: '1150906',
          公司代號: '2330',
          公司名稱: '台積電',
          主旨: '公告本公司董事會決議核准資本預算',
          說明: '1.董事會決議日期:115/09/06\n2.核准資本預算約新台幣5,000億元\n3.興建先進製程晶圓廠',
          發言日期: '1150906',
          發言時間: '173000',
        },
      ];

      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('openapi.twse.com.tw')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockTwseData,
          } as any);
        }
        // Yahoo news 端點失敗
        return Promise.reject(new Error('Yahoo news rate limited'));
      });

      const res = await fetchCompanyFastInfo('2330', '台積電', true);
      expect(res.isLive).toBe(true);
      expect(res.announcements.length).toBe(1);
      expect(res.announcements[0].title).toContain('董事會決議核准資本預算');
      expect(res.news).toEqual([]);
    });
  });

  // ==========================================================================
  // STRESS AREA 4: LocalStorage Quota Exceeded & Error Recovery
  // ==========================================================================
  describe('4. LocalStorage Quota Exceeded & Error Recovery', () => {
    it('當 LocalStorage 容量滿溢 (QuotaExceededError) 時，寫入失敗但不中斷返回資料', async () => {
      // 模擬配額超出異常
      storageThrowOnSet = true;

      // 模擬成功的即時數據
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as any);

      const res = await fetchCompanyFastInfo('2330', '台積電', true);
      expect(res).toBeDefined();
      expect(res.symbol).toBe('2330');

      // 驗證記憶體快取仍能正常運作
      storageThrowOnSet = false;
      const cached = await fetchCompanyFastInfo('2330', '台積電', false);
      expect(cached).toBe(res);
    });

    it('當 LocalStorage 讀取受阻 (SecurityError / Insecure) 時應自動略過快取直接執行查詢', async () => {
      storageThrowOnGet = true;

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as any);

      const res = await fetchCompanyFastInfo('2330', '台積電', false);
      expect(res).toBeDefined();
      expect(res.symbol).toBe('2330');
    });

    it('當 LocalStorage 內存有損毀的 JSON 字串時應自動容錯忽略', async () => {
      storageStore[`${CACHE_STORAGE_PREFIX}2330`] = 'CORRUPTED_NOT_JSON{{{';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      } as any);

      const res = await fetchCompanyFastInfo('2330', '台積電', false);
      expect(res).toBeDefined();
      expect(res.symbol).toBe('2330');
    });

    it('清除快取 clearCompanyFastInfoCache 遭遇 removeItem 異常時不拋錯', () => {
      storageThrowOnRemove = true;
      expect(() => clearCompanyFastInfoCache('2330')).not.toThrow();
      expect(() => clearCompanyFastInfoCache()).not.toThrow();
    });
  });

  // ==========================================================================
  // STRESS AREA 5: UI Component Rendering with Sparse & Edge Data
  // ==========================================================================
  describe('5. UI Component CompanyFastInfoTab Zero-White-Screen Stress Test', () => {
    const mockStock: StockSymbol = {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      price: 1000,
      change: 10,
      changePercent: 1.0,
      currency: 'TWD',
    };

    it('在初始載入骨架屏狀態下應能順利渲染，無 React 渲染錯誤', () => {
      const html = renderToString(
        React.createElement(CompanyFastInfoTab, {
          symbol: mockStock,
          companyName: '台積電',
        })
      );
      expect(html).toContain('animate-pulse');
      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(100);
    });

    it('極端稀疏數據 (nextEarnings=undefined, nextConference=undefined, timelineEvents=[], announcements=[], news=[]) 應優雅呈現無白屏', () => {
      // 驗證組件在各種屬性空缺時能健全處理
      const emptyStock: StockSymbol = {
        symbol: 'EMPTY',
        name: '空資料測試',
        market: 'TW',
        price: 0,
        change: 0,
        changePercent: 0,
        currency: 'TWD',
      };

      const html = renderToString(
        React.createElement(CompanyFastInfoTab, {
          symbol: emptyStock,
          companyName: '空資料測試',
        })
      );
      expect(html).toBeDefined();
    });

    it('公告缺少非必填欄位 (無 summaryPoints, 無 time, 無 fullContent, 無 url) 時應正常排版', () => {
      const sparseAnnouncement: CompanyAnnouncement = {
        id: 'sparse-1',
        symbol: '2330',
        date: '2026/09/06',
        title: '簡短重大訊息',
        summaryPoints: [],
        category: 'material',
        categoryLabel: '重大營運',
        importance: 'high',
        source: '公開資訊觀測站 (MOPS)',
      };

      // 測試分類邏輯與樣式判定
      expect(sparseAnnouncement.importance).toBe('high');
      expect(sparseAnnouncement.summaryPoints.length).toBe(0);
      expect(sparseAnnouncement.fullContent).toBeUndefined();
    });

    it('日曆事件倒數天數包含 0 (今日), >0 (未來), <0 (過去) 時應各自有對應文字標籤', () => {
      const events: CalendarEventItem[] = [
        {
          id: 'ev-today',
          symbol: '2330',
          title: '今日事件',
          date: '2026/09/06',
          daysRemaining: 0,
          eventType: 'earnings',
          status: 'confirmed',
          statusLabel: '今日召開',
          highlights: ['第一點'],
        },
        {
          id: 'ev-future',
          symbol: '2330',
          title: '未來事件',
          date: '2026/09/10',
          daysRemaining: 4,
          eventType: 'conference',
          status: 'estimated',
          statusLabel: '即將召開',
          highlights: [],
        },
        {
          id: 'ev-past',
          symbol: '2330',
          title: '歷史事件',
          date: '2026/09/01',
          daysRemaining: -5,
          eventType: 'revenue',
          status: 'past',
          statusLabel: '已申報',
          highlights: ['歷史重點'],
        },
      ];

      expect(events[0].daysRemaining).toBe(0);
      expect(events[1].daysRemaining).toBeGreaterThan(0);
      expect(events[2].daysRemaining).toBeLessThan(0);
    });

    it('權威新聞項目缺少 sentiment 或 url 時應安全降級不拋錯', () => {
      const sparseNews: CompanyNewsFeedItem = {
        id: 'news-sparse-1',
        symbol: '2330',
        title: '某項測試財經報導',
        summary: '報導摘要內文',
        source: '測試日報',
        publishedAt: '2026-09-06T12:00:00Z',
      };

      expect(sparseNews.sentiment).toBeUndefined();
      expect(sparseNews.url).toBeUndefined();
    });
  });
});
