@echo off
REM ProStock Analyzer - Windows 快速啟動腳本
chcp 65001 >nul
echo 🚀 正在啟動 專業股票技術分析軟體 (ProStock Analyzer)...
cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo 📦 正在安裝必要環境與組件，請稍候...
    npm install
)

echo ✨ 啟動桌面版應用程式...
npm run dev:electron
pause
