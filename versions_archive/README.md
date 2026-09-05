# ProStock Analyzer 版本封存總目錄 (Version Archives)

本資料夾完整保存了專案從初始設計規範至當前最新版本的所有歷史更迭紀錄與程式碼快照。

---

## 📂 版本目錄一覽

| 版本資料夾 | 發布階段 | 核心改動與里程碑重點 | 狀態 |
| :--- | :--- | :--- | :--- |
| [v1.0.0_design_spec_and_baseline](./v1.0.0_design_spec_and_baseline/) | 第一階段 (原型規範) | 建立完整 UI 設計規範與 UX 看盤者動線架構，產出原型應用程式。 | 歷史封存 |
| [v1.1.0_multi_market_tabs_and_flagship_tools](./v1.1.0_multi_market_tabs_and_flagship_tools/) | 第二階段 (分類與旗艦工具) | 導入四大市場核心分類分頁（台股/美股/大盤/幣圈）、分析工具箱下拉選單、Volume Profile、回測中心、模擬交易。 | 歷史封存 |
| [v1.2.0_latest_yuanta_upgrade_and_responsive](./v1.2.0_latest_yuanta_upgrade_and_responsive/) | 第三階段 (元大升級版) | **元大證券風格防黑邊 K 線圖**、**實時國際時區與盤後交易追蹤**、**未開盤市場靜態無波動**、**非全螢幕比例自適應**、**全球大盤遮蔽修復**。 | 歷史封存 |
| [v1.3.0_official_full_market_smart_search_and_meta_learning](./v1.3.0_official_full_market_smart_search_and_meta_learning/) | 第四階段 (全市場名冊與學習) | **官方全市場 ISIN 名冊自動同步 (2,344檔)**、**0.1ms 極速雙向搜尋**、**元數據自動學習**、**股票身份水印與頂部標識顯著強化**。 | 歷史封存 |
| [v1.4.0_interactive_onboarding_and_feature_tour](./v1.4.0_interactive_onboarding_and_feature_tour/) | 第五階段 (新手導覽與K線交互) | **全方位彈出式新手導覽教學 (6大章節)**、**現價線自訂開關**、**點擊固定 K 棒資訊 (箱型圖)**、**股票名稱與數值重疊修復**。 | **目前最新版 (Current)** |

---

## 🚀 最新版本軟體在哪裡？如何運行？

### 1. 桌面端原生應用程式 (.app)
- **檔案位置**：`release/mac-arm64/ProStock Analyzer.app`
- **運行方式**：
  - 在 Finder 中進入 `release/mac-arm64/` 直接雙擊 `ProStock Analyzer.app` 啟動。
  - 或在終端機中執行：
    ```bash
    open "release/mac-arm64/ProStock Analyzer.app"
    ```

### 2. 本地即時開發與看盤預覽 (熱重載模式)
- **專案主目錄**：專案根目錄 `/Users/viberorob/Desktop/New Stock Project` 即為當前最新原始碼。
- **運行方式**：
  ```bash
  # 啟動 Desktop 桌面視窗
  npm run dev:electron
  
  # 或使用快速啟動腳本
  ./run.sh
  ```

### 3. 生產環境網頁版本 (Web Build)
- **檔案位置**：`dist/index.html` (已完成打包編譯，可直接部署至伺服器或於瀏覽器執行)。
