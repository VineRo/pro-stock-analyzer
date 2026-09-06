# Handoff Report: Reviewer 2 (Security, Edge Cases & Robustness Reviewer)

- **Agent**: Reviewer 2 (`teamwork_preview_reviewer`)
- **Roles**: reviewer, critic
- **Working Directory**: `/Users/viberorob/Desktop/New Stock Project/.agents/reviewer_2`
- **Workspace Root**: `/Users/viberorob/Desktop/New Stock Project`
- **Date**: 2026-09-06T14:12:00Z
- **Type**: Hard Handoff
- **Explicit Verdict**: **`APPROVE`**

---

## 1. Observation

### 1.1 程式碼檢視與實作邊界
1. **`electron/main.cjs`** (Line 46-97):
   - IPC 處理器 `fetch-market-data` 擴增 `allowedHosts`，包含 `openapi.twse.com.tw`、`www.tpex.org.tw` 與 `mops.twse.com.tw`。
   - 包含協定嚴格限制 `parsed.protocol !== 'https:'` 及白名單精確比對 `!allowedHosts.includes(parsed.hostname)`。
   - 設置 `signal: AbortSignal.timeout(8000)` 防止 IPC 通道無限掛起。
   - Yahoo Finance API 包含自動故障切換：`url.includes('query1.finance.yahoo.com')` 失敗時自動轉向 `query2.finance.yahoo.com`。
2. **`src/types/companyInfo.ts`** (Line 1-111):
   - 定義完整的 TypeScript 型別契約：`AnnouncementCategory`、`CalendarEventItem`、`CompanyAnnouncement`、`CompanyFastInfoState`、`CompanyNewsFeedItem`、`TwseOpenApiAnnouncement`。
   - 提供靜態映射常數 `ANNOUNCEMENT_CATEGORY_LABELS` 與 `EVENT_TYPE_LABELS`。
3. **`src/services/mopsService.ts`** (Line 1-1083):
   - `normalizeStockSymbol`: 支援 `.TW`、`.TWO`、純數字、特殊字元與美股/加密代碼的修剪與正規化。
   - `detectMarket`: 判定 `TW`、`US`、`CRYPTO`。
   - `parseRocDate`: 支援 7 碼純數字 (1150906)、斜線民國年 (115/09/06)、歷史雙位數民國年 (990906) 及西元標準格式。
   - `calculateDaysRemaining`: 基於 `Date.UTC` 午夜時間戳計算自然日曆天差，避免日光節約時間 (DST) 與時區時分秒偏移。
   - `generateStatutoryCalendar`: 遵循證券交易法第 36 條（每月 10 日前申報營收、5/15 Q1、8/14 Q2、11/14 Q3、次年 3/31 年報）及 SEC 申報窗口。
   - 多層快取：記憶體快取 (`Map`) + 15 分鐘 `localStorage` (`prostock_fast_info_`)，支援 `forceRefresh`。
   - 零白屏降級：斷網或 API 異常時，主要標的 (2330, 2317, AAPL, NVDA) 降級至官方公告備援資料庫；冷門標的動態合成法定時程與空陣列。
4. **`src/components/CompanyFastInfoTab.tsx`** (Line 1-829):
   - 包含 1:1 骨架屏 (`loading && !infoData`) 與斷網重試狀態 (`error && !infoData`)。
   - 所有資料陣列存取 (`timelineEvents`, `announcements`, `news`, `summaryPoints`, `highlights`) 皆具備嚴格空值與長度防護，無 `undefined.map` 風險。
   - 無任何 `dangerouslySetInnerHTML`，杜絕 XSS 風險；外連超連結均配置 `target="_blank"` 與 `rel="noopener noreferrer"`。
5. **`src/components/FundamentalModal.tsx`** (Line 38, 140-145, 173, 205-214):
   - 新增 `'fast_info'` 分頁，標籤為「⚡ 資訊最速報 / 重訊日程」。
   - 在 `fast_info` 分頁自動收合估值新手引導，最大化垂直閱讀體驗。
6. **`src/__tests__/companyFastInfo.test.ts`** (Line 1-575):
   - 8 大範疇共 45 項單元測試，無任何造假或針對測試斷言特化的硬編碼 logic。

### 1.2 複驗指令輸出 (Verbatim Output)
- **`npm test`**:
  ```
  Test Files  18 passed (18)
       Tests  225 passed (225)
    Start at  22:07:27
    Duration  1.37s
  ```
- **`npx tsc --noEmit`**:
  ```
  The command exited with code 0.
  ```
- **`npx vitest run src/__tests__/companyFastInfo.test.ts`**:
  ```
  Test Files  1 passed (1)
       Tests  45 passed (45)
    Start at  22:10:23
    Duration  429ms
  ```
- **`npm run build`**:
  ```
  vite v6.4.3 building for production...
  ✓ 1892 modules transformed.
  ✓ built in 1.66s
  The command exited with code 0.
  ```

---

## 2. Logic Chain

1. **誠信與防作弊評估 (Integrity Verification)**:
   - 經源碼比對，`mopsService.ts` 真正發起 TWSE OpenAPI 與 Yahoo Finance 請求，真正實作民國年轉換正規表達式、日期差推算、證交法法定時間軸、雙層快取與備援合成。
   - 未在原始碼中發現硬編碼特定測試結果、無 Dummy/Facade 欺瞞邏輯，亦無破壞性變更或歷史目錄篡改，通過誠信審查。
2. **網路安全與 IPC 隔離推論**:
   - `electron/main.cjs` 嚴格限制 `https:` 協定與 `allowedHosts` 清單，使用字串完全相等的陣列包含比對，杜絕子網域注入、偽造協定與 SSRF 漏洞。
   - 8 秒逾時防護確保若 TWSE 或 Yahoo 伺服器無響應時，Electron 進程不發生連線洩漏。
3. **極端輸入與代碼正規化健全性推論**:
   - `normalizeStockSymbol` 經過 `""`、`null`、`undefined`、`"   "`、`"2330.TW"`、`"8299.TWO"`、`"2881A.TW"`、`"<script>"` 等多維度邊界檢驗，皆平穩回傳字串且無未捕捉例外。
   - `parseRocDate` 與 `calculateDaysRemaining` 採用 `Date.UTC` 純日曆天計算，排除潤秒、夏令時間與時區小時落差，當日精準為 0，過期精準為負整數，符合商業邏輯。
4. **零白屏原則與 React 渲染安全推論**:
   - `CompanyFastInfoTab.tsx` 所有條件分支均對 `infoData` 及其子屬性施行可選鏈 (`?.`) 與陣列合法性檢查。
   - 遭遇斷網、API 500、JSON 毀損或冷門無資料標的，皆能退回確定性法定時程與乾淨空狀態卡片，符合零白屏承諾 (No Crash Principle)。

---

## 3. Caveats

1. **上櫃 (TPEx) 標的即時重訊覆蓋**:
   目前即時重大訊息端點連接為證交所上市公司端點 (`t187ap04_L`)。若使用者檢視純上櫃個股（如 8299、6488），其重大訊息清單在非種子狀態下將呈現空公告狀態，但其法定營收/財報時程與 Yahoo 財經新聞仍能正常運作。建議後續迭代可補充櫃買中心公開端點。
2. **LocalStorage 堆積管理**:
   雖然 `setItem` 具備 `try-catch` 避免配額滿溢報錯，且具備 `clearCompanyFastInfoCache` 工具函式，但目前未配置跨啟動的主動 LRU 清理。因每個快取項目僅 ~3-8 KB，短期內無記憶體或配額風險。

---

## 4. Conclusion

- 實作完整、品質極高、測試充分（225/225 通過）、靜態型別 0 錯誤、生產建置無虞。
- 網路逾時、快取、代碼解析、日曆運算與渲染防護皆具備企業級防禦水準。
- **最終評定：`APPROVE`**。

---

## 5. Verification Method

獨立驗證指令：
```bash
# 1. 執行全量單元測試 (須 18 套件、225 項測試 100% 通過)
npm test

# 2. 執行專案 TypeScript 嚴格靜態型別檢查 (須 0 錯誤退出)
npx tsc --noEmit

# 3. 執行最速報專用測試
npx vitest run src/__tests__/companyFastInfo.test.ts

# 4. 驗證生產打包構建
npm run build
```

---

## 6. Review & Challenge Dimensions

### Review Summary
**Verdict**: **`APPROVE`**

### Findings
- **[Minor] Finding 1: TPEx (上櫃) 重訊端點後續擴充空間**
  - **Where**: `src/services/mopsService.ts:934`
  - **What**: 目前台股重大訊息主要查詢證交所上市公司開放端點 `t187ap04_L`。若為純櫃買上櫃公司，實時公告清單將顯示為空（新聞與法定時程仍正常）。
  - **Suggestion**: 未來版本可增設 `t187ap04_O` 或 TPEx 櫃買端點，進一步豐富上櫃標的之即時公告。
- **[Minor] Finding 2: LocalStorage 歷史過期資料定時垃圾回收**
  - **Where**: `src/services/mopsService.ts:909`
  - **What**: 雖然各標的已落實 15 分鐘 TTL 與例外防護，但久未查詢之過期鍵值可於應用啟動時批次清理。
  - **Suggestion**: 建議後續加入定時清理機制。

### Verified Claims
- `allowedHosts` 阻擋未授權網域與非 HTTPS 請求 → Verified via source audit → Pass
- 倒數天數計算不受時區時差影響且精確支援閏年 → Verified via `calculateDaysRemaining` tests → Pass
- 遭遇網路斷線或 HTTP 500 降級至備援而不崩潰 → Verified via Mocked tests & error handling → Pass
- `FundamentalModal` 整合順暢且無型別錯誤 → Verified via `npx tsc --noEmit` & `npm run build` → Pass

### Adversarial Challenge Summary
**Overall risk assessment**: **`LOW`**

- **Challenge 1 (SSRF / IPC Injection)**:
  - 測試目標：`electron/main.cjs` 的 `fetch-market-data` IPC。
  - 結果：透過 `new URL(url).hostname` 及靜態陣列精確匹配，杜絕任何協議注入或內部私有 IP 存取。
- **Challenge 2 (XSS Injection in News/Announcements)**:
  - 測試目標：新聞標題與觀測站公告原文渲染。
  - 結果：全 React JSX 原生跳脫，無 `dangerouslySetInnerHTML`，連結包含 `rel="noopener noreferrer"`。
- **Challenge 3 (Date & Calendar Drift)**:
  - 測試目標：跨年 (12/31 -> 1/1)、閏年 (2/28 -> 3/1)、當日 (0天)、過期 (<0)。
  - 結果：基於 UTC 自然日曆天相減，數學推論嚴密無偏差。
