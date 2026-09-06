# Survey Explorer 1 Handoff Report: Data Flow & Electron Architecture

- **Agent**: Survey Explorer 1 (`teamwork_preview_explorer`)
- **Role**: Data Flow & Electron Architecture Explorer
- **Working Directory**: `/Users/viberorob/Desktop/New Stock Project/.agents/survey_explorer_1`
- **Target Report**: `handoff.md`
- **Timestamp**: 2026-09-06T13:46:00Z

---

## 1. Observation

### 1.1 Electron IPC Architecture & Security Whitelist
In `electron/preload.cjs` (lines 1–21):
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  ping: () => 'pong',
  fetchMarketData: (url) => ipcRenderer.invoke('fetch-market-data', url),
  updater: { ... }
});
```

In `electron/main.cjs` (lines 46–94):
```javascript
ipcMain.handle('fetch-market-data', async (_event, url) => {
  if (typeof url !== 'string') {
    return { error: 'Invalid URL parameter' };
  }
  try {
    const parsed = new URL(url);
    const allowedHosts = [
      'query1.finance.yahoo.com',
      'query2.finance.yahoo.com',
      'api.binance.com'
    ];
    if (parsed.protocol !== 'https:' || !allowedHosts.includes(parsed.hostname)) {
      return { error: 'Forbidden host' };
    }
  } catch {
    return { error: 'Malformed URL' };
  }

  async function requestWithHeaders(targetUrl) {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }

  try {
    const json = await requestWithHeaders(url);
    return { data: json };
  } catch (err) {
    if (url.includes('query1.finance.yahoo.com')) {
      try {
        const fallbackUrl = url.replace('query1.finance.yahoo.com', 'query2.finance.yahoo.com');
        const json = await requestWithHeaders(fallbackUrl);
        return { data: json };
      } catch (fallbackErr) {
        return { error: fallbackErr.message || 'Fallback request failed' };
      }
    }
    return { error: err.message || 'Network request failed' };
  }
});
```

**Key Finding on IPC Whitelist**:
- The main process executes Node.js native `fetch`, which has zero browser CORS limitations.
- However, `allowedHosts` is currently restricted strictly to `query1.finance.yahoo.com`, `query2.finance.yahoo.com`, and `api.binance.com`.
- Any external request sent to another host (e.g. `openapi.twse.com.tw`, `www.tpex.org.tw`, `mops.twse.com.tw`) immediately returns `{ error: 'Forbidden host' }` unless `allowedHosts` is extended.

---

### 1.2 Renderer Data Fetching Patterns & CORS Fallback
In `src/data/stockApi.ts` (lines 161–214):
- Checks for Electron environment: `if (typeof window !== 'undefined' && window.electronAPI?.fetchMarketData)`.
- If Electron is present, routes requests to `primaryUrl` (`query1.finance.yahoo.com`), and upon error immediately falls back to `secondaryUrl` (`query2.finance.yahoo.com`).
- In pure browser mode (without Electron), it races across public CORS proxies (`corsproxy.io`, `proxy.cors.sh`, `api.codetabs.com`, `api.allorigins.win`) with a 3500ms timeout per proxy.
- Timeout protection: A global `Promise.race` with a 6-second timeout (`setTimeout(() => resolve({ timeout: true }), 6000)`).
- Binance API (`api.binance.com`): Crypto klines and tickers are fetched via native browser `fetch` because Binance natively enables `access-control-allow-origin: *`.

---

### 1.3 Caching & Anti-Rate-Limit (429) Strategies
1. **Local Storage K-line Cache (`src/data/cacheService.ts`)**:
   - Key: `prostock_kline_cache_${symbol}_${period}_${isAdjusted ? 'adj' : 'raw'}`.
   - TTL: 10 minutes (`CACHE_EXPIRY_MS = 10 * 60 * 1000`).
   - Limits saved bars to the most recent 3,000 (`data.slice(-3000)`).
   - Pruning: `clearOld()` scans and purges keys matching prefix where `Date.now() - payload.timestamp > CACHE_EXPIRY_MS` when `localStorage` quota errors occur.
2. **In-Memory Quote Cache (`src/services/quoteService.ts`, lines 48–59)**:
   - Cache Map: `quoteCache = new Map<string, { quote: RealtimeQuote; expireAt: number }>()`.
   - TTL: 30 seconds (`CACHE_TTL_MS = 30 * 1000`).
3. **Batch Throttling (`src/services/quoteService.ts`, lines 178–205)**:
   - `fetchBatchQuotes(symbols, concurrency = 2)` limits concurrency to 2 simultaneous requests and inserts a 250ms sleep between chunks (`await new Promise((resolve) => setTimeout(resolve, 250))`).

---

### 1.4 Symbol Normalization & TWSE/TPEx Mapping
1. **Official Registry Bundling**:
   - `src/data/twseFullRegistry.json` (1,000+ TWSE上市標的)
   - `src/data/tpexFullRegistry.json` (1,300+ TPEx上櫃/櫃買標的)
   - Both datasets contain:
     - `s`: Symbol with exchange suffix (e.g. `"2330.TW"`, `"8299.TWO"`)
     - `c`: Pure stock code (e.g. `"2330"`, `"8299"`)
     - `n`: Stock name (e.g. `"台積電"`, `"群聯"`)
     - `i`: Industry category (e.g. `"半導體業"`)
     - `t`: Type (`"EQ"` or `"ETF"`)
     - `p`: Official latest closing benchmark price
     - `ch`: Price change
     - `cp`: Price change percentage
2. **Auto-Correction in `toYahooSymbol()` (`src/data/stockApi.ts`, lines 38–58)**:
   - Evaluates `TPEX_CODES` and `TWSE_CODES` sets.
   - If user passes `8299` or `8299.TW`, automatically corrects to `8299.TWO` (preventing Yahoo 404 delisted errors).
   - If user passes `2330`, resolves to `2330.TW`.
   - US stocks (e.g. `AAPL`, `NVDA`) pass through unchanged.
   - Crypto maps `BTCUSDT` -> `BTC-USD`.
3. **Pure Code Extraction for Official Taiwan APIs**:
   - Official Taiwan government/exchange APIs (TWSE OpenAPI, MOPS) require pure 4–5 digit numeric codes (e.g. `"2330"`, `"2317"`, `"8299"`), without `.TW` or `.TWO`.

---

### 1.5 Multi-Tier Zero-Blank-Screen Fallback System
The application currently operates on 4 defensive layers:
- **Tier 1 (Live Realtime)**: Remote HTTPS request via Electron main IPC or proxy.
- **Tier 2 (Local Cache)**: `localStorage` or memory cache with unexpired or gracefully stale payloads.
- **Tier 3 (Official Registry Benchmark)**: `OFFICIAL_PRICE_MAP` / `OFFICIAL_QUOTES` based on bundled TWSE/TPEx registry json ensures that even completely offline, the system never displays NaN, 0, or blanks.
- **Tier 4 (Deterministic PRNG Simulation)**: Mulberry32 PRNG (`createSeededRandom(`${symbol}_${period}_stable_v2`)`) in `stockService.ts:generateRealisticKLineData` generates deterministic, reproducible price series pinned to the official anchor price.

---

### 1.6 Current Verification State
- `npm test`: 16 test files, 135 tests passing (100% pass, 767ms execution).
- `npx tsc --noEmit`: 0 TypeScript compiler errors.

---

## 2. Logic Chain

1. **Premise 1**: The user requests a new "公司資訊最速報" feature in `FundamentalModal.tsx` displaying:
   - (R1) Latest MOPS corporate material announcements & news headlines with timestamps, titles, and key points.
   - (R2) Next expected earnings release date, investor conference (法說會) schedule, and key highlights countdown.
   - (R3) Integration in `FundamentalModal.tsx` as a dedicated tab with modern dark theme cards and timelines.
   - (R4) Robust timeout protection, caching, and graceful zero-blank-screen empty/fallback states.
2. **Premise 2**: In Electron, browser renderer code cannot make cross-origin requests to hosts that lack CORS headers (like TWSE, MOPS, and Yahoo Finance) unless routed through Electron IPC `fetchMarketData`.
3. **Premise 3**: Currently, `electron/main.cjs` strictly validates requests against `allowedHosts = ['query1.finance.yahoo.com', 'query2.finance.yahoo.com', 'api.binance.com']`.
4. **Premise 4**:
   - For official TWSE listed announcements, TWSE provides `https://openapi.twse.com.tw/v1/opendata/t187ap04_L` (上市公司每日重大訊息).
   - For real-time news headlines, Yahoo Finance provides `https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=15`.
   - For corporate calendar and earnings announcement dates, Yahoo Finance provides `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=calendarEvents,earnings`.
   - For statutory legal deadlines (法定申報期限) in Taiwan: Q1 by May 15, Q2 by August 14, Q3 by November 14, Annual/Q4 by March 31, and monthly revenue by the 10th of every month.
5. **Deduction**:
   - Extending `allowedHosts` in `electron/main.cjs` to include `openapi.twse.com.tw`, `www.tpex.org.tw`, and `mops.twse.com.tw` empowers the existing `window.electronAPI.fetchMarketData` channel to fetch official MOPS/TWSE data without changing `preload.cjs` or creating new IPC channels.
   - A dual-engine service `src/services/mopsService.ts` combining (A) official TWSE/TPEx announcements, (B) Yahoo Finance news & calendar events, and (C) statutory calendar calculation + curated major stock events (台積電、鴻海、聯發科等) provides 100% data coverage for all Taiwan stocks and major US stocks, with zero blank screen even when offline.

---

## 3. Caveats

1. **TWSE OpenAPI Data Scope**:
   - `openapi.twse.com.tw` returns daily snapshots of announcements rather than a searchable historical database. Therefore, local caching (`localStorage`) is essential to preserve previously fetched announcements.
2. **Sandbox Network Restrictions**:
   - Terminal shell commands in the agent sandbox cannot access external networks (exit code 6). Testing API responses directly in the terminal via curl must rely on application unit tests or mock fixtures.
3. **Rate Limiting**:
   - Rapid queries to Yahoo Finance search or quoteSummary endpoints can trigger HTTP 429. The new service must enforce a minimum 10–15 minute cache TTL and prevent duplicate in-flight requests.
4. **Read-Only Scope**:
   - As Survey Explorer 1, no source files were modified in `src/` or `electron/`. All recommendations are documented for implementation by the designated specialist agents.

---

## 4. Conclusion & Recommendations

### 4.1 Recommended Service Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FundamentalModal.tsx (UI Layer)                      │
│        - New Tab: "⚡ 資訊最速報 / 重訊日程" (id: 'announcements')       │
│        - Top: Next Earnings / Conference Countdown Banner (倒數看板)    │
│        - Middle: Event Timeline (法說會 / 財報 / 除息 / 營收公布)       │
│        - Bottom: Filterable Announcements & News List (全部/重訊/新聞)   │
│        - Status bar: Refresh button, Last updated, Live/Cache indicator │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  src/services/mopsService.ts (Service)                  │
│   - fetchCompanyAnnouncements(symbol: string, forceRefresh?: boolean)   │
│   - fetchUpcomingEvents(symbol: string): Promise<UpcomingEvent[]>       │
│   - calculateStatutoryCalendar(symbol: string): UpcomingEvent[]         │
└───────────────────┬─────────────────────────────────┬───────────────────┘
                    │                                 │
     ┌──────────────┴──────────────┐   ┌──────────────┴───────────────────┐
     ▼                             ▼   ▼                                  ▼
[TWSE/TPEx OpenAPI]      [Yahoo News & Calendar] [Local Cache & Fallback]
- t187ap04_L (重大訊息)   - /v1/finance/search    - localStorage (15m TTL)
- mopsfin_t187ap04_O     - /v10/quoteSummary     - Curated Benchmark (2330 etc)
                         (modules=calendarEvents)- Statutory Rules (法定申報)
```

---

### 4.2 Proposed File Modifications & Additions

#### 1. Update `electron/main.cjs` (Allowed Hosts)
Extend `allowedHosts` at line 52:
```javascript
const allowedHosts = [
  'query1.finance.yahoo.com',
  'query2.finance.yahoo.com',
  'api.binance.com',
  'openapi.twse.com.tw',
  'www.tpex.org.tw',
  'mops.twse.com.tw'
];
```
*Impact*: Enables direct IPC fetching of official MOPS and TWSE/TPEx open data without CORS errors. Zero breaking changes to `preload.cjs`.

#### 2. Create `src/types/mops.ts`
Define strong TypeScript contracts:
```typescript
export type AnnouncementType = 'MOPS_CRITICAL' | 'EARNINGS' | 'CONFERENCE' | 'DIVIDEND' | 'NEWS';

export interface CompanyAnnouncement {
  id: string;
  symbol: string;
  companyName: string;
  type: AnnouncementType;
  title: string;
  summary: string;
  content?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm:ss
  timestamp: number; // Unix timestamp ms
  source: 'MOPS' | 'TWSE' | 'TPEX' | 'YAHOO' | 'OFFICIAL_CALENDAR';
  url?: string;
  ruleClause?: string; // e.g. "重大訊息符合條款第51款"
  importance: 'HIGH' | 'MEDIUM' | 'NORMAL';
}

export interface UpcomingEvent {
  id: string;
  title: string;
  eventType: 'EARNINGS_RELEASE' | 'INVESTOR_CONFERENCE' | 'MONTHLY_REVENUE' | 'EX_DIVIDEND' | 'SHAREHOLDERS_MEETING';
  expectedDate: string; // YYYY-MM-DD
  expectedDateEnd?: string;
  daysRemaining: number;
  description: string;
  highlights: string[]; // 關鍵看點摘要
  status: 'CONFIRMED' | 'ESTIMATED';
  quarterOrMonth?: string;
}

export interface CompanyNewsAndEvents {
  symbol: string;
  companyName: string;
  lastUpdated: number;
  status: 'live' | 'cache' | 'fallback';
  announcements: CompanyAnnouncement[];
  upcomingEvents: UpcomingEvent[];
  nextKeyCountdown?: {
    title: string;
    targetDate: string;
    daysRemaining: number;
    type: string;
    highlights: string[];
  };
}
```

#### 3. Create `src/services/mopsService.ts`
- **Identifier Extraction**:
  ```typescript
  export function extractTaiwanStockCode(symbol: string): string | null {
    const clean = symbol.trim().toUpperCase();
    const match = clean.match(/^(\d{4,5}[A-Z]?)(?:\.(?:TW|TWO))?$/i);
    return match ? match[1] : null;
  }
  ```
- **Fetch Pipeline**:
  1. Check in-memory / localStorage cache (`prostock_mops_${symbol}`, TTL = 15 minutes).
  2. If fresh and not `forceRefresh`, return cached data immediately.
  3. Parallel fetch:
     - If Taiwan stock: fetch TWSE/TPEx OpenAPI announcement feeds via `window.electronAPI?.fetchMarketData`.
     - Fetch Yahoo Finance news via `window.electronAPI?.fetchMarketData('https://query1.finance.yahoo.com/v1/finance/search?q=' + encodeURIComponent(toYahooSymbol(symbol)) + '&newsCount=15')`.
     - Fetch Yahoo Finance calendar events via `https://query1.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=calendarEvents,earnings`.
  4. Parse and normalize items into `CompanyAnnouncement[]` and `UpcomingEvent[]`.
  5. Calculate statutory deadlines (台股每季法定申報日與每月10日營收公布) + merge with confirmed calendar dates.
  6. Calculate `nextKeyCountdown` (e.g. days until next investor conference or earnings date).
  7. If any network call fails or times out (5-second timeout), seamlessly fall back to cache -> statutory rules -> curated benchmark data.
  8. Save result in `localStorage`.

#### 4. Update `src/components/FundamentalModal.tsx`
- Add tab option in Tab Bar:
  ```typescript
  { id: 'announcements', label: '⚡ 資訊最速報 / 重訊日程', desc: 'MOPS重大訊息公告、法說會與財報時程' }
  ```
- Tab Content Section:
  - **Top Countdown Hero Card**: Displays the closest upcoming key event (e.g. `2026 Q3 法人說明會 倒數 38 天`), with visual status badge, event date, and bulleted key watchpoints (關鍵看點摘要).
  - **Timeline Cards**: Horizontal or vertical timeline of upcoming milestones (Q3 財報、法說會、除息日、每月營收).
  - **Filterable Announcement Feed**:
    - Segmented control: `全部 (All)` | `MOPS重大訊息` | `法說/財報` | `財經新聞`.
    - Modern dark-theme cards with color-coded badges (`[MOPS重大訊息 第51款]`, `[重要公告]`).
    - Expandable detail view for full announcement explanations.
  - **Header Actions**: Manual refresh button (`重新整理` with spinning animation when loading), and timestamp indicator (`資料時間: 14:30 (即時連線)`).
  - **Skeleton / Empty State**: Elegant skeleton loaders during fetch and helpful empty state if a company has no current public disclosures.

---

## 5. Verification Method

### 5.1 Verification Commands
To independently verify the environment and validate future changes:
1. **Unit Tests**:
   ```bash
   npm test
   ```
   *Expected outcome*: All 16 test suites and 135 tests pass 100%.
2. **TypeScript Static Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   *Expected outcome*: 0 errors.

### 5.2 Specific Test Cases to Add in QA Phase
1. `mopsService.test.ts`:
   - Verify `extractTaiwanStockCode`:
     - `'2330.TW'` -> `'2330'`
     - `'8299.TWO'` -> `'8299'`
     - `'2330'` -> `'2330'`
     - `'AAPL'` -> `null`
   - Verify statutory calendar calculations (Q1-Q4 deadlines and monthly revenue deadlines).
   - Verify caching behavior (cache hit within 15 mins, bypass with `forceRefresh = true`).
   - Verify offline fallback resilience (ensuring valid `CompanyNewsAndEvents` is returned with zero thrown errors).
2. `FundamentalModal.test.ts` (or component test):
   - Verify tab switching to `'announcements'`.
   - Verify countdown badge rendering.
   - Verify filter button interactions (All / MOPS / News).

### 5.3 Invalidation Conditions
This survey report would be invalidated if:
- `electron/main.cjs` removed the IPC pattern in favor of an entirely different network architecture.
- TWSE retired `openapi.twse.com.tw`.
- Yahoo Finance completely locked down its `query1.finance.yahoo.com` endpoint with mandatory OAuth authentication.

---
*Report completed by Survey Explorer 1. Ready for handoff.*
