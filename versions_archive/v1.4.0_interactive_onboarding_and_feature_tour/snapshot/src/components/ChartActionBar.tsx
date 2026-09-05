import React from 'react';
import { 
  BarChart2, 
  Columns, 
  Star, 
  Clock, 
  Wifi, 
  Maximize,
  TrendingUp,
  TrendingDown,
  Search
} from 'lucide-react';
import { ColorTheme, DataStatus, Period, StockSymbol } from '../types/stock';
import { formatPrice, getMarketInfo } from '../utils/formatters';

interface ChartActionBarProps {
  currentSymbol: StockSymbol;
  period: Period;
  onChangePeriod: (period: Period) => void;
  colorTheme: ColorTheme;
  dataStatus: DataStatus;
  isAdjusted: boolean;
  onToggleAdjusted: () => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  showVolumeProfile: boolean;
  onToggleVolumeProfile: () => void;
  showSMC?: boolean;
  onToggleSMC?: () => void;
  isDualSplit: boolean;
  onToggleDualSplit: () => void;
  onResetChartScale?: () => void;
  onOpenSearch?: () => void;
}

export const ChartActionBar: React.FC<ChartActionBarProps> = ({
  currentSymbol,
  period,
  onChangePeriod,
  colorTheme,
  dataStatus,
  isAdjusted,
  onToggleAdjusted,
  isInWatchlist,
  onToggleWatchlist,
  showVolumeProfile,
  onToggleVolumeProfile,
  showSMC = false,
  onToggleSMC,
  isDualSplit,
  onToggleDualSplit,
  onResetChartScale,
  onOpenSearch,
}) => {
  const periods: { key: Period; label: string; shortcut: string }[] = [
    { key: '1m', label: '1分', shortcut: '1' },
    { key: '5m', label: '5分', shortcut: '5' },
    { key: '15m', label: '15分', shortcut: '3' },
    { key: '1h', label: '1小時', shortcut: '6' },
    { key: '1D', label: '日K', shortcut: 'D' },
    { key: '1W', label: '週K', shortcut: 'W' },
  ];

  const isUp = currentSymbol.change >= 0;
  const getChangeColorClass = () => {
    if (colorTheme === 'international') {
      return isUp 
        ? 'text-pro-up bg-emerald-500/10 border-emerald-500/30' 
        : 'text-pro-down bg-rose-500/10 border-rose-500/30';
    } else {
      return isUp 
        ? 'text-pro-down bg-rose-500/10 border-rose-500/30' 
        : 'text-pro-up bg-emerald-500/10 border-emerald-500/30';
    }
  };

  return (
    <div className="h-10 bg-pro-bg border-b border-pro-border flex items-center justify-between px-2.5 sm:px-3 select-none text-pro-text text-xs shrink-0 z-20 min-w-0 overflow-x-auto no-scrollbar">
      {/* 左側：醒目標的身份卡片、等寬大字價格、漲跌幅、自選、連線狀態 */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
        {/* 核心標的識別卡 (高對比深色面板 + 大字粗體代號 + 清晰粗體名稱 + 市場標籤，絕無發光特效) */}
        <div 
          onClick={onOpenSearch}
          className={`flex items-center gap-2 bg-[#1e222d] border border-[#363a45] px-2.5 py-1 rounded-md shrink-0 transition-colors shadow-sm ${
            onOpenSearch ? 'cursor-pointer hover:bg-[#252a37] hover:border-slate-500' : ''
          }`}
          title="當前查看股票標的 (點擊快速開啟搜尋更換標的，快捷鍵 [/])"
        >
          {/* 股票代號：加大、粗體、高對比等寬字元 */}
          <span className="font-black text-sm sm:text-base text-white font-mono tracking-wider">
            {currentSymbol.symbol}
          </span>

          {/* 股票名稱：粗體、明亮清晰、全尺寸可見 (移除 hidden 限制) */}
          <span className="font-extrabold text-xs sm:text-sm text-slate-100 max-w-[110px] sm:max-w-[200px] truncate">
            {currentSymbol.name}
          </span>

          {/* 市場別標籤 */}
          <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold border ${getMarketInfo(currentSymbol.market).badgeClass}`}>
            {getMarketInfo(currentSymbol.market).label}
          </span>

          {onOpenSearch && (
            <Search size={12} className="text-slate-400 hover:text-white transition-colors ml-0.5" />
          )}
        </div>

        {/* 等寬實時大字現價 */}
        <span className="text-sm sm:text-base font-bold font-mono financial-number text-white ml-0.5 shrink-0">
          {formatPrice(currentSymbol.price, currentSymbol.currency)}
        </span>

        {/* 漲跌幅標籤 */}
        <span className={`text-xs font-mono financial-number font-bold px-1.5 sm:px-2 py-0.5 rounded border inline-flex items-center gap-0.5 shrink-0 ${getChangeColorClass()}`}>
          {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span className="hidden sm:inline">{isUp ? '+' : ''}{currentSymbol.change.toFixed(2)}</span>
          <span>({isUp ? '+' : ''}{currentSymbol.changePercent.toFixed(2)}%)</span>
        </span>

        {/* 加入/移除自選按鈕 */}
        {onToggleWatchlist && (
          <button
            onClick={onToggleWatchlist}
            className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[11px] font-medium rounded border transition-colors shrink-0 ${
              isInWatchlist
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-pro-panel text-pro-muted border-pro-border hover:text-white hover:border-gray-500'
            }`}
            title={isInWatchlist ? '已在自選清單中 (點擊移除)' : '加入目前自選清單'}
          >
            <Star size={12} className={isInWatchlist ? 'fill-amber-400 text-amber-400' : ''} />
            <span className="hidden xl:inline">{isInWatchlist ? '已自選' : '+ 自選'}</span>
          </button>
        )}

        {/* 數據來源連線狀態膠囊 */}
        <div
          className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${
            dataStatus === 'live'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : dataStatus === 'cache'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
          }`}
          title={dataStatus === 'live' ? '已連線至即時市場數據' : dataStatus === 'cache' ? '讀取本地快取數據' : '離線高擬真金融數據'}
        >
          {dataStatus === 'live' ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden sm:inline">即時</span>
            </>
          ) : dataStatus === 'cache' ? (
            <>
              <Clock size={11} className="text-amber-400" />
              <span className="hidden sm:inline">快取</span>
            </>
          ) : (
            <>
              <Wifi size={11} className="text-blue-400" />
              <span className="hidden sm:inline">離線</span>
            </>
          )}
        </div>

        {/* 除權息還原切換 */}
        <button
          onClick={onToggleAdjusted}
          className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors shrink-0 ${
            isAdjusted
              ? 'bg-blue-600 border-blue-500 text-white font-semibold'
              : 'bg-pro-panel border-pro-border text-pro-muted hover:text-white'
          }`}
          title="切換除權息還原價格 (Adjusted Close)"
        >
          {isAdjusted ? '已還原' : '未還原'}
        </button>
      </div>

      {/* 中間：時間週期選擇群組 */}
      <div className="flex items-center bg-pro-panel rounded-lg p-0.5 border border-pro-border shrink-0 mx-1">
        {periods.map((p) => {
          const isActive = period === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onChangePeriod(p.key)}
              className={`px-1.5 sm:px-2 py-0.5 text-xs rounded transition-all font-medium flex items-center gap-1 ${
                isActive
                  ? 'bg-pro-hover text-white font-bold border border-white/20'
                  : 'text-pro-muted hover:text-white hover:bg-white/5'
              }`}
              title={`切換為 ${p.label} (快捷鍵: ${p.shortcut})`}
            >
              <span>{p.label}</span>
              <span className={`text-[10px] font-mono opacity-50 hidden 2xl:inline ${isActive ? 'text-pro-accent' : ''}`}>
                {p.shortcut}
              </span>
            </button>
          );
        })}
      </div>

      {/* 右側：圖表輔助功能 (籌碼分佈 VP、雙屏分時對比、重置比例) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 籌碼分佈開關 (無發光，簡潔高對比按鈕) */}
        <button
          onClick={onToggleVolumeProfile}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
            showVolumeProfile
              ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
              : 'bg-pro-panel border-pro-border text-pro-muted hover:text-white hover:border-gray-500'
          }`}
          title="開啟/關閉 籌碼成交量分佈圖 (Volume Profile)"
        >
          <BarChart2 size={13} className="text-amber-400" />
          <span className="hidden xl:inline">籌碼分佈 (VP)</span>
          <span className="xl:hidden">VP</span>
        </button>

        {/* SMC 機構訂單流/價值失衡區開關 */}
        {onToggleSMC && (
          <button
            onClick={onToggleSMC}
            className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showSMC
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                : 'bg-pro-panel border-pro-border text-pro-muted hover:text-white hover:border-gray-500'
            }`}
            title="開啟/關閉 SMC 機構訂單流 (Fair Value Gaps 價值失衡區 & 機構訂單塊)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="hidden xl:inline">SMC 機構訂單流</span>
            <span className="xl:hidden">SMC</span>
          </button>
        )}

        {/* 雙屏對比開關 */}
        <button
          onClick={onToggleDualSplit}
          className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
            isDualSplit
              ? 'bg-blue-600 border-blue-500 text-white font-bold'
              : 'bg-pro-panel border-pro-border text-pro-muted hover:text-white hover:border-gray-500'
          }`}
          title="多週期同屏對比視圖"
        >
          <Columns size={13} className="text-blue-400" />
          <span className="hidden sm:inline">{isDualSplit ? '關閉雙屏' : '雙屏分時'}</span>
          <span className="sm:hidden">{isDualSplit ? '單屏' : '雙屏'}</span>
        </button>

        {/* 重置視圖按鈕 */}
        {onResetChartScale && (
          <button
            onClick={onResetChartScale}
            className="p-1 text-pro-muted hover:text-white hover:bg-pro-hover rounded border border-transparent hover:border-pro-border transition-colors hidden xl:block"
            title="雙擊畫布亦可重置至最適合視角"
          >
            <Maximize size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
