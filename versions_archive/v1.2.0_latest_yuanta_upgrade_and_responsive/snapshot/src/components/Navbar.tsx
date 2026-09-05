import React, { useState, useRef, useEffect } from 'react';
import { 
  CandlestickChart, 
  SlidersHorizontal, 
  BookOpen, 
  Activity, 
  ArrowLeftRight, 
  Maximize2,
  Filter,
  BarChart3,
  Building2,
  Wallet,
  Bell,
  Keyboard,
  ChevronDown,
  Wrench
} from 'lucide-react';
import { ColorTheme, MarketCategory } from '../types/stock';

interface NavbarProps {
  currentCategory: MarketCategory;
  onChangeCategory: (category: MarketCategory) => void;
  colorTheme: ColorTheme;
  onToggleColorTheme: () => void;
  onOpenIndicators: () => void;
  onOpenEducation: () => void;
  onOpenHealth: () => void;
  onOpenShortcuts: () => void;
  activeIndicatorsCount: number;
  onOpenScreener: () => void;
  onOpenBacktest: () => void;
  onOpenFundamentals: () => void;
  onOpenPaperTrading: () => void;
  onOpenAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onChangeCategory,
  colorTheme,
  onToggleColorTheme,
  onOpenIndicators,
  onOpenEducation,
  onOpenHealth,
  onOpenShortcuts,
  activeIndicatorsCount,
  onOpenScreener,
  onOpenBacktest,
  onOpenFundamentals,
  onOpenPaperTrading,
  onOpenAlerts,
}) => {
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // 點擊外部自動收起分析工具選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(e.target as Node)) {
        setIsToolsOpen(false);
      }
    };
    if (isToolsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isToolsOpen]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 偵測是否處於 macOS 環境 (保留原生紅黃綠視窗按鈕的安全留白區間)
  const isMac = typeof window !== 'undefined' && (
    window.electronAPI?.platform === 'darwin' ||
    (typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent))
  );

  // 四大核心分類分頁定義 (無發光特效，純淨高對比標籤，支援小視窗自適應縮寫)
  const categoryTabs: { key: MarketCategory; label: string; shortLabel: string; icon: string; desc: string }[] = [
    { key: 'domestic', label: '國內股票', shortLabel: '台股', icon: '🇹🇼', desc: '台股市場行情 (上市櫃/ETF)' },
    { key: 'foreign', label: '國外股票', shortLabel: '美股', icon: '🇺🇸', desc: '美股主流標的與科技巨頭' },
    { key: 'indices', label: '大盤指數', shortLabel: '大盤', icon: '🌐', desc: '全球市場大盤即時深度看板' },
    { key: 'crypto', label: '虛擬貨幣', shortLabel: '幣圈', icon: '🪙', desc: '主流加密資產 24/7 全天候行情' },
  ];

  return (
    <header 
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      className={`h-11 bg-pro-panel border-b border-pro-border flex items-center justify-between pr-3 select-none z-30 text-pro-text shrink-0 ${
        isMac ? 'pl-[76px]' : 'px-3'
      }`}
    >
      {/* 左側：品牌 Logo 與四大市場核心分頁導航 */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-2.5 sm:gap-3.5 min-w-0"
      >
        {/* Logo */}
        <div className="flex items-center gap-2 pr-2.5 border-r border-pro-border/80 shrink-0">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <CandlestickChart size={15} />
          </div>
          <span className="font-black text-sm tracking-tight text-white hidden md:inline">
            Pro<span className="text-blue-500">Stock</span>
          </span>
        </div>

        {/* 🌟 四大市場核心獨立分頁按鈕組 (清晰明顯、無發光特效、純淨高對比、自動響應視窗大小) */}
        <nav className="flex items-center gap-1 bg-pro-bg p-1 rounded-xl border border-pro-border/80 shrink-0">
          {categoryTabs.map((tab) => {
            const isActive = currentCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => onChangeCategory(tab.key)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-lg transition-colors font-medium border ${
                  isActive
                    ? 'bg-blue-600 text-white font-bold border-blue-500 shadow-sm'
                    : 'text-pro-muted hover:text-white hover:bg-pro-hover/70 border-transparent'
                }`}
                title={tab.desc}
              >
                <span className="text-xs">{tab.icon}</span>
                <span className="hidden xl:inline">{tab.label}</span>
                <span className="xl:inline hidden sm:hidden">{tab.shortLabel}</span>
                <span className="hidden sm:inline xl:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* 右側：功能工具箱與輔助設定按鈕 */}
      <div 
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        className="flex items-center gap-1.5"
      >
        {/* 🛠️ 分析工具箱下拉選單 (收納 5 大分析模組，徹底解決橫向 1660px 碰撞問題) */}
        <div className="relative" ref={toolsMenuRef}>
          <button
            onClick={() => setIsToolsOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-colors font-medium ${
              isToolsOpen
                ? 'bg-pro-hover text-white border-pro-border'
                : 'bg-pro-bg text-pro-muted hover:text-white hover:bg-pro-hover border-pro-border'
            }`}
            title="開啟進階金融分析工具清單"
          >
            <Wrench size={13} className="text-pro-accent" />
            <span className="font-semibold text-white hidden sm:inline">分析工具</span>
            <ChevronDown size={12} className={`transition-transform duration-150 ${isToolsOpen ? 'rotate-180 text-white' : ''}`} />
          </button>

          {/* 分析工具選單浮層 (無發光，純粹俐落深色彈窗) */}
          {isToolsOpen && (
            <div className="absolute right-0 top-9 w-48 bg-pro-panel border border-pro-border rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in space-y-1">
              <div className="text-[10px] font-bold text-pro-muted px-2 py-1 uppercase tracking-wider">
                策略與交易工具
              </div>

              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenScreener();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left"
              >
                <Filter size={14} className="text-blue-400" />
                <div className="flex flex-col">
                  <span className="font-semibold">智慧選股器</span>
                  <span className="text-[10px] text-pro-muted">多因子量化選股模型</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenBacktest();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left"
              >
                <BarChart3 size={14} className="text-purple-400" />
                <div className="flex flex-col">
                  <span className="font-semibold">策略回測中心</span>
                  <span className="text-[10px] text-pro-muted">均線/RSI歷史績效驗證</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenFundamentals();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left"
              >
                <Building2 size={14} className="text-emerald-400" />
                <div className="flex flex-col">
                  <span className="font-semibold">個股基本面</span>
                  <span className="text-[10px] text-pro-muted">財務指標與體質診斷</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenPaperTrading();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left"
              >
                <Wallet size={14} className="text-amber-400" />
                <div className="flex flex-col">
                  <span className="font-semibold">模擬交易沙盒</span>
                  <span className="text-[10px] text-pro-muted">無風險實戰下單演練</span>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsToolsOpen(false);
                  onOpenAlerts();
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left"
              >
                <Bell size={14} className="text-rose-400" />
                <div className="flex flex-col">
                  <span className="font-semibold">價格與指標預警</span>
                  <span className="text-[10px] text-pro-muted">到價推播與突破提醒</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 指標庫管理 */}
        <button
          onClick={onOpenIndicators}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-white bg-pro-bg hover:bg-pro-hover rounded-lg border border-pro-border transition-colors relative"
          title="技術指標庫管理 (快捷鍵: I)"
        >
          <SlidersHorizontal size={13} className="text-pro-accent" />
          <span className="hidden xl:inline font-medium">指標庫</span>
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-mono font-bold">
            {activeIndicatorsCount}
          </span>
        </button>

        {/* 小白百科全書 */}
        <button
          onClick={onOpenEducation}
          className="p-1.5 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors"
          title="新手技術指標生活化百科 (快捷鍵: ?)"
        >
          <BookOpen size={14} />
        </button>

        {/* 快捷鍵客製化中心 */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-pro-muted hover:text-white hover:bg-pro-hover rounded-lg border border-transparent hover:border-pro-border transition-colors"
          title="快捷鍵客製化中心 (快捷鍵: K)"
        >
          <Keyboard size={14} />
        </button>

        {/* 漲跌配色切換 */}
        <button
          onClick={onToggleColorTheme}
          className="flex items-center gap-1 px-2 py-1 text-xs text-pro-muted hover:text-white rounded-lg hover:bg-pro-hover border border-pro-border transition-colors"
          title="切換漲跌色彩習慣 (快捷鍵: C)"
        >
          <ArrowLeftRight size={13} />
          <span className="text-[11px] font-medium hidden sm:inline">
            {colorTheme === 'international' ? '綠漲' : '紅漲'}
          </span>
        </button>

        {/* 系統健康診斷 */}
        <button
          onClick={onOpenHealth}
          className="p-1.5 text-pro-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
          title="系統效能健康診斷"
        >
          <Activity size={14} />
        </button>

        {/* 全螢幕切換 */}
        <button
          onClick={toggleFullScreen}
          className="p-1.5 text-pro-muted hover:text-white hover:bg-pro-hover rounded-lg transition-colors hidden sm:block"
          title="切換全螢幕看盤模式 (快捷鍵: F)"
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </header>
  );
};
