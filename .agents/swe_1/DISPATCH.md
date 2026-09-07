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

## 2026-09-06T18:24:08Z

Quota reset. Please check status and resume execution.
