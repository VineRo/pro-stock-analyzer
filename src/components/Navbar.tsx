import React, { useState, useRef, useEffect } from 'react';
import { 
  CandlestickChart, 
  BookOpen, 
  Activity, 
  ArrowLeftRight, 
  Filter,
  BarChart3,
  Wallet,
  Bell,
  Keyboard,
  ChevronDown,
  Wrench,
  Sparkles,
  RotateCw
} from 'lucide-react';
import { ColorTheme, MarketCategory } from '../types/stock';

interface NavbarProps {
  currentCategory: MarketCategory;
  onChangeCategory: (category: MarketCategory) => void;
  activeTab?: 'chart' | 'indices' | 'paper_trading';
  colorTheme: ColorTheme;
  onToggleColorTheme: () => void;
  onOpenEducation: () => void;
  onOpenHealth: () => void;
  onOpenShortcuts: () => void;
  onOpenScreener: () => void;
  onOpenBacktest: () => void;
  onOpenPaperTrading: () => void;
  onOpenAlerts: () => void;
  onOpenUpdate?: () => void;
  hasUpdateAvailable?: boolean;
  isUpdateDownloading?: boolean;
  updateVersion?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCategory,
  onChangeCategory,
  activeTab,
  colorTheme,
  onToggleColorTheme,
  onOpenEducation,
  onOpenHealth,
  onOpenShortcuts,
  onOpenScreener,
  onOpenBacktest,
  onOpenPaperTrading,
  onOpenAlerts,
  onOpenUpdate,
  hasUpdateAvailable,
  isUpdateDownloading,
  updateVersion,
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

  // 僅在 Electron 原生 macOS 視窗模式下為紅黃綠視窗控制項保留左側留白 (76px)；在純網頁環境下保持標準緊湊邊距
  const isMacElectron = typeof window !== 'undefined' && Boolean(
    window.electronAPI && window.electronAPI.platform === 'darwin'
  );

  // 核心分類分頁定義 (僅保留「股票幣圈」與「大盤指數」兩大核心模式，無發光特效、純淨高對比)
  const categoryTabs: { key: MarketCategory; label: string; shortLabel: string; icon: string; desc: string }[] = [
    { key: 'stocks_crypto', label: '股票幣圈', shortLabel: '股票幣圈', icon: '📊', desc: '台股、美股與虛擬貨幣即時 K 線技術圖表' },
    { key: 'indices', label: '大盤指數', shortLabel: '大盤指數', icon: '🌐', desc: '全球市場大盤即時深度看板' },
  ];

  return (
    <header 
      style={isMacElectron ? ({ WebkitAppRegion: 'drag' } as React.CSSProperties) : undefined}
      className={`relative h-11 bg-pro-panel border-b border-pro-border flex items-center justify-between pr-3 select-none z-50 text-pro-text shrink-0 ${
        isMacElectron ? 'pl-[76px]' : 'px-3'
      }`}
    >
      {/* 左側：品牌 Logo 與四大市場核心分頁導航 */}
      <div 
        style={isMacElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
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

        {/* 🌟 核心模式與即時工作台獨立切換按鈕組 (股票幣圈 / 大盤指數 / 回測中心 / 模擬交易，清晰明顯、純淨高對比) */}
        <nav className="flex items-center gap-1 bg-pro-bg p-1 rounded-xl border border-pro-border/80 shrink-0">
          {categoryTabs.map((tab) => {
            const isStocksCrypto = currentCategory === 'stocks_crypto' || currentCategory === 'domestic' || currentCategory === 'foreign' || currentCategory === 'crypto';
            const isActive = tab.key === 'stocks_crypto'
              ? (isStocksCrypto && activeTab !== 'paper_trading')
              : (currentCategory === 'indices' && activeTab === 'indices');
            return (
              <button
                key={tab.key}
                onClick={() => onChangeCategory(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-pro-muted hover:text-white hover:bg-pro-hover'
                }`}
                title={tab.desc}
              >
                <span className="text-xs">{tab.icon}</span>
                {/* 大螢幕顯示完整標籤，小螢幕自適應縮寫 */}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}

          <div className="h-4 w-[1px] bg-pro-border/80 mx-0.5 shrink-0" />

          {/* 📈 策略回測中心 (拆分獨立至大盤指數旁) */}
          <button
            onClick={onOpenBacktest}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-lg font-bold transition-all text-purple-300 hover:text-white hover:bg-purple-600/20 border border-purple-500/30 hover:border-purple-500/60 shadow-sm"
            title="策略回測中心：均線與 RSI 歷史量化回測與績效驗證"
          >
            <BarChart3 size={13} className="text-purple-400 shrink-0" />
            <span className="hidden sm:inline">回測中心</span>
            <span className="sm:hidden">回測</span>
          </button>

          {/* 💼 模擬交易 (拆分獨立至大盤指數旁，更名為純淨模擬交易) */}
          <button
            onClick={onOpenPaperTrading}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-lg font-bold transition-all border shadow-sm ${
              activeTab === 'paper_trading'
                ? 'bg-amber-600 text-white border-amber-500 shadow-sm'
                : 'text-amber-300 hover:text-white hover:bg-amber-600/20 border-amber-500/30 hover:border-amber-500/60'
            }`}
            title="模擬交易工作台：盤面真實撮合、委買賣五檔、多空比、分時走勢與 T+2 資金交割"
          >
            <Wallet size={13} className="text-amber-400 shrink-0" />
            <span className="hidden sm:inline">模擬交易</span>
            <span className="sm:hidden">模擬</span>
          </button>

          {/* 🛠️ 分析工具箱下拉選單 (移至模擬交易旁邊，z-[100] 徹底防覆蓋) */}
          <div className="relative" ref={toolsMenuRef}>
            <button
              onClick={() => setIsToolsOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs rounded-lg border transition-all font-bold shadow-sm ${
                isToolsOpen
                  ? 'bg-blue-600/25 text-blue-300 border-blue-500/60'
                  : 'text-slate-300 hover:text-white hover:bg-pro-hover border-pro-border'
              }`}
              title="開啟進階金融分析工具清單"
            >
              <Wrench size={13} className="text-pro-accent shrink-0" />
              <span className="font-bold hidden sm:inline">分析工具</span>
              <span className="sm:hidden">分析</span>
              <ChevronDown size={12} className={`transition-transform duration-150 ${isToolsOpen ? 'rotate-180 text-white' : ''}`} />
            </button>

            {/* 分析工具選單浮層 (防重疊：top-full + z-[100]) */}
            {isToolsOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-48 bg-pro-panel border border-pro-border rounded-xl shadow-2xl p-1.5 z-[100] animate-in fade-in space-y-1">
                <div className="text-[10px] font-bold text-pro-muted px-2 py-1 uppercase tracking-wider">
                  策略與監控工具
                </div>

                <button
                  onClick={() => {
                    setIsToolsOpen(false);
                    onOpenScreener();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left cursor-pointer"
                >
                  <Filter size={14} className="text-blue-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold">智慧選股器</span>
                    <span className="text-[10px] text-pro-muted">多因子量化選股模型</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsToolsOpen(false);
                    onOpenAlerts();
                  }}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-white hover:bg-pro-hover transition-colors text-left cursor-pointer"
                >
                  <Bell size={14} className="text-rose-400 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold">價格與指標預警</span>
                    <span className="text-[10px] text-pro-muted">到價推播與突破提醒</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* 右側：功能工具箱與輔助設定按鈕 */}
      <div 
        style={isMacElectron ? ({ WebkitAppRegion: 'no-drag' } as React.CSSProperties) : undefined}
        className="flex items-center gap-1.5"
      >

        {/* 技術指標觀念指南 */}
        <button
          onClick={onOpenEducation}
          className="p-1.5 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg border border-amber-500/30 transition-colors"
          title="技術指標指南 (快捷鍵: ?)"
        >
          <BookOpen size={14} />
        </button>

        {/* 快捷鍵設定 */}
        <button
          onClick={onOpenShortcuts}
          className="p-1.5 text-pro-muted hover:text-white hover:bg-pro-hover rounded-lg border border-transparent hover:border-pro-border transition-colors"
          title="快捷鍵設定 (快捷鍵: K)"
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

        {/* 軟體升級與安全發布中心 */}
        {hasUpdateAvailable ? (
          <button
            onClick={onOpenUpdate}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg border border-emerald-500/40 transition-all shadow-sm shadow-emerald-500/20 animate-pulse"
            title={`官方發布新版本 v${updateVersion || ''}，點擊立即更新`}
          >
            <Sparkles size={13} className="text-emerald-400" />
            <span className="text-[11px] font-bold">新版本 v{updateVersion}</span>
          </button>
        ) : isUpdateDownloading ? (
          <button
            onClick={onOpenUpdate}
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-blue-300 bg-blue-500/20 rounded-lg border border-blue-500/40"
            title="更新檔案下載中..."
          >
            <RotateCw size={13} className="animate-spin text-pro-accent" />
            <span className="text-[11px] font-medium hidden sm:inline">下載中</span>
          </button>
        ) : (
          <button
            onClick={onOpenUpdate}
            className="p-1.5 text-pro-muted hover:text-white hover:bg-pro-hover rounded-lg border border-transparent hover:border-pro-border transition-colors"
            title="軟體升級與安全中心"
          >
            <Sparkles size={14} />
          </button>
        )}

        {/* 系統健康診斷 */}
        <button
          onClick={onOpenHealth}
          className="p-1.5 text-pro-muted hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
          title="系統效能健康診斷"
        >
          <Activity size={14} />
        </button>
      </div>
    </header>
  );
};
