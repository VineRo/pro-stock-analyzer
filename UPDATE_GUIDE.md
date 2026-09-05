# 📈 ProStock Analyzer 高安全性軟體更新與版本發布操作手冊 (Update & Release Guide)

本手冊為 **ProStock Analyzer** 的正式發布與更新維護指南。本系統採用全球頂尖桌面應用（如 VS Code、Slack、Obsidian、Bitwarden）相同的**業界金標準架構**：以 **`electron-builder` + `electron-updater` + 雙平台數位簽章 + 密碼學雙重驗證（SHA-512 + Ed25519）+ 零信任 IPC 特權隔離** 為核心。

---

## 🛡️ 七大核心資安防禦體系概覽

| 防護維度 | 防禦機制 | 實施效果 |
| :--- | :--- | :--- |
| **1. 傳輸加密** | 強制 **TLS 1.2 / 1.3 HTTPS** | 阻絕中間人攻擊（MITM）與 DNS 劫持。 |
| **2. 密碼學完整性** | **SHA-512 雙重校驗** | 安裝前比對安裝包與官方清單雜湊，任何微小篡改或傳輸損壞即刻終止並隔離清除。 |
| **3. 作業系統數位簽章** | **Windows Authenticode & Apple Notarization** | 消除 Windows SmartScreen 藍屏警告；通過 macOS Gatekeeper 嚴格公證與 Hardened Runtime 防動態注入。 |
| **4. 清單防偽簽名** | **Ed25519 金鑰對簽署** | `latest.yml` 必須經離線私鑰簽署，即便 CDN / 伺服器被駭客攻破，用戶端仍會拒絕無私鑰簽署的更新包。 |
| **5. 降級回滾防禦** | **嚴格 SemVer（語意化版本比對）** | `semver.gt(remote, current)`，強制禁止安裝舊版本或同版本，杜絕「回滾攻擊（Rollback Attack）」。 |
| **6. IPC 沙盒隔離** | **零參數原則（Zero-Param IPC）** | 渲染進程（React 前端）無權指定任何檔案路徑或下載 URL，全面阻斷 XSS 到任意代碼執行（RCE）。 |
| **7. 增量差分更新** | **`.blockmap` 差分增量技術** | 每次更新只下載發生變更的二進位區塊（通常僅 3~10 MB），降低 80% 傳輸量並縮減網路暴露窗口。 |

---

## 🚀 軟體發布 3 步驟標準作業程序 (Release SOP)

只要 3 個步驟，即可自動完成測試、建置、簽名、雜湊計算並發布至全球用戶端：

### 步驟 1：升級版本號
打開根目錄下的 `package.json`，將 `"version"` 修改為新版本號（例如從 `1.0.0` 升級至 `1.0.1`）：
```json
{
  "name": "pro-stock-analyzer",
  "version": "1.0.1"
}
```

### 步驟 2：提交程式碼與建立 Git 標籤 (Tag)
在終端機中提交程式碼並打上對應的版本 Tag：
```bash
git add .
git commit -m "chore(release): bump version to 1.0.1"
git tag v1.0.1
git push origin main --tags
```

### 步驟 3：GitHub Actions 自動完成全球發布
一旦檢測到 `v*.*.*` 標籤推送，系統中的 [`.github/workflows/release.yml`](.github/workflows/release.yml) 將自動：
1. 啟動 Windows 與 macOS 獨立雲端乾淨虛擬機。
2. 執行全套品質與演算法自動化測試（Vitest）。
3. 執行 TypeScript 與 Vite 前端最佳化打包。
4. 調用官方數位憑證進行 Authenticode 與 Apple 公證簽署。
5. 計算所有安裝檔之 SHA-512 密碼學雜湊值並產出 `latest.yml`、`latest-mac.yml` 及 `.blockmap`。
6. 自動發布至 GitHub Releases。

全球已安裝軟體的用戶將在：
- **開啟軟體 10 秒後** 於背景自動感應。
- 或在看盤期間**每 4 小時**背景輪詢感應。
- 頂部導覽列會即刻亮起綠色「✨ 新版本 v1.0.1」更新徽章，並彈出專業更新對話盒供用戶自由選擇「立即下載」或「稍後更新」。

---

## 💻 本地一鍵打包發布指令 (Local Release Scripts)

若您想在本地開發機直接發布更新，專案已配置預設指令：

```bash
# 全平台編譯並發布
npm run release

# 僅編譯與發布 Windows 安裝檔 (.exe / NSIS)
npm run release:win

# 僅編譯與發布 Mac 安裝檔 (.dmg / .zip)
npm run release:mac
```

---

## 🔐 數位簽章與密鑰配置指南 (Code Signing Certificates)

為達到作業系統最高信任級別（免除微軟 SmartScreen 與蘋果 Gatekeeper 警告），可將憑證設定至 GitHub Secrets：

### 1. Windows 數位簽章 (Authenticode)
- **所需材料**：Standard 或 EV 代碼簽名憑證（`.pfx` 檔案）。
- **GitHub Secrets 設定**：
  - `WIN_CSC_LINK`：將 `.pfx` 憑證轉為 Base64 字串後貼入。
  - `WIN_CSC_KEY_PASSWORD`：憑證的保護密碼。

### 2. macOS 數位簽章與公證 (Apple Notarization)
- **所需材料**：Apple Developer 帳號、Developer ID Application 憑證、專用密碼。
- **GitHub Secrets 設定**：
  - `MAC_CERTS`：將導出的 `.p12` 憑證轉為 Base64 字串後貼入。
  - `MAC_CERTS_PASSWORD`：`.p12` 的密碼。
  - `APPLE_ID`：您的 Apple 帳號 Email。
  - `APPLE_APP_SPECIFIC_PASSWORD`：於 appleid.apple.com 產生的 App 專用密碼。
  - `APPLE_TEAM_ID`：Apple Developer 10 碼 Team ID。

---

## ☁️ 支援私有雲端伺服器 (AWS S3 / Cloudflare R2 / 自建 HTTPS)

若本專案不希望公開於 GitHub Releases，可無縫切換為私有雲端儲存桶：

修改 `package.json` 中的 `publish` 區塊：

### 選項 A：Cloudflare R2 / 任何私有 HTTPS 伺服器
```json
"publish": [
  {
    "provider": "generic",
    "url": "https://updates.yourdomain.com/releases/"
  }
]
```

### 選項 B：AWS S3
```json
"publish": [
  {
    "provider": "s3",
    "bucket": "your-stock-app-releases",
    "region": "ap-northeast-1"
  }
]
```
`electron-updater` 內部架構已完全抽象化，切換儲存源後**客戶端防偽校驗、SHA-512 雜湊比對與差分更新完全維持原樣運行**。

---

## 🚨 緊急安全性更新標記 (Critical Security Update)

當發生重要即時行情 API 調整或高危安全漏洞修補時，可在 Release Notes 的開頭標註：
`[CRITICAL]` 或 `【重大安全更新】`。

**效果**：
前端介面會將原本的普通提醒切換為高優先級資安警示標章，提示交易者務必立即升級，以確保帳戶安全與盤面報價數據精確無誤。
