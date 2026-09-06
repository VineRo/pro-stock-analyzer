# Handoff Report — Survey Spec Miner 1: MOPS & Corporate Calendar Specifications

**Author**: Survey Spec Miner 1 (`teamwork_preview_spec_miner`)  
**Mission**: Data Sources & Specifications for MOPS Announcements, Corporate Calendar, Earnings & Conferences, and Financial News  
**Date**: 2026-09-06  
**Target File**: `/Users/viberorob/Desktop/New Stock Project/.agents/survey_spec_miner_1/handoff.md`

---

## 1. Observation

1. **Original User Request & Requirements** (`.agents/ORIGINAL_REQUEST.md`):
   - **R1 (重大訊息與即時新聞獲取)**: 對當前股票代碼自公開資訊觀測站 (MOPS) 等權威數據源獲取最新公告、重大訊息（發布時間、主旨、內容要點）與財訊報導，具備網路連線防護與適度快取。
   - **R2 (財報與法說會時程智慧彙整)**: 追蹤解析下一次預計財報公布時程、法人說明會 (Investor Conference) 或關鍵行事曆，產出時程倒數/時間軸與關鍵看點摘要。
   - **R3 (基本面彈窗介面整合)**: 現有 `FundamentalModal.tsx` 內新增「資訊最速報 / 重訊日程」專屬分頁標籤，以清晰深色現代化卡片與時間軸呈現。
   - **R4 (健全容錯與邊界防護)**: 網路超時、無重訊或離線時呈現優雅降級，恪守零白屏原則。

2. **Existing Network & IPC Architecture in Codebase**:
   - `electron/main.cjs` (lines 46-62):
     ```javascript
     ipcMain.handle('fetch-market-data', async (_event, url) => {
       ...
       const allowedHosts = [
         'query1.finance.yahoo.com',
         'query2.finance.yahoo.com',
         'api.binance.com'
       ];
       if (parsed.protocol !== 'https:' || !allowedHosts.includes(parsed.hostname)) {
         return { error: 'Forbidden host' };
       }
       ...
     ```
     Observed: Currently, `fetchMarketData` strictly checks `allowedHosts`. Any request to Yahoo Finance (`query1.finance.yahoo.com`) is **already permitted**. External endpoints such as `openapi.twse.com.tw` or `www.tpex.org.tw` are not yet in `allowedHosts` and will return `{ error: 'Forbidden host' }` unless added to the whitelist.
   - `electron/preload.cjs` (lines 3-6):
     `fetchMarketData: (url) => ipcRenderer.invoke('fetch-market-data', url)` is safely bridged to the renderer window.
   - `src/data/stockApi.ts` (lines 176-187):
     The renderer checks `if (typeof window !== 'undefined' && window.electronAPI?.fetchMarketData)` to bypass browser CORS inside Electron, and falls back to web proxies in standalone browser mode.
   - `src/data/cacheService.ts` (lines 1-83):
     Manages local storage caching with `CACHE_PREFIX = 'prostock_kline_cache_'` and a 10-minute expiry time.

3. **Existing UI Architecture in `FundamentalModal.tsx`**:
   - `src/components/FundamentalModal.tsx` (lines 40, 140-160):
     Currently has 5 tabs: `'football' | 'dcf' | 'pe_bands' | 'monte_carlo' | 'health'`.
     Tab navigation is driven by an array of objects `{ id, label, desc }`.
     The layout uses modern Tailwind classes (`bg-pro-panel`, `border-pro-border`, `text-pro-text`, `animate-fade-in`, custom badges, and Lucide icons).

4. **Public Data Sources Probed**:
   - **TWSE OpenAPI (臺灣證券交易所)**:
     - Endpoint: `https://openapi.twse.com.tw/v1/opendata/t187ap04_L` (上市公司每日重大訊息).
     - Authentication: Free open data, JSON format.
     - Fields: `出表日期`, `發言日期` (ROC format YYYMMDD), `發言時間` (HH:mm:ss), `公司代號`, `公司名稱`, `主旨`, `符合條款` (e.g. 第12款 for 法說會, 第31款 for 財務報告, 第14款 for 股利, 第51款 for 其他重大訊息), `事實發生日`, `說明`.
   - **Yahoo Finance News API**:
     - Endpoint: `https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=10&quotesCount=0`
     - Status: Already permitted by `electron/main.cjs`.
     - Fields: `news[].uuid`, `title`, `publisher`, `link`, `providerPublishTime` (Unix epoch seconds), `type`, `thumbnail`.
     - Coverage: Uniformly supports TW stocks (`2330.TW`, `2317.TW`), US stocks (`AAPL`, `NVDA`), and crypto (`BTC-USD`).
   - **Yahoo Finance Calendar API**:
     - Endpoint: `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=calendarEvents`
     - Fields: `calendarEvents.earnings.earningsDate[]`, `earningsAverage`, `revenueAverage`, `dividendDate`.
   - **Taiwan Statutory Reporting Timetable (法定申報日程)**:
     - Monthly Revenue: On or before 10th of each month.
     - Q1 Financial Report: May 15th.
     - Q2 Financial Report: August 14th (Financial holding: Aug 31st).
     - Q3 Financial Report: November 14th.
     - Annual Report: March 31st of following year.

5. **Current Verification State**:
   - `npm test`: 16 test files, 135 unit tests passing 100%.
   - `npx tsc --noEmit`: 0 errors.

---

## 2. Logic Chain

1. **Dual-Market Compatibility**:
   - ProStock Analyzer supports both Taiwan equities (`TW`) and US equities (`US`), as well as ETFs and crypto.
   - For Taiwan stocks, MOPS (`t187ap04_L`) provides the legal, authoritative corporate filings and investor conference notices (Clause 12).
   - For both TW and US stocks, Yahoo Finance (`query1.finance.yahoo.com/v1/finance/search`) provides high-quality, up-to-the-minute news coverage and is already whitelisted in the Electron IPC handler.
   - Therefore, a hybrid data provider strategy is optimal: combining official MOPS filings (when available for TW stocks) with Yahoo Finance News & Calendar, backed by statutory timetable projection and benchmark mock seeds.

2. **Electron IPC & CORS Handling**:
   - In browser development mode (`localhost:5173`), direct `fetch` to `openapi.twse.com.tw` may be blocked by browser CORS.
   - In Electron desktop mode, `window.electronAPI.fetchMarketData` bypasses CORS safely.
   - To support TWSE OpenAPI directly via Electron IPC, `openapi.twse.com.tw` and `openapi.tpex.org.tw` must be added to `allowedHosts` in `electron/main.cjs`.
   - For browser dev mode or when IPC is unavailable, the client service must implement proxy fallback and immediate offline seed data fallback.

3. **Data Freshness and Rate-Limiting Defense**:
   - External APIs (especially Yahoo Finance and TWSE OpenAPI) will throttle or block rapid successive requests (HTTP 429).
   - A dedicated `CompanyInfoCache` with a 15-minute TTL (900,000 ms) using `localStorage` ensures:
     a) Instantaneous 0-delay modal opening (Stale-While-Revalidate pattern).
     b) Prevention of unnecessary network calls when user flips between tabs or stocks.
     c) Manual refresh capability with a cooldown timer (e.g. minimum 10 seconds between manual refreshes).

4. **Zero-White-Screen (R4) Assurance**:
   - If an endpoint returns 404/500/timeout or the user is offline, the application must NEVER crash or show an empty blank window.
   - Pre-compiled benchmark seeds for top popular stocks (`2330.TW`, `2317.TW`, `2454.TW`, `0050.TW`, `AAPL`, `NVDA`, `TSLA`, `MSFT`) provide instant, realistic corporate disclosures.
   - A deterministic statutory schedule generator calculates upcoming regulatory dates (next monthly revenue, next quarterly report) for any unseeded stock code.

---

## 3. Caveats

1. **MOPS OpenAPI Frequency & Scope**:
   - TWSE OpenAPI endpoint `t187ap04_L` returns today's and recent days' announcements across all listed companies. When querying a specific ticker, client-side filtering by `公司代號` is required. If a company has not made a major announcement within the dataset's timeframe (typically recent 1~7 days), the announcements list for that ticker will be legitimately empty. The UI must present a clear, reassuring status: "近期無重大訊息申報，公司營運維持常態公布".
2. **ROC Calendar Era vs. AD Years**:
   - TWSE fields use Republic of China (ROC) calendar years (e.g. `1150906`). Algorithms must convert `rocYear + 1911` to produce standard ISO timestamps (`2026-09-06`).
3. **Crypto and ETF Distinctions**:
   - Cryptocurrencies (`BTCUSDT`) and Index ETFs (`SPY`, `0050.TW`) do not hold traditional corporate investor conferences or quarterly EPS announcements. The UI should dynamically display dividend distributions, fund rebalancing, or macroeconomic events rather than corporate earnings.
4. **Read-Only Mining Role**:
   - As a Specification Miner, no implementation code has been written to `src/` or `electron/`. All designs, type interfaces, and algorithms are specified here for subsequent implementation agents.

---

## 4. Conclusion & Specifications

### Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Official Filings | TWSE MOPS OpenAPI Daily Material Information | Official daily filings by listed companies (t187ap04_L) | `https://openapi.twse.com.tw/v1/opendata/t187ap04_L` | JSON array of announcements (Date, Time, Code, Name, Title, Clause, Details) | Returns empty array or network error; fall back to local seed/statutory rules | TWSE OpenAPI documentation & web survey |
| 2 | Official Filings | Announcement Classification & Normalization | Parse MOPS legal clauses (第12款法說會, 第31款財報, 第8款人事, 第14款股利, 第51款其他) into typed categories | Raw announcement item | Normalized `CompanyAnnouncement` with typed `category`, formatted date, and summary | Defaults to `'other'` if clause is unrecognized | TWSE legal procedure rules & sample filings |
| 3 | Corporate Calendar | Investor Conference (法說會) Tracking & Countdown | Detects upcoming corporate conferences, extracts meeting date/time, location, webcast URL, and calculates countdown | Target symbol & announcements or calendar feeds | `CorporateCalendarEvent` with `countdownDays`, `location`, `highlights`, `onlineUrl` | If no confirmed conference, projects statutory quarterly earnings conference window | MOPS Clause 12 guidelines & Yahoo calendarEvents |
| 4 | Corporate Calendar | Statutory Financial Reporting Timetable Engine | Computes statutory filing deadlines (每月營收 10 日前, Q1 5/15, Q2 8/14, Q3 11/14, 年報 3/31) based on current calendar date | Current date & market (`TW` vs `US`) | Next expected earnings/revenue announcement dates with countdown badges | Uses deterministic calendar arithmetic, never fails | Taiwan SEC / TWSE statutory filing regulations |
| 5 | Financial News | Real-time Stock Financial News Feed | Real-time news headlines, publishers, publish time, and external links for TW & US tickers | `query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=10` | Array of `StockNewsItem` with relative timestamps and publisher info | Falls back to cached news or seed articles | Yahoo Finance search API & `electron/main.cjs` whitelist |
| 6 | IPC Security | Electron Host Whitelist Expansion | Expand `allowedHosts` in `electron/main.cjs` to include `openapi.twse.com.tw` and `www.tpex.org.tw` | Target URL string | Permitted IPC network fetch without CORS restriction | Returns `{ error: 'Forbidden host' }` if not whitelisted | `electron/main.cjs` inspection |
| 7 | Storage & Caching | Multi-Tier Stale-While-Revalidate Cache | 15-minute `localStorage` cache for company news, announcements, and calendar events | `symbol`, `data` | Cached `CompanyFastInfoData` with timestamp | Graceful fallback on `QuotaExceededError` by clearing stale keys | `src/data/cacheService.ts` pattern analysis |
| 8 | UI Integration | FundamentalModal "資訊最速報" Tab | 6th tab in `FundamentalModal.tsx` displaying countdown cards, announcement timeline, news list, and manual refresh | Active tab `'fast_info'` | Rich dark-mode UI with countdown chips, badges, and skeleton loading | Shows informative empty state or retry button on error | `src/components/FundamentalModal.tsx` inspection |

---

### Edge Cases

| # | Feature | Input | Observed / Specified Behavior |
|---|---------|-------|-------------------------------|
| 1 | Symbol Format | Symbol with suffix e.g. `2330.TW` or `8299.TWO` vs pure `2330` | Clean code extraction (`symbol.replace(/\.(TW|TWO)$/i, '')`) before querying TWSE OpenAPI; use full Yahoo symbol for Yahoo News API. |
| 2 | ROC Year Parsing | Date strings like `1150906` or `1131015` | Correctly extract first 3 digits (`115`), add 1911 to get `2026`, format as `2026-09-06`. Safely handle 2-digit years (`991231` -> `2010-12-31`). |
| 3 | Network Disconnection | Offline or DNS failure (exit code 6 / fetch rejected) | Zero white-screen: immediate retrieval from `localStorage` cache; if cache miss, load pre-compiled seed data or generated statutory schedule with offline status chip. |
| 4 | Empty Filings Window | Legitimate stock with no filings in the last 7 days | Display empty state with green shield icon: "近期營運平穩，無重大訊息申報紀錄。下一次法定公告請參閱時程表。" |
| 5 | Non-Equity Assets | `BTCUSDT`, `SPY`, `0050.TW` | Adaptively hide investor conference card; display ETF dividend dates, NAV notices, or crypto macro events. |
| 6 | Announcement Long Text | Multi-line text with formatting ("1. ... \n 2. ... \n 3. ...") | Summary extractor extracts first 2 significant lines or "法人說明會擇要訊息", while full text is expandable via accordion/modal. |
| 7 | Special Characters & HTML | Unescaped HTML entities (`&amp;`, `&quot;`, `<br/>`) | Text sanitizer decodes entities and strips raw HTML tags to prevent XSS. |
| 8 | Rapid Manual Refresh | User clicking "手動更新" repeatedly | Throttle button with 10-second cooldown timer; display spinning animation during fetch. |

---

### Proposed TypeScript Data Contracts (`src/types/companyInfo.ts` or `src/types/stock.ts`)

```typescript
export type AnnouncementCategory =
  | 'earnings'       // 財務報告 / 季報公告
  | 'conference'     // 法人說明會 / 投資人論壇
  | 'dividend'       // 股利分派 / 除權息
  | 'governance'     // 董監事異動 / 股東常會
  | 'capital'        // 增資 / 減資 / 庫藏股
  | 'operations'     // 營收公告 / 業務簽約 / 重大投資
  | 'clarification'  // 媒體澄清 / 重大事件澄清
  | 'other';         // 其他重大訊息

export interface CompanyAnnouncement {
  id: string;
  symbol: string;             // 股票代號 (如 "2330.TW" 或 "2330")
  companyName: string;        // 公司名稱 (如 "台積電")
  publishDate: string;        // 發布日期 (ISO 格式 "YYYY-MM-DD")
  publishTime?: string;       // 發布時間 (如 "17:30:15")
  timestamp: number;          // 毫秒時間戳
  title: string;              // 主旨
  category: AnnouncementCategory; // 分類標籤
  clauseCode?: string;        // 符合條款 (如 "第12款", "第31款", "第51款")
  summary: string;            // 核心內容要點 (2~3 句精華摘要)
  content?: string;           // 完整公告內文
  source: 'MOPS' | 'TWSE_OPENAPI' | 'SEC' | 'YAHOO' | 'OFFICIAL_FALLBACK';
  isImportant?: boolean;      // 是否為特別重大訊息
  url?: string;               // 原始公告外鏈
}

export type CalendarEventType =
  | 'earnings_release'       // 預計財報公布
  | 'investor_conference'    // 法人說明會 (法說會)
  | 'shareholder_meeting'    // 股東常會 / 臨時會
  | 'ex_dividend'            // 除權息交易日
  | 'monthly_revenue';       // 每月營收公告日

export interface CorporateCalendarEvent {
  id: string;
  symbol: string;
  companyName: string;
  eventType: CalendarEventType;
  title: string;             // 事件標題
  date: string;              // 預計日期 (ISO "YYYY-MM-DD")
  time?: string;             // 預計時間 (如 "14:00")
  timestamp: number;         // 毫秒時間戳
  countdownDays: number;     // 倒數天數 (0=今日, >0=即將到來, <0=已結束)
  location?: string;         // 地點 (如 "線上視訊會議 (Webcast)")
  onlineUrl?: string;        // 線上法說會直播或簡報下載連結
  highlights: string[];      // 會議核心看點
  status: 'confirmed' | 'estimated' | 'statutory_deadline';
  periodLabel?: string;      // 財政期 (如 "2026 Q3", "2026 8月營收")
}

export interface StockNewsItem {
  id: string;
  symbol: string;
  title: string;             // 新聞標題
  publisher: string;         // 媒體來源 (如 "經濟日報", "Reuters")
  publishTime: string;       // 發布時間 (如 "2 小時前")
  timestamp: number;         // 毫秒時間戳
  summary?: string;          // 內容摘要
  url: string;               // 原文連結
  thumbnailUrl?: string;     // 縮圖
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface CompanyFastInfoData {
  symbol: string;
  name: string;
  market: 'TW' | 'US' | 'CRYPTO';
  lastUpdated: number;
  dataStatus: 'live' | 'cache' | 'simulated';
  nextKeyEvents: CorporateCalendarEvent[];
  announcements: CompanyAnnouncement[];
  news: StockNewsItem[];
  quarterlyEarningsHighlight?: {
    estimatedDate: string;
    countdownDays: number;
    consensusEPS?: number;
    lastReportedEPS?: number;
    yoyGrowth?: number;
  };
}
```

---

## 5. Verification Method

To independently verify these findings and specifications:

1. **Verify Existing Project Health**:
   ```bash
   npm test
   npx tsc --noEmit
   ```
   Both commands must pass with 100% tests passing and 0 TypeScript errors.

2. **Verify Electron IPC Whitelist**:
   Inspect `electron/main.cjs` lines 52-59:
   Verify `query1.finance.yahoo.com` is present, and note where `openapi.twse.com.tw` should be added.

3. **Verify FundamentalModal Tabs Extension**:
   Inspect `src/components/FundamentalModal.tsx` lines 40, 140-160:
   Verify where the 6th tab (`fast_info`) can be inserted seamlessly.

4. **Verify Cache Pattern**:
   Inspect `src/data/cacheService.ts`:
   Verify `localStorage` access and error handling.
