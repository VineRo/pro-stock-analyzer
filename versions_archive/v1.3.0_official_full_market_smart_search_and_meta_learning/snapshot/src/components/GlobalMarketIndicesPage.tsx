import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  LayoutGrid, 
  Table as TableIcon, 
  LineChart, 
  ArrowRight, 
  Activity,
  ArrowUpDown
} from 'lucide-react';
import { ColorTheme, StockSymbol } from '../types/stock';
import { 
  GlobalIndexItem, 
  INITIAL_GLOBAL_INDICES, 
  MarketRegion, 
  MarketSessionStatus,
  mergeQuotesIntoIndices, 
  calcMarketBreadth 
} from '../data/globalIndicesData';
import { fetchBatchQuotes } from '../services/quoteService';

interface GlobalMarketIndicesPageProps {
  colorTheme: ColorTheme;
  onSelectIndex: (symbol: StockSymbol) => void;
}

type ViewMode = 'cards' | 'table' | 'overlay';
type SortField = 'changePercent' | 'price' | 'd5' | 'm1' | 'ytd' | 'amplitude';
type SortOrder = 'desc' | 'asc';

export const GlobalMarketIndicesPage: React.FC<GlobalMarketIndicesPageProps> = ({
  colorTheme,
  onSelectIndex,
}) => {
  const [indices, setIndices] = useState<GlobalIndexItem[]>(INITIAL_GLOBAL_INDICES);
  const [selectedRegion, setSelectedRegion] = useState<MarketRegion>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const isGreenUp = colorTheme === 'international';

  // 1. 批次聯網載入最新全球大盤即時行情
  const refreshQuotes = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const symbolsToFetch = indices.map((idx) => idx.symbol);
      const quotes = await fetchBatchQuotes(symbolsToFetch, 6);
      if (quotes && Object.keys(quotes).length > 0) {
        setIndices((prev) => mergeQuotesIntoIndices(prev, quotes));
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.warn('[GlobalMarketIndicesPage] Failed to fetch quotes:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [indices]);

  // 初次載入與每 25 秒自動輪詢更新
  useEffect(() => {
    refreshQuotes();
    const interval = setInterval(() => {
      refreshQuotes();
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // 2. 依區域過濾標的
  const filteredIndices = useMemo(() => {
    if (selectedRegion === 'ALL') return indices;
    return indices.filter((idx) => idx.region === selectedRegion);
  }, [indices, selectedRegion]);

  // 3. 排序邏輯
  const sortedIndices = useMemo(() => {
    return [...filteredIndices].sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'changePercent':
          valA = a.changePercent;
          valB = b.changePercent;
          break;
        case 'price':
          valA = a.price;
          valB = b.price;
          break;
        case 'd5':
          valA = a.returns.d5;
          valB = b.returns.d5;
          break;
        case 'm1':
          valA = a.returns.m1;
          valB = b.returns.m1;
          break;
        case 'ytd':
          valA = a.returns.ytd;
          valB = b.returns.ytd;
          break;
        case 'amplitude':
          valA = a.prevClose > 0 ? ((a.high - a.low) / a.prevClose) * 100 : 0;
          valB = b.prevClose > 0 ? ((b.high - b.low) / b.prevClose) * 100 : 0;
          break;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [filteredIndices, sortField, sortOrder]);

  // 4. 計算全球強弱風向球統計
  const breadth = useMemo(() => {
    return calcMarketBreadth(indices);
  }, [indices]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // 輔助顏色轉換函數
  const getChangeColor = (val: number) => {
    if (val > 0) return isGreenUp ? 'text-emerald-400' : 'text-rose-400';
    if (val < 0) return isGreenUp ? 'text-rose-400' : 'text-emerald-400';
    return 'text-pro-muted';
  };

  const getChangeBadgeClass = (val: number) => {
    if (val > 0) {
      return isGreenUp
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    }
    if (val < 0) {
      return isGreenUp
        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    return 'bg-gray-800 text-gray-400 border-gray-700';
  };

  // 將大盤項目轉換為主圖載入所需之 StockSymbol 結構
  const handleOpenChart = (idx: GlobalIndexItem) => {
    const stock: StockSymbol = {
      symbol: idx.symbol,
      name: idx.name,
      market: idx.market,
      price: idx.price,
      change: idx.change,
      changePercent: idx.changePercent,
      currency: idx.currency,
      isIndex: true,
    };
    onSelectIndex(stock);
  };

  // 繪製平滑 SVG 微型走勢圖 (Sparkline) - 依據開盤/盤後/已收盤狀態真實反映波動
  const renderSparkline = (points: number[], isUp: boolean, status: MarketSessionStatus = 'OPEN') => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 110;
    const height = 34;

    const coordinates = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    // 顏色與線條定義：
    // - CLOSED (已收盤)：冷灰靜止色系 (#64748b)，線條微弱虛化，真實呈現無即時波動狀態
    // - AFTER_HOURS (盤後交易)：琥珀金黃色系 (#f59e0b)，明確標示盤後交易狀態
    // - OPEN (正常交易中)：依漲跌紅綠配色正常實線即時跳價
    const strokeColor = status === 'CLOSED'
      ? '#64748b'
      : status === 'AFTER_HOURS'
      ? '#f59e0b'
      : isUp
      ? isGreenUp ? '#10b981' : '#f43f5e'
      : isGreenUp ? '#f43f5e' : '#10b981';

    const areaPath = `M 0,${height} L ${coordinates.join(' L ')} L ${width},${height} Z`;
    const gradId = `grad_${points[0]}_${isUp}_${status}`;

    return (
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={status === 'CLOSED' ? 0.12 : 0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={status === 'CLOSED' ? '3,2' : undefined}
          points={coordinates.join(' ')}
        />
      </svg>
    );
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-pro-bg text-pro-text overflow-y-auto no-scrollbar select-none p-4 md:p-6 lg:p-8">
      {/* 1. 頁面標題與即時控制列 */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-pro-border">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm border border-blue-500">
              <Globe size={24} />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                全球大盤指數即時深度對比中心
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Global Market Hub
                </span>
              </h1>
              <p className="text-xs text-pro-muted mt-0.5">
                即時監控台灣、美股、日韓、中港與歐洲跨國股市指數，橫向對比振幅、多期報酬與相對強弱
              </p>
            </div>
          </div>
        </div>

        {/* 右側：即時信號燈、手動重新整理、視圖切換 */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* 連線狀態與更新時間 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pro-panel border border-pro-border text-xs text-pro-muted">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-emerald-400">即時聯網更新</span>
            <span className="opacity-40">|</span>
            <span className="font-mono text-[11px]">
              {lastUpdated.toLocaleTimeString()}
            </span>
          </div>

          {/* 手動更新按鈕 */}
          <button
            onClick={refreshQuotes}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/80 hover:bg-blue-600 active:scale-95 text-white text-xs font-medium border border-blue-500/40 transition-all shadow-sm"
            title="手動立即刷新最新即時行情"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? '更新中...' : '重新整理'}</span>
          </button>

          {/* 視圖切換器 */}
          <div className="flex items-center bg-pro-panel rounded-lg p-0.5 border border-pro-border">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-pro-hover text-white font-bold shadow-sm text-pro-accent'
                  : 'text-pro-muted hover:text-white'
              }`}
            >
              <LayoutGrid size={13} />
              <span>大卡矩陣</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-pro-hover text-white font-bold shadow-sm text-pro-accent'
                  : 'text-pro-muted hover:text-white'
              }`}
            >
              <TableIcon size={13} />
              <span>橫向總表</span>
            </button>
            <button
              onClick={() => setViewMode('overlay')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'overlay'
                  ? 'bg-pro-hover text-white font-bold shadow-sm text-pro-accent'
                  : 'text-pro-muted hover:text-white'
              }`}
            >
              <LineChart size={13} />
              <span>走勢疊加</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 全球市場強弱風向球 (Breadth KPI Banner) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-5 shrink-0">
        {/* 今日領頭羊 */}
        <div className="bg-pro-panel/90 border border-pro-border/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-pro-muted flex items-center gap-1">
            <TrendingUp size={13} className="text-emerald-400" />
            今日領頭羊
          </span>
          {breadth.leader ? (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-bold text-sm text-white">
                {breadth.leader.flag} {breadth.leader.shortName}
              </span>
              <span className={`text-sm font-mono font-extrabold ${getChangeColor(breadth.leader.changePercent)}`}>
                +{breadth.leader.changePercent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-pro-muted">計算中...</span>
          )}
        </div>

        {/* 今日跌幅最大 */}
        <div className="bg-pro-panel/90 border border-pro-border/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-pro-muted flex items-center gap-1">
            <TrendingDown size={13} className="text-rose-400" />
            今日最弱勢
          </span>
          {breadth.laggard ? (
            <div className="mt-1 flex items-baseline justify-between">
              <span className="font-bold text-sm text-white">
                {breadth.laggard.flag} {breadth.laggard.shortName}
              </span>
              <span className={`text-sm font-mono font-extrabold ${getChangeColor(breadth.laggard.changePercent)}`}>
                {breadth.laggard.changePercent.toFixed(2)}%
              </span>
            </div>
          ) : (
            <span className="text-xs text-pro-muted">計算中...</span>
          )}
        </div>

        {/* 全球平均漲跌幅 */}
        <div className="bg-pro-panel/90 border border-pro-border/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-pro-muted flex items-center gap-1">
            <Activity size={13} className="text-blue-400" />
            全球大盤平均報酬
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xs text-pro-muted">17 大市場綜合</span>
            <span className={`text-sm font-mono font-extrabold ${getChangeColor(breadth.avgReturn)}`}>
              {breadth.avgReturn > 0 ? '+' : ''}{breadth.avgReturn.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 上漲 vs 下跌市場比例 */}
        <div className="bg-pro-panel/90 border border-pro-border/80 rounded-xl p-3.5 flex flex-col justify-between shadow-sm">
          <span className="text-xs text-pro-muted flex items-center justify-between">
            <span>市場漲跌比率</span>
            <span className="font-mono text-[11px] text-white">
              {breadth.upCount} 漲 / {breadth.downCount} 跌
            </span>
          </span>
          <div className="w-full bg-gray-700/50 rounded-full h-2 mt-2 overflow-hidden flex">
            <div
              style={{ width: `${(breadth.upCount / (indices.length || 1)) * 100}%` }}
              className="bg-emerald-500 h-full transition-all duration-500"
              title={`上漲市場: ${breadth.upCount}`}
            />
            <div
              style={{ width: `${(breadth.downCount / (indices.length || 1)) * 100}%` }}
              className="bg-rose-500 h-full transition-all duration-500"
              title={`下跌市場: ${breadth.downCount}`}
            />
          </div>
        </div>
      </div>

      {/* 3. 地區篩選標籤 (Region Filter Tabs) 與 排序控制列 (彈性自適應，徹底杜絕遮蔽) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 shrink-0">
        {/* 左側：地區篩選標籤 (全視窗自適應縮寫) */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'ALL', label: '全部大盤', shortLabel: '全部', count: indices.length },
            { id: 'ASIA', label: '亞洲市場 (台/日/韓/陸/港)', shortLabel: '亞洲', count: indices.filter((i) => i.region === 'ASIA').length },
            { id: 'AMERICAS', label: '美洲市場 (標普/那指/道瓊/費半)', shortLabel: '美洲', count: indices.filter((i) => i.region === 'AMERICAS').length },
            { id: 'EUROPE', label: '歐洲市場 (德/英/法)', shortLabel: '歐洲', count: indices.filter((i) => i.region === 'EUROPE').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRegion(tab.id as MarketRegion)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedRegion === tab.id
                  ? 'bg-blue-600 text-white font-bold border border-blue-500 shadow-sm'
                  : 'bg-pro-panel border border-pro-border text-pro-muted hover:text-white hover:border-gray-600'
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                selectedRegion === tab.id ? 'bg-white/20 text-white' : 'bg-black/30 text-pro-muted'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* 右側：快速排序標籤組 (依漲跌幅 / 依點位 / 依5日 / 依振幅 + 正反序切換) */}
        <div className="flex items-center gap-1.5 bg-pro-panel rounded-lg p-1 border border-pro-border">
          <span className="text-[11px] text-pro-muted px-1.5 font-medium hidden md:inline">排序:</span>
          {[
            { field: 'changePercent' as SortField, label: '漲跌幅' },
            { field: 'price' as SortField, label: '點位' },
            { field: 'd5' as SortField, label: '5日' },
            { field: 'amplitude' as SortField, label: '振幅' },
          ].map((s) => (
            <button
              key={s.field}
              onClick={() => handleSort(s.field)}
              className={`px-2 py-1 rounded text-xs transition-colors flex items-center gap-1 ${
                sortField === s.field
                  ? 'bg-pro-hover text-white font-bold'
                  : 'text-pro-muted hover:text-white'
              }`}
              title={`依${s.label}排序 (點擊切換升降序)`}
            >
              <span>{s.label}</span>
              {sortField === s.field && (
                <span className="text-[10px] text-blue-400 font-mono">
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 主內容區：依據 viewMode 呈現不同檢視模式 */}

      {/* 模式 A：大卡片視覺矩陣 (Card Grid View) - 徹底解決太小不易閱讀的問題 */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {sortedIndices.map((idx) => {
            const isUp = idx.change >= 0;
            const amp = idx.prevClose > 0 ? ((idx.high - idx.low) / idx.prevClose) * 100 : 0;
            
            // 計算目前價格在今日高低點之相對百分比位置 (0% 為最低，100% 為最高)
            const rangeSpan = idx.high - idx.low || 1;
            const rangePos = Math.max(0, Math.min(100, ((idx.price - idx.low) / rangeSpan) * 100));

            return (
              <div
                key={idx.symbol}
                className="bg-pro-panel/85 hover:bg-pro-panel border border-pro-border hover:border-blue-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 shadow-md hover:shadow-xl group relative overflow-hidden"
              >
                {/* 頂部：國旗、國家名稱、全稱、市場狀態 */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl select-none" role="img" aria-label={idx.country}>
                        {idx.flag}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-pro-accent tracking-wide uppercase">
                            {idx.country}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-pro-card border border-pro-border text-pro-muted">
                            {idx.symbol}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-sm text-white group-hover:text-blue-300 transition-colors line-clamp-1" title={idx.name}>
                          {idx.name}
                        </h3>
                      </div>
                    </div>

                    {/* 交易狀態膠囊 */}
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                      idx.status === 'OPEN'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : idx.status === 'AFTER_HOURS'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}>
                      {idx.status === 'OPEN' ? '● 交易中' : idx.status === 'AFTER_HOURS' ? '● 盤後交易' : '○ 已收盤'}
                    </span>
                  </div>

                  {/* 核心報價：大字體點位與漲跌膠囊 (極致高易讀性) */}
                  <div className="mt-4 flex items-baseline justify-between gap-2">
                    <div>
                      <div className="text-2xl md:text-3xl font-black font-mono tracking-tight financial-number text-white">
                        {idx.price >= 1000 ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : idx.price.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-pro-muted font-mono mt-0.5">
                        幣別：{idx.currency} ‧ 成交額：{idx.turnover}
                      </div>
                    </div>

                    {/* 漲跌點數與百分比大膠囊 */}
                    <div className={`px-2.5 py-1 rounded-xl border flex flex-col items-end ${getChangeBadgeClass(idx.changePercent)}`}>
                      <span className="text-xs font-black font-mono flex items-center gap-0.5">
                        {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                      </span>
                      <span className="text-[10px] font-mono opacity-80">
                        {isUp ? '+' : ''}{idx.change.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* 中間：今日振幅與微型折線走勢 */}
                  <div className="mt-4 pt-3 border-t border-pro-border/70 flex items-center justify-between gap-3">
                    {/* 今日高低振幅量尺 */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-pro-muted mb-1">
                        <span>低 {idx.low >= 1000 ? idx.low.toLocaleString() : idx.low.toFixed(1)}</span>
                        <span className="text-white font-medium">振幅 {amp.toFixed(2)}%</span>
                        <span>高 {idx.high >= 1000 ? idx.high.toLocaleString() : idx.high.toFixed(1)}</span>
                      </div>
                      {/* 振幅進度條與位置指針 */}
                      <div className="w-full bg-gray-800 rounded-full h-1.5 relative overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${rangePos}%` }}
                        />
                      </div>
                    </div>

                    {/* SVG Sparkline 微型走勢折線 */}
                    <div className="shrink-0 flex flex-col items-end">
                      {renderSparkline(idx.sparkline, isUp, idx.status)}
                      <span className="text-[9px] font-mono text-pro-muted mt-0.5">
                        {idx.status === 'CLOSED' ? '收盤靜止' : idx.status === 'AFTER_HOURS' ? '盤後即時' : '即時跳價'}
                      </span>
                    </div>
                  </div>

                  {/* 多天期報酬率熱力微型標籤 */}
                  <div className="grid grid-cols-3 gap-1.5 mt-3 text-center text-[10px] font-mono">
                    <div className="p-1.5 rounded-lg bg-pro-card border border-pro-border/60">
                      <span className="text-pro-muted block text-[9px]">5日表現</span>
                      <span className={`font-bold ${getChangeColor(idx.returns.d5)}`}>
                        {idx.returns.d5 > 0 ? '+' : ''}{idx.returns.d5.toFixed(2)}%
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-pro-card border border-pro-border/60">
                      <span className="text-pro-muted block text-[9px]">1個月</span>
                      <span className={`font-bold ${getChangeColor(idx.returns.m1)}`}>
                        {idx.returns.m1 > 0 ? '+' : ''}{idx.returns.m1.toFixed(2)}%
                      </span>
                    </div>
                    <div className="p-1.5 rounded-lg bg-pro-card border border-pro-border/60">
                      <span className="text-pro-muted block text-[9px]">今年以來(YTD)</span>
                      <span className={`font-bold ${getChangeColor(idx.returns.ytd)}`}>
                        {idx.returns.ytd > 0 ? '+' : ''}{idx.returns.ytd.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* 底部操作按鈕：一鍵進入專業技術分析 */}
                <button
                  onClick={() => handleOpenChart(idx)}
                  className="mt-4 w-full py-2 px-3 rounded-xl bg-pro-hover group-hover:bg-blue-600 active:scale-98 text-pro-muted group-hover:text-white font-medium text-xs border border-pro-border group-hover:border-blue-500/50 flex items-center justify-center gap-1.5 transition-all shadow-sm"
                >
                  <span>進入 K 線深入分析</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 模式 B：橫向深度對比總表 (Sortable Table View) */}
      {viewMode === 'table' && (
        <div className="bg-pro-panel border border-pro-border rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-pro-card/80 border-b border-pro-border text-pro-muted font-semibold text-[11px] select-none">
                  <th className="py-3 px-4">市場 / 國旗</th>
                  <th className="py-3 px-4">大盤指數名稱</th>
                  <th className="py-3 px-4">代碼</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-1">
                      <span>最新點位</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('changePercent')}
                  >
                    <div className="flex items-center gap-1">
                      <span>今日漲跌幅</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-4">今日最高 / 最低</th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('amplitude')}
                  >
                    <div className="flex items-center gap-1">
                      <span>當日振幅</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('d5')}
                  >
                    <div className="flex items-center gap-1">
                      <span>5日報酬</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('m1')}
                  >
                    <div className="flex items-center gap-1">
                      <span>1個月</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('ytd')}
                  >
                    <div className="flex items-center gap-1">
                      <span>今年以來(YTD)</span>
                      <ArrowUpDown size={11} />
                    </div>
                  </th>
                  <th className="py-3 px-4">微型走勢</th>
                  <th className="py-3 px-4 text-center">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pro-border/60">
                {sortedIndices.map((idx) => {
                  const isUp = idx.change >= 0;
                  const amp = idx.prevClose > 0 ? ((idx.high - idx.low) / idx.prevClose) * 100 : 0;

                  return (
                    <tr 
                      key={idx.symbol}
                      className="hover:bg-pro-hover/50 transition-colors group"
                    >
                      <td className="py-3 px-4 font-medium flex items-center gap-2 whitespace-nowrap">
                        <span className="text-lg">{idx.flag}</span>
                        <div className="flex flex-col">
                          <span className="text-white font-bold">{idx.country}</span>
                          <span className={`text-[9px] font-mono px-1 rounded inline-block w-fit ${
                            idx.status === 'OPEN'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : idx.status === 'AFTER_HOURS'
                              ? 'text-amber-400 bg-amber-500/10'
                              : 'text-gray-400 bg-gray-800'
                          }`}>
                            {idx.status === 'OPEN' ? '● 交易中' : idx.status === 'AFTER_HOURS' ? '● 盤後' : '○ 已收盤'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-white whitespace-nowrap">
                        {idx.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-pro-muted whitespace-nowrap">
                        {idx.symbol}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white text-sm whitespace-nowrap">
                        {idx.price >= 1000 ? idx.price.toLocaleString(undefined, { minimumFractionDigits: 1 }) : idx.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs ${getChangeBadgeClass(idx.changePercent)}`}>
                          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-pro-muted text-[11px] whitespace-nowrap">
                        <span className="text-emerald-400 font-medium">{idx.high >= 1000 ? idx.high.toLocaleString() : idx.high.toFixed(1)}</span>
                        <span className="mx-1">/</span>
                        <span className="text-rose-400 font-medium">{idx.low >= 1000 ? idx.low.toLocaleString() : idx.low.toFixed(1)}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white whitespace-nowrap">
                        {amp.toFixed(2)}%
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${getChangeColor(idx.returns.d5)}`}>
                        {idx.returns.d5 > 0 ? '+' : ''}{idx.returns.d5.toFixed(2)}%
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${getChangeColor(idx.returns.m1)}`}>
                        {idx.returns.m1 > 0 ? '+' : ''}{idx.returns.m1.toFixed(2)}%
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold whitespace-nowrap ${getChangeColor(idx.returns.ytd)}`}>
                        {idx.returns.ytd > 0 ? '+' : ''}{idx.returns.ytd.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderSparkline(idx.sparkline, isUp, idx.status)}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenChart(idx)}
                          className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[11px] font-medium transition-all"
                        >
                          深入分析
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 模式 C：標準化跨國走勢疊加對比圖 (Normalized Comparative Chart) */}
      {viewMode === 'overlay' && (
        <div className="bg-pro-panel border border-pro-border rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <LineChart size={18} className="text-pro-accent" />
                全球核心指數標準化走勢疊加對比 (基期 = 100)
              </h2>
              <p className="text-xs text-pro-muted mt-0.5">
                將各國大盤基點標準化為 100%，直觀比較台股、美股、日經、恆生與歐洲等同台強弱表現
              </p>
            </div>
            <div className="text-xs text-pro-muted font-mono">
              走勢抽樣：最新波段序列
            </div>
          </div>

          {/* 走勢圖主體 SVG */}
          <div className="w-full h-80 relative flex flex-col justify-between pt-4 pb-2">
            {/* 繪製 SVG 疊加折線 */}
            <svg viewBox="0 0 800 280" className="w-full h-full overflow-visible">
              {/* 水平格線與 100% 基準線 */}
              <line x1="0" y1="50" x2="800" y2="50" stroke="#2a2e39" strokeDasharray="3,3" />
              <line x1="0" y1="110" x2="800" y2="110" stroke="#2a2e39" strokeDasharray="3,3" />
              <line x1="0" y1="170" x2="800" y2="170" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="4,4" />
              <line x1="0" y1="230" x2="800" y2="230" stroke="#2a2e39" strokeDasharray="3,3" />

              <text x="5" y="165" fill="#60a5fa" fontSize="11" fontFamily="monospace">基準線 (100.0)</text>

              {/* 挑選前 6 大代表性大盤繪製標準化曲線 */}
              {[
                { sym: '^TWII', name: '台股加權 🇹🇼', color: '#3b82f6' },
                { sym: 'SPY', name: '美股標普 🇺🇸', color: '#10b981' },
                { sym: 'QQQ', name: '那斯達克 🇺🇸', color: '#8b5cf6' },
                { sym: '^N225', name: '日經225 🇯🇵', color: '#f59e0b' },
                { sym: '^HSI', name: '香港恆生 🇭🇰', color: '#ec4899' },
                { sym: '^GDAXI', name: '德國DAX 🇩🇪', color: '#06b6d4' },
              ].map((spec) => {
                const target = indices.find((i) => i.symbol === spec.sym);
                if (!target || !target.sparkline || target.sparkline.length < 2) return null;

                const base = target.sparkline[0] || 1;
                // 將數值轉為相對於基點的百分比偏離度 (以 y: 170 為 100 基線)
                const points = target.sparkline.map((val, idx) => {
                  const x = (idx / (target.sparkline.length - 1)) * 790 + 5;
                  const ratio = val / base; // 例如 1.025 代表 +2.5%
                  const y = 170 - (ratio - 1.0) * 1500; // 放大偏離度以利視覺呈現
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                });

                return (
                  <g key={spec.sym}>
                    <polyline
                      fill="none"
                      stroke={spec.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points.join(' ')}
                    />
                    {/* 尾端標記點 */}
                    {points.length > 0 && (
                      <circle
                        cx={points[points.length - 1].split(',')[0]}
                        cy={points[points.length - 1].split(',')[1]}
                        r="4"
                        fill={spec.color}
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* 圖例說明列 */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 pt-4 border-t border-pro-border text-xs">
            {[
              { sym: '^TWII', name: '台灣加權 🇹🇼', color: '#3b82f6' },
              { sym: 'SPY', name: '美股標普 🇺🇸', color: '#10b981' },
              { sym: 'QQQ', name: '那斯達克 🇺🇸', color: '#8b5cf6' },
              { sym: '^N225', name: '日經225 🇯🇵', color: '#f59e0b' },
              { sym: '^HSI', name: '香港恆生 🇭🇰', color: '#ec4899' },
              { sym: '^GDAXI', name: '德國DAX 🇩🇪', color: '#06b6d4' },
            ].map((leg) => {
              const current = indices.find((i) => i.symbol === leg.sym);
              return (
                <div 
                  key={leg.sym} 
                  className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-pro-card border border-pro-border cursor-pointer hover:border-white transition-all"
                  onClick={() => current && handleOpenChart(current)}
                  title="點擊深入分析此指數"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: leg.color }} />
                  <span className="font-bold text-white">{leg.name}</span>
                  {current && (
                    <span className={`font-mono text-[11px] ${getChangeColor(current.changePercent)}`}>
                      {current.changePercent > 0 ? '+' : ''}{current.changePercent.toFixed(2)}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
