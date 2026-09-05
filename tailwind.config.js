/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pro: {
          // 介面基底層次色盤
          bg: '#131722',           // 畫布最底層 (Obsidian Slate)
          panel: '#1e222d',        // 工具列、側欄、浮動窗底色
          card: '#242832',         // 卡片、診斷橫幅背景
          input: '#2a2e39',        // 搜尋與輸入框底色
          hover: '#363a45',        // 滑鼠懸浮反白
          border: '#2a2e39',       // 1px 分割細線
          borderStrong: '#363a45', // 強調邊框

          // 文字階梯
          text: '#f0f3fa',         // 主文字 (白)
          textSec: '#d1d4dc',      // 次級文字
          muted: '#787b86',        // 提示輔助字與刻度

          // 核心焦點主色
          accent: '#2962ff',       // 交易藍
          accentHover: '#1e53e5',

          // 多空交易色 (支援國際/傳統雙模式)
          up: '#089981',           // 國際標準漲綠 (Emerald)
          down: '#f23645',         // 國際標準跌紅 (Crimson)
          upAsia: '#f23645',       // 亞洲標準漲紅
          downAsia: '#089981',     // 亞洲標準跌綠
          neutral: '#787b86',      // 平盤板岩灰

          // 12色技術指標專用高對比光譜
          indYellow: '#fbc02d',    // MA5 / 黃金分割
          indCyan: '#00bcd4',      // MA10 / 晴空青
          indFuchsia: '#e91e63',   // MA20 月線生命線
          indGreen: '#00e676',     // MA60 季線大關
          indPurple: '#9c27b0',    // MA120 / RSI 紫
          indOrange: '#ff9800',    // MACD DEA 晚霞橘
          indBlue: '#2962ff',      // BOLL 軌道 / MACD DIF
        }
      },
      fontFamily: {
        mono: ['"SF Mono"', '"Roboto Mono"', '"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Trebuchet MS"', 'Roboto', 'Ubuntu', 'sans-serif'],
      },
      boxShadow: {
        'glow-accent': '0 0 14px rgba(41, 98, 255, 0.4)',
        'glow-up': '0 0 10px rgba(8, 153, 129, 0.35)',
        'glow-down': '0 0 10px rgba(242, 54, 69, 0.35)',
        'glow-amber': '0 0 12px rgba(245, 158, 11, 0.35)',
        'card-elevated': '0 12px 32px rgba(0, 0, 0, 0.55)',
      }
    },
  },
  plugins: [],
}
