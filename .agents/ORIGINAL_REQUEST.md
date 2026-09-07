# Original User Request

## 2026-09-06T13:40:57Z

在 ProStock Analyzer 桌面看盤軟體中新增「公司資訊最速報」功能：針對當前檢視的個股，自動自公開資訊觀測站 (MOPS) 等權威來源抓取最新重大訊息公告與權威新聞，並智慧彙整公司下一次財報公布、法說會日程與核心事件摘要，整合於個股基本面分析彈窗 (FundamentalModal) 中。

Working directory: /Users/viberorob/Desktop/New Stock Project
Integrity mode: development

## Requirements

### R1. 重大訊息與即時新聞獲取
針對當前股票代碼（如台股 2330、2317 等與主要個股），自公開資訊觀測站 (MOPS) 等權威數據源獲取最新公告、重大訊息（含發布時間、主旨、內容要點）與財訊報導，具備網路連線防護與適度快取機制。

### R2. 財報與法說會時程智慧彙整
追蹤並解析該個股下一次預計財報公布時程、法人說明會 (Investor Conference) 或關鍵行事曆事件，產出清晰直覺的時程倒數/時間軸與關鍵看點摘要。

### R3. 基本面彈窗介面整合 (FundamentalModal)
在現有基本面分析彈窗 (FundamentalModal.tsx) 內新增「資訊最速報 / 重訊日程」專屬分頁標籤，以清晰深色現代化卡片與時間軸呈現重大資訊與會議時程。

### R4. 健全容錯與邊界防護
當外部伺服器連線超時、無最新重大訊息或檢視無公開重訊之標的時，呈現優雅的空狀態或降級提示，恪守零白屏原則。

## Acceptance Criteria

### 功能與介面驗收
- [ ] 在個股基本面分析彈窗中可順暢切換至「資訊最速報 / 重訊日程」頁籤
- [ ] 查詢台股主要個股能獲取並結構化展示最新重大訊息與新聞清單
- [ ] 具備明確的下一次預計財報公布或法說會等重大行事曆時程板塊
- [ ] 介面具備載入中骨架屏 (Skeleton/Spinner) 與手動重新整理按鈕

### 系統品質與架構規範
- [ ] 代碼修改嚴格限定於 src/ 與 electron/，不更動歷史封存目錄
- [ ] 既有 16 個測試套件、135 項單元測試以及新增之單元測試必須 100% 通過 (npm test)
- [ ] TypeScript 靜態型別檢查 0 錯誤 (npx tsc --noEmit)
- [ ] 遭遇無網路或 API 異常時無未捕捉例外，介面流暢穩定

## 2026-09-06T17:03:17Z

This is a single self-contained fix; keep it small and focused.

診斷並徹底修復 ProStock Analyzer 在 Windows 與 macOS 客戶端上的自動更新 (autoUpdater) 檢測、版本一致性校驗與容錯回退機制。解決因 GitHub Releases 發布狀態與本地版本號對齊落差導致的「已是最新版本」非預期誤判，並強化跨平台更新錯誤日誌與直載指引。

Working directory: /Users/viberorob/Desktop/New Stock Project
Integrity mode: development

## Requirements

### R1. 自動更新機制與雲端發布狀態一致性校驗
- 確保客戶端本地版本號（`package.json` 中的 `version`）、官方網站宣傳標註與 GitHub Releases 實際發布之 Release Tag / Assets / `latest.yml` 完全對齊。
- 當軟體版本與雲端發布版本一致時，在 UI 上給予明確、標註「當前已是最新版本 (vX.X.X)」的提示與最後檢查時間戳，避免使用者困惑。
- 當遠端發布新版本（如 v1.7.7 或更高版本）時，Windows 客戶端能順暢觸發 `update-available`、下載 NSIS 安裝套件並能執行 `quitAndInstall` 無縫更新。

### R2. Windows 與 macOS 雙平台更新容錯與錯誤日誌可觀測性
- 在 `electron/updater.cjs` 中增強針對 Windows (NSIS differential blockmap, 權限, 暫存目錄) 及 macOS (DMG 下載、憑證限制) 的異常處理與詳細診斷日誌。
- 在更新異常彈窗 (`UpdateModal.tsx`) 中，依據使用者當前作業系統動態提供對應平台的下載按鈕（Windows 提供 `.exe` 安裝引導檔，macOS 提供 `.dmg`），消除跨平台平台硬編碼錯誤。
- 當 GitHub API 連線超時、網路中斷或伺服器尚未發布符合平台之檔案時，UI 應呈現具體可行的解決引導與官方網站直載管道。

## Acceptance Criteria

### 功能與版本一致性
- [ ] 官方網站 (`docs/index.html`)、`package.json`、`latest.yml` 與 GitHub Releases 發布狀態完全一致，不再出現「網站宣稱新版本但 GitHub 實體未釋出」之落差。
- [ ] 在客戶端執行手動「檢查更新」時，無論是否有新版本，均能於 UI 上即時獲得正確的狀態回饋與版號說明。
- [ ] Windows NSIS 自動下載與重啟安裝機制配置完整無死角，異常時能平滑提示備用下載。
- [ ] `UpdateModal.tsx` 能精確依使用者作業系統顯示對應之 Windows (.exe) 或 macOS (.dmg) 直載按鈕。

### 質量與工程健康度
- [ ] 現有單元測試（`npm test`）100% 通過（全部 19 套件、255 項測試）。
- [ ] TypeScript 型別檢查（`npx tsc --noEmit`）0 錯誤。
