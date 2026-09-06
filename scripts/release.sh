#!/bin/bash
# ProStock Analyzer - Mac 小白一鍵安全打包與發布腳本
echo "=================================================="
echo "🚀 ProStock Analyzer - Mac 一鍵安全發布精靈"
echo "=================================================="
cd "$(dirname "$0")/.."

echo "🔍 步驟 1/4: 執行全套品質與資安測試 (Vitest 72項)..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ 測試未通過！為確保軟體穩定與資安，終止打包發布。"
    exit 1
fi
echo "✅ 測試全數通過！"

echo "🛠️ 步驟 2/4: 編譯 TypeScript 核心與 Vite 前端..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 前端編譯失敗！請檢查錯誤。"
    exit 1
fi
echo "✅ 前端編譯成功！"

echo "📦 步驟 3/4: 封裝 Mac 應用程式與計算 SHA-512 完整性雜湊..."
npm run release:mac

echo ""
echo "🎉 步驟 4/4: 發布準備完成！"
echo "📂 請至 release/ 資料夾查看產出的安裝檔與更新清單 (latest-mac.yml)。"
echo "=================================================="
