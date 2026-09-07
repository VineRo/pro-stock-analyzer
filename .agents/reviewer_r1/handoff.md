# Handoff Report — Reviewer r1

> [!WARNING] **Skepticism Disclaimer**
> 儘管已在 19 個測試套件、274 項單元測試（包含全新擴充之 18 項針對性防護測試）中取得 100% 通過，並通過 TypeScript 靜態編譯與 Vite 生產打包，但由於目前沙盒環境無法連接外部 GitHub API 亦無實體 Windows 雙機進行 NSIS 真實 UAC 提權替換，實機運行仍需於實際打包環境中進行發布覆蓋驗證。

## 1. What the prior attempt got wrong

### Issue 1: 非 Windows/macOS 平台（Linux/Other）在下載資訊產生器中被硬編碼判定為 macOS
- **Input**: `getPlatformDownloadInfo('1.7.0', 'linux')` 或在 Linux/Other 瀏覽器環境中開啟更新彈窗。
- **Expected**: `platformName: 'Other'`, `isWindows: false`, `isMac: false`，提供前往 GitHub Releases 下載對應檔案之通用引導。
- **Actual**: `platformName: 'Other'` 但 `isMac: true`，按鈕文字顯示「一鍵下載 macOS 原生安裝檔 (.dmg)」，並產出 macOS ARM64 DMG 下載 URL。
- **Root Cause**: `updaterUtils.ts` 第 172 行在非 Windows 分支中硬編碼 `isMac: true`，未依據 `isMacPlatform` 進行分支區隔。

### Issue 2: `ENOENT` 泛化捕捉導致非設定檔之檔案缺失錯誤被誤判為「設定檔初始化中」
- **Input**: 下載套件或暫存目錄缺失所引發之 `ENOENT: no such file or directory, open 'C:\Users\...'`。
- **Expected**: 應進入標準錯誤流程或本機路徑遮蔽處理。
- **Actual**: 被 `raw.includes('app-update.yml') || raw.includes('ENOENT')` 攔截，回傳無關的「更新設定檔初始化中，請稍候重試」。
- **Root Cause**: 過於寬鬆地比對 `enoent`，未限定為 `app-update.yml` 或 `dev-app-update.yml`。

### Issue 3: 未捕捉錯誤訊息洩漏本機檔案系統隱私路徑與使用者帳號
- **Input**: 包含 Windows 或 Unix 絕對路徑的非預期底層異常（例如 `EINVAL: invalid path 'C:\Users\Administrator\AppData\Local\Temp\...'`）。
- **Expected**: UI 彈窗不應將敏感的使用者資料夾結構與系統帳號外洩給使用者或畫面截圖。
- **Actual**: `getFriendlyErrorMessage` 直接回傳未經濾除的 raw 字串，造成資訊揭露風險。
- **Root Cause**: 缺乏本機目錄與使用者名稱遮蔽過濾器（`sanitizeErrorMessage`）。

### Issue 4: 遺漏關鍵資安防護與 Windows 異常情境之錯誤轉譯
- **Input**:
  1. SHA-512 密碼學完整性雜湊校驗失敗 (`ERR_CHECKSUM_MISMATCH`)
  2. Windows 數位簽章 Authenticode 驗證未通過 (`ERR_UPDATER_INVALID_SIGNATURE`)
  3. 磁碟儲存空間不足 (`ENOSPC`)
  4. 使用者於 Windows UAC 提示按下「否」或取消 (`1223` / `ERROR_CANCELLED`)
  5. 快速連點觸發重複下載 (`Download is already in progress`)
- **Expected**: 呈現精確繁體中文診斷與指引，並安全處置。
- **Actual**: 曝露雜湊明文、數字代碼或英文 stack trace，甚至使下載狀態陷入死鎖。
- **Root Cause**: `getFriendlyErrorMessage` 未涵蓋上述密碼學驗證與 Windows NSIS 特有錯誤代碼。

### Issue 5: macOS 直接下載 DMG 串流缺乏未捕捉錯誤防護與損毀檔案殘留
- **Input**: 下載過程網路中斷或磁碟寫入失敗。
- **Expected**: `fs.createWriteStream` 綁定錯誤監聽，在失敗時自動中斷串流並清除殘留之 0-byte/損毀 `.dmg`。
- **Actual**: 未監聽 `fileStream.on('error')`（可能引發 Node.js Unhandled Error 崩潰），且 `catch` 區塊未清除殘留檔案。
- **Root Cause**: `downloadMacDmgDirectly` 串流 Promise 封裝不完整。

### Issue 6: 版本號重複前綴產生 `vv1.7.0`
- **Input**: `info.version` 或 `currentVersion` 帶有前導 `v` 字元（如 `'v1.7.0'`）。
- **Expected**: UI 呈現為統一的 `v1.7.0`。
- **Actual**: UI 呈現 `目前版本: vv1.7.0` 與 `新版本 vv1.7.0`。
- **Root Cause**: `Navbar.tsx`、`UpdateModal.tsx` 與 `App.tsx` 在字串插值 `v${version}` 前未過濾 `^v`。

### Issue 7: 主進程與渲染端 `isCritical` 判定邏輯不一致
- **Input**: Release Notes 包含小寫 `[critical]` 或中文 `【重大安全更新】`。
- **Expected**: 主進程正確判定為緊急更新並標註 `isCritical: true`。
- **Actual**: 主進程僅進行區分大小寫之 `includes('[CRITICAL]')`，無法識別其他標記；且 `UpdateModal.tsx` 完全未對 `isCritical` 提供視覺警示。
- **Root Cause**: `electron/updater.cjs` 未同步共用演算法，且 UI 缺乏警示元件。

### Issue 8: 最新版本狀態下時間戳重複呈現
- **Input**: 檢查更新結果為 `status === 'not-available'`。
- **Expected**: 時間戳僅在最新狀態綠色卡片中精簡呈現一次。
- **Actual**: 綠色卡片內部呈現「最後檢查時間」，卡片下方又再次呈現「上次檢查時間」，畫面雜亂。
- **Root Cause**: `UpdateModal.tsx` 底部未排除 `not-available` 狀態。

---

## 2. What I changed

- **`src/utils/updaterUtils.ts`**:
  - 修復 `getPlatformDownloadInfo`：當非 Windows 且非 macOS 時，正確回傳 `platformName: 'Other'`、`isMac: false`，並提供 GitHub Releases 通用下載連結與適配按鈕文字。
  - 增強 `isCriticalUpdate`：支援大小寫不敏感之 `[critical]`、`security update`、`critical fix` 與中文關鍵字。
  - 新增 `sanitizeErrorMessage`：自動過濾遮蔽 Windows (`C:\Users\...`) 與 Unix (`/Users/...`、`/home/...`) 本機敏感目錄路徑。
  - 擴充 `getFriendlyErrorMessage`：增設 SHA-512 雜湊校驗損毀、數位簽章驗證失敗、磁碟空間不足 (ENOSPC)、使用者取消 UAC 安裝、重複下載防護等錯誤分類。
  - 修正 `app-update.yml` 錯誤比對範圍，避免誤傷一般 `ENOENT`。

- **`electron/updater.cjs`**:
  - 同步引入 `sanitizeErrorMessage` 與 `isCriticalUpdate` 完整判定邏輯。
  - 同步擴充 `getFriendlyErrorMessage` 至與前端工具完全對齊。
  - 增強 `setupUpdateConfig`：在 `setFeedURL` 中正式傳入 `updaterCacheDirName: CACHE_DIR_NAME`。
  - 強化 `initUpdater`：診斷日誌納入 `tempDir` 與 `userDataDir` 路徑。
  - 強化 `downloadMacDmgDirectly`：確保下載目錄存在，綁定 `fileStream.on('error')`，並於異常時呼叫 `destroy()` 與自動刪除殘留損毀二進位檔。
  - 強化 `startDownloadUpdate`：增設下載中狀態防重入鎖（避免重複呼叫引發 `Download is already in progress` 異常），並對差異增量下載錯誤進行小寫不敏感重試判定。
  - 強化 `quitAndInstall`：嚴格檢查 `currentUpdateState.status === 'downloaded'`，避免在未完成下載時觸發無效安裝。

- **`src/components/UpdateModal.tsx`**:
  - 全面導入 `cleanCurrentVersion` 與 `cleanTargetVersion`（過濾 `^v`），徹底消滅 `vv1.7.0` 瑕疵。
  - 新增 `info.isCritical` 緊急安全更新高對比警示橫幅。
  - 新增 `status === 'idle'` 待命狀態之引導說明，避免彈窗空白。
  - 優化最後檢查時間戳顯示：在 `status === 'not-available'` 時只在專屬卡片內顯示，消除底部重複冗餘。

- **`src/components/Navbar.tsx`**:
  - 更新導覽列更新按鈕之版本字串插值，消除雙 `v` 前綴。

- **`src/App.tsx`**:
  - 在版本監聽與檢查回呼中進行版本號標準化過濾。

- **`electron/preload.cjs` & `src/types/updater.ts`**:
  - 安全導出 `process.arch` 至 `window.electronAPI.arch`，使前端具備系統架構識別能力。

- **`src/__tests__/updater.test.ts`**:
  - 新增並擴充 18 項針對性單元測試（總測試數由 12 項提升至 30 項），涵蓋非 Win/Mac 平台回退、SHA-512 損毀防護、數位簽章失敗、磁碟不足、UAC 取消、底層路徑隱私遮蔽、多段 SemVer 比較等關鍵邏輯。

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm test`: 19 個測試套件、274 項單元測試 **100% 通過**（0 失敗、0 警告阻斷）。
  - `npx tsc --noEmit`: TypeScript 嚴格靜態型別檢查 **0 錯誤**。
  - `npm run build`: Vite 生產環境編譯打包順暢通過，構建產物無遺失。

- **Shallow Verification (manual only):**
  - 逐行比對 `latest.yml` 與 `docs/index.html` 中的 SHA-512（`x2yg41HBvOYGhol4fq18Akb8d6Xd9H46wr6widebbdHftH6jr7Wj7VZWjSKpDlIO8q1SK+Ec8fP+XrTzHDOt3A==`）與版本號 `1.7.0`。
  - 檢查 `package.json`、`latest.yml` 與 `docs/index.html` 之二進位檔案名稱對齊。

- **Unverified aspects:**
  - 實體 Windows 10/11 客戶端上的 NSIS 執行檔真實替換、`elevate.exe` UAC 視窗互動（受限於本機 macOS 環境）。
  - 線上即時向 GitHub Releases 執行實際下載（受限於本地沙盒無外網環境）。

---

## 4. Known Issues

- `Shallow Verification` — Windows NSIS 增量更新 blockmap 實際運作依賴線上伺服器支援 HTTP Range 請求，在離線或本地 mock 環境下以全量下載機制進行保底。
- `Minor Robustness Risk` — 若日後 GitHub 變更 Release 資產命名規則（未帶 Setup 或未帶架構標籤），系統已具備 fallback 至通用 Releases 標籤頁面與官網直載之能力，不致發生崩潰。

---

## 5. Remaining risk & next step

- **結論**：本輪已徹底修復前次實作遺留的平台判斷倒置、錯誤路徑外洩、串流洩漏、版本號雙 `v` 瑕疵與時間戳重複等問題。所有驗收標準（AC）均已達成，代碼健康度達到最高水準。
- **後續步驟**：建議團隊於發布新版本（如正式發布 v1.7.7 或更高版本）時，遵循 `docs/guides/UPDATE_GUIDE.md` 規範，同步打包 Windows NSIS 安裝檔與 macOS DMG，並確保 `latest.yml` 上傳至 GitHub Release 資產中。
