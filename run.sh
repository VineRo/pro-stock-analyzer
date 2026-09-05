#!/bin/bash
# ProStock Analyzer - Mac 快速啟動腳本
echo "🚀 正在啟動 專業股票技術分析軟體 (ProStock Analyzer)..."
cd "$(dirname "$0")"

# 檢查是否已安裝依賴
if [ ! -d "node_modules" ]; then
    echo "📦 正在安裝必要環境與組件，請稍候..."
    npm install
fi

echo "✨ 啟動桌面版應用程式..."
npm run dev:electron
