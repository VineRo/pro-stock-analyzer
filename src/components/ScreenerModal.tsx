import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Filter, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  ArrowRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Table, 
  LayoutGrid, 
  RotateCcw, 
  SlidersHorizontal, 
  ChevronDown, 
  ChevronUp, 
  Activity, 
  Building2, 
  ShieldCheck, 
  Zap
} from 'lucide-react';
import { StockSymbol } from '../types/stock';
import { getFundamentalData } from '../data/stockService';
import { STOCK_DIRECTORY, DirectoryStock, SearchScope } from '../data/stockDirectory';
import { formatPrice, getMarketInfo } from '../utils/formatters';

interface ScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: StockSymbol) => void;
  colorTheme: 'international' | 'asia';
}

type SortColumn = 
  | 'symbol' 
  | 'price' 
  | 'changePercent' 
  | 'rsi' 
  | 'peRatio' 
  | 'dividendYield' 
  | 'revenueGrowthYoY' 
  | 'healthScore';

type SortDirection = 'asc' | 'desc' | null;

interface EnrichedScreenerStock extends DirectoryStock {
  rsi: number;
  maTrend: 'bullish' | 'above_ma20' | 'above_ma60' | 'bearish' | 'neutral';
  macdSignal: 'golden_cross' | 'red_hist' | 'death_cross' | 'neutral';
  bollingerSignal: 'upper_break' | 'squeeze' | 'lower_touch' | 'neutral';
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  revenueGrowthYoY: number;
  healthScore: number;
  analystConsensus: string;
}

export const ScreenerModal: React.FC<ScreenerModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  colorTheme,
}) => {
  // 1. 搜尋與市場範圍
  const [searchScope, setSearchScope] = useState<SearchScope>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('ALL');

  // 2. 技術指標條件自訂
  const [filterTrend, setFilterTrend] = useState<string>('ALL');
  const [filterRsi, setFilterRsi] = useState<string>('ALL');
  const [filterMacd, setFilterMacd] = useState<string>('ALL');
  const [filterBollinger, setFilterBollinger] = useState<string>('ALL');
  const [filterChange, setFilterChange] = useState<string>('ALL');

  // 3. 基本面與估值條件自訂
  const [filterPe, setFilterPe] = useState<string>('ALL');
  const [filterDividend, setFilterDividend] = useState<string>('ALL');
  const [filterGrowth, setFilterGrowth] = useState<string>('ALL');
  const [filterHealth, setFilterHealth] = useState<string>('ALL');

  // 4. 視圖模式 (TradingView 數據表格總表 vs 診斷卡片視圖)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  // 5. 排序狀態
  const [sortColumn, setSortColumn] = useState<SortColumn>('changePercent');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 6. 條件面板折疊/展開
  const [isFilterPanelExpanded, setIsFilterPanelExpanded] = useState<boolean>(true);

  // 鍵盤 Esc 快捷關閉
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 動態抽取所有產業清單
  const availableSectors = useMemo(() => {
    const set = new Set<string>();
    STOCK_DIRECTORY.forEach((s) => {
      if (s.sector) set.add(s.sector);
    });
    return Array.from(set).sort();
  }, []);

  // 預先豐富化所有標的（技術面與基本面確定性數據，零跳動）
  const enrichedStocks = useMemo<EnrichedScreenerStock[]>(() => {
    return STOCK_DIRECTORY.map((stock) => {
      const fd = getFundamentalData(stock.symbol, stock.price);
      const hash = stock.symbol.split('').reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
      
      // 確定性推導 RSI
      const rsiBase = Math.round(50 + stock.changePercent * 3.5 + ((hash % 21) - 10));
      const rsi = Math.min(88, Math.max(18, rsiBase));

      // 均線排列
      let maTrend: EnrichedScreenerStock['maTrend'] = 'neutral';
      if (stock.changePercent >= 1.5 && rsi > 54) {
        maTrend = 'bullish';
      } else if (stock.changePercent >= 0 && rsi >= 48) {
        maTrend = 'above_ma20';
      } else if (stock.changePercent >= -0.8 && rsi >= 42) {
        maTrend = 'above_ma60';
      } else if (stock.changePercent <= -1.8 && rsi < 44) {
        maTrend = 'bearish';
      }

      // MACD 訊號
      let macdSignal: EnrichedScreenerStock['macdSignal'] = 'neutral';
      if ((hash % 4 === 0) || (stock.changePercent > 1.2 && rsi > 55)) {
        macdSignal = 'golden_cross';
      } else if ((hash % 3 === 0) || (stock.changePercent > 0.2)) {
        macdSignal = 'red_hist';
      } else if (stock.changePercent < -1.5 || rsi < 40) {
        macdSignal = 'death_cross';
      }

      // 布林通道訊號
      let bollingerSignal: EnrichedScreenerStock['bollingerSignal'] = 'neutral';
      if (stock.changePercent > 2.5 || (rsi > 70 && hash % 2 === 0)) {
        bollingerSignal = 'upper_break';
      } else if (stock.changePercent < -2.5 || rsi < 32) {
        bollingerSignal = 'lower_touch';
      } else if (hash % 5 === 0) {
        bollingerSignal = 'squeeze';
      }

      return {
        ...stock,
        rsi,
        maTrend,
        macdSignal,
        bollingerSignal,
        peRatio: fd.peRatio,
        pbRatio: fd.pbRatio,
        dividendYield: fd.dividendYield,
        revenueGrowthYoY: fd.revenueGrowthYoY,
        healthScore: fd.healthScore,
        analystConsensus: fd.analystConsensus,
      };
    });
  }, []);

  // 重設所有條件
  const handleResetFilters = () => {
    setSearchScope('ALL');
    setSearchQuery('');
    setSelectedSector('ALL');
    setFilterTrend('ALL');
    setFilterRsi('ALL');
    setFilterMacd('ALL');
    setFilterBollinger('ALL');
    setFilterChange('ALL');
    setFilterPe('ALL');
    setFilterDividend('ALL');
    setFilterGrowth('ALL');
    setFilterHealth('ALL');
  };

  // 計算已啟用的自訂條件數
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchScope !== 'ALL') count++;
    if (selectedSector !== 'ALL') count++;
    if (searchQuery.trim() !== '') count++;
    if (filterTrend !== 'ALL') count++;
    if (filterRsi !== 'ALL') count++;
    if (filterMacd !== 'ALL') count++;
    if (filterBollinger !== 'ALL') count++;
    if (filterChange !== 'ALL') count++;
    if (filterPe !== 'ALL') count++;
    if (filterDividend !== 'ALL') count++;
    if (filterGrowth !== 'ALL') count++;
    if (filterHealth !== 'ALL') count++;
    return count;
  }, [
    searchScope,
    selectedSector,
    searchQuery,
    filterTrend,
    filterRsi,
    filterMacd,
    filterBollinger,
    filterChange,
    filterPe,
    filterDividend,
    filterGrowth,
    filterHealth,
  ]);

  // 快速策略模板 (TradingView 經典一鍵套用)
  const applyPreset = (preset: 'breakout' | 'dividend' | 'bullish' | 'oversold' | 'bluechip' | 'bollinger') => {
    handleResetFilters();
    switch (preset) {
      case 'breakout':
        setFilterTrend('above_ma20');
        setFilterRsi('strong');
        setFilterGrowth('steady');
        break;
      case 'dividend':
        setFilterDividend('high');
        setFilterPe('under15');
        setFilterHealth('good');
        break;
      case 'bullish':
        setFilterTrend('bullish');
        setFilterChange('mild_up');
        setFilterHealth('good');
        break;
      case 'oversold':
        setFilterRsi('oversold');
        setFilterHealth('pass');
        break;
      case 'bluechip':
        setFilterHealth('excellent');
        setFilterGrowth('positive');
        break;
      case 'bollinger':
        setFilterBollinger('upper_break');
        setFilterChange('strong_up');
        break;
    }
  };

  // 執行即時過濾
  const filteredStocks = useMemo(() => {
    return enrichedStocks.filter((stock) => {
      // 1. 市場分類
      if (searchScope === 'DOMESTIC' && stock.market !== 'TW') return false;
      if (searchScope === 'FOREIGN' && stock.market !== 'US') return false;
      if (searchScope === 'CRYPTO' && stock.market !== 'CRYPTO') return false;
      if (searchScope === 'INDICES' && !stock.isIndex) return false;

      // 2. 產業別
      if (selectedSector !== 'ALL' && stock.sector !== selectedSector) return false;

      // 3. 搜尋字詞 (代號、名稱、別名、產業)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchSymbol = stock.symbol.toLowerCase().includes(query);
        const matchName = stock.name.toLowerCase().includes(query);
        const matchAlias = stock.aliases?.some((a) => a.toLowerCase().includes(query));
        const matchSector = stock.sector ? stock.sector.toLowerCase().includes(query) : false;
        if (!matchSymbol && !matchName && !matchAlias && !matchSector) return false;
      }

      // 4. 技術面：均線排列
      if (filterTrend !== 'ALL' && stock.maTrend !== filterTrend) return false;

      // 5. 技術面：RSI
      if (filterRsi === 'oversold' && stock.rsi >= 35) return false;
      if (filterRsi === 'neutral' && (stock.rsi < 35 || stock.rsi > 55)) return false;
      if (filterRsi === 'strong' && (stock.rsi < 55 || stock.rsi > 70)) return false;
      if (filterRsi === 'overbought' && stock.rsi <= 70) return false;

      // 6. 技術面：MACD
      if (filterMacd !== 'ALL' && stock.macdSignal !== filterMacd) return false;

      // 7. 技術面：布林通道
      if (filterBollinger !== 'ALL' && stock.bollingerSignal !== filterBollinger) return false;

      // 8. 技術面：漲跌幅
      if (filterChange === 'strong_up' && stock.changePercent < 3.0) return false;
      if (filterChange === 'mild_up' && (stock.changePercent <= 0 || stock.changePercent >= 3.0)) return false;
      if (filterChange === 'flat' && (stock.changePercent < -1.0 || stock.changePercent > 1.0)) return false;
      if (filterChange === 'down' && (stock.changePercent >= 0 || stock.changePercent < -3.0)) return false;
      if (filterChange === 'crash' && stock.changePercent >= -3.0) return false;

      // 9. 基本面：本益比 PE
      if (filterPe === 'under15' && stock.peRatio >= 15) return false;
      if (filterPe === 'between15_25' && (stock.peRatio < 15 || stock.peRatio > 25)) return false;
      if (filterPe === 'above25' && stock.peRatio <= 25) return false;

      // 10. 基本面：現金殖利率
      if (filterDividend === 'high' && stock.dividendYield < 5.0) return false;
      if (filterDividend === 'medium' && (stock.dividendYield < 3.0 || stock.dividendYield >= 5.0)) return false;
      if (filterDividend === 'none' && stock.dividendYield >= 3.0) return false;

      // 11. 基本面：營收 YoY 成長
      if (filterGrowth === 'explosive' && stock.revenueGrowthYoY < 30) return false;
      if (filterGrowth === 'steady' && stock.revenueGrowthYoY < 15) return false;
      if (filterGrowth === 'positive' && stock.revenueGrowthYoY <= 0) return false;

      // 12. 基本面：體質評分
      if (filterHealth === 'excellent' && stock.healthScore < 85) return false;
      if (filterHealth === 'good' && stock.healthScore < 75) return false;
      if (filterHealth === 'pass' && stock.healthScore < 60) return false;

      return true;
    });
  }, [
    enrichedStocks,
    searchScope,
    selectedSector,
    searchQuery,
    filterTrend,
    filterRsi,
    filterMacd,
    filterBollinger,
    filterChange,
    filterPe,
    filterDividend,
    filterGrowth,
    filterHealth,
  ]);

  // 排序點擊切換
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
        setSortColumn('changePercent');
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('desc');
    }
  };

  // 最終排序標的列表
  const sortedStocks = useMemo(() => {
    if (!sortDirection) return filteredStocks;
    return [...filteredStocks].sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredStocks, sortColumn, sortDirection]);

  if (!isOpen) return null;

  const isGreenUp = colorTheme === 'international';

  const getChangeBadge = (val: number) => {
    if (val > 0) {
      return isGreenUp 
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
        : 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (val < 0) {
      return isGreenUp 
        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    return 'bg-slate-700/30 text-slate-300 border-slate-600/40';
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col || sortDirection === null) {
      return <ArrowUpDown size={11} className="text-slate-500 group-hover:text-slate-300" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={11} className="text-blue-400" />
    ) : (
      <ArrowDown size={11} className="text-blue-400" />
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-[#121620] border border-[#2a3040] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* 🌟 1. 頂部旗艦標題列與全局操作 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-[#252b3b] bg-[#171b26] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/15 text-blue-400 border border-blue-500/30">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  智慧多因子選股器
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                  TradingView 級專業版
                </span>
                {activeFiltersCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    已套用 {activeFiltersCount} 條件
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 hidden sm:block mt-0.5">
                全方位自訂技術型態、動能指標、基本面估值與財務評級，點擊標的即時跳轉主圖表
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* 雙重視圖切換按鈕組 */}
            <div className="flex items-center bg-[#10131c] p-1 rounded-xl border border-[#252b3b]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="TradingView 風格量化數據總表 (支援欄位排序)"
              >
                <Table size={13} />
                <span className="hidden sm:inline">數據總表</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg font-bold transition-all ${
                  viewMode === 'card'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="卡片視覺化總覽"
              >
                <LayoutGrid size={13} />
                <span className="hidden sm:inline">診斷卡片</span>
              </button>
            </div>

            {/* 條件面板收折切換 */}
            <button
              onClick={() => setIsFilterPanelExpanded((prev) => !prev)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#1e2332] hover:bg-[#282f42] text-slate-300 hover:text-white border border-[#2e364a] text-xs font-semibold transition-colors"
              title="收合或展開篩選條件自訂抽屜"
            >
              <SlidersHorizontal size={13} className="text-blue-400" />
              <span className="hidden md:inline">{isFilterPanelExpanded ? '收合篩選' : '自訂條件'}</span>
              {isFilterPanelExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-[#1e2332] hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-[#2e364a] hover:border-rose-500/40 transition-colors"
              title="關閉選股器 (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 🌟 2. 頂部快速搜尋列與市場範疇切換 */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#141824] border-b border-[#202636] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
            {/* 搜尋關鍵字 */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜尋代號、名稱、別名 (如 2330, NVDA, 聯發科)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0e111a] border border-[#282f40] rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* 市場分頁 Tabs */}
            <div className="flex rounded-xl bg-[#0e111a] p-1 border border-[#282f40] text-xs font-semibold">
              {[
                { key: 'ALL', label: '全部市場' },
                { key: 'DOMESTIC', label: '台股 (TW)' },
                { key: 'FOREIGN', label: '美股 (US)' },
                { key: 'CRYPTO', label: '幣圈 (Crypto)' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSearchScope(tab.key as SearchScope)}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all ${
                    searchScope === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 產業類別下拉 */}
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              aria-label="選擇產業類別"
              className="bg-[#0e111a] border border-[#282f40] text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="ALL">全部產業板塊</option>
              {availableSectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>

          {/* 策略快捷晶片與重設按鈕 */}
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all active:scale-95"
                title="清空所有篩選條件"
              >
                <RotateCcw size={12} />
                <span>重設</span>
              </button>
            )}
            <div className="text-xs text-slate-400 font-mono">
              符合 <b className="text-white text-sm">{filteredStocks.length}</b> 檔 
              <span className="text-slate-500 text-[11px] ml-1">/ 共 {STOCK_DIRECTORY.length}</span>
            </div>
          </div>
        </div>

        {/* 🌟 3. 快速策略晶片模板 (One-click TradingView Strategy Presets) */}
        <div className="px-4 sm:px-6 py-2 bg-[#10141e] border-b border-[#1c2230] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
          <span className="text-slate-400 flex items-center gap-1 shrink-0 font-bold mr-1">
            <Sparkles size={13} className="text-amber-400" />
            快速策略：
          </span>
          <button
            type="button"
            onClick={() => applyPreset('breakout')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#191f2d] hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-[#2a3449] hover:border-blue-500/50 transition-all font-semibold"
          >
            🚀 動能起漲突破 (站月線+RSI強+營收)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('dividend')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#191f2d] hover:bg-emerald-600/20 text-slate-300 hover:text-emerald-300 border border-[#2a3449] hover:border-emerald-500/50 transition-all font-semibold"
          >
            💎 價值高股息 (殖利率&gt;4%+低PE+高分)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bullish')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#191f2d] hover:bg-purple-600/20 text-slate-300 hover:text-purple-300 border border-[#2a3449] hover:border-purple-500/50 transition-all font-semibold"
          >
            🐂 強勢均線多頭 (多頭排列+上漲)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('oversold')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#191f2d] hover:bg-amber-600/20 text-slate-300 hover:text-amber-300 border border-[#2a3449] hover:border-amber-500/50 transition-all font-semibold"
          >
            🏹 跌深超賣反彈 (RSI&lt;35超跌)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bluechip')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#191f2d] hover:bg-cyan-600/20 text-slate-300 hover:text-cyan-300 border border-[#2a3449] hover:border-cyan-500/50 transition-all font-semibold"
          >
            👑 藍籌龍頭體質 (評分&gt;=85+營收正成長)
          </button>
          <button
            type="button"
            onClick={() => applyPreset('bollinger')}
            className="shrink-0 px-2.5 py-1 rounded-lg bg-[#191f2d] hover:bg-rose-600/20 text-slate-300 hover:text-rose-300 border border-[#2a3449] hover:border-rose-500/50 transition-all font-semibold"
          >
            ⚡ 布林上軌突破 (強勢噴發)
          </button>
        </div>

        {/* 🌟 4. 可折疊的豐富自訂條件抽屜 (技術面 + 基本面多維度量化過濾器) */}
        {isFilterPanelExpanded && (
          <div className="px-4 sm:px-6 py-3.5 bg-[#121622] border-b border-[#242b3c] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0 text-xs animate-in fade-in duration-200">
            
            {/* 區塊 1: 均線趨勢與漲跌幅 */}
            <div className="bg-[#171c2b] p-2.5 rounded-xl border border-[#262f44] space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-[#262f44] pb-1.5">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Activity size={13} />
                  均線與走勢
                </span>
                {filterTrend !== 'ALL' && <span className="w-2 h-2 rounded-full bg-blue-500" />}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">均線排列型態</label>
                  <select
                    value={filterTrend}
                    onChange={(e) => setFilterTrend(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">全部均線型態</option>
                    <option value="bullish">多頭排列 (MA5 &gt; MA20 &gt; MA60)</option>
                    <option value="above_ma20">站上月線 (股價 &gt; MA20)</option>
                    <option value="above_ma60">站上季線 (股價 &gt; MA60)</option>
                    <option value="bearish">空頭排列向下</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">當日漲跌幅區間</label>
                  <select
                    value={filterChange}
                    onChange={(e) => setFilterChange(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="ALL">全部漲跌幅</option>
                    <option value="strong_up">強勢大漲 (&gt; +3%)</option>
                    <option value="mild_up">溫和走揚 (0% ~ +3%)</option>
                    <option value="flat">平盤震盪 (-1% ~ +1%)</option>
                    <option value="down">回檔修正 (0% ~ -3%)</option>
                    <option value="crash">重挫回落 (&lt; -3%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 區塊 2: 震盪動能指標 (RSI / MACD / BOLL) */}
            <div className="bg-[#171c2b] p-2.5 rounded-xl border border-[#262f44] space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-[#262f44] pb-1.5">
                <span className="flex items-center gap-1.5 text-purple-400">
                  <Zap size={13} />
                  動能指標 (RSI/MACD)
                </span>
                {(filterRsi !== 'ALL' || filterMacd !== 'ALL') && <span className="w-2 h-2 rounded-full bg-purple-500" />}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">RSI(14) 震盪強度</label>
                  <select
                    value={filterRsi}
                    onChange={(e) => setFilterRsi(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="ALL">全部 RSI 區間</option>
                    <option value="oversold">超賣區反彈 (&lt; 35 跌深)</option>
                    <option value="neutral">中性盤整 (35 ~ 55)</option>
                    <option value="strong">強勢偏多 (55 ~ 70 動能旺)</option>
                    <option value="overbought">極度超買警戒 (&gt; 70)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">MACD 指標訊號</label>
                  <select
                    value={filterMacd}
                    onChange={(e) => setFilterMacd(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-purple-500 font-medium"
                  >
                    <option value="ALL">全部 MACD 訊號</option>
                    <option value="golden_cross">黃金交叉 (快線上穿慢線)</option>
                    <option value="red_hist">柱狀體翻紅增長</option>
                    <option value="death_cross">死亡交叉向下</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 區塊 3: 價值與殖利率估值 (PE / 殖利率) */}
            <div className="bg-[#171c2b] p-2.5 rounded-xl border border-[#262f44] space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-[#262f44] pb-1.5">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Building2 size={13} />
                  估值與配息 (P/E &amp; 殖利率)
                </span>
                {(filterPe !== 'ALL' || filterDividend !== 'ALL') && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">本益比 (P/E Ratio)</label>
                  <select
                    value={filterPe}
                    onChange={(e) => setFilterPe(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="ALL">全部本益比區間</option>
                    <option value="under15">深度低估安全邊際 (&lt; 15x)</option>
                    <option value="between15_25">合理公允評價 (15x ~ 25x)</option>
                    <option value="above25">高成長溢價 (&gt; 25x)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">現金殖利率 (Yield)</label>
                  <select
                    value={filterDividend}
                    onChange={(e) => setFilterDividend(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 font-medium"
                  >
                    <option value="ALL">全部殖利率條件</option>
                    <option value="high">高股息防禦 (&gt; 5.0%)</option>
                    <option value="medium">穩定收息 (&gt; 3.0%)</option>
                    <option value="none">成長無息/低息 (&lt; 3.0%)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 區塊 4: 營收動能與體質評級 */}
            <div className="bg-[#171c2b] p-2.5 rounded-xl border border-[#262f44] space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold border-b border-[#262f44] pb-1.5">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <ShieldCheck size={13} />
                  基本面成長與體質
                </span>
                {(filterGrowth !== 'ALL' || filterHealth !== 'ALL') && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">營收年增率 (YoY Growth)</label>
                  <select
                    value={filterGrowth}
                    onChange={(e) => setFilterGrowth(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ALL">全部成長幅度</option>
                    <option value="explosive">爆發式高成長 (&gt; +30%)</option>
                    <option value="steady">雙位數穩健成長 (&gt; +15%)</option>
                    <option value="positive">正成長轉強 (&gt; 0%)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-0.5">綜合財務體質評分</label>
                  <select
                    value={filterHealth}
                    onChange={(e) => setFilterHealth(e.target.value)}
                    className="w-full bg-[#0f121a] border border-[#2e374d] text-white text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-amber-500 font-medium"
                  >
                    <option value="ALL">全部體質等級</option>
                    <option value="excellent">卓越旗艦企業 (&gt;= 85分)</option>
                    <option value="good">優良健康體質 (&gt;= 75分)</option>
                    <option value="pass">穩健及格標的 (&gt;= 60分)</option>
                  </select>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 🌟 5. 核心資料呈現區 (表格模式 vs 卡片模式) */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-[#0e111a] custom-scrollbar">
          {viewMode === 'table' ? (
            /* 📋 TradingView 風格量化數據總表 (支援點擊欄位排序) */
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-[#161a25] z-10 border-b border-[#262c3c] text-slate-400 font-bold uppercase tracking-wider select-none">
                  <tr>
                    {/* 標的 */}
                    <th 
                      onClick={() => handleSort('symbol')}
                      className="py-2.5 px-3 hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>標的代號 / 名稱</span>
                        {renderSortIcon('symbol')}
                      </div>
                    </th>

                    {/* 現價 */}
                    <th 
                      onClick={() => handleSort('price')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>最新價格</span>
                        {renderSortIcon('price')}
                      </div>
                    </th>

                    {/* 漲跌幅 */}
                    <th 
                      onClick={() => handleSort('changePercent')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>當日漲跌</span>
                        {renderSortIcon('changePercent')}
                      </div>
                    </th>

                    {/* 均線趨勢 */}
                    <th className="py-2.5 px-3 whitespace-nowrap">
                      均線狀態
                    </th>

                    {/* RSI (14) */}
                    <th 
                      onClick={() => handleSort('rsi')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>RSI (14)</span>
                        {renderSortIcon('rsi')}
                      </div>
                    </th>

                    {/* 本益比 PE */}
                    <th 
                      onClick={() => handleSort('peRatio')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>本益比 P/E</span>
                        {renderSortIcon('peRatio')}
                      </div>
                    </th>

                    {/* 殖利率 */}
                    <th 
                      onClick={() => handleSort('dividendYield')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>殖利率</span>
                        {renderSortIcon('dividendYield')}
                      </div>
                    </th>

                    {/* 營收 YoY */}
                    <th 
                      onClick={() => handleSort('revenueGrowthYoY')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>營收 YoY</span>
                        {renderSortIcon('revenueGrowthYoY')}
                      </div>
                    </th>

                    {/* 體質評分 */}
                    <th 
                      onClick={() => handleSort('healthScore')}
                      className="py-2.5 px-3 text-right hover:text-white cursor-pointer group whitespace-nowrap"
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span>體質評分</span>
                        {renderSortIcon('healthScore')}
                      </div>
                    </th>

                    {/* 產業別 */}
                    <th className="py-2.5 px-3 whitespace-nowrap hidden lg:table-cell">
                      產業板塊
                    </th>

                    {/* 操作 */}
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">
                      快速看盤
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#1e2330] font-mono">
                  {sortedStocks.map((stock) => {
                    const isPositive = stock.changePercent >= 0;
                    const changeBadge = getChangeBadge(stock.changePercent);

                    return (
                      <tr
                        key={stock.symbol}
                        onClick={() => {
                          onSelectSymbol(stock);
                          onClose();
                        }}
                        className="hover:bg-[#181d2a] cursor-pointer transition-colors group"
                      >
                        {/* 標的 */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {stock.symbol}
                            </span>
                            <span className="text-[11px] font-sans text-slate-300 font-medium truncate max-w-[130px]">
                              {stock.name}
                            </span>
                            <span className={`text-[9px] px-1 py-0.2 rounded border font-mono ${getMarketInfo(stock.market).badgeClass}`}>
                              {getMarketInfo(stock.market).label}
                            </span>
                          </div>
                        </td>

                        {/* 現價 */}
                        <td className="py-2.5 px-3 text-right font-bold text-white">
                          {formatPrice(stock.price, stock.currency)}
                        </td>

                        {/* 漲跌幅 */}
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${changeBadge}`}>
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </span>
                        </td>

                        {/* 均線趨勢 */}
                        <td className="py-2.5 px-3 font-sans">
                          {stock.maTrend === 'bullish' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              <TrendingUp size={11} /> 多頭排列
                            </span>
                          )}
                          {stock.maTrend === 'above_ma20' && (
                            <span className="text-[11px] font-semibold text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/30">
                              站上月線
                            </span>
                          )}
                          {stock.maTrend === 'above_ma60' && (
                            <span className="text-[11px] font-semibold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              站上季線
                            </span>
                          )}
                          {stock.maTrend === 'bearish' && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/30">
                              <TrendingDown size={11} /> 空頭走弱
                            </span>
                          )}
                          {stock.maTrend === 'neutral' && (
                            <span className="text-[11px] text-slate-400">區間震盪</span>
                          )}
                        </td>

                        {/* RSI */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                              <div
                                className={`h-full ${
                                  stock.rsi > 70 
                                    ? 'bg-rose-500' 
                                    : stock.rsi < 35 
                                      ? 'bg-amber-400' 
                                      : 'bg-blue-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, stock.rsi))}%` }}
                              />
                            </div>
                            <span className={`font-semibold ${
                              stock.rsi > 70 
                                ? 'text-rose-400' 
                                : stock.rsi < 35 
                                  ? 'text-amber-400' 
                                  : 'text-slate-200'
                            }`}>
                              {stock.rsi}
                            </span>
                          </div>
                        </td>

                        {/* 本益比 */}
                        <td className="py-2.5 px-3 text-right text-slate-200 font-semibold">
                          {stock.peRatio.toFixed(1)}x
                        </td>

                        {/* 殖利率 */}
                        <td className="py-2.5 px-3 text-right">
                          <span className={stock.dividendYield >= 4.0 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                            {stock.dividendYield.toFixed(2)}%
                          </span>
                        </td>

                        {/* 營收 YoY */}
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold ${stock.revenueGrowthYoY >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stock.revenueGrowthYoY > 0 ? '+' : ''}{stock.revenueGrowthYoY.toFixed(1)}%
                          </span>
                        </td>

                        {/* 體質評分 */}
                        <td className="py-2.5 px-3 text-right">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            stock.healthScore >= 85 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : stock.healthScore >= 75 
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' 
                                : 'bg-slate-700/50 text-slate-300'
                          }`}>
                            {stock.healthScore}分
                          </span>
                        </td>

                        {/* 產業別 */}
                        <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px] hidden lg:table-cell truncate max-w-[110px]">
                          {stock.sector || '-'}
                        </td>

                        {/* 操作 */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectSymbol(stock);
                              onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-sans font-semibold transition-colors"
                          >
                            <span>載入圖表</span>
                            <ArrowRight size={11} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* 🗂️ 診斷卡片視圖 (Card View) */
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {sortedStocks.map((stock) => {
                const isPositive = stock.changePercent >= 0;
                const changeBadge = getChangeBadge(stock.changePercent);

                return (
                  <div
                    key={stock.symbol}
                    onClick={() => {
                      onSelectSymbol(stock);
                      onClose();
                    }}
                    className="group bg-[#151a26] border border-[#262e40] hover:border-blue-500/60 rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-xl hover:shadow-blue-500/5 flex flex-col justify-between"
                  >
                    <div>
                      {/* 卡片頂部：代號 + 市場徽章 + 價格 + 漲跌幅 */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base group-hover:text-blue-400 transition-colors font-mono">
                              {stock.symbol}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${getMarketInfo(stock.market).badgeClass}`}>
                              {getMarketInfo(stock.market).label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-300 font-semibold mt-0.5">{stock.name}</div>
                          <div className="text-[10px] text-slate-500">{stock.sector || '綜合板塊'}</div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-white font-mono text-sm">
                            {formatPrice(stock.price, stock.currency)}
                          </div>
                          <div className={`text-xs font-bold px-2 py-0.5 rounded border inline-block mt-1 font-mono ${changeBadge}`}>
                            {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      {/* 卡片中間：技術型態與訊號徽章 */}
                      <div className="mt-3 pt-2.5 border-t border-[#22293a] flex flex-wrap items-center gap-1.5 text-[11px]">
                        {stock.maTrend === 'bullish' && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                            均線多頭
                          </span>
                        )}
                        {stock.maTrend === 'above_ma20' && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
                            站上月線
                          </span>
                        )}
                        {stock.macdSignal === 'golden_cross' && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold">
                            MACD 金叉
                          </span>
                        )}
                        {stock.bollingerSignal === 'upper_break' && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
                            布林突破
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-[#10131c] text-slate-400 border border-[#222838] font-mono">
                          RSI: {stock.rsi}
                        </span>
                      </div>
                    </div>

                    {/* 卡片底部：基本面指標與體質評分 */}
                    <div className="mt-3 pt-2.5 border-t border-[#22293a] flex items-center justify-between text-xs text-slate-400 font-mono">
                      <div>
                        PE <span className="text-white font-bold">{stock.peRatio.toFixed(1)}x</span>
                      </div>
                      <div>
                        殖利率 <span className="text-emerald-400 font-bold">{stock.dividendYield.toFixed(1)}%</span>
                      </div>
                      <div>
                        營收 <span className={stock.revenueGrowthYoY >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                          {stock.revenueGrowthYoY > 0 ? '+' : ''}{stock.revenueGrowthYoY.toFixed(1)}%
                        </span>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        stock.healthScore >= 85 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {stock.healthScore}分
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 無符合資料提示 */}
          {sortedStocks.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-30 text-blue-400" />
              <p className="text-sm font-bold text-white">沒有找到符合條件的標的</p>
              <p className="text-xs text-slate-500 mt-1">
                請嘗試放寬篩選條件、變更市場分類或清空關鍵字搜尋
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-3 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md"
              >
                重設所有條件
              </button>
            </div>
          )}
        </div>

        {/* 🌟 6. 底部狀態條 */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#141824] border-t border-[#202636] flex items-center justify-between text-xs text-slate-400 shrink-0 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>量化引擎連線中 · 即時多維度篩選已就緒</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-slate-500">提示：點擊任一行即可在主畫面切換並載入該標的技術圖表</span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-[#202638] hover:bg-[#2c344d] text-white font-semibold transition-colors"
            >
              完成
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
