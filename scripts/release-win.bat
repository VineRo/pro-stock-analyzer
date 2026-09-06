@echo off
REM ProStock Analyzer - Windows 小白一鍵安全打包與發布腳本
chcp 65001 >nul
echo ==================================================
echo 🚀 ProStock Analyzer - Windows 一鍵安全發布精靈
echo ==================================================
cd /d "%~dp0.."

echo 🔍 步驟 1/4: 執行全套品質與資安測試 (Vitest 72項)...
call npm test
if %errorlevel% neq 0 (
    echo ❌ 測試未通過！為確保軟體穩定與資安，終止打包發布。
    pause
    exit /b %errorlevel%
)
echo ✅ 測試全數通過！

echo 🛠️ 步驟 2/4: 編譯 TypeScript 核心與 Vite 前端...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 前端編譯失敗！
    pause
    exit /b %errorlevel%
)
echo ✅ 前端編譯成功！

echo 📦 步驟 3/4: 封裝 Windows 安裝檔 (NSIS) 與計算 SHA-512 雜湊...
call npm run release:win

echo.
echo 🎉 步驟 4/4: Windows 版本發布準備完成！
echo 📂 請至 release 資料夾查看產出的安裝檔與 latest.yml。
echo ==================================================
pause
