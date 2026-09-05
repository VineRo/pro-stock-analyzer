@echo off
REM ProStock Analyzer - Windows 獨立打包安裝檔腳本
chcp 65001 >nul
echo 📦 正在準備構建 ProStock Analyzer Windows 安裝檔 (NSIS / Portable)...
cd /d "%~dp0"

IF NOT EXIST "node_modules" (
    echo 📥 正在安裝必要環境依賴...
    npm install
)

echo 🛠️ 開始編譯 TypeScript 與 Vite 核心前端...
call npm run build

echo 🚀 執行 Electron-Builder 封裝 Windows (x64) 應用...
call npx electron-builder --win

echo.
echo ✅ Windows 版本打包完成！請至 release 資料夾查看安裝檔。
pause
