# v1.2.0 - 元大證券風格升級、盤後交易追蹤與非全螢幕自適應版 [當前最新]

## 📌 版本概述
本版本全面對齊元大證券「投資先生」專業看盤圖表標準，並徹底修復所有 UI 溢出、圖表拖拽黑邊、真實市場時區波動、盤後交易追蹤以及非全螢幕自適應問題。

## 📁 包含內容
- [snapshot/src/components/](./snapshot/src/components/)：核心修復與優化組件快照代碼
  - `ChartContainer.tsx`：元大證券風格防黑邊 K 線圖表、標準頂部平鋪資訊列、右側標記點位優化
  - `Navbar.tsx`：非全螢幕自適應雙層頂部列、市場標籤響應式切換
  - `ChartActionBar.tsx`：標的資訊在小螢幕自動縮合隱藏、按鈕文字響應式調整
  - `GlobalMarketIndicesPage.tsx`：領頭羊下方被遮蔽問題修復、排序與區域聯動篩選
  - `DrawingToolbar.tsx`：側邊劃線懸浮提示窗改為定點右側，徹底消除按鈕遮蔽
- [snapshot/src/data/globalIndicesData.ts](./snapshot/src/data/globalIndicesData.ts)：真實全球時區、未開盤無波動、盤後交易 (`AFTER_HOURS`) 數據引擎
- [snapshot/src/__tests__/flagshipFeatures.test.ts](./snapshot/src/__tests__/flagshipFeatures.test.ts)：47 項全域單元與整合測試用例

## 🎯 核心里程碑
1. **元大證券防黑邊極限邊界控制**：
   - 移除 `setLeftMinVisibleBarCount` / `setRightMinVisibleBarCount`，改用 `setMaxOffsetLeftDistance(50)` 與 `setMaxOffsetRightDistance(60)`。
   - 拖拽蠟燭圖永不出現全黑空洞，始終貼邊滿屏。
   - 懸浮黑色方塊 Tooltip 改為元大標準平鋪頂部指標欄（`TooltipShowType.Standard`）。
2. **全球大盤指數盤態真實反映**：
   - 引入 `getMarketSessionStatus`，已收盤市場呈現冷灰靜態線條、無虛假波動。
   - 美股盤後交易時段（美東 16:00-20:00）顯示琥珀黃燈「● 盤後交易」並實時追蹤跳動點位。
3. **頂部及側邊 UI 全面比例自適應**：
   - 非全螢幕下各市場按鈕自動縮寫為精簡版，標的文字自動省略。
   - 側欄劃線 Tooltip 定點外移，操作順手不擋手。
4. **通過 100% 全域測試 (47/47)**。
