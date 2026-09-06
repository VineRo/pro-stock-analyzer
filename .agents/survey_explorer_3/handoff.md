# Survey Explorer 3: UI Architecture & FundamentalModal Investigation Handoff Report

- **Date**: 2026-09-06
- **Agent**: Survey Explorer 3 (UI Architecture & FundamentalModal Explorer)
- **Working Directory**: `/Users/viberorob/Desktop/New Stock Project/.agents/survey_explorer_3`
- **Target Feature**: 公司資訊最速報 / 重訊日程 (Company Fast Information / MOPS & Calendar Tab)

---

## 1. Observation (客觀觀察)

### 1.1 `src/components/FundamentalModal.tsx` 架構與現況
- **檔案規模**：884 行，47,380 位元組。
- **進入點與呼叫位置**：
  - 在 `src/App.tsx` 第 835–843 行掛載：
    ```tsx
    <FundamentalModal
      isOpen={isFundamentalOpen}
      onClose={() => setIsFundamentalOpen(false)}
      symbol={selectedSymbol}
      onOpenEducation={(targetId) => {
        setEducationTargetId(targetId);
        setIsEducationModalOpen(true);
      }}
    />
    ```
- **頁籤管理 (Tab Architecture)**：
  - 第 40 行宣告當前頁籤狀態：
    ```tsx
    const [activeTab, setActiveTab] = useState<'football' | 'dcf' | 'pe_bands' | 'monte_carlo' | 'health'>('football');
    ```
  - 第 141–159 行渲染水平頁籤列（支援橫向滾動）：
    ```tsx
    <div className="px-6 py-2 border-b border-pro-border bg-pro-bg/40 flex items-center justify-between shrink-0 overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-1.5">
        {[
          { id: 'football', label: '🏈 綜合估值區間圖', desc: '多模型公允價值重疊交集' },
          { id: 'dcf', label: '🧮 互動式 DCF 精算器', desc: '自由現金流折現與5x5敏感度' },
          { id: 'pe_bands', label: '🌊 歷史估值河流圖', desc: 'P/E 本益比倍數水位' },
          { id: 'monte_carlo', label: '🎲 蒙地卡羅 1,000 次模擬', desc: '隨機機率路徑與95% VaR' },
          { id: 'health', label: '📊 核心財務體質卡', desc: 'EPS、殖利率與營收成長' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/20'
                : 'text-pro-muted hover:text-pro-text hover:bg-pro-panel'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    ```
  - 第 168 行為滾動容器：`<div className="flex-1 overflow-y-auto p-6 space-y-6">`，根據 `activeTab === 'xxx'` 條件渲染子視圖。

### 1.2 視覺與樣式規範 (Styling Conventions)
- **Tailwind 色盤設定 (`tailwind.config.js`)**：
  - 背景階梯：`bg-pro-bg` (`#131722`，底層深色)、`bg-pro-panel` (`#1e222d`，浮動視窗與面板)、`bg-pro-card` (`#242832`，卡片與橫幅)、`bg-pro-hover` (`#363a45`，懸停反白)。
  - 邊框：`border-pro-border` (`#2a2e39`，1px 細分界線)、`border-pro-borderStrong` (`#363a45`)。
  - 文字層級：`text-pro-text` (`#f0f3fa`，主要文字白)、`text-pro-textSec` (`#d1d4dc`)、`text-pro-muted` (`#787b86`，輔助說明與次要資訊)。
  - 狀態與重點配色：
    - 上漲/綠色強調：`text-emerald-400`, `bg-emerald-500/10`, `border-emerald-500/30`
    - 下跌/警告紅色：`text-rose-400`, `bg-rose-500/10`, `border-rose-500/30`
    - 關注/提示橙黃色：`text-amber-400`, `bg-amber-500/10`, `border-amber-500/30`
    - 科技/主題藍色：`text-blue-400`, `bg-blue-500/10`, `border-blue-500/30`
    - 數據與數值：一律採用 `font-mono font-bold`。
- **圖標庫 (Lucide React)**：
  - 專案依賴 `"lucide-react": "^1.16.0"`，內建豐富的行事曆、報表、時間與公告相關圖示：`Building2`, `Calendar`, `CalendarDays`, `CalendarClock`, `Clock`, `Newspaper`, `FileText`, `Megaphone`, `Zap`, `RefreshCw`, `RotateCw`, `ExternalLink`, `AlertCircle`, `CheckCircle2`, `Info`, `Sparkles`, `ChevronDown`, `ChevronUp`, `ChevronRight`。

### 1.3 現有載入、重新整理與空狀態模式 (Loading, Refresh, & Empty States)
- **手動重新整理按鈕**：
  - 參考 `src/components/WatchlistSidebar.tsx` (第 595–603 行) 與 `src/components/GlobalMarketIndicesPage.tsx` (第 255–264 行)：
    ```tsx
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 active:scale-95 text-white text-xs font-medium border border-blue-500/40 transition-all shadow-sm"
      title="手動立即刷新最新重大訊息與行事曆"
    >
      <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
      <span>{isRefreshing ? '更新中...' : '重新整理'}</span>
    </button>
    ```
- **骨架屏現狀**：
  - 經全文搜尋，專案尚未有統一的 Skeleton 元件；目前均採用 `animate-pulse` 與深色佔位塊進行局部過渡。
- **空狀態與錯誤處理**：
  - 參考 `src/components/ScreenerModal.tsx` (第 1145–1160 行) 與 `src/components/AlertsModal.tsx` (第 155–159 行)：
    - 居中容器：`py-16 text-center text-slate-400`
    - 象徵圖示：`w-10 h-10 mx-auto mb-3 opacity-30 text-blue-400`
    - 清楚主標與輔助說明：`text-sm font-bold text-white` + `text-xs text-slate-500 mt-1`
    - 操作回饋：提供「重設條件」或「重新整理」按鈕。
  - 參考 `src/components/ErrorBoundary.tsx`：具有攔截渲染異常能力，但單元視圖應內部自我消化錯誤，恪守零白屏承諾。

### 1.4 測試環境與現行架構 (`src/__tests__/`)
- **測試命令驗證**：
  - 執行 `npm test`（`vitest run`）：
    ```
    Test Files  16 passed (16)
         Tests  135 passed (135)
      Duration  778ms
    ```
  - 執行 `npx tsc --noEmit`：0 錯誤。
- **Vitest 配置與環境**：
  - `vite.config.ts`：排除 `node_modules`, `dist`, `versions_archive`。
  - 執行環境為 Node.js 模式（未安裝 `@testing-library/react` 或 `jsdom`）。
  - 現有 16 套件均針對業務邏輯、工具函數（如 `formatters.test.ts`）、引擎計算（如 `valuationEngine.test.ts`）、數據儲存與過濾進行高覆蓋率驗證。因此，UI 相關之時間換算、倒數計算、公告重要度判定與降級回退等，應抽離為純函數模組進行單元測試。

---

## 2. Logic Chain (邏輯推理鏈)

1. **依據 Observation 1.1**：`FundamentalModal.tsx` 目前已有 884 行，若將 R1–R4（重大訊息卡、法說會與財報行事曆、新聞動態、篩選與骨架屏）全部直接塞入該檔案，其長度將突破 1,300 行，大幅增加維護難度與型別複雜度。
   - **推論**：應遵循關注點分離原則，將新頁籤的核心 UI 封裝為獨立子元件 `src/components/CompanyFastInfoTab.tsx`，並在 `FundamentalModal.tsx` 僅透過 `activeTab === 'fast_info'` 調度掛載，保持主 Modal 結構清爽乾淨。
2. **依據 Observation 1.1 與原始需求 R3**：用戶要求在 FundamentalModal 中新增「資訊最速報 / 重訊日程」專屬頁籤。
   - **推論**：在 `FundamentalModal.tsx` 的 `activeTab` 聯合型別中加入 `'fast_info'`，並在 Tab Bar 陣列中新增條目：
     `{ id: 'fast_info', label: '⚡ 資訊最速報 / 重訊日程', desc: 'MOPS 重大訊息、法說會與財報行事曆' }`。該列本已具備 `overflow-x-auto no-scrollbar`，增加第 6 個標籤完全不影響響應式橫排。
3. **依據 Observation 1.2 與 1.3**：專案色彩統一採用 `pro-*` 系列與 Emerald/Amber/Blue/Rose 語意色，數值強調 `font-mono`，載入採用 `RefreshCw` + `animate-spin`。
   - **推論**：新分頁卡片必須無縫契合 ProStock 暗色主題，採用雙欄/網格卡片（英雄卡呈現下一次財報/法說會倒數），垂直時間軸呈現事件進度，並以標籤徽章（Badge）標註公告性質與影響層級。
4. **依據 Observation 1.3 與原始需求 R4**：外部 MOPS/新聞伺服器可能遭遇連線超時、非台股標的無 MOPS 資料，或無近期重大訊息。
   - **推論**：UI 必須具備三種防護邊界：
     a. **載入中**：展示與正式卡片 1:1 佈局的骨架屏（Skeleton），避免內容突然跳動。
     b. **非台股/無資料**：主動提示標的性質，自動優雅降級為 Yahoo 國際新聞/海外預估財報，或引導至估值河流圖。
     c. **連線失敗**：展示離線標竿/本地快取數據，並提供顯眼的手動重整按鈕與降級提示，杜絕白屏。
5. **依據 Observation 1.4**：Vitest 目前在 Node 環境運行，不包含 DOM 測試環境。
   - **推論**：新功能的驗證核心應將行事曆倒數日計算、公告分類比對、重要性評級、數據防呆與快取機制提煉於 `src/utils/companyInfoUtils.ts` 或服務層，並撰寫 `src/__tests__/companyFastInfo.test.ts`，確保可直接以 `npm test` 自動化驗證 100% 通過。

---

## 3. Caveats (邊界與考量)

1. **非台股標的 (美股/加密市場) 差異**：
   - 公開資訊觀測站 (MOPS) 僅收錄臺灣上市櫃企業（如 2330, 2317, 2454 等）。
   - 當使用者檢視美股（如 AAPL, NVDA）時，MOPS 數據自然為空。此時 UI 不應報錯，而應優雅切換為「國際市場重大動態」或「海外財報與權威新聞」。
   - 當檢視加密幣（如 BTCUSDT）時，應提示「加密貨幣無法人法說會與 MOPS 重訊」，並提供切換建議。
2. **Tab 順序與預設頁籤**：
   - 既有第一頁籤為「🏈 綜合估值區間圖 (`football`)」。
   - 建議：可將 `fast_info` 置於第一位或顯著第二位，並保留預設為 `football`（避免打破習慣），同時允許傳入 `initialTab` 參數以支援外層新聞橫幅一鍵直達。
3. **無額外外部依賴 (Zero External Dependencies)**：
   - 骨架屏與時間軸完全由 TailwindCSS 3 語法實現（`animate-pulse`, `relative`, `before:absolute` 垂直線），無需引入額外的 React timeline 或 skeleton 套件。

---

## 4. Conclusion & UI Architecture Plan (結論與架構規劃)

### 4.1 核心元件階層樹 (Component Hierarchy)

```
src/components/
├── FundamentalModal.tsx               # 主彈窗 (新增 'fast_info' 頁籤導航與 Tab 內容調度)
└── CompanyFastInfoTab.tsx             # [新增] 資訊最速報 / 重訊日程核心子視圖
    ├── FastInfoControlBar             # 頂部控制列 (資料源標籤、快取時間、重新整理按鈕、分類過濾 Pills)
    ├── CalendarHeroCards              # 雙核心倒數卡 (下一次財報公布倒數 + 法說會日程/看點)
    ├── EventsTimeline                 # 重大行事曆與關鍵事件時間軸 (過去/未來關鍵時間點)
    ├── MaterialAnnouncementsSection   # MOPS 公開重大訊息卡片清單 (含重要度標籤、要點、折疊全文)
    ├── FinancialNewsSection           # 權威財訊報導清單 (來源、時間、情緒標籤、外部連結)
    ├── FastInfoSkeletonLoader         # 載入中骨架屏 (1:1 佈局防跳動)
    └── FastInfoEmptyOrErrorState      # 優雅空狀態與降級提示 (零白屏防護)
```

### 4.2 介面線框圖 (UI Wireframe Layout)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ 頂部狀態與操作控制列 (Control & Filter Bar)                               │
│ [🟢 即時連線 MOPS / 2分鐘前] [最後更新: 15:30:25]         [ ⟳ 立即刷新 ]   │
│ 標籤過濾: [全部 (11)]  [📢 重大訊息 (5)]  [📅 法說財報 (2)]  [📰 權威新聞 (4)]│
├─────────────────────────────────────────────────────────────────────────────┤
│ 🌟 雙核心行事曆焦點卡 (Dual Calendar Countdown Hero Cards)                  │
│ ┌───────────────────────────────┐   ┌───────────────────────────────┐       │
│ │ 📅 下一次預計財報公布          │   │ 🎤 法人說明會 (法說會) 日程    │       │
│ │ 2026 Q3 財務季度報告          │   │ 2026 Q3 全球線上法說會        │       │
│ │ ⏱️ 倒數 14 天 (2026/10/16)    │   │ ⏱️ 倒數 16 天 (2026/10/18 14:00)│    │
│ │ 預估 EPS: $12.50 (+24% YoY)   │   │ 型式: 中文/英文線上直播 (Zoom) │       │
│ │ 核心看點: CoWoS 產能與毛利率   │   │ 看點: 資本支出指引與 AI 營收比 │       │
│ └───────────────────────────────┘   └───────────────────────────────┘       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📅 重大行事曆與關鍵事件時間軸 (Upcoming Events Timeline)                     │
│   ● [2026/09/10] 八月合併營收公告 (預估) ───────────── [即將到來]          │
│   ● [2026/10/16] 2026 Q3 董事會與季報公布 ────────── [已排程]              │
│   ● [2026/10/18] 第三季全球法人說明會 ─────────────── [即將召開]           │
│   ● [2026/12/12] 除息交易日 (預計每股現金 $4.5) ────── [預估]              │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📢 公開資訊觀測站 (MOPS) 重大訊息速報 (Latest Material Announcements)        │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │ [🔴 重大影響] [董事會決議] 2026/09/05 17:15 (MOPS)                  │ │
│   │ 主旨: 代子公司公告取得供營業用之機器設備一批                           │ │
│   │ 核心要點:                                                             │ │
│   │ • 交易總金額達新台幣 48.5 億元 (ASML Netherlands B.V.)                 │ │
│   │ • 資金用途: 因應先進製程擴產與產能升級需求                            │ │
│   │ [展開完整公告說明 ▾]                                                  │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ 📰 權威財經新聞動態 (Financial News & Market Highlights)                   │
│   • [鉅亨網] 2小時前: 外資上調目標價至 1,350 元，看好先進製程定價權 ↗       │
│   • [工商時報] 5小時前: CoWoS 擴產速度翻倍，供應鏈營運動能強勁 ↗            │
│   • [Yahoo財經] 昨日: 法說會前夕外資買超擴大，盤後籌碼集中度顯著提升 ↗      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 詳細設計規範與 Props 定義

#### 1. 資料介面型別 (建議置於 `src/types/companyInfo.ts`)
```ts
export type AnnouncementCategory = 
  | 'financial'       // 財務報告 / 季報
  | 'conference'      // 法說會
  | 'board'           // 董事會決議
  | 'revenue'         // 營收公告
  | 'dividend'        // 股利分派 / 除權息
  | 'material'        // 重大營運與資產取得
  | 'other';

export type EventStatus = 'upcoming' | 'confirmed' | 'estimated' | 'past';
export type AnnouncementImportance = 'high' | 'medium' | 'normal';

export interface CompanyAnnouncement {
  id: string;
  symbol: string;
  date: string;              // '2026/09/05'
  time?: string;             // '17:15'
  title: string;             // 重訊主旨
  summaryPoints: string[];   // 條列化重點精華
  fullContent?: string;      // 完整內文 (可折疊展開)
  category: AnnouncementCategory;
  categoryLabel: string;     // 中文標籤 (如: "董事會決議")
  importance: AnnouncementImportance;
  source: string;            // "公開資訊觀測站 (MOPS)"
  url?: string;
}

export interface CalendarEventItem {
  id: string;
  symbol: string;
  title: string;             // 事件名稱 (如: "2026 Q3 法人說明會")
  date: string;              // '2026/10/18'
  time?: string;             // '14:00'
  daysRemaining: number;     // 倒數天數 (0=今日, >0=未來, <0=過去)
  eventType: 'earnings' | 'conference' | 'revenue' | 'dividend' | 'meeting';
  status: EventStatus;
  statusLabel: string;       // "即將召開", "已排程", "預估"
  formatOrLocation?: string; // "線上中文法說會 (Webcast)"
  highlights: string[];      // 法說會或財報核心看點
  consensusData?: {
    estEps?: number;
    epsGrowthYoY?: number;
    targetPrice?: number;
  };
}

export interface CompanyNewsFeedItem {
  id: string;
  symbol: string;
  title: string;
  summary: string;
  source: string;            // "鉅亨網" | "工商時報" | "Yahoo 財經"
  publishedAt: string;       // "2小時前" 或 "2026/09/06 13:20"
  url?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

export interface CompanyFastInfoState {
  symbol: string;
  name: string;
  market: string;
  lastUpdated: number;
  isLive: boolean;
  dataSourceDesc: string;
  nextEarnings?: CalendarEventItem;
  nextConference?: CalendarEventItem;
  timelineEvents: CalendarEventItem[];
  announcements: CompanyAnnouncement[];
  news: CompanyNewsFeedItem[];
}
```

#### 2. 元件 Props 定義
```tsx
export interface CompanyFastInfoTabProps {
  symbol: StockSymbol;
  fundamental?: FundamentalData;
  onOpenEducation?: (topic: string) => void;
}
```

#### 3. 樣式與動畫 Class 組合
- **Hero 卡片背景**：
  - 財報卡：`bg-gradient-to-br from-blue-500/10 via-pro-bg to-pro-panel border border-blue-500/30 rounded-xl p-4`
  - 法說會卡：`bg-gradient-to-br from-emerald-500/10 via-pro-bg to-pro-panel border border-emerald-500/30 rounded-xl p-4`
- **倒數天數高亮**：
  - `<span className="font-mono font-extrabold text-2xl text-emerald-400">倒數 {days} 天</span>`
- **重要度徽章 (Importance Badges)**：
  - 🔴 高重要度：`bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold px-2 py-0.5 rounded text-[10px]`
  - 🟡 中重要度：`bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold px-2 py-0.5 rounded text-[10px]`
  - 🟢 一般公告：`bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px]`
- **時間軸線條**：
  - 垂直線容器：`relative pl-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-pro-border`
  - 節點圓點：`absolute -left-4 top-1 w-3 h-3 rounded-full border-2 border-pro-bg bg-emerald-400 ring-2 ring-emerald-500/30`

### 4.4 測試與品質保證方案 (Test Plan)

1. **單元測試套件 `src/__tests__/companyFastInfo.test.ts`**：
   - **倒數天數計算演算法**：驗證跨月、潤年、當天（0天）、過期負天數之處理正確性。
   - **公告分類與重要度篩選**：驗證關鍵字萃取規則（如含「重大」、「取得資產」、「營業用設備」歸為 High；「營收」、「自結」歸為 Revenue）。
   - **時間軸事件排序**：驗證事件依日期由近至遠嚴格排序。
   - **空狀態與降級容錯**：驗證非台股代碼、無資料代碼傳入時，回傳合規降級物件而不拋出例外。
   - **快取命中驗證**：驗證第二次呼叫直接讀取有效快取，減少網路請求。
2. **命令驗證驗收**：
   - `npm test`：既有 16 套件 135 測試 + 新增測試檔案全數 PASS。
   - `npx tsc --noEmit`：TypeScript 0 錯誤。

---

## 5. Verification Method (驗證方式)

下一階段實作或審查代理人可使用下列步驟進行完全獨立之驗證：

1. **程式碼檢查 (Code Inspection)**：
   - 查看 `src/components/FundamentalModal.tsx`：檢查 `activeTab` 聯合型別是否成功收納 `'fast_info'`，且包含對應按鈕。
   - 查看 `src/components/CompanyFastInfoTab.tsx`：檢查是否具備 Hero Cards、時間軸、重訊清單、新聞、骨架屏與空狀態。
2. **自動化測試命令 (Automated Commands)**：
   ```bash
   # 1. 執行專案完整單元測試 (必須 100% 通過)
   npm test

   # 2. 執行 TypeScript 嚴格靜態型別檢查 (必須 0 錯誤)
   npx tsc --noEmit
   ```
3. **失效條件 (Invalidation Conditions)**：
   - 任一現有 135 項單元測試出現 failure。
   - TypeScript 編譯報錯或有隱式 `any` 型別錯誤。
   - 遭遇非台股代碼時出現 React 渲染崩潰或白屏。
   - 載入狀態未顯示骨架屏或刷新動畫。
