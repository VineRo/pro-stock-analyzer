# ProStock Analyzer 專案架構與 AI 快速排查導航手冊 (Architecture & Navigation Guide)

> 💡 **致 AI 助手與開發者**：在進行任何功能修改、Bug 排查或效能優化前，**請優先查閱本檔案**。本檔案提供精確的模組職責映射與故障排查快速通道，請直接檢視目標檔案，**嚴禁全局盲搜或調取歸檔檔案**，以最小化 Token 消耗並實現秒級排錯。

---

## 🧭 專案核心技術棧

- **桌面框架**：Electron 34 + Node.js 20
- **前端視圖**：React 18 + TypeScript 5 + Vite 6 + TailwindCSS 3
- **圖表引擎**：KlineCharts 9.8 (專業金融 K 線庫，搭配客製化 Canvas 覆蓋層)
- **測試框架**：Vitest 3 (12 個測試套件，95 項單元測試)
- **圖標庫**：Lucide React

---

## 🗂️ 核心目錄結構與職責劃分

```
/
├── electron/              # Electron 主行程與自動更新程序
│   ├── main.cjs           # 應用程式生命週期、視窗建立、系統菜單
│   ├── preload.cjs        # IPC 安全通道橋接
│   └── updater.cjs        # 自動更新檢查、DMG 下載安裝與進度事件
├── src/                   # 唯一的活動原始碼目錄 (All Active Code)
│   ├── components/        # UI 視覺視圖與彈窗組件 (React)
│   ├── services/          # 業務狀態管理與單例服務 (Singleton Stores)
│   ├── utils/             # 純函數運算引擎與量化演算法 (Engines)
│   ├── data/              # 報價 API、離線證券名冊、全球指數定義
│   ├── types/             # TypeScript 介面與列舉型別
│   ├── education/         # 小白百科與指標教學文本
│   ├── App.tsx            # 核心主視圖 (看盤版面組合、全域事件監聽)
│   └── main.tsx           # React 渲染入口
├── scripts/               # 構建、自動同步名冊與跨平台發布腳本
├── docs/                  # 官方網站 (GitHub Pages) 與詳細規格文檔
│   ├── specs/             # UI/UX 與設計規範文檔
│   └── guides/            # 更新與設定指南
├── versions_archive/      # 歷史版本日誌與單一封存包 (勿掃描)
│   ├── VERSION_CHANGELOG.md # 完整歷史里程碑變更清單
│   └── snapshots_legacy.tar.gz # 歷史快照打包 (已壓縮備份)
└── ARCHITECTURE.md        # 本導航手冊
```

---

## 🎯 模組速查索引 (Module Quick Reference)

| 業務模組 | 核心檔案路徑 | 模組職責說明 |
| :--- | :--- | :--- |
| **📈 K線圖表渲染** | `src/components/ChartContainer.tsx` | KlineCharts 實例化、主題色、外置 HUD 資訊列、現價線、十字線 |
| **🎨 畫布自訂覆蓋層**| `src/utils/customOverlays.ts` | 磁吸繪圖、自訂矩形箱體、趨勢線、文字標註的 Canvas 註冊 |
| **✏️ 繪圖工具箱** | `src/components/DrawingToolbar.tsx`<br>`src/services/drawingStore.ts` | 畫線工具選擇（Alt+T/H/F）、持久化儲存、自訂色盤與線條粗細 |
| **🔍 股票搜尋與名冊** | `src/data/stockService.ts`<br>`src/data/stockDirectory.ts`<br>`src/data/stockApi.ts` | 臺證所/櫃買 2,344 檔官方名冊雙向秒搜、Yahoo Finance 行情與歷史 K 棒 |
| **⚡ 實時報價流** | `src/services/quoteService.ts` | WebSocket / 輪詢報價流、開盤狀態判斷（美股/台股/盤後）、自動學習回寫 |
| **⭐ 自選清單管理** | `src/services/watchlistStore.ts`<br>`src/components/WatchlistSidebar.tsx` | 自選股清單群組、一鍵新建清單、拖曳排序、LocalStorage 記憶 |
| **📐 SMC 機構訂單流** | `src/utils/smcAnalysis.ts` | 機構訂單塊 (OB)、公允價值失衡區 (FVG)、市場結構突破 (BOS) 計算 |
| **📊 量化技術指標** | `src/utils/vwap.ts`<br>`src/utils/volumeProfile.ts` | VWAP 成交量加權均價線、Volume Profile 籌碼分佈直方圖 |
| **💡 智慧健檢診斷** | `src/utils/smartDiagnosis.ts`<br>`src/components/SmartSummaryBanner.tsx` | 趨勢判定、支撐壓力位、綜合評分與頂部診斷跑馬燈 |
| **💰 價值投資與估值** | `src/utils/valuationEngine.ts`<br>`src/components/FundamentalModal.tsx` | 本益比河流圖、DCF 現金流折現、葛拉漢價值模型、財務評級 |
| **🧪 策略歷史回測** | `src/utils/backtestEngine.ts`<br>`src/components/BacktestModal.tsx` | 雙均線、MACD、RSI 策略回測、權益曲線 (Equity Curve)、勝率與 MDD |
| **🎮 模擬下單撮合** | `src/services/paperTradingService.ts`<br>`src/components/PaperTradingModal.tsx` | 模擬資金帳戶、市價/限價單撮合、持倉損益計算、歷史成交紀錄 |
| **🔔 價格與指標預警** | `src/services/alertService.ts`<br>`src/components/AlertsModal.tsx` | 價格突破、指標交叉條件監聽、音效推播與系統通知觸發 |
| **🌐 全球大盤看板** | `src/components/GlobalMarketIndicesPage.tsx`<br>`src/data/globalIndicesData.ts` | 道瓊/標普/那指/費半/日韓/歐亞大盤即時深度對比與領頭羊排序 |
| **🔄 自動更新與發布** | `electron/updater.cjs`<br>`src/components/UpdateModal.tsx`<br>`src/utils/updaterUtils.ts` | GitHub Releases 自動檢查、macOS/Win 更新日誌解析與 DMG/ZIP 下載 |
| **⌨️ 全域快捷鍵** | `src/utils/shortcutManager.ts`<br>`src/components/ShortcutsModal.tsx` | `/` 搜尋、`1/5/D/W` 週期、`C` 漲跌色盤、`Alt+` 劃線熱鍵綁定 |
| **🧭 新手導覽教學** | `src/components/OnboardingModal.tsx` | 6 大核心章節新手教學導覽與本機持久化設定 |

---

## ⚡ 故障排查快速通道 (Troubleshooting Quick-Paths)

當遇到特定問題時，**請直接前往下列對應檔案排查**，切勿全目錄搜索：

1. **圖表 K 棒顯示異常、資訊列數值或十字線重疊**：
   👉 前往 `src/components/ChartContainer.tsx`（檢查 `OnCrosshairChange` 與頂部 DOM 外置列結構）。
2. **搜尋某些台股代號搜不到或名稱不正確**：
   👉 前往 `src/data/stockDirectory.ts` 與 `src/data/stockService.ts`（檢查 ISIN 名冊加載與 `searchStocks` 正則比對邏輯）。
3. **股票即時價格跳動不及時或時區開盤狀態誤判**：
   👉 前往 `src/services/quoteService.ts` 中的 `getMarketSessionStatus` 與 `subscribeQuote`。
4. **自選清單新增、刪除或切換群組異常**：
   👉 前往 `src/services/watchlistStore.ts` 與 `src/components/WatchlistSidebar.tsx`。
5. **畫線工具無法吸附或無法保存顏色/線條**：
   👉 前往 `src/services/drawingStore.ts` 與 `src/utils/customOverlays.ts`。
6. **回測計算收益率、勝率或最大回撤不準確**：
   👉 前往 `src/utils/backtestEngine.ts`。
7. **基本面河流圖或折現模型數值計算**：
   👉 前往 `src/utils/valuationEngine.ts`。
8. **macOS 自動更新跳出未簽名或安裝失敗**：
   👉 前往 `electron/updater.cjs` 與 `src/utils/updaterUtils.ts`。

---

## 🛡️ AI 助手操作準則 (AI Agent Rules)

1. **嚴禁全域遞迴掃描**：一律限制在 `src/` 與 `electron/` 兩大活動目錄內。
2. **嚴禁讀取或修改** `versions_archive/`、`docs/app/assets/`、`dist/`、`release/`。
3. **任何改動完成後必須執行雙驗證**：
   - 執行單元測試：`npm test`（必須 100% 通過 12 檔案 95 測試）。
   - 執行型別檢查：`npx tsc --noEmit`（必須 0 錯誤）。
