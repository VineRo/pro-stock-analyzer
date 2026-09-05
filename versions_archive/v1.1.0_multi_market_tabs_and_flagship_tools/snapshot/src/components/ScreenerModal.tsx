import React, { useState, useMemo } from 'react';
import { X, Filter, Sparkles, TrendingUp, Search, ArrowRight } from 'lucide-react';
import { StockSymbol } from '../types/stock';
import { FUNDAMENTAL_DATA_MAP } from '../data/stockService';
import { STOCK_DIRECTORY, SearchScope } from '../data/stockDirectory';
import { formatPrice, getMarketInfo } from '../utils/formatters';

interface ScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: StockSymbol) => void;
  colorTheme: 'international' | 'asia';
}

export const ScreenerModal: React.FC<ScreenerModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  colorTheme,
}) => {
  const [filterTrend, setFilterTrend] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [filterRsiOversold, setFilterRsiOversold] = useState(false);
  const [filterHighGrowth, setFilterHighGrowth] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 根據條件篩選股票
  const filteredStocks = useMemo(() => {
    return STOCK_DIRECTORY.filter((stock) => {
      // 分類過濾：全部 / 國內 (台股) / 國外 (美股)
      if (searchScope === 'DOMESTIC' && stock.market !== 'TW') return false;
      if (searchScope === 'FOREIGN' && stock.market === 'TW') return false;

      // 搜尋關鍵字：代號、中文名、英文名、別名
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchSymbol = stock.symbol.toLowerCase().includes(query);
        const matchName = stock.name.toLowerCase().includes(query);
        const matchAlias = stock.aliases?.some((a) => a.toLowerCase().includes(query));
        const matchSector = stock.sector ? stock.sector.toLowerCase().includes(query) : false;
        if (!matchSymbol && !matchName && !matchAlias && !matchSector) return false;
      }

      if (filterTrend === 'bullish' && stock.changePercent < 0) return false;
      if (filterTrend === 'bearish' && stock.changePercent > 0) return false;

      const fundamental = FUNDAMENTAL_DATA_MAP[stock.symbol];
      if (filterHighGrowth && (!fundamental || fundamental.revenueGrowthYoY < 15)) {
        return false;
      }

      if (filterRsiOversold && stock.changePercent > -1.0) {
        return false;
      }

      return true;
    });
  }, [searchScope, searchQuery, filterTrend, filterHighGrowth, filterRsiOversold]);

  if (!isOpen) return null;

  const isGreenUp = colorTheme === 'international';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-pro-panel border border-pro-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden text-pro-text">
        {/* 頂部 Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                智慧選股與策略掃描器 (Screener)
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  即時掃描
                </span>
              </h2>
              <p className="text-xs text-pro-muted">結合多維度技術指標、量能爆發與基本面體質進行自動篩選</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-pro-border text-pro-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 篩選條件工具列 */}
        <div className="p-5 border-b border-pro-border bg-pro-panel/50 flex flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 搜尋框 */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-pro-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋代碼或名稱 (例如 AAPL, 台積電)..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-pro-bg border border-pro-border rounded-lg text-white placeholder-pro-muted focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 三大市場分類標籤切換 */}
            <div className="flex rounded-lg bg-pro-bg p-1 border border-pro-border text-xs">
              <button
                onClick={() => setSearchScope('ALL')}
                className={`px-3 py-1 rounded transition-colors ${
                  searchScope === 'ALL' ? 'bg-blue-600 text-white font-medium' : 'text-pro-muted hover:text-white'
                }`}
              >
                全部 (國內外)
              </button>
              <button
                onClick={() => setSearchScope('DOMESTIC')}
                className={`px-3 py-1 rounded transition-colors ${
                  searchScope === 'DOMESTIC' ? 'bg-emerald-600 text-white font-medium' : 'text-pro-muted hover:text-white'
                }`}
              >
                國內 (台股)
              </button>
              <button
                onClick={() => setSearchScope('FOREIGN')}
                className={`px-3 py-1 rounded transition-colors ${
                  searchScope === 'FOREIGN' ? 'bg-purple-600 text-white font-medium' : 'text-pro-muted hover:text-white'
                }`}
              >
                國外 (美股)
              </button>
            </div>
          </div>

          {/* 策略條件過濾器按鈕 */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-pro-muted flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              精選策略：
            </span>

            <button
              onClick={() => setFilterTrend((prev) => (prev === 'bullish' ? 'all' : 'bullish'))}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                filterTrend === 'bullish'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium'
                  : 'bg-pro-bg border-pro-border text-pro-muted hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              多頭向上突破
            </button>

            <button
              onClick={() => setFilterHighGrowth((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                filterHighGrowth
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-medium'
                  : 'bg-pro-bg border-pro-border text-pro-muted hover:text-white'
              }`}
            >
              營收高成長 (&gt;15%)
            </button>

            <button
              onClick={() => setFilterRsiOversold((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5 ${
                filterRsiOversold
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium'
                  : 'bg-pro-bg border-pro-border text-pro-muted hover:text-white'
              }`}
            >
              超賣反彈機會 (RSI 築底)
            </button>
          </div>
        </div>

        {/* 篩選結果列表 */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center justify-between mb-3 text-xs text-pro-muted">
            <span>找到 {filteredStocks.length} 檔符合條件之標的</span>
            <span>點擊任意標的立即跳轉專業分析圖表</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredStocks.map((stock) => {
              const fundamental = FUNDAMENTAL_DATA_MAP[stock.symbol];
              const isPositive = stock.change >= 0;
              const colorClass = isPositive
                ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                : isGreenUp ? 'text-rose-400' : 'text-emerald-400';
              const bgBadgeClass = isPositive
                ? isGreenUp ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'
                : isGreenUp ? 'bg-rose-500/10 border-rose-500/30' : 'bg-emerald-500/10 border-emerald-500/30';

              return (
                <div
                  key={stock.symbol}
                  onClick={() => {
                    onSelectSymbol(stock);
                    onClose();
                  }}
                  className="group bg-pro-bg border border-pro-border hover:border-blue-500/60 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-blue-500/5 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                          {stock.symbol}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${getMarketInfo(stock.market).badgeClass}`}>
                          {getMarketInfo(stock.market).label}
                        </span>
                      </div>
                      <div className="text-xs text-pro-muted mt-0.5">{stock.name}</div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-white font-mono">
                        {formatPrice(stock.price, stock.currency)}
                      </div>
                      <div className={`text-xs font-semibold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${colorClass} ${bgBadgeClass}`}>
                        {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  {/* 基本面指標標籤 */}
                  {fundamental && (
                    <div className="mt-3 pt-2.5 border-t border-pro-border/60 flex items-center justify-between text-[11px] text-pro-muted">
                      <div>
                        本益比 PE: <span className="text-white font-medium">{fundamental.peRatio}x</span>
                      </div>
                      <div>
                        營收 YoY: <span className={fundamental.revenueGrowthYoY >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {fundamental.revenueGrowthYoY > 0 ? '+' : ''}{fundamental.revenueGrowthYoY}%
                        </span>
                      </div>
                      <div>
                        體質評分:{' '}
                        <span className="text-yellow-400 font-bold">
                          {fundamental.healthScore}分
                        </span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredStocks.length === 0 && (
              <div className="col-span-2 py-12 text-center text-pro-muted">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>目前沒有符合所選條件的股票</p>
                <p className="text-xs mt-1">請嘗試放寬篩選條件或清空搜尋字詞</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
