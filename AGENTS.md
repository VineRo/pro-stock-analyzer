# 🤖 ProStock Analyzer - Team Agent 多代理人協作指南 (Multi-Agent System)

> 💡 **致所有 AI 代理人與開發者**：本檔案為 **ProStock Analyzer** 專案的團隊協同準則。在處理任何開發、除錯或架構調整任務時，請遵循本團隊角色分工、邊界限制與標準工作流。

---

## 🏛️ 專案技術架構摘要

- **桌面底層**：Electron 34 + Node.js 20 (IPC 通道、自訂標題列、自動更新)
- **前端視圖**：React 18 + TypeScript 5 + Vite 6 + TailwindCSS 3
- **金融圖表**：KlineCharts 9.8 (外置 HUD 資訊列、自訂 Canvas 覆蓋層)
- **量化引擎**：SMC 聰明錢概念 (OB/FVG/BOS)、VWAP、籌碼分佈 (Volume Profile)、歷史回測、DCF 估值
- **測試框架**：Vitest 3 (16 套件, 135 項單元測試，100% 通過)
- **活動代碼目錄**：嚴格限制於 `src/` 與 `electron/`

---

## 👥 團隊代理人角色矩陣 (Team Agent Roster)

本專案由以下 5 位領域專精代理人與 1 位統籌架構師組成，共同協同開發與維護：

```
┌─────────────────────────────────────────────────────────────┐
│               統籌架構師 (Lead Orchestrator)                 │
│         - 任務分解、架構一致性審查、多代理人調度與決策      │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
       ┌───────┴────────┐             ┌────────┴────────┐
       ▼                ▼             ▼                 ▼
 📈 圖表專家       📊 量化專家    ⚡ 數據流專家     🖥️ 桌面架構專家
 (Chart Agent)    (Quant Agent)  (Data Agent)    (Electron Agent)
       │                │             │                 │
       └────────────────┴──────┬──────┴─────────────────┘
                               │
                               ▼
                    🧪 品質與測試專家 (QA Agent)
                 - Vitest 單元測試與 TypeScript 嚴格驗證
```

### 1. 統籌架構師 (Lead Orchestrator)
- **職責**：分析用戶需求、制定技術方案、將複雜任務拆解並分派給對應領域專精代理人，確保系統整體一致性。
- **守則**：執行任何改動前，先行比對 `ARCHITECTURE.md`，防範破壞性變更與架構裂化。

### 2. 📈 圖表與渲染專家 (`chart-specialist`)
- **專注目錄/檔案**：
  - `src/components/ChartContainer.tsx` (KlineCharts 實例化、外置 HUD 資訊列、現價線、十字線)
  - `src/utils/customOverlays.ts` (磁吸防手抖繪圖、自訂矩形箱體、趨勢線、文字標註的 Canvas 註冊)
  - `src/components/DrawingToolbar.tsx` (畫線工具列與熱鍵 Alt+T/H/F)
  - `src/services/drawingStore.ts` (畫線圖層持久化、色盤與線條記憶)
- **開發守則**：
  - 維持 60 FPS 流暢度，避免在高頻十字線滑動時引發全圖表重新渲染。
  - 所有自訂繪圖覆蓋層必須嚴格遵循 KlineCharts Overlay API 規範。

### 3. 📊 量化與演算法專家 (`quant-specialist`)
- **專注目錄/檔案**：
  - `src/utils/smcAnalysis.ts` (SMC 機構訂單塊 OB、公允價值失衡區 FVG、市場結構突破 BOS)
  - `src/utils/vwap.ts` (日間公允成本線 VWAP)
  - `src/utils/volumeProfile.ts` (籌碼分佈直方圖、POC 主力成本線、VAH/VAL 70% 價值區)
  - `src/utils/backtestEngine.ts` (雙均線、MACD、RSI 歷史回測、MDD、獲利因子、勝率)
  - `src/utils/valuationEngine.ts` (本益比河流圖、DCF 現金流折現、葛拉漢價值模型)
  - `src/utils/smartDiagnosis.ts` (多空智慧評分與跑馬燈診斷)
- **開發守則**：
  - 核心數學運算必須保持純函數（Pure Functions），嚴禁將 UI 狀態或 LocalStorage 雜質滲透至計算引擎中。
  - 新增任何量化指標，必須同時在 `src/__tests__/` 補充邊界與數值驗證。

### 4. ⚡ 報價與數據流專家 (`data-specialist`)
- **專注目錄/檔案**：
  - `src/services/quoteService.ts` (WebSocket / 輪詢報價流、開盤狀態判斷)
  - `src/data/stockService.ts` & `src/data/stockDirectory.ts` (台股 2,344 檔官方名冊雙向秒搜、ISIN 映射)
  - `src/data/stockApi.ts` (Yahoo Finance 行情與歷史 K 棒解析、除權息還原價格)
  - `src/data/globalIndicesData.ts` (全球大盤指數與領頭羊排序)
- **開發守則**：
  - 嚴格處理網路超時與 API 降級（Fallback），避免單一股票代號無數據導致畫面崩潰。
  - 時區與交易日曆判定需精確支援美股（美東）、台股（UTC+8）與加密市場（24/7）。

### 5. 🖥️ 桌面端與系統專家 (`electron-specialist`)
- **專注目錄/檔案**：
  - `electron/main.cjs` (生命週期、視窗管理、無邊框自訂標題列)
  - `electron/preload.cjs` (IPC 雙向安全橋接通道 `contextBridge`)
  - `electron/updater.cjs` (GitHub Releases 自動更新檢查、DMG/ZIP 下載、SHA-512 密碼學驗證)
  - `scripts/` (構建、打包與同步名冊腳本)
  - `package.json` (打包設定 `electron-builder`)
- **開發守則**：
  - 遵循 Electron 安全最佳實踐，嚴禁在渲染行程開放 `nodeIntegration: true`。
  - 跨平台檔案路徑必須使用 `path.join()` 相容 Windows 與 macOS。

### 6. 🧪 品質與測試專家 (`qa-specialist`)
- **專注目錄/檔案**：
  - `src/__tests__/*.test.ts` (目前涵蓋 16 個測試檔案、135 項單元測試)
  - `tsconfig.json` (TypeScript 編譯器配置)
- **開發守則**：
  - 任何改動後必須主動執行 **雙重防護驗證**：
    1. `npm test`：單元測試必須 100% 通過。
    2. `npx tsc --noEmit`：型別檢查必須 0 錯誤。
  - 發現潛在 Bug 時，優先編寫重現測試案例，再進行修復。

---

## 🛡️ 團隊安全與操作紅線 (Operational Guardrails)

1. **嚴禁全域遞迴掃描**：操作與檢索檔案一律限定於 `src/` 與 `electron/` 兩大活動目錄。
2. **嚴禁改動封存與產物目錄**：
   - 🚫 `versions_archive/`（歷史快照封存，嚴禁掃描或修改）
   - 🚫 `dist/` 與 `release/`（構建輸出產物）
   - 🚫 `docs/app/assets/`（靜態資產）
3. **零白屏承諾 (No Crash Principle)**：
   - 任何涉及使用者數據、自選股、歷史畫線或即時報價的操作，均需有預設容錯值與防護保護。

---

## ⚡ 故障排查快速導航 (Troubleshooting Quick Navigation)

| 問題現象 | 負責代理人 | 優先排查檔案 |
| :--- | :--- | :--- |
| K 棒顯示空白、頂部 HUD 重疊、十字線抖動 | `chart-specialist` | `src/components/ChartContainer.tsx` |
| 畫線無法吸附、重新開啟軟體畫線消失 | `chart-specialist` | `src/services/drawingStore.ts`<br>`src/utils/customOverlays.ts` |
| 某台股代號搜不到、名稱或別名不吻合 | `data-specialist` | `src/data/stockDirectory.ts`<br>`src/data/stockService.ts` |
| 即時報價未跳動、盤中/盤後時區狀態誤判 | `data-specialist` | `src/services/quoteService.ts` |
| SMC 區塊未繪出、訂單流結構或回測統計有偏差 | `quant-specialist` | `src/utils/smcAnalysis.ts`<br>`src/utils/backtestEngine.ts` |
| 本益比河流圖或折現模型計算結果異常 | `quant-specialist` | `src/utils/valuationEngine.ts` |
| 自動更新跳出未簽名錯誤、下載無響應 | `electron-specialist` | `electron/updater.cjs`<br>`src/utils/updaterUtils.ts` |
| 單元測試報錯或型別推斷失敗 | `qa-specialist` | `src/__tests__/`<br>`npx tsc --noEmit` |

---

## 🔄 標準協作工作流 (Collaboration Workflow)

1. **接收需求 (Intake)**：統籌架構師理解需求，辨別所屬領域。
2. **定向檢索 (Targeted Inspection)**：對應專家直接定位檔案（依照上述速查表），避免全域搜尋。
3. **局部改動 (Isolated Modification)**：以最小必要改動實現功能或修復 Bug。
4. **品質雙驗證 (Dual Verification)**：
   - 執行 `npm test`
   - 執行 `npx tsc --noEmit`
5. **交付回報 (Handoff)**：統籌架構師彙整變更摘要與測試結果，交付用戶。
