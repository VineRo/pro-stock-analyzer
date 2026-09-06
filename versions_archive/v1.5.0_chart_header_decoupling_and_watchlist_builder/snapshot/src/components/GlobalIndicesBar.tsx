import React from 'react';
import { TrendingUp, TrendingDown, Globe, ExternalLink } from 'lucide-react';
import { ColorTheme, StockSymbol } from '../types/stock';
import { GLOBAL_BENCHMARK_INDICES } from '../data/stockDirectory';

interface GlobalIndicesBarProps {
  currentSymbol: StockSymbol;
  onSelectSymbol: (symbol: StockSymbol) => void;
  colorTheme: ColorTheme;
  onOpenGlobalIndicesPage?: () => void;
}

export const GlobalIndicesBar: React.FC<GlobalIndicesBarProps> = ({
  currentSymbol,
  onSelectSymbol,
  colorTheme,
  onOpenGlobalIndicesPage,
}) => {
  const isGreenUp = colorTheme === 'international';

  // 國旗與簡稱映射
  const getIndexFlag = (symbol: string) => {
    switch (symbol) {
      case '^TWII': return '🇹🇼';
      case '^TWOII': return '🇹🇼';
      case '^N225': return '🇯🇵';
      case '^TOPX': return '🇯🇵';
      case '^KS11': return '🇰🇷';
      case '^KQ11': return '🇰🇷';
      case '000001.SS': return '🇨🇳';
      case '000300.SS': return '🇨🇳';
      case '399001.SZ': return '🇨🇳';
      case '^HSI': return '🇭🇰';
      case '^HSTECH': return '🇭🇰';
      case 'SPY': return '🇺🇸';
      case 'QQQ': return '🇺🇸';
      case 'DIA': return '🇺🇸';
      case 'SOXX': return '🇺🇸';
      case '^GDAXI': return '🇩🇪';
      case '^FTSE': return '🇬🇧';
      case '^FCHI': return '🇫🇷';
      default: return '🌐';
    }
  };

  const getShortName = (symbol: string) => {
    switch (symbol) {
      case '^TWII': return '台股加權';
      case '^TWOII': return '台灣櫃買';
      case '^N225': return '日經 225';
      case '^TOPX': return '日本東證';
      case '^KS11': return '韓國 KOSPI';
      case '^KQ11': return '韓國科斯達克';
      case '000001.SS': return '上證指數';
      case '000300.SS': return '滬深 300';
      case '399001.SZ': return '深證成指';
      case '^HSI': return '香港恆生';
      case '^HSTECH': return '恆生科技';
      case 'SPY': return '美股標普';
      case 'QQQ': return '美股那指';
      case 'DIA': return '道瓊工業';
      case 'SOXX': return '費城半導體';
      case '^GDAXI': return '德國 DAX';
      case '^FTSE': return '英國富時';
      case '^FCHI': return '法國 CAC';
      default: return symbol;
    }
  };

  return (
    <div className="h-8 bg-pro-panel border-b border-pro-border flex items-center px-3 select-none overflow-x-auto no-scrollbar gap-2 text-xs shrink-0 z-20">
      <div className="flex items-center gap-2 text-[11px] font-bold text-pro-muted shrink-0 pr-2 border-r border-pro-border/80">
        <div className="flex items-center gap-1">
          <Globe size={13} className="text-blue-400" />
          <span className="hidden sm:inline">全球大盤指數</span>
        </div>
        {onOpenGlobalIndicesPage && (
          <button
            onClick={onOpenGlobalIndicesPage}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-600/25 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 text-[10px] font-medium transition-all shadow-sm"
            title="開啟全球大盤即時深度對比分頁"
          >
            <span>深度對比看板</span>
            <ExternalLink size={10} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {GLOBAL_BENCHMARK_INDICES.map((index) => {
          const isSelected = currentSymbol.symbol === index.symbol;
          const isUp = index.change >= 0;
          const changeColor = isUp
            ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
            : isGreenUp ? 'text-rose-400' : 'text-emerald-400';

          return (
            <button
              key={index.symbol}
              onClick={() => onSelectSymbol(index)}
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all shrink-0 font-mono text-[11px] ${
                isSelected
                  ? 'bg-blue-600/25 border-blue-500 text-white font-bold shadow-sm'
                  : 'bg-pro-bg/60 border-pro-border/70 text-pro-muted hover:text-white hover:border-gray-500'
              }`}
              title={`點擊切換查看 ${index.name}`}
            >
              <span>{getIndexFlag(index.symbol)}</span>
              <span className="font-sans font-medium text-white">{getShortName(index.symbol)}</span>
              <span className="font-bold text-white">
                {index.price >= 1000 ? index.price.toLocaleString() : index.price.toFixed(2)}
              </span>
              <span className={`inline-flex items-center gap-0.5 text-[10px] ${changeColor}`}>
                {isUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {isUp ? '+' : ''}{index.changePercent.toFixed(2)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
