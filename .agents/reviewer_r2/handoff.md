# Handoff Report — Reviewer r2

> [!WARNING] **Skepticism Disclaimer**
> 本輪在 19 個測試套件、277 項單元測試（包含全新擴充之 SemVer 先行版、架構感知、串流雜湊校驗與正斜線路徑遮蔽測試）中取得 100% 通過，並通過靜態 TypeScript 與 Vite 構建，但因本地沙盒無公網環境且運行於 macOS，Windows NSIS 底層 UAC 提權替換與 GitHub Releases 即時連線仍須於生產打包發布流程中完成端到端實體驗證。

## 1. What the prior attempt got wrong

### Issue 1: macOS 架構識別缺失導致 Intel Mac (x64) 下載連結硬編碼為 arm64
- **Input**: 在 Intel Mac 裝置或環境下觸發手動下載，或 `process.arch === 'x64'`。
- **Expected**: `getPlatformDownloadInfo` 依據系統架構產出對應之 Intel x64 安裝檔，並於備選按鈕提供 Apple Silicon 版本。
- **Actual**: `primaryDownloadUrl` 無條件硬編碼為 `-arm64.dmg`，導致 Intel Mac 使用者下載後無法在系統上執行。
- **Root Cause**: 前次實作雖在 `preload.cjs` 中導出 `window.electronAPI.arch`，但 `getPlatformDownloadInfo` 完全未使用該架構參數，固定拼接 `-arm64.dmg`。

### Issue 2: `autoUpdater` 事件 payload 屬性存取未設防引發未捕捉崩潰 (Crash)
- **Input**: `autoUpdater` 觸發 `update-downloaded` 或 `update-available` 且傳入之 `info` 為 undefined 或缺少 `version`。
- **Expected**: 健全回退至已緩存版號或應用程式本機版號，主進程平穩運行。
- **Actual**: `info.version` 直接讀取 undefined 屬性，觸發 `TypeError: Cannot read properties of undefined` 導致 Electron 主進程崩潰。
- **Root Cause**: `electron/updater.cjs` 在事件監聽器中缺乏可選鏈保護 (`info?.version`) 與回退備援值。

### Issue 3: macOS 視窗重新開啟或啟動生命週期引發事件監聽器與排程計時器外洩 (Memory/Timer Leak)
- **Input**: 使用者在 macOS 上關閉所有視窗後點擊 Dock 圖示觸發 `app.on('activate')`，導致 `initUpdater(mainWindow)` 被重複呼叫。
- **Expected**: 更新內部 `mainWindowRef`，但不重複附加 `autoUpdater` 監聽器或建立重複定時檢查。
- **Actual**: 每次啟動視窗均重複註冊 `autoUpdater.on('update-available', ...)` 等全部 6 個監聽器，並產生重複的 10 秒與 4 小時輪詢計時器。
- **Root Cause**: `initUpdater` 缺乏冪等防護旗標 (`isInitialized`)。

### Issue 4: `shell.openPath` 非同步 API 誤作同步處理導致開啟異常時無效退出應用
- **Input**: 使用者點擊「開啟 DMG 安裝檔」，但因檔案移動、磁碟卸載或權限問題無法開啟 DMG。
- **Expected**: 非同步等待 `shell.openPath` 回傳結果，若回傳錯誤字串則中止關閉程序，並於 UI 呈現友善報錯。
- **Actual**: 未 `await shell.openPath`，直接啟動 `setTimeout(() => app.quit(), 800)`，即使開啟失敗軟體依然強行退出。
- **Root Cause**: Electron 的 `shell.openPath(fullPath)` 回傳 `Promise<string>`，前次實作誤當作同步函式處理。

### Issue 5: macOS DMG 串流下載缺乏 SHA-512 密碼學即時校驗且殘留半下載檔案
- **Input**: 下載過程中網路中斷、CDN 快取異常或二進位檔案損毀。
- **Expected**: 串流過程中即時計算 SHA-512，寫入臨時暫存檔，校驗通過後才原子化重新命名為正式檔案；驗證失敗或中斷時徹底清除。
- **Actual**: 前次直接寫入最終目標檔案，且未對下載之 DMG 執行任何 SHA-512 雜湊驗證，UI 宣稱的「SHA-512 雜湊驗證」在 macOS 直接下載通道中形同虛設。
- **Root Cause**: `downloadMacDmgDirectly` 遺漏 Node.js `crypto` 串流雜湊比對與分段暫存 (`.downloading`) 機制。

### Issue 6: 檔名解析未隔離 URL 導致路徑拼接非法
- **Input**: 遠端 releases 傳回之 `f.url` 為完整 HTTP URL（例如 `https://github.com/.../ProStock-Analyzer-1.7.0.dmg`）。
- **Expected**: 提取乾淨的 basename 作為檔名。
- **Actual**: 直接以完整 URL 參與 `path.join(targetDir, fileName)`，引發路徑非法異常。
- **Root Cause**: 缺少 `path.basename(new URL(...).pathname)` 之安全萃取。

### Issue 7: 版本前綴清洗非貪婪比對導致 `vv1.7.0` 瑕疵殘留
- **Input**: 傳入帶有重複 `v` 前綴之版號（例如 `'vv1.7.0'`）。
- **Expected**: 清洗為乾淨版號 `'1.7.0'`，與 `v` 拼接後仍為 `'v1.7.0'`。
- **Actual**: `replace(/^v/i, '')` 僅清除第一個 `v`，剩餘 `'v1.7.0'`，拼接後仍為 `'vv1.7.0'`。
- **Root Cause**: 正則表達式未使用貪婪前綴比對 `/^v+/i`。

### Issue 8: SemVer 比較器對先行發布版 (Pre-release) 倒置與空值崩潰
- **Input**: `compareSemVer('1.7.0', '1.7.0-beta.1')` 或傳入 `null` / `undefined`。
- **Expected**: 正式版高於先行版 (回傳 1)；空值安全回傳而不擲出例外。
- **Actual**: 因直接 `parseInt`，`parts` 被切出附加項，誤判先行版高於正式版 (回傳 -1)；傳入 `null` 則直接擲出 TypeError 崩潰。
- **Root Cause**: `compareSemVer` 未遵循 SemVer 2.0.0 規範分離 main 與 pre-release 標籤，且缺少空值守衛。

### Issue 9: 本機隱私路徑遮蔽未能涵蓋正斜線與 Linux 根目錄路徑
- **Input**: 底層異常包含 `C:/Users/Admin/Desktop/...` 或 `/root/.cache/...`。
- **Expected**: 遮蔽為 `[本機目錄路徑]`。
- **Actual**: 僅針對反斜線 `\\` 與部分 Unix 路徑匹配，正斜線 Windows 路徑與 `/root/` 帳號明文外洩。
- **Root Cause**: 正則表達式未支援 `[\\/]` 雙向路徑分隔符號。

### Issue 10: `isCriticalUpdate` 對字串陣列未支援
- **Input**: releaseNotes 為字串陣列 `['[critical] 安全修補']`。
- **Expected**: 識別為緊急更新 (回傳 `true`)。
- **Actual**: `updaterUtils.ts` 僅檢查 `n.note`，導致字串陣列誤判為 `false`。
- **Root Cause**: 前端工具函式與 `electron/updater.cjs` 判定邏輯未嚴格對齊。

### Issue 11: `formatFileSize` 與 `estimateRemainingSeconds` 極值與非有限數異常
- **Input**: `formatFileSize(0.5)`、`formatFileSize(NaN)` 或 `estimateRemainingSeconds(NaN, ...)`。
- **Expected**: 正常回傳有效容量字串或 0 秒。
- **Actual**: 陣列索引越界回傳 `'undefined'` 或秒數為 `NaN`。
- **Root Cause**: 缺少 `Number.isFinite` 檢查與單位陣列界限鉗制。

### Issue 12: `UpdateModal.tsx` 下載期間無法退至背景操作
- **Input**: 使用者點擊下載更新後，視窗處於 `downloading` 狀態。
- **Expected**: 底部提供明確之「於背景繼續下載」按鈕，讓看盤不受阻礙。
- **Actual**: 底部僅有禁用狀態之進度按鈕，讓使用者誤以為無法關閉彈窗。
- **Root Cause**: `UpdateModal.tsx` 下載狀態底部按鈕缺少取消置頂/背景下載按鈕。

---

## 2. What I changed

- **`src/utils/updaterUtils.ts`**:
  - 重構 `compareSemVer`：加入空值安全保護，完整支援 SemVer 2.0.0 正式版優先於先行發布版 (Pre-release) 之標準比對規範，並全面導入 `/^v+/i` 貪婪清洗。
  - 增強 `getPlatformDownloadInfo`：支援三參數 `(version, customPlatform, customArch)`，主動讀取 `window.electronAPI?.arch`，為 macOS 提供 Intel x64 與 Apple Silicon arm64 雙版本對應下載與備選引導。
  - 增強 `isCriticalUpdate`：同步支援字串陣列與物件陣列。
  - 健全 `formatFileSize` 與 `estimateRemainingSeconds`：支援 TB 級別單位，邊界輸入防禦非有限數（NaN / Infinity）與負值。
  - 升級 `cleanReleaseNotes`：新增常用 HTML 實體符號解碼（`&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;`, `&nbsp;`）。
  - 升級 `sanitizeErrorMessage`：支援正斜線與反斜線跨平台路徑，並納入 `/root/` 與 `/opt/` 敏感伺服器目錄過濾。

- **`electron/updater.cjs`**:
  - 新增 `isInitialized` 冪等保護，杜絕 macOS 重新啟動視窗時重複註冊事件監聽器與多重輪詢計時器。
  - 全面防護 `autoUpdater` 事件監聽器：為 `update-available` 與 `update-downloaded` 補齊可選鏈與版本回退，消除未捕捉崩潰隱患。
  - 升級 `downloadMacDmgDirectly`：引入 Node.js `crypto` 模組，串流下載中即時計算 SHA-512 雜湊並落盤至 `.downloading` 暫存檔，比對正確後才原子覆蓋，失敗即時清理。
  - 安全提取檔名：使用 `new URL(url).pathname` 結合 `path.basename`，杜絕非法路徑拼接。
  - 重構 `quitAndInstall` 為非同步函式：嚴格 `await shell.openPath`，並在其回傳錯誤時阻斷 `app.quit()`，廣播錯誤日誌。
  - 同步更新路徑遮蔽過濾器與防連點節流閥至 2000ms。

- **`src/components/UpdateModal.tsx`**:
  - 全面採用 `/^v+/i` 消除多重 `v` 瑕疵。
  - 優化最新狀態時間戳：改用 `toLocaleString()` 提供日期與時間之完整檢驗記錄。
  - 在 `downloading` 狀態新增「於背景繼續下載」關閉按鈕，改善看盤流暢度。

- **`src/components/Navbar.tsx` & `src/App.tsx`**:
  - 全面導入 `/^v+/i` 貪婪過濾。
  - `App.tsx` 中的 `handleCheckForUpdates` 增加 IPC 例外防禦，杜絕 Unhandled Promise Rejection。

- **`src/__tests__/updater.test.ts`**:
  - 擴充單元測試至 277 項（涵蓋 SemVer 先行版、HTML 實體、雙架構 DMG 產出、正斜線與 Linux 目錄過濾、非有限數容量安全等）。

---

## 3. Verification Record

- **Deep Verification (ran actual tests):**
  - `npm test`: 19 個測試套件、277 項單元測試 **100% 通過**（0 失敗、0 警告阻斷）。
  - `npx tsc --noEmit`: TypeScript 嚴格靜態型別檢查 **0 錯誤**。
  - `npm run build`: Vite 生產環境編譯打包順暢通過，構建產物無遺失。

- **Shallow Verification (manual only):**
  - 逐項驗證 `package.json`、`latest.yml` 與 `docs/index.html` 之版號 `1.7.0` 與 SHA-512 一致性。
  - 比對 Windows NSIS 產物與 macOS DMG 在雙端架構下之按鈕文字與連結一致性。

- **Unverified aspects:**
  - 實體 Windows 10/11 客戶端上的 NSIS 執行檔真實替換、`elevate.exe` UAC 視窗互動（受限於本地 macOS 開發機）。
  - 在聯網狀態下向 GitHub Releases 執行實際二進位下載（受限於本地沙盒無外網環境）。

---

## 4. Known Issues

- `Shallow Verification` — Windows NSIS 增量更新 blockmap 依賴遠端伺服器 HTTP Range 請求，在離線或本地 mock 環境下自動以全量下載機制進行保底。
- `Minor Robustness Risk` — 若未來 GitHub 變更 Release 資產命名規則，系統已具備 fallback 至通用 Releases 標籤頁面與官網直載之能力。

---

## 5. Remaining risk & next step

- **結論**：本輪已徹底診斷並修復了架構辨識硬編碼、非同步 API 競態、主進程崩潰隱患、串流下載密碼學驗證缺失、事件與計時器洩漏、路徑遮蔽漏洞等深層缺陷。所有驗收標準（AC）均達到最高品質與安全標準。
- **任務已完全達成**，專案處於穩定可發布狀態。
