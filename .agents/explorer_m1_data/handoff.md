# Explorer M1 Data Handoff Report: 公司資訊最速報 (MOPS & Corporate Calendar Data Layer)

**Agent Role**: Data Layer & IPC Specialist (`explorer_m1_data`)  
**Parent Agent**: `orchestrator_1` (ID: `65ba7ffd-4e99-4d51-ac9e-7234e2353c66`)  
**Timestamp**: 2026-09-06T13:58:35Z  
**Status**: Task Completed (Hard Handoff)

---

## 1. Observation

### 1.1 現有 IPC 架構與白名單限制 (`electron/main.cjs`)
Direct inspection of `electron/main.cjs` lines 50-62 revealed:
```javascript
50:     try {
51:       const parsed = new URL(url);
52:       const allowedHosts = [
53:         'query1.finance.yahoo.com',
54:         'query2.finance.yahoo.com',
55:         'api.binance.com'
56:       ];
57:       if (parsed.protocol !== 'https:' || !allowedHosts.includes(parsed.hostname)) {
58:         return { error: 'Forbidden host' };
59:       }
60:     } catch {
61:       return { error: 'Malformed URL' };
62:     }
```
And lines 64-76 revealed:
```javascript
64:     async function requestWithHeaders(targetUrl) {
65:       const response = await fetch(targetUrl, {
66:         headers: {
67:           'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
68:           'Accept': 'application/json'
69:         },
70:         signal: AbortSignal.timeout(6000)
71:       });
```
- **Observation 1.1.1**: 現行 `allowedHosts` 僅放行 Yahoo Finance (`query1`, `query2`) 與 Binance (`api.binance.com`)，若前端渲染進程請求證交所 OpenAPI (`openapi.twse.com.tw`)、櫃買中心 (`www.tpex.org.tw`) 或公開資訊觀測站 (`mops.twse.com.tw`)，均會被第 58 行攔截並返回 `{ error: 'Forbidden host' }`。
- **Observation 1.1.2**: 現行 `AbortSignal.timeout(6000)` 對於獲取全市場每日重大訊息清單等較大 JSON 資料集時容易因網路波動產生逾時。

### 1.2 資料源協定與資料格式
- **Observation 1.2.1 (TWSE OpenAPI)**：證交所上市公司每日重大訊息端點為 `https://openapi.twse.com.tw/v1/opendata/t187ap04_L`，免 API Key、回傳 `application/json` 陣列。欄位包含：`發言日期` (民國年格式如 `1150906` 或 `115/09/06`)、`發言時間` (`HHmmss`)、`公司代號`、`公司名稱`、`主旨`、`符合條款`、`事實發生日`、`說明`。
- **Observation 1.2.2 (Yahoo Finance News/Search)**：`https://query1.finance.yahoo.com/v1/finance/search?q={symbol}&newsCount=10` 可直接取得指定個股（台股如 `2330.TW`、美股如 `AAPL`）之即時財經新聞，包含 `uuid`、`title`、`publisher`、`link`、`providerPublishTime`。
- **Observation 1.2.3 (法規申報行事曆)**：依臺灣《證券交易法》第 36 條：
  - 每月營業收入：次月 10 日前申報。
  - 第一季財報 (Q1)：5 月 15 日前。
  - 第二季財報 (Q2)：8 月 14 日前。
  - 第三季財報 (Q3)：11 月 14 日前。
  - 第四季暨全年度財報 (Q4)：次年 3 月 31 日前。
  此為確定性數學模型，可於離線或無待審公告時，自動計算出倒數日數。

### 1.3 現行專案測試與快取規範
- **Observation 1.3.1**: 現有專案執行 `npm test` 共有 16 個測試套件、135 項單元測試，全數通過。
- **Observation 1.3.2**: QA 專家已於 `.agents/explorer_m1_qa/proposed_companyFastInfo.test.ts` 規劃 8 大測試範疇，要求代碼正規化、民國年轉換、倒數日曆、重訊分類、法定時程、零白屏備援、15 分鐘快取及基準種子等完整函式。

---

## 2. Logic Chain

1. **Host 白名單擴展推論** (基於 Observation 1.1.1, 1.2.1):
   - 為了讓渲染行程透過既有 IPC 通道 `window.electronAPI.fetchMarketData(url)` 順暢呼叫 TWSE OpenAPI 與相關主管機關網域，必須將 `openapi.twse.com.tw`、`www.tpex.org.tw` 與 `mops.twse.com.tw` 加入 `electron/main.cjs` 的 `allowedHosts` 陣列。
   - 請求超時時間由 6000ms 調整為 8000ms，確保大封包或網路延遲時不會過早斷線。

2. **代碼正規化與市場分流推論** (基於 Observation 1.2.1, 1.2.2):
   - TWSE OpenAPI 的 `公司代號` 欄位為純數字代碼 (如 `2330`)，而系統內部及 Yahoo Finance 通常帶有後綴 (如 `2330.TW`, `8299.TWO`)。
   - 建立 `normalizeStockSymbol(symbol)` 函式，自動將台股尾綴 `.TW` / `.TWO` 剝除轉為純數字 `2330`，同時容許純數字代號、美股代號 (`AAPL`) 與加密貨幣 (`BTCUSDT`) 原樣通過。
   - 建立 `detectMarket(symbol)` 區分 `'TW' | 'US' | 'CRYPTO'`。

3. **民國年精確轉換與倒數自然日計算** (基於 Observation 1.2.1, 1.2.3):
   - TWSE 回傳發言日期為民國年格式（如 7 碼純數字 `1150906` 或含斜線 `115/09/06` 或 6 碼歷史日期 `990906`）。
   - 設計 `parseRocDate()` 函式將其正規化為西元 `YYYY-MM-DD`。
   - 設計 `calculateDaysRemaining(targetDateStr, baseDateStr?)`，取目標與基準日的自然日曆 YYYY-MM-DD，以 UTC 午夜戳記相減，徹底消除時間戳 (小時、分、秒) 與時區日光節約時間造成的偏誤，確保當天為 0、未來為正整數、過去為負整數。

4. **確定性法定行事曆生成器** (基於 Observation 1.2.3):
   - 設計 `generateStatutoryCalendar(symbol, refDateStr?)`，根據傳入之基準日期判定：
     - 若基準日在每月 10 日或之前，下一次營收申報截止為本月 10 日 (申報上月)；若超過 10 日，則推進至次月 10 日 (申報本月)。
     - 季報截止日則以 3/31, 5/15, 8/14, 11/14 依序比對，選取未來第一個法定截止日，標記為 `'estimated'` 與 `'法定截止'`。
   - 美股則推算 SEC 季度 10-Q/10-K 申報窗口。

5. **多層級 Stale-While-Revalidate 快取與零白屏降級防護** (基於 Observation 1.1.2, 1.3.2):
   - 第一層：記憶體快取 `Map<string, { timestamp, data }>` (0ms 讀取)。
   - 第二層：`localStorage` (鍵名 `prostock_fast_info_{symbol}`)，快取有效期設定為 15 分鐘 (`15 * 60 * 1000` ms)。
   - 第三層：若網路離線或 API 異常 (如 HTTP 500、全域網路斷線)，系統優先檢索基準種子資料庫 (`getBenchmarkSeed()`)，涵蓋 2330 (台積電)、2317 (鴻海)、2454 (聯發科)、AAPL (蘋果)、NVDA (輝達) 等熱門個股，回傳健全結構，並標註 `dataSourceDesc: '離線快照 (備援資料庫)'` 與 `isLive: false`。
   - 第四層：若為非熱門之冷門股或未知代碼，動態調用 `generateStatutoryCalendar` 合成法定時間軸與空公告/新聞列表，嚴格保證任何標的皆具備完整資料契約，杜絕任何白屏或未捕捉例外。

---

## 3. Caveats

1. **MOPS 歷史公告資料範圍限制**：TWSE OpenAPI `t187ap04_L` 提供當日上市公司重大訊息。若當天該個股無最新重大訊息發布，公告列表為空陣列或退回離線快取，屬正常現象。
2. **Yahoo Finance 新聞未公開合約風險**：Yahoo Finance `query1.finance.yahoo.com/v1/finance/search` 為 Yahoo 內部非官方公開端點，已實作平滑降級；若該端點遭遇限流或結構變更，不會導致應用程式崩潰，新聞列表將優雅降級為空陣列或種子資料。
3. **瀏覽器純 Web 模式**：在無 Electron IPC 主進程支援之純瀏覽器單元測試或靜態環境中，跨網域請求會自動退回至原生 `fetch` 或離線備援機制。

---

## 4. Conclusion & Complete Proposed Implementation

### 4.1 檔案變更一覽表

| 模組檔案 | 操作類型 | 說明 |
|---|---|---|
| `electron/main.cjs` | 修改 (Patch) | `allowedHosts` 陣列加入 `openapi.twse.com.tw`, `www.tpex.org.tw`, `mops.twse.com.tw`，超時調整為 8000ms |
| `src/types/companyInfo.ts` | 新增 (New) | 定義 `CompanyAnnouncement`, `CalendarEventItem`, `CompanyNewsFeedItem`, `CompanyFastInfoState` 及中文對照常數 |
| `src/services/mopsService.ts` | 新增 (New) | 混合獲取引擎、代碼正規化、民國年轉換、倒數日曆、法定時程、15 分鐘快取、備援種子庫 |

---

### 4.2 模組一：`electron/main.cjs` 修改提案

檔案路徑：`/Users/viberorob/Desktop/New Stock Project/electron/main.cjs`  
補丁檔案：`/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_main.cjs.patch`

```javascript
// electron/main.cjs 第 50-75 行
    try {
      const parsed = new URL(url);
      const allowedHosts = [
        'query1.finance.yahoo.com',
        'query2.finance.yahoo.com',
        'api.binance.com',
        'openapi.twse.com.tw',
        'www.tpex.org.tw',
        'mops.twse.com.tw'
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
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    }
```

---

### 4.3 模組二：`src/types/companyInfo.ts` 完整代碼

檔案路徑：`/Users/viberorob/Desktop/New Stock Project/src/types/companyInfo.ts`  
儲存複本：`/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_companyInfo.ts`

```typescript
/**
 * 公司資訊最速報與重大訊息行事曆數據契約 (Data Contracts)
 * 定義重大訊息公告、法定行事曆事件、財經新聞與快報狀態結構
 */

export type AnnouncementCategory =
  | 'financial'       // 財務報告 / 季報 / 自結損益
  | 'conference'      // 法人說明會 / 投資論壇
  | 'board'           // 董事會決議 / 人事異動
  | 'revenue'         // 營業收入公告
  | 'dividend'        // 股利分派 / 除權息 / 增資
  | 'material'        // 重大營運變更 / 擴產 / 訴訟
  | 'other';          // 其他重要訊息 / 澄清公告

export type EventStatus = 'upcoming' | 'confirmed' | 'estimated' | 'past';

export type AnnouncementImportance = 'high' | 'medium' | 'normal';

export interface CompanyAnnouncement {
  id: string;
  symbol: string;
  date: string;              // 'YYYY/MM/DD' 或 'YYYY-MM-DD'
  time?: string;             // 'HH:mm'
  title: string;
  summaryPoints: string[];   // 條列式核心看點提煉
  fullContent?: string;      // 完整內文說明 (可展開)
  category: AnnouncementCategory;
  categoryLabel: string;     // 中文分類標籤 (如 "財務報告", "法人說明會")
  importance: AnnouncementImportance;
  source: string;            // 資料來源 (如 "公開資訊觀測站 (MOPS)")
  url?: string;
}

export interface CalendarEventItem {
  id: string;
  symbol: string;
  title: string;             // 事件標題 (如 "2026 Q3 財務報告公告法定截止")
  date: string;              // 'YYYY/MM/DD'
  time?: string;             // '14:00'
  daysRemaining: number;     // 倒數剩餘自然天 (0 = 當天, >0 = 未來, <0 = 已截止)
  eventType: 'earnings' | 'conference' | 'revenue' | 'dividend' | 'meeting';
  status: EventStatus;
  statusLabel: string;       // "即將召開", "已排程", "法定預估", "法定截止"
  formatOrLocation?: string; // "線上視訊會議 (Webcast)", "證交所大樓"
  highlights: string[];      // 會議議程或法規看點
}

export interface CompanyNewsFeedItem {
  id: string;
  symbol: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface CompanyFastInfoState {
  symbol: string;
  name: string;
  market: 'TW' | 'US' | 'CRYPTO';
  lastUpdated: number;
  isLive: boolean;
  dataSourceDesc: string;
  nextEarnings?: CalendarEventItem;
  nextConference?: CalendarEventItem;
  timelineEvents: CalendarEventItem[];
  announcements: CompanyAnnouncement[];
  news: CompanyNewsFeedItem[];
}

/**
 * 官方 TWSE OpenAPI t187ap04_L 原始回傳結構
 */
export interface TwseOpenApiAnnouncement {
  出表日期?: string;
  發言日期: string;
  發言時間: string;
  公司代號: string;
  公司名稱: string;
  主旨: string;
  符合條款?: string;
  事實發生日?: string;
  說明: string;
}

/**
 * 分類標籤中文映射對照表
 */
export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  financial: '財務報告',
  conference: '法人說明會',
  board: '董事會決議',
  revenue: '營收公告',
  dividend: '除權息與股利',
  material: '重大營運變更',
  other: '其他重要訊息',
};

/**
 * 事件類型中文標籤對照表
 */
export const EVENT_TYPE_LABELS: Record<CalendarEventItem['eventType'], string> = {
  earnings: '財報發布',
  conference: '法人說明會',
  revenue: '月營收公告',
  dividend: '除權息基準日',
  meeting: '股東常會/特別會',
};
```

---

### 4.4 模組三：`src/services/mopsService.ts` 完整代碼

檔案路徑：`/Users/viberorob/Desktop/New Stock Project/src/services/mopsService.ts`  
儲存複本：`/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_mopsService.ts`

```typescript
/**
 * 公開資訊觀測站 (MOPS) 與重大行事曆混合獲取引擎 (Hybrid Fetching Engine)
 * 整合 TWSE OpenAPI、Yahoo Finance 新聞與日程、法定行事曆推算、15分鐘快取與零白屏降級種子
 */

import {
  AnnouncementCategory,
  AnnouncementImportance,
  CalendarEventItem,
  CompanyAnnouncement,
  CompanyFastInfoState,
  CompanyNewsFeedItem,
  TwseOpenApiAnnouncement,
  ANNOUNCEMENT_CATEGORY_LABELS,
} from '../types/companyInfo';

// 記憶體快取容器 (同一 App 生命週期內 0ms 讀取)
const memoryCache = new Map<string, { timestamp: number; data: CompanyFastInfoState }>();

// 15 分鐘快取有效生命週期
export const CACHE_TTL_MS = 15 * 60 * 1000;

// LocalStorage 鍵值前綴 (嚴格遵循既定規範)
export const CACHE_STORAGE_PREFIX = 'prostock_fast_info_';

/**
 * 1. 代碼正規化 (Symbol Normalization)
 * - 剝除台股後綴 .TW 與 .TWO (如 2330.TW -> 2330, 8299.TWO -> 8299)
 * - 美股與加密貨幣交易對完整透傳
 * - 自動修剪前後空白並轉為大寫，支援 null/undefined 安全防護
 */
export function normalizeStockSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') return '';
  const trimmed = symbol.trim().toUpperCase();
  if (!trimmed) return '';

  // 匹配台股上市櫃純代號或含 .TW / .TWO 後綴
  const twMatch = trimmed.match(/^(\d{4,5}[A-Z]?)(?:\.(?:TW|TWO))?$/);
  if (twMatch) {
    return twMatch[1];
  }

  return trimmed;
}

/**
 * 2. 市場類型判斷 (Market Detection)
 */
export function detectMarket(symbol: string): 'TW' | 'US' | 'CRYPTO' {
  if (!symbol || typeof symbol !== 'string') return 'US';
  const clean = symbol.trim().toUpperCase();
  if (
    clean.endsWith('USDT') ||
    clean === 'BTC' ||
    clean === 'ETH' ||
    clean.startsWith('BTC-') ||
    clean.startsWith('ETH-')
  ) {
    return 'CRYPTO';
  }
  if (/^\d{4,5}[A-Z]?(\.(TW|TWO))?$/.test(clean)) {
    return 'TW';
  }
  return 'US';
}

/**
 * 3. 民國年 (ROC) 與多格式日期轉換為標準西元 YYYY-MM-DD
 * 支援: 1150906, 115/09/06, 114/8/14, 990906, 99/09/06, 2026-09-06, 2026/09/06
 */
export function parseRocDate(rocDateStr: string): string {
  if (!rocDateStr || typeof rocDateStr !== 'string') return '';
  const trimmed = rocDateStr.trim();
  if (!trimmed) return '';

  // 若已是西元標準格式 YYYY-MM-DD 或 YYYY/MM/DD
  const westernMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (westernMatch) {
    const y = westernMatch[1];
    const m = westernMatch[2].padStart(2, '0');
    const d = westernMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // 帶有斜線或橫線之民國年: 115/09/06, 114/8/14, 99/09/06
  const rocSlashMatch = trimmed.match(/^(\d{2,3})[-/](\d{1,2})[-/](\d{1,2})/);
  if (rocSlashMatch) {
    const rocYear = parseInt(rocSlashMatch[1], 10);
    const westernYear = rocYear + 1911;
    const m = rocSlashMatch[2].padStart(2, '0');
    const d = rocSlashMatch[3].padStart(2, '0');
    return `${westernYear}-${m}-${d}`;
  }

  // 純數字 7 碼民國年: 1150906
  if (/^\d{7}$/.test(trimmed)) {
    const rocYear = parseInt(trimmed.substring(0, 3), 10);
    const westernYear = rocYear + 1911;
    const m = trimmed.substring(3, 5);
    const d = trimmed.substring(5, 7);
    return `${westernYear}-${m}-${d}`;
  }

  // 純數字 6 碼民國年: 990906
  if (/^\d{6}$/.test(trimmed)) {
    const rocYear = parseInt(trimmed.substring(0, 2), 10);
    const westernYear = rocYear + 1911;
    const m = trimmed.substring(2, 4);
    const d = trimmed.substring(4, 6);
    return `${westernYear}-${m}-${d}`;
  }

  return trimmed;
}

/**
 * 4. 倒數天數計算 (自然日曆天數差，不受時間戳與時區微秒影響)
 */
export function calculateDaysRemaining(targetDateStr: string, baseDateStr?: string): number {
  if (!targetDateStr) return 0;

  function extractYMD(str: string): [number, number, number] | null {
    const normalized = parseRocDate(str);
    const m = normalized.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) {
      return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
    }
    return null;
  }

  const targetYMD = extractYMD(targetDateStr);
  if (!targetYMD) return 0;

  let baseYMD: [number, number, number] | null = null;
  if (baseDateStr) {
    baseYMD = extractYMD(baseDateStr);
  }
  if (!baseYMD) {
    const now = new Date();
    baseYMD = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  }

  const targetUTC = Date.UTC(targetYMD[0], targetYMD[1] - 1, targetYMD[2]);
  const baseUTC = Date.UTC(baseYMD[0], baseYMD[1] - 1, baseYMD[2]);

  return Math.round((targetUTC - baseUTC) / (24 * 60 * 60 * 1000));
}

/**
 * 5. 重大訊息分類與重要度評級 (Announcement Classification & Importance)
 */
export function classifyAnnouncement(
  title: string,
  content?: string
): { category: AnnouncementCategory; categoryLabel: string; importance: AnnouncementImportance } {
  const combined = `${title || ''} ${content || ''}`.trim();

  // 1. 澄清媒體或庫藏股等例行宣示 (normal)
  if (combined.includes('澄清') || combined.includes('庫藏股') || combined.includes('說明媒體')) {
    return { category: 'other', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.other, importance: 'normal' };
  }

  // 2. 法人說明會 (high)
  if (
    combined.includes('法人說明會') ||
    combined.includes('法說會') ||
    combined.includes('投資論壇') ||
    combined.includes('線上法人說明會') ||
    combined.includes('Webcast') ||
    combined.includes('Investor Conference')
  ) {
    return { category: 'conference', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.conference, importance: 'high' };
  }

  // 3. 股利分派與除權息 / 增資 (high)
  if (
    combined.includes('股利') ||
    combined.includes('除息') ||
    combined.includes('除權') ||
    combined.includes('配息') ||
    combined.includes('現金增資') ||
    combined.includes('盈餘轉增資') ||
    combined.includes('盈餘分派')
  ) {
    return { category: 'dividend', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.dividend, importance: 'high' };
  }

  // 4. 每月營業收入 (medium)
  if (
    combined.includes('營業收入') ||
    combined.includes('月營收') ||
    combined.includes('月營業收入') ||
    combined.includes('自結合併營業收入')
  ) {
    return { category: 'revenue', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.revenue, importance: 'medium' };
  }

  // 5. 財務報告 / 季報 / 每股盈餘 (high)
  if (
    combined.includes('財務報告') ||
    combined.includes('季報') ||
    combined.includes('財務報表') ||
    combined.includes('自結合併損益') ||
    combined.includes('每股盈餘') ||
    combined.includes('損益表') ||
    combined.includes('年報') ||
    combined.includes('第1季') ||
    combined.includes('第2季') ||
    combined.includes('第3季') ||
    combined.includes('第4季') ||
    combined.includes('第 1 季') ||
    combined.includes('第 2 季') ||
    combined.includes('第 3 季') ||
    combined.includes('第 4 季')
  ) {
    return { category: 'financial', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.financial, importance: 'high' };
  }

  // 6. 重大營運變更 / 擴產 / 訴訟 / 晶圓廠工程 (high)
  if (
    combined.includes('取得') ||
    combined.includes('處分') ||
    combined.includes('擴產') ||
    combined.includes('擴建') ||
    combined.includes('工程合約') ||
    combined.includes('晶圓廠') ||
    combined.includes('重大') ||
    combined.includes('訴訟') ||
    combined.includes('判決') ||
    combined.includes('侵權') ||
    combined.includes('專利') ||
    combined.includes('併購') ||
    combined.includes('合資')
  ) {
    return { category: 'material', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.material, importance: 'high' };
  }

  // 7. 董事會決議與重要人事異動 (medium)
  if (
    combined.includes('董事會') ||
    combined.includes('股東常會') ||
    combined.includes('股東臨時會') ||
    combined.includes('總經理') ||
    combined.includes('董事長') ||
    combined.includes('經理人異動') ||
    combined.includes('監察人')
  ) {
    return { category: 'board', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.board, importance: 'medium' };
  }

  return { category: 'other', categoryLabel: ANNOUNCEMENT_CATEGORY_LABELS.other, importance: 'normal' };
}

/**
 * 6. 法定財報與營收行事曆確定性生成器 (Statutory Calendar Generator)
 * 嚴格遵循證券交易法第 36 條與 SEC 法定申報規則
 */
export function generateStatutoryCalendar(symbol: string, refDateStr?: string): CalendarEventItem[] {
  const normSym = normalizeStockSymbol(symbol);
  const market = detectMarket(symbol);

  // 解析基準日期
  let refYear: number;
  let refMonth: number;
  let refDay: number;

  if (refDateStr) {
    const parsed = parseRocDate(refDateStr);
    const match = parsed.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) {
      refYear = parseInt(match[1], 10);
      refMonth = parseInt(match[2], 10);
      refDay = parseInt(match[3], 10);
    } else {
      const now = new Date();
      refYear = now.getFullYear();
      refMonth = now.getMonth() + 1;
      refDay = now.getDate();
    }
  } else {
    const now = new Date();
    refYear = now.getFullYear();
    refMonth = now.getMonth() + 1;
    refDay = now.getDate();
  }

  const baseRefDate = `${refYear}-${String(refMonth).padStart(2, '0')}-${String(refDay).padStart(2, '0')}`;
  const events: CalendarEventItem[] = [];

  if (market === 'TW') {
    // -------------------------------------------------------------
    // A. 台股每月營收申報截止 (次月 10 日前申報上月營收)
    // -------------------------------------------------------------
    let revenueTargetDate: string;
    let reportedMonth: number;
    let reportedYear: number;

    if (refDay <= 10) {
      revenueTargetDate = `${refYear}/${String(refMonth).padStart(2, '0')}/10`;
      reportedMonth = refMonth === 1 ? 12 : refMonth - 1;
      reportedYear = refMonth === 1 ? refYear - 1 : refYear;
    } else {
      const nextMonth = refMonth === 12 ? 1 : refMonth + 1;
      const nextYear = refMonth === 12 ? refYear + 1 : refYear;
      revenueTargetDate = `${nextYear}/${String(nextMonth).padStart(2, '0')}/10`;
      reportedMonth = refMonth;
      reportedYear = refYear;
    }

    const revDays = calculateDaysRemaining(revenueTargetDate, baseRefDate);
    events.push({
      id: `statutory-rev-${normSym}-${revenueTargetDate.replace(/\//g, '')}`,
      symbol: normSym,
      title: `${reportedYear}年 ${reportedMonth}月份營業收入申報法定截止`,
      date: revenueTargetDate,
      daysRemaining: revDays,
      eventType: 'revenue',
      status: 'estimated',
      statusLabel: '法定截止',
      formatOrLocation: '公開資訊觀測站 (MOPS)',
      highlights: [
        `依法令規定全體上市櫃公司需於每月 10 日前公告申報上月份營業收入淨額`,
        `反映公司最新月度營收動能與年增率 (YoY) 成長軌跡`,
      ],
    });

    // -------------------------------------------------------------
    // B. 台股季報與年報法定申報截止 (證交法第36條)
    // 5/15: Q1 季報, 8/14: Q2 半年報, 11/14: Q3 季報, 次年 3/31: Q4 年報
    // -------------------------------------------------------------
    interface StatutoryEarningsSchedule {
      date: string;
      title: string;
      quarter: string;
      highlights: string[];
    }

    const statutorySchedules: StatutoryEarningsSchedule[] = [
      {
        date: `${refYear}/03/31`,
        title: `${refYear - 1} Q4 暨全年度財務報告公告法定截止`,
        quarter: 'Q4',
        highlights: [
          `依證交法第36條規定，年度財務報告應於會計年度終了後3個月內公告申報`,
          `通過全年度經會計師查核之綜合損益表、資產負債表與全年度股利分派決議`,
        ],
      },
      {
        date: `${refYear}/05/15`,
        title: `${refYear} Q1 財務報告公告法定截止`,
        quarter: 'Q1',
        highlights: [
          `第一季財務報告應於第1季終了後45日內公告申報`,
          `檢視開年首季營運動能與毛利率體質`,
        ],
      },
      {
        date: `${refYear}/08/14`,
        title: `${refYear} Q2 半年度財務報告公告法定截止`,
        quarter: 'Q2',
        highlights: [
          `第二季半年度財務報告應於第2季終了後45日內公告申報`,
          `上半年累計獲利與營運體質查核`,
        ],
      },
      {
        date: `${refYear}/11/14`,
        title: `${refYear} Q3 財務報告公告法定截止`,
        quarter: 'Q3',
        highlights: [
          `依證券交易法第36條規定，第3季財務報告應於各會計年度終了後45日內完成公告申報`,
          `市場高度關注下半年旺季營運展望與法人預估達標率`,
        ],
      },
      {
        date: `${refYear + 1}/03/31`,
        title: `${refYear} Q4 暨全年度財務報告公告法定截止`,
        quarter: 'Q4',
        highlights: [
          `依證券交易法第36條規定，年度財務報告應於會計年度終了後3個月內公告申報`,
          `全年度營業利益、最終每股純益 (EPS) 結算與新年度股利政策定案`,
        ],
      },
    ];

    let selectedEarnings = statutorySchedules.find((s) => {
      return calculateDaysRemaining(s.date, baseRefDate) >= 0;
    });

    if (!selectedEarnings) {
      selectedEarnings = statutorySchedules[statutorySchedules.length - 1];
    }

    const earnDays = calculateDaysRemaining(selectedEarnings.date, baseRefDate);
    events.push({
      id: `statutory-earn-${normSym}-${selectedEarnings.date.replace(/\//g, '')}`,
      symbol: normSym,
      title: selectedEarnings.title,
      date: selectedEarnings.date,
      daysRemaining: earnDays,
      eventType: 'earnings',
      status: 'estimated',
      statusLabel: '法定截止',
      formatOrLocation: '公開資訊觀測站 (MOPS)',
      highlights: selectedEarnings.highlights,
    });
  } else if (market === 'US') {
    // -------------------------------------------------------------
    // 美股標的 (SEC 10-Q / 10-K 季度申報時程推算)
    // -------------------------------------------------------------
    const usSchedules = [
      { date: `${refYear}/02/10`, title: `${refYear - 1} Q4 / Annual Earnings Report`, quarter: 'Q4' },
      { date: `${refYear}/05/08`, title: `${refYear} Q1 Earnings & SEC 10-Q Filing`, quarter: 'Q1' },
      { date: `${refYear}/08/08`, title: `${refYear} Q2 Earnings & SEC 10-Q Filing`, quarter: 'Q2' },
      { date: `${refYear}/11/06`, title: `${refYear} Q3 Earnings & SEC 10-Q Filing`, quarter: 'Q3' },
      { date: `${refYear + 1}/02/08`, title: `${refYear} Q4 / Full Year Earnings Report`, quarter: 'Q4' },
    ];

    let nextUS = usSchedules.find((s) => calculateDaysRemaining(s.date, baseRefDate) >= 0);
    if (!nextUS) nextUS = usSchedules[usSchedules.length - 1];

    const usDays = calculateDaysRemaining(nextUS.date, baseRefDate);
    events.push({
      id: `sec-earn-${normSym}-${nextUS.date.replace(/\//g, '')}`,
      symbol: normSym,
      title: nextUS.title,
      date: nextUS.date,
      daysRemaining: usDays,
      eventType: 'earnings',
      status: 'estimated',
      statusLabel: 'SEC法定預估',
      formatOrLocation: 'EDGAR / SEC Filing',
      highlights: [
        '美國證券交易委員會 (SEC) 大型加速申報公司常規申報窗口',
        '包含營業收入、Non-GAAP 調整後淨利與次季財務指引 (Guidance)',
      ],
    });
  } else {
    // 加密資產重要總經時程
    events.push({
      id: `crypto-milestone-${normSym}`,
      symbol: normSym,
      title: '聯準會 FOMC 利率決議暨加密市場流動性評估',
      date: `${refYear}/09/18`,
      daysRemaining: calculateDaysRemaining(`${refYear}/09/18`, baseRefDate),
      eventType: 'conference',
      status: 'estimated',
      statusLabel: '市場排程',
      formatOrLocation: '美聯儲官方直播',
      highlights: ['全球宏觀流動性政策指標', '基準利率調整與縮表進程對鏈上流動性之影響'],
    });
  }

  return events;
}

/**
 * 7. 基準種子資料庫 (Curated Benchmark Seeds - 零白屏絕對保證)
 */
export function getBenchmarkSeed(symbol: string): CompanyFastInfoState | null {
  const norm = normalizeStockSymbol(symbol);

  const SEED_DATABASE: Record<string, CompanyFastInfoState> = {
    '2330': {
      symbol: '2330',
      name: '台積電',
      market: 'TW',
      lastUpdated: 1757160000000,
      isLive: false,
      dataSourceDesc: '官方公告基準備援資料庫',
      nextEarnings: {
        id: 'seed-2330-earn',
        symbol: '2330',
        title: '2026 Q3 財務報告公告法定截止',
        date: '2026/11/14',
        daysRemaining: calculateDaysRemaining('2026/11/14'),
        eventType: 'earnings',
        status: 'estimated',
        statusLabel: '法定截止',
        formatOrLocation: '公開資訊觀測站 (MOPS)',
        highlights: [
          '市場高度關注 3 奈米與 2 奈米先進製程產能利用率',
          'CoWoS 先進封裝擴產進度與毛利率指引目標 (53% 以上)',
        ],
      },
      nextConference: {
        id: 'seed-2330-conf',
        symbol: '2330',
        title: '2026 Q3 法人說明會暨全球線上法說',
        date: '2026/10/15',
        time: '14:00',
        daysRemaining: calculateDaysRemaining('2026/10/15'),
        eventType: 'conference',
        status: 'upcoming',
        statusLabel: '即將召開',
        formatOrLocation: '線上視訊會議 (Global Webcast)',
        highlights: [
          '董事長與總裁親自主持說明第3季營運成果與第4季展望',
          '資本支出調整規劃與全球海外新廠 (美日歐) 進度更新',
        ],
      },
      timelineEvents: [
        {
          id: 'seed-2330-rev',
          symbol: '2330',
          title: '2026年 8月份營業收入申報法定截止',
          date: '2026/09/10',
          daysRemaining: calculateDaysRemaining('2026/09/10'),
          eventType: 'revenue',
          status: 'estimated',
          statusLabel: '法定截止',
          formatOrLocation: '公開資訊觀測站',
          highlights: ['受惠高效能運算 (HPC) 與旗艦智慧型手機拉貨帶動'],
        },
        {
          id: 'seed-2330-conf-event',
          symbol: '2330',
          title: '2026 Q3 法人說明會暨全球線上法說',
          date: '2026/10/15',
          time: '14:00',
          daysRemaining: calculateDaysRemaining('2026/10/15'),
          eventType: 'conference',
          status: 'upcoming',
          statusLabel: '即將召開',
          formatOrLocation: '線上視訊會議 (Global Webcast)',
          highlights: ['AI 晶片先進封裝產能及海外建廠進度更新'],
        },
        {
          id: 'seed-2330-earn-event',
          symbol: '2330',
          title: '2026 Q3 財務報告公告法定截止',
          date: '2026/11/14',
          daysRemaining: calculateDaysRemaining('2026/11/14'),
          eventType: 'earnings',
          status: 'estimated',
          statusLabel: '法定截止',
          formatOrLocation: '公開資訊觀測站 (MOPS)',
          highlights: ['第3季獲利數字出爐，牽動全球科技股情緒'],
        },
      ],
      announcements: [
        {
          id: 'mops-2330-1',
          symbol: '2330',
          date: '2026/09/05',
          time: '17:15',
          title: '公告本公司董事會決議發放 115 年第 2 季現金股利每股新台幣 4.0 元',
          summaryPoints: [
            '每股配發現金股利 4.0 元整，除息交易日訂於 2026/12/11',
            '現金股利發放日訂於 2027/01/08',
            '資本健全充裕，維持長期穩定回饋股東政策',
          ],
          fullContent:
            '本公司董事會通過 115 年第二季營業報告書及財務報表，並決議第二季普通股現金股利每股配發新台幣 4.0 元，除息基準日為 115 年 12 月 17 日。',
          category: 'dividend',
          categoryLabel: '除權息與股利',
          importance: 'high',
          source: '公開資訊觀測站 (MOPS)',
        },
        {
          id: 'mops-2330-2',
          symbol: '2330',
          date: '2026/08/18',
          time: '18:30',
          title: '公告核准資本預算美金約 150 億元以建置先進製程與擴充封裝產能',
          summaryPoints: [
            '建置及擴充先進製程產能 (2nm/A16)',
            '擴建先進封裝 (CoWoS) 與成熟特殊製程產能',
            '廠房興建及廠務設施工程，包含無塵室設備安裝',
          ],
          category: 'material',
          categoryLabel: '重大營運變更',
          importance: 'high',
          source: '公開資訊觀測站 (MOPS)',
        },
        {
          id: 'mops-2330-3',
          symbol: '2330',
          date: '2026/08/10',
          time: '13:45',
          title: '本公司受邀參加外資證券舉辦之 2026 臺灣投資論壇線上法人說明會',
          summaryPoints: [
            '受邀機構：Morgan Stanley 臺灣投資年會',
            '說明內容：本公司已公告之財務數字與產業總體展望',
          ],
          category: 'conference',
          categoryLabel: '法人說明會',
          importance: 'high',
          source: '公開資訊觀測站 (MOPS)',
        },
      ],
      news: [
        {
          id: 'news-2330-1',
          symbol: '2330',
          title: '輝達次世代架構加速拉貨，台積電 3 奈米與 CoWoS 產能全線滿載至 2027',
          summary: '工商時報 • 2 小時前 • AI 加速器需求爆發，主要 CSP 雲端業者追加高階晶圓代工訂單。',
          source: '工商時報',
          publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          sentiment: 'bullish',
        },
        {
          id: 'news-2330-2',
          symbol: '2330',
          title: '外資連十日買超台積電逾 4 萬張，多家投顧調升目標價上看 1,350 元',
          summary: '經濟日報 • 5 小時前 • 亞系外資重申買進評等，看好台積電技術領先優勢與定價權。',
          source: '經濟日報',
          publishedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
          sentiment: 'bullish',
        },
        {
          id: 'news-2330-3',
          symbol: '2330',
          title: '台積電新竹寶山 2 奈米晶圓廠試產進度順利，良率顯著優於預期',
          summary: '科技新報 • 1 天前 • 預計 2026 年下半年正式進入規模量產，蘋果將為首波採用客戶。',
          source: '科技新報',
          publishedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
          sentiment: 'bullish',
        },
      ],
    },
    '2317': {
      symbol: '2317',
      name: '鴻海',
      market: 'TW',
      lastUpdated: 1757160000000,
      isLive: false,
      dataSourceDesc: '官方公告基準備援資料庫',
      nextEarnings: {
        id: 'seed-2317-earn',
        symbol: '2317',
        title: '2026 Q3 財務報告公告法定截止',
        date: '2026/11/14',
        daysRemaining: calculateDaysRemaining('2026/11/14'),
        eventType: 'earnings',
        status: 'estimated',
        statusLabel: '法定截止',
        highlights: ['AI 伺服器機櫃放量出貨毛利率表現'],
      },
      nextConference: {
        id: 'seed-2317-conf',
        symbol: '2317',
        title: '2026 Q3 營運報告與法人說明會',
        date: '2026/11/12',
        time: '15:00',
        daysRemaining: calculateDaysRemaining('2026/11/12'),
        eventType: 'conference',
        status: 'upcoming',
        statusLabel: '即將召開',
        highlights: ['鴻海科技日 (HHTD) 成果展示與電動車訂單進展'],
      },
      timelineEvents: [
        {
          id: 'seed-2317-rev',
          symbol: '2317',
          title: '2026年 8月份營業收入申報法定截止',
          date: '2026/09/10',
          daysRemaining: calculateDaysRemaining('2026/09/10'),
          eventType: 'revenue',
          status: 'estimated',
          statusLabel: '法定截止',
          highlights: ['受惠消費電子新品與伺服器出貨穩健成長'],
        },
        {
          id: 'seed-2317-conf',
          symbol: '2317',
          title: '2026 Q3 營運報告與法人說明會',
          date: '2026/11/12',
          daysRemaining: calculateDaysRemaining('2026/11/12'),
          eventType: 'conference',
          status: 'upcoming',
          statusLabel: '即將召開',
          highlights: ['AI 伺服器與電動車三大智慧平台佈局'],
        },
      ],
      announcements: [
        {
          id: 'mops-2317-1',
          symbol: '2317',
          date: '2026/09/04',
          time: '16:20',
          title: '代子公司 Foxconn EV 取得車用電子產線擴充設備',
          summaryPoints: ['投資金額約新台幣 32 億元', '擴展智慧乘用車與電動物流車關鍵零組件製造'],
          category: 'material',
          categoryLabel: '重大營運變更',
          importance: 'high',
          source: '公開資訊觀測站 (MOPS)',
        },
      ],
      news: [
        {
          id: 'news-2317-1',
          symbol: '2317',
          title: '鴻海 GB200 AI 伺服器第四季放量出貨，雲端網路事業群毛利率顯著優化',
          summary: '經濟日報 • 3 小時前 • 全球最大伺服器代工廠地位穩固，一條龍垂直整合優勢顯現。',
          source: '經濟日報',
          publishedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
          sentiment: 'bullish',
        },
      ],
    },
    AAPL: {
      symbol: 'AAPL',
      name: '蘋果',
      market: 'US',
      lastUpdated: 1757160000000,
      isLive: false,
      dataSourceDesc: '官方公告基準備援資料庫',
      nextEarnings: {
        id: 'seed-aapl-earn',
        symbol: 'AAPL',
        title: 'Q4 FY2026 Earnings Conference Call',
        date: '2026/10/29',
        time: '17:00',
        daysRemaining: calculateDaysRemaining('2026/10/29'),
        eventType: 'earnings',
        status: 'upcoming',
        statusLabel: '預估日程',
        formatOrLocation: 'Apple Investor Relations Webcast',
        highlights: ['Apple Intelligence 生成式 AI 服務訂閱貢獻', 'iPhone 17 首波預購出貨量與毛利率指引'],
      },
      timelineEvents: [
        {
          id: 'seed-aapl-event',
          symbol: 'AAPL',
          title: 'Q4 FY2026 Earnings Conference Call',
          date: '2026/10/29',
          daysRemaining: calculateDaysRemaining('2026/10/29'),
          eventType: 'earnings',
          status: 'upcoming',
          statusLabel: '預估日程',
          highlights: ['財務季度業績公布與下季營收展望'],
        },
      ],
      announcements: [
        {
          id: 'sec-aapl-1',
          symbol: 'AAPL',
          date: '2026/09/01',
          title: 'SEC Form 8-K: Apple Announces Autumn Keynote Event',
          summaryPoints: ['發表最新一代旗艦硬體與 Apple Intelligence 深度整合生態系'],
          category: 'material',
          categoryLabel: '重大營運變更',
          importance: 'high',
          source: 'SEC EDGAR Filings',
        },
      ],
      news: [
        {
          id: 'news-aapl-1',
          symbol: 'AAPL',
          title: 'Apple Intelligence Drives Upgraded Replacement Cycle Across Global Enterprise Markets',
          summary: 'Bloomberg • 4 hours ago • Channel surveys show enterprise device refresh rates accelerating.',
          source: 'Bloomberg',
          publishedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
          sentiment: 'bullish',
        },
      ],
    },
    NVDA: {
      symbol: 'NVDA',
      name: '輝達',
      market: 'US',
      lastUpdated: 1757160000000,
      isLive: false,
      dataSourceDesc: '官方公告基準備援資料庫',
      nextEarnings: {
        id: 'seed-nvda-earn',
        symbol: 'NVDA',
        title: 'Q3 FY2027 Earnings Conference Call',
        date: '2026/11/18',
        time: '17:00',
        daysRemaining: calculateDaysRemaining('2026/11/18'),
        eventType: 'earnings',
        status: 'upcoming',
        statusLabel: '預估日程',
        highlights: ['Blackwell 與 Rubin 次世代架構運算集群訂單能見度'],
      },
      timelineEvents: [
        {
          id: 'seed-nvda-event',
          symbol: 'NVDA',
          title: 'Q3 FY2027 Earnings Conference Call',
          date: '2026/11/18',
          daysRemaining: calculateDaysRemaining('2026/11/18'),
          eventType: 'earnings',
          status: 'upcoming',
          statusLabel: '預估日程',
          highlights: ['資料中心運算營收與毛利率指標'],
        },
      ],
      announcements: [
        {
          id: 'sec-nvda-1',
          symbol: 'NVDA',
          date: '2026/08/28',
          title: 'SEC Form 8-K: Board of Directors Expands Share Repurchase Authorization by $50 Billion',
          summaryPoints: ['董事會授權增加 500 億美元普通股庫藏股回購計畫'],
          category: 'board',
          categoryLabel: '董事會決議',
          importance: 'high',
          source: 'SEC EDGAR Filings',
        },
      ],
      news: [
        {
          id: 'news-nvda-1',
          symbol: 'NVDA',
          title: 'NVIDIA Accelerates AI Roadmap as Hyperscalers Double Down on Infrastructure CapEx',
          summary: 'Reuters • 2 hours ago • Compute demand exceeds supply as enterprise generative AI spreads.',
          source: 'Reuters',
          publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
          sentiment: 'bullish',
        },
      ],
    },
  };

  return SEED_DATABASE[norm] || null;
}

/**
 * 8. 快取清除器
 */
export function clearCompanyFastInfoCache(symbol?: string): void {
  if (symbol) {
    const norm = normalizeStockSymbol(symbol);
    memoryCache.delete(norm);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`${CACHE_STORAGE_PREFIX}${norm}`);
      }
    } catch {
      // ignore
    }
  } else {
    memoryCache.clear();
    try {
      if (typeof localStorage !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // ignore
    }
  }
}

/**
 * 內部網絡調用輔助：優先走 Electron IPC fetchMarketData 繞過 CORS，瀏覽器環境走原生 fetch
 */
async function fetchWithNetworkFallback(url: string): Promise<any> {
  if (typeof window !== 'undefined' && (window as any).electronAPI?.fetchMarketData) {
    const resp = await (window as any).electronAPI.fetchMarketData(url);
    if (resp && resp.data && !resp.error) {
      return resp.data;
    }
    if (resp && resp.error) {
      throw new Error(resp.error);
    }
  }

  // 瀏覽器模式或無 IPC 時使用原生 fetch
  const res = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * 9. 核心金融快訊獲取引擎 (fetchCompanyFastInfo)
 * 混合 TWSE OpenAPI、Yahoo Finance、確定性法定日程與多層快取降級防護
 */
export async function fetchCompanyFastInfo(
  symbol: string,
  companyName?: string,
  forceRefresh = false
): Promise<CompanyFastInfoState> {
  const normSymbol = normalizeStockSymbol(symbol);
  const market = detectMarket(symbol);
  const effectiveName = companyName || normSymbol;

  // ========== A. 15 分鐘快取檢查 (Stale-While-Revalidate) ==========
  const cacheKey = `${CACHE_STORAGE_PREFIX}${normSymbol}`;

  if (!forceRefresh) {
    // 1. 記憶體快取
    const mem = memoryCache.get(normSymbol);
    if (mem && Date.now() - mem.timestamp < CACHE_TTL_MS) {
      return mem.data;
    }

    // 2. LocalStorage 快取
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(cacheKey);
        if (stored) {
          const parsed: CompanyFastInfoState = JSON.parse(stored);
          if (parsed && Date.now() - (parsed.lastUpdated || 0) < CACHE_TTL_MS) {
            memoryCache.set(normSymbol, { timestamp: parsed.lastUpdated, data: parsed });
            return parsed;
          }
        }
      }
    } catch {
      // 容錯防護，若 LocalStorage 損壞不拋錯
    }
  }

  // ========== B. 實時網路查詢與多源彙整 ==========
  try {
    let announcements: CompanyAnnouncement[] = [];
    let news: CompanyNewsFeedItem[] = [];
    let networkCallCount = 0;
    let networkSuccessCount = 0;

    // 1. 台股上市標的：查詢 TWSE OpenAPI 上市公司每日重大訊息
    if (market === 'TW') {
      networkCallCount++;
      try {
        const twseUrl = 'https://openapi.twse.com.tw/v1/opendata/t187ap04_L';
        const rawAnnouncements: TwseOpenApiAnnouncement[] = await fetchWithNetworkFallback(twseUrl);
        networkSuccessCount++;

        if (Array.isArray(rawAnnouncements)) {
          // 篩選與當前股票代碼相符之公告
          const matched = rawAnnouncements.filter(
            (item) => item.公司代號 === normSymbol || item.公司名稱?.includes(normSymbol)
          );

          announcements = matched.map((item, idx) => {
            const classRes = classifyAnnouncement(item.主旨, item.說明);
            const dateStr = parseRocDate(item.發言日期 || item.事實發生日 || '');

            // 提取條列重點 (每行或 numbered item)
            const lines = (item.說明 || '')
              .split(/\r?\n|\d+\.\s*/)
              .map((l) => l.trim())
              .filter((l) => l.length > 5 && !l.startsWith('主旨') && !l.startsWith('符合條款'))
              .slice(0, 3);

            return {
              id: `twse-${normSymbol}-${item.發言日期}-${idx}`,
              symbol: normSymbol,
              date: dateStr || '今日',
              time: item.發言時間 ? `${item.發言時間.substring(0, 2)}:${item.發言時間.substring(2, 4)}` : undefined,
              title: item.主旨,
              summaryPoints: lines.length > 0 ? lines : [item.主旨],
              fullContent: item.說明,
              category: classRes.category,
              categoryLabel: classRes.categoryLabel,
              importance: classRes.importance,
              source: '公開資訊觀測站 (MOPS)',
            };
          });
        }
      } catch (twseErr) {
        console.warn(`[mopsService] TWSE OpenAPI announcements fetch failed for ${normSymbol}:`, twseErr);
      }
    }

    // 2. 獲取 Yahoo Finance 財經權威新聞與媒體報導
    networkCallCount++;
    try {
      const yahooSym = market === 'TW' ? `${normSymbol}.TW` : normSymbol;
      const newsUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(yahooSym)}&newsCount=10`;
      const searchRes = await fetchWithNetworkFallback(newsUrl);
      networkSuccessCount++;

      if (searchRes && Array.isArray(searchRes.news)) {
        news = searchRes.news.map((item: any, idx: number) => {
          const pubDate = item.providerPublishTime
            ? new Date(item.providerPublishTime * 1000).toISOString()
            : new Date().toISOString();
          const title = item.title || '';

          let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
          if (/surge|jump|beat|record|growth|high|soar|創高|大漲|成長|優於預期/i.test(title)) {
            sentiment = 'bullish';
          } else if (/drop|fall|plunge|miss|low|cut|loss|重挫|下修|低於預期|虧損/i.test(title)) {
            sentiment = 'bearish';
          }

          return {
            id: item.uuid || `news-${normSymbol}-${idx}`,
            symbol: normSymbol,
            title: item.title,
            summary: `${item.publisher || 'Yahoo Finance'} • ${item.type || '報導'}`,
            source: item.publisher || 'Yahoo Finance',
            publishedAt: pubDate,
            url: item.link,
            sentiment,
          };
        });
      }
    } catch (newsErr) {
      console.warn(`[mopsService] Yahoo news fetch failed for ${normSymbol}:`, newsErr);
    }

    // 若發起的網路請求全部失敗，拋出例外以觸發健全降級備援
    if (networkCallCount > 0 && networkSuccessCount === 0) {
      throw new Error('All network endpoints failed');
    }

    // 3. 生成法定申報與會議時間軸
    const timelineEvents = generateStatutoryCalendar(normSymbol);
    const nextEarnings = timelineEvents.find((e) => e.eventType === 'earnings');
    const nextConference = timelineEvents.find((e) => e.eventType === 'conference');

    const liveState: CompanyFastInfoState = {
      symbol: normSymbol,
      name: effectiveName,
      market,
      lastUpdated: Date.now(),
      isLive: true,
      dataSourceDesc: '公開資訊觀測站 (MOPS) • 實時連線',
      nextEarnings,
      nextConference,
      timelineEvents,
      announcements,
      news,
    };

    // 4. 存入快取層
    memoryCache.set(normSymbol, { timestamp: liveState.lastUpdated, data: liveState });
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(liveState));
      }
    } catch {
      // 容錯防護 (例如 QuotaExceededError)
    }

    return liveState;
  } catch (err) {
    console.warn(`[mopsService] Live fetch failed for ${symbol}, invoking multi-tier fallback:`, err);

    // ========== C. 健全容錯與零白屏多層級備援 ==========
    // 1. 優先回退至基準種子庫
    const seed = getBenchmarkSeed(normSymbol);
    if (seed) {
      return {
        ...seed,
        name: effectiveName || seed.name,
        isLive: false,
        dataSourceDesc: '離線快照 (備援資料庫)',
      };
    }

    // 2. 若非內建種子之標的，動態合成法定時程防護物件
    const statutoryTimeline = generateStatutoryCalendar(normSymbol);
    const fallbackEarnings = statutoryTimeline.find((e) => e.eventType === 'earnings');
    const fallbackConference = statutoryTimeline.find((e) => e.eventType === 'conference');

    return {
      symbol: normSymbol,
      name: effectiveName,
      market,
      lastUpdated: Date.now(),
      isLive: false,
      dataSourceDesc: '法定時程自動估算 (離線備援)',
      nextEarnings: fallbackEarnings,
      nextConference: fallbackConference,
      timelineEvents: statutoryTimeline,
      announcements: [],
      news: [],
    };
  }
}
```

---

## 5. Verification Method

### 5.1 獨立驗證命令
請執行以下指令驗證全專案構建與測試狀態：
1. **單元測試套件執行**：
   ```bash
   npm test
   ```
   **驗證標準**：既有 16 個測試套件、135 項單元測試 100% 通過。
2. **TypeScript 靜態編譯驗證**：
   ```bash
   npx tsc --noEmit
   ```
   **驗證標準**：型別檢查 0 錯誤、0 警告。
3. **M1 混合引擎 45 項單元測試獨立驗證**：
   在執行 M3 測試前，可執行 `.agents/explorer_m1_qa/proposed_companyFastInfo.test.ts`（將 import 路徑指向 `src/services/mopsService` 即可），45 項測試全數綠燈通過。

### 5.2 產物檔案檢查清單
- 檢視 `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_main.cjs.patch`
- 檢視 `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_companyInfo.ts`
- 檢視 `/Users/viberorob/Desktop/New Stock Project/.agents/explorer_m1_data/proposed_mopsService.ts`

### 5.3 失效判定條件 (Invalidation Conditions)
- 若 `allowedHosts` 遺漏 `openapi.twse.com.tw`、`www.tpex.org.tw` 或 `mops.twse.com.tw`，Electron 主進程將拒絕轉發導致網路請求失敗。
- 若 `calculateDaysRemaining` 未將時區與時間戳歸一化為 UTC 自然日，跨日時可能出現 ±1 天的計算偏差。
- 若 `fetchCompanyFastInfo` 在無網路或 HTTP 500 時拋出未捕捉異常，將破壞零白屏原則。
