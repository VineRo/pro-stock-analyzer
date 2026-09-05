import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Search, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  ArrowUpDown, 
  Plus, 
  Trash2, 
  Compass,
  RefreshCw,
  Folder,
  ChevronDown,
  Edit2,
  Check
} from 'lucide-react';
import { ColorTheme, MarketCategory, StockSymbol, WatchlistGroup } from '../types/stock';
import { searchStockDirectory, SearchScope, DirectoryStock } from '../data/stockDirectory';
import { formatPrice, getMarketInfo } from '../utils/formatters';
import { fetchBatchQuotes, fetchSingleQuote, mergeQuotesIntoSymbols } from '../services/quoteService';
import { saveWatchlistGroups, setActiveGroupId } from '../services/watchlistStore';

interface WatchlistSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedSymbol: StockSymbol;
  onSelectSymbol: (symbol: StockSymbol) => void;
  colorTheme: ColorTheme;
  searchFocusTrigger?: number;
  groups: WatchlistGroup[];
  activeGroupId: string;
  onUpdateGroups: (groups: WatchlistGroup[]) => void;
  onSelectGroup: (groupId: string) => void;
  currentCategory?: MarketCategory;
}

export const WatchlistSidebar: React.FC<WatchlistSidebarProps> = ({
  isOpen,
  onToggle,
  selectedSymbol,
  onSelectSymbol,
  colorTheme,
  searchFocusTrigger,
  groups,
  activeGroupId,
  onUpdateGroups,
  onSelectGroup,
  currentCategory,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'changeDesc' | 'changeAsc'>('default');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 當外部大分類分頁切換時，自動同步自選側邊欄的市場過濾範圍
  useEffect(() => {
    if (currentCategory === 'domestic') setSearchScope('DOMESTIC');
    else if (currentCategory === 'foreign') setSearchScope('FOREIGN');
    else if (currentCategory === 'crypto') setSearchScope('CRYPTO');
    else if (currentCategory === 'indices') setSearchScope('ALL');
  }, [currentCategory]);
  
  // 清單切換與管理下拉狀態
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isCreatingNewGroup, setIsCreatingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 當前啟用的清單群組
  const activeGroup = useMemo(() => {
    return groups.find((g) => g.id === activeGroupId) || groups[0] || {
      id: 'default',
      name: '核心自選',
      symbols: [],
      createdAt: Date.now(),
    };
  }, [groups, activeGroupId]);

  const symbols = activeGroup.symbols;

  // 1. 同步當前主要圖表所載入之最新即時報價入目前清單
  useEffect(() => {
    if (selectedSymbol && typeof selectedSymbol.price === 'number') {
      const exists = symbols.some((s) => s.symbol === selectedSymbol.symbol);
      if (exists) {
        const updatedSymbols = symbols.map((s) =>
          s.symbol === selectedSymbol.symbol
            ? {
                ...s,
                price: selectedSymbol.price,
                change: selectedSymbol.change,
                changePercent: selectedSymbol.changePercent,
              }
            : s
        );
        const updatedGroups = groups.map((g) =>
          g.id === activeGroup.id ? { ...g, symbols: updatedSymbols } : g
        );
        onUpdateGroups(updatedGroups);
        saveWatchlistGroups(updatedGroups);
      }
    }
  }, [selectedSymbol.symbol, selectedSymbol.price, selectedSymbol.change, selectedSymbol.changePercent]);

  // 2. 批次抓取並同步當前自選清單即時報價
  const refreshWatchlistQuotes = async () => {
    if (!symbols.length || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const quotes = await fetchBatchQuotes(symbols.map((s) => s.symbol));
      const updatedSymbols = mergeQuotesIntoSymbols(symbols, quotes);
      const updatedGroups = groups.map((g) =>
        g.id === activeGroup.id ? { ...g, symbols: updatedSymbols } : g
      );
      onUpdateGroups(updatedGroups);
      saveWatchlistGroups(updatedGroups);
      setLastUpdated(new Date());
    } catch (err) {
      console.warn('[WatchlistSidebar] Failed to refresh quotes:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 3. 元件掛載時與切換清單時自動更新報價 (30 秒輪詢)
  useEffect(() => {
    refreshWatchlistQuotes();
    const interval = setInterval(() => {
      refreshWatchlistQuotes();
    }, 30000);
    return () => clearInterval(interval);
  }, [activeGroup.id]);

  // 當外部觸發按鍵 '/' 時聚焦搜尋框
  useEffect(() => {
    if (searchFocusTrigger && searchInputRef.current && isOpen) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    }
  }, [searchFocusTrigger, isOpen]);

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsGroupDropdownOpen(false);
        setIsCreatingNewGroup(false);
        setEditingGroupId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUp = (change: number) => change >= 0;
  const getChangeColor = (change: number) => {
    if (colorTheme === 'international') {
      return isUp(change) 
        ? 'text-pro-up bg-emerald-500/10 border-emerald-500/20' 
        : 'text-pro-down bg-rose-500/10 border-rose-500/20';
    } else {
      return isUp(change) 
        ? 'text-pro-down bg-rose-500/10 border-rose-500/20' 
        : 'text-pro-up bg-emerald-500/10 border-emerald-500/20';
    }
  };

  // 當前自選股依搜尋範圍與關鍵字過濾
  const displayedWatchlist = useMemo(() => {
    return symbols.filter((s) => {
      if (searchScope === 'DOMESTIC' && s.market !== 'TW') return false;
      if (searchScope === 'FOREIGN' && (s.market === 'TW' || s.market === 'CRYPTO' || s.isIndex)) return false;
      if (searchScope === 'INDICES' && !s.isIndex) return false;
      if (searchScope === 'CRYPTO' && s.market !== 'CRYPTO') return false;
      if (!searchTerm.trim()) return true;

      const q = searchTerm.trim().toLowerCase();
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      if (sortBy === 'changeDesc') return b.changePercent - a.changePercent;
      if (sortBy === 'changeAsc') return a.changePercent - b.changePercent;
      return 0;
    });
  }, [symbols, searchTerm, searchScope, sortBy]);

  // 全域股票名錄搜尋匹配 (僅當有輸入關鍵字時觸發)
  const directoryMatches = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return searchStockDirectory(searchTerm, searchScope).slice(0, 15);
  }, [searchTerm, searchScope]);

  // 自訂代號識別
  const customQuery = useMemo(() => {
    if (!searchTerm.trim()) return null;
    const raw = searchTerm.trim().toUpperCase();
    const inWatchlist = symbols.some((s) => s.symbol.toUpperCase() === raw || s.name.toUpperCase().includes(raw));
    const inDirectory = directoryMatches.some((d) => d.symbol.toUpperCase() === raw);
    if (inWatchlist || inDirectory) return null;

    let symbol = raw;
    let market: 'US' | 'TW' | 'CRYPTO' = 'US';
    let currency = 'USD';

    if (/^\d{4,6}$/.test(raw)) {
      symbol = `${raw}.TW`;
      market = 'TW';
      currency = 'TWD';
    } else if (raw.endsWith('.TW') || raw.endsWith('.TWO')) {
      market = 'TW';
      currency = 'TWD';
    } else if (raw.includes('USDT') || raw.includes('BTC') || raw.includes('ETH')) {
      market = 'CRYPTO';
      currency = 'USDT';
    }

    if (searchScope === 'DOMESTIC' && market !== 'TW') return null;
    if (searchScope === 'FOREIGN' && market === 'TW') return null;

    return { symbol, market, currency };
  }, [searchTerm, symbols, directoryMatches, searchScope]);

  // 核心邏輯：僅點擊查看（載入圖表，不自動加入自選）
  const handleViewStock = (stock: StockSymbol | DirectoryStock) => {
    onSelectSymbol(stock);
    setSearchTerm('');
  };

  // 核心邏輯：使用者主動點擊「加入」按鈕時才加入目前自選清單
  const handleExplicitAdd = (stock: StockSymbol | DirectoryStock) => {
    const exists = symbols.some((s) => s.symbol === stock.symbol);
    if (exists) {
      alert(`【${stock.name}】已在「${activeGroup.name}」自選清單中！`);
      return;
    }

    const newStock: StockSymbol = {
      symbol: stock.symbol,
      name: stock.name,
      market: stock.market,
      price: stock.price || 100,
      change: stock.change || 0,
      changePercent: stock.changePercent || 0,
      currency: stock.currency,
    };

    const updatedSymbols = [newStock, ...symbols];
    const updatedGroups = groups.map((g) =>
      g.id === activeGroup.id ? { ...g, symbols: updatedSymbols } : g
    );
    onUpdateGroups(updatedGroups);
    saveWatchlistGroups(updatedGroups);

    // 立即向即時 API 抓取最新真實市場價格更新
    fetchSingleQuote(stock.symbol).then((q) => {
      if (q) {
        const enrichedSymbols = updatedSymbols.map((s) =>
          s.symbol === stock.symbol
            ? { ...s, price: q.price, change: q.change, changePercent: q.changePercent }
            : s
        );
        const enrichedGroups = groups.map((g) =>
          g.id === activeGroup.id ? { ...g, symbols: enrichedSymbols } : g
        );
        onUpdateGroups(enrichedGroups);
        saveWatchlistGroups(enrichedGroups);
      }
    });

    onSelectSymbol(newStock);
    setSearchTerm('');
  };

  // 快捷載入自訂代號 (點擊查看)
  const handleViewCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customQuery) return;

    const newStock: StockSymbol = {
      symbol: customQuery.symbol,
      name: customQuery.market === 'TW' ? `台股 ${customQuery.symbol}` : `美股 ${customQuery.symbol}`,
      market: customQuery.market,
      price: customQuery.market === 'TW' ? 100 : 150,
      change: 0,
      changePercent: 0,
      currency: customQuery.currency,
    };

    onSelectSymbol(newStock);
    setSearchTerm('');
  };

  // 自訂代號主動加入自選
  const handleAddCustom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!customQuery) return;

    const newStock: StockSymbol = {
      symbol: customQuery.symbol,
      name: customQuery.market === 'TW' ? `台股 ${customQuery.symbol}` : `美股 ${customQuery.symbol}`,
      market: customQuery.market,
      price: customQuery.market === 'TW' ? 100 : 150,
      change: 0,
      changePercent: 0,
      currency: customQuery.currency,
    };

    handleExplicitAdd(newStock);
  };

  // 從目前清單移除單一股票
  const handleRemoveSymbol = (e: React.MouseEvent, symbolToRemove: string) => {
    e.stopPropagation();
    const updatedSymbols = symbols.filter((s) => s.symbol !== symbolToRemove);
    const updatedGroups = groups.map((g) =>
      g.id === activeGroup.id ? { ...g, symbols: updatedSymbols } : g
    );
    onUpdateGroups(updatedGroups);
    saveWatchlistGroups(updatedGroups);

    if (selectedSymbol.symbol === symbolToRemove && updatedSymbols.length > 0) {
      onSelectSymbol(updatedSymbols[0]);
    }
  };

  // 清單管理：建立新清單
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    const newGroup: WatchlistGroup = {
      id: `group_${Date.now()}`,
      name,
      symbols: [],
      createdAt: Date.now(),
    };

    const nextGroups = [...groups, newGroup];
    onUpdateGroups(nextGroups);
    saveWatchlistGroups(nextGroups);
    onSelectGroup(newGroup.id);
    setActiveGroupId(newGroup.id);
    setNewGroupName('');
    setIsCreatingNewGroup(false);
    setIsGroupDropdownOpen(false);
  };

  // 清單管理：重新命名清單
  const handleRenameGroup = (groupId: string, e: React.FormEvent) => {
    e.preventDefault();
    const name = editingGroupName.trim();
    if (!name) return;

    const nextGroups = groups.map((g) =>
      g.id === groupId ? { ...g, name } : g
    );
    onUpdateGroups(nextGroups);
    saveWatchlistGroups(nextGroups);
    setEditingGroupId(null);
  };

  // 清單管理：刪除清單
  const handleDeleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (groups.length <= 1) {
      alert('系統至少需保留 1 個自選清單！');
      return;
    }
    const target = groups.find((g) => g.id === groupId);
    if (!window.confirm(`確定要刪除「${target?.name}」自選清單嗎？清單內的股票將一併清除。`)) {
      return;
    }

    const nextGroups = groups.filter((g) => g.id !== groupId);
    onUpdateGroups(nextGroups);
    saveWatchlistGroups(nextGroups);

    if (activeGroupId === groupId) {
      onSelectGroup(nextGroups[0].id);
      setActiveGroupId(nextGroups[0].id);
    }
  };
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="w-8 bg-pro-panel hover:bg-pro-hover border-l border-pro-border flex flex-col items-center justify-between text-pro-muted hover:text-white transition-colors select-none py-4 shrink-0"
        title="展開自選股側邊欄 (快捷鍵: Tab)"
      >
        <Star size={14} className="text-amber-400" />
        <span className="text-[11px] [writing-mode:vertical-lr] tracking-widest text-pro-muted hover:text-white font-medium">
          自選行情
        </span>
        <span className="text-[9px] font-mono opacity-50 px-1 py-0.5 rounded bg-white/5">Tab</span>
      </button>
    );
  }

  return (
    <div className="w-72 bg-pro-panel border-l border-pro-border flex flex-col h-full select-none z-10 shrink-0 text-pro-text">
      {/* 頂部標題與清單切換下拉列 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-pro-border bg-pro-panel relative" ref={dropdownRef}>
        {/* 自選清單下拉切換器 */}
        <div className="relative">
          <button
            onClick={() => setIsGroupDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 font-bold text-white text-xs hover:text-pro-accent transition-colors py-1 px-1.5 rounded-lg hover:bg-pro-hover"
            title="點擊切換或管理自訂自選清單"
          >
            <Folder size={14} className="text-amber-400" />
            <span className="max-w-[110px] truncate">{activeGroup.name}</span>
            <span className="text-[10px] font-mono text-pro-muted">({symbols.length})</span>
            <ChevronDown size={12} className={`text-pro-muted transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* 清單切換與建立選單 */}
          {isGroupDropdownOpen && (
            <div className="absolute left-0 top-9 w-60 bg-pro-card border border-pro-border rounded-xl shadow-2xl p-2 z-50 animate-in fade-in space-y-2">
              <div className="text-[11px] font-bold text-pro-muted px-1.5 py-0.5 flex items-center justify-between">
                <span>我的自選股票庫</span>
                <span className="text-[10px] font-mono">共 {groups.length} 個</span>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {groups.map((g) => {
                  const isActive = g.id === activeGroup.id;
                  const isEditing = editingGroupId === g.id;

                  if (isEditing) {
                    return (
                      <form
                        key={g.id}
                        onSubmit={(e) => handleRenameGroup(g.id, e)}
                        className="flex items-center gap-1 p-1 bg-pro-input rounded-lg border border-pro-accent"
                      >
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value)}
                          autoFocus
                          className="flex-1 bg-transparent text-xs text-white px-1 focus:outline-none"
                        />
                        <button type="submit" className="text-xs text-emerald-400 px-1 font-bold">儲存</button>
                        <button type="button" onClick={() => setEditingGroupId(null)} className="text-xs text-pro-muted px-1">取消</button>
                      </form>
                    );
                  }

                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        onSelectGroup(g.id);
                        setActiveGroupId(g.id);
                        setIsGroupDropdownOpen(false);
                      }}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-pro-accent/20 border border-pro-accent/40 text-white font-bold'
                          : 'hover:bg-pro-hover text-pro-muted hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <Folder size={12} className={isActive ? 'text-amber-400' : 'text-pro-muted'} />
                        <span className="truncate">{g.name}</span>
                        <span className="text-[10px] font-mono opacity-60">({g.symbols.length})</span>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroupId(g.id);
                            setEditingGroupName(g.name);
                          }}
                          className="p-1 hover:text-white"
                          title="重命名此清單"
                        >
                          <Edit2 size={11} />
                        </button>

                        {groups.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteGroup(g.id, e)}
                            className="p-1 hover:text-rose-400"
                            title="刪除此清單"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 新增自選清單按鈕與輸入框 */}
              {isCreatingNewGroup ? (
                <form onSubmit={handleCreateGroup} className="pt-1.5 border-t border-pro-border flex flex-col gap-1.5">
                  <input
                    type="text"
                    placeholder="輸入新清單名稱 (如: AI概念股)..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    autoFocus
                    className="w-full bg-pro-input border border-pro-border rounded-lg px-2 py-1 text-xs text-white placeholder-pro-muted focus:outline-none focus:border-pro-accent"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setIsCreatingNewGroup(false)}
                      className="px-2 py-0.5 rounded text-[11px] text-pro-muted hover:text-white"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={!newGroupName.trim()}
                      className="px-2.5 py-0.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[11px] font-bold"
                    >
                      建立
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingNewGroup(true)}
                  className="w-full py-1.5 border border-dashed border-pro-border hover:border-pro-accent text-pro-muted hover:text-pro-accent rounded-lg text-xs flex items-center justify-center gap-1 transition-colors"
                >
                  <Plus size={13} />
                  <span>新增自選清單</span>
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* 右側操作按鈕 */}
        <div className="flex items-center gap-1">
          {/* 即時脈衝指示 */}
          <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title={`即時報價 (更新: ${lastUpdated.toLocaleTimeString()})`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            即時
          </span>

          {/* 手動重新整理按鈕 */}
          <button
            onClick={() => refreshWatchlistQuotes()}
            disabled={isRefreshing}
            className="p-1 text-pro-muted hover:text-white rounded hover:bg-pro-hover transition-colors"
            title={`手動刷新自選股即時行情 (最後更新: ${lastUpdated.toLocaleTimeString()})`}
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-pro-accent' : ''} />
          </button>

          {/* 排序按鈕 */}
          <button
            onClick={() => {
              setSortBy((prev) => (prev === 'default' ? 'changeDesc' : prev === 'changeDesc' ? 'changeAsc' : 'default'));
            }}
            className="p-1 text-pro-muted hover:text-white rounded hover:bg-pro-hover"
            title={`排序方式: ${sortBy === 'default' ? '預設' : sortBy === 'changeDesc' ? '漲幅由高至低' : '跌幅由大至小'}`}
          >
            <ArrowUpDown size={13} className={sortBy !== 'default' ? 'text-pro-accent' : ''} />
          </button>

          {/* 收合按鈕 */}
          <button
            onClick={onToggle}
            className="p-1 text-pro-muted hover:text-white rounded hover:bg-pro-hover"
            title="收合側邊欄 (快捷鍵: Tab)"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* 搜尋列與三大分類模式切換 */}
      <div className="p-2.5 border-b border-pro-border space-y-2 bg-pro-bg/30">
        <form onSubmit={handleViewCustom} className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-pro-muted" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="搜尋公司名稱或代號 (如: 長榮, 微軟, 2330)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-pro-input border border-pro-border rounded-lg pl-8 pr-8 py-1.5 text-xs text-white placeholder-pro-muted focus:outline-none focus:border-pro-accent focus:ring-1 focus:ring-pro-accent font-sans"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-pro-muted hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </form>

        {/* 四大市場分類篩選切換 (無發光，純淨高對比標籤) */}
        <div className="grid grid-cols-4 gap-1 bg-pro-input p-0.5 rounded-lg border border-pro-border text-[10px]">
          <button
            onClick={() => setSearchScope('ALL')}
            className={`py-1 rounded text-center transition-all font-medium flex items-center justify-center gap-1 border ${
              searchScope === 'ALL'
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'text-pro-muted hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Compass size={11} />
            <span>全部</span>
          </button>

          <button
            onClick={() => setSearchScope('DOMESTIC')}
            className={`py-1 rounded text-center transition-all font-medium flex items-center justify-center gap-0.5 border ${
              searchScope === 'DOMESTIC'
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'text-pro-muted hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <span>🇹🇼 台股</span>
          </button>

          <button
            onClick={() => setSearchScope('FOREIGN')}
            className={`py-1 rounded text-center transition-all font-medium flex items-center justify-center gap-0.5 border ${
              searchScope === 'FOREIGN'
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'text-pro-muted hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <span>🇺🇸 美股</span>
          </button>

          <button
            onClick={() => setSearchScope('CRYPTO')}
            className={`py-1 rounded text-center transition-all font-medium flex items-center justify-center gap-0.5 border ${
              searchScope === 'CRYPTO'
                ? 'bg-blue-600 text-white border-blue-500 font-bold'
                : 'text-pro-muted hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <span>🪙 加密</span>
          </button>
        </div>

        {/* 自訂代號卡片：區分「點擊查看」與「主動加入自選」 */}
        {customQuery && (
          <div className="w-full p-2 bg-blue-950/30 border border-blue-500/40 rounded-lg flex items-center justify-between gap-2 animate-fade-in">
            <div 
              onClick={() => handleViewCustom()}
              className="flex-1 cursor-pointer hover:underline"
              title="點擊僅在圖表查看走勢 (不加入自選)"
            >
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>{customQuery.symbol}</span>
                <span className="text-[10px] text-blue-300 font-normal">(點擊僅查看)</span>
              </div>
            </div>

            <button
              onClick={handleAddCustom}
              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-bold flex items-center gap-1 shadow-sm transition-colors"
              title={`將 ${customQuery.symbol} 加入「${activeGroup.name}」自選庫`}
            >
              <Plus size={12} />
              <span>加入自選</span>
            </button>
          </div>
        )}
      </div>

      {/* 搜尋結果與自選列表 */}
      <div className="flex-1 overflow-y-auto divide-y divide-pro-border/30">
        {/* 名錄搜尋結果：區分「點擊查看」與「主動按鈕加入自選」 */}
        {directoryMatches.length > 0 && (
          <div className="bg-blue-950/20 border-b border-blue-500/20">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-blue-300 bg-blue-500/10 flex items-center justify-between">
              <span>搜尋結果 (點擊左側僅查看，點擊按鈕加入自選)</span>
            </div>
            {directoryMatches.map((item) => {
              const alreadyInActive = symbols.some((s) => s.symbol === item.symbol);
              return (
                <div
                  key={item.symbol}
                  className="px-3 py-2 text-left flex items-center justify-between hover:bg-blue-600/15 transition-all group"
                >
                  {/* 左側點擊區域：僅載入圖表查看，不加入自選 */}
                  <div 
                    onClick={() => handleViewStock(item)}
                    className="flex-1 cursor-pointer pr-2"
                    title="點擊在主圖載入看盤 (不加入自選庫)"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs font-mono tracking-wide">{item.symbol}</span>
                      <span className={`text-[9px] px-1 py-0.2 rounded font-mono border ${getMarketInfo(item.market).badgeClass}`}>
                        {getMarketInfo(item.market).label}
                      </span>
                    </div>
                    <div className="text-[11px] text-blue-200 mt-0.5 truncate max-w-[130px]">
                      {item.name}
                    </div>
                  </div>

                  {/* 右側加入自選按鈕：使用者明確按下後才加入自選庫 */}
                  {alreadyInActive ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                      <Check size={11} />
                      已在自選
                    </span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExplicitAdd(item);
                      }}
                      className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                      title={`加入「${activeGroup.name}」自選清單`}
                    >
                      <Plus size={11} />
                      加入自選
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 當前清單內的自選股 */}
        {displayedWatchlist.map((item) => {
          const isSelected = item.symbol === selectedSymbol.symbol;
          const up = isUp(item.change);
          return (
            <div
              key={item.symbol}
              onClick={() => onSelectSymbol(item)}
              className={`group w-full px-3 py-2 text-left flex items-center justify-between cursor-pointer transition-all ${
                isSelected 
                  ? 'bg-[#1e222d] border-l-[3px] border-blue-500 shadow-sm' 
                  : 'hover:bg-pro-hover/50'
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`font-mono tracking-wide ${isSelected ? 'font-black text-white text-sm' : 'font-bold text-white text-xs'}`}>
                    {item.symbol}
                  </span>
                  <span className={`text-[9px] px-1 py-0.2 rounded font-mono border ${getMarketInfo(item.market).badgeClass}`}>
                    {getMarketInfo(item.market).label}
                  </span>
                </div>
                <div className={`truncate max-w-[130px] mt-0.5 ${isSelected ? 'text-xs font-bold text-slate-100' : 'text-[11px] text-pro-muted'}`}>
                  {item.name}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="font-mono financial-number text-xs font-bold text-white">
                    {formatPrice(item.price, item.currency)}
                  </div>
                  <div
                    className={`inline-flex items-center gap-0.5 text-[10px] font-mono financial-number font-semibold px-1.5 py-0.2 rounded border mt-0.5 ${getChangeColor(
                      item.change
                    )}`}
                  >
                    {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    <span>
                      {up ? '+' : ''}
                      {item.changePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* 刪除自選按鈕 */}
                <button
                  onClick={(e) => handleRemoveSymbol(e, item.symbol)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 text-pro-muted hover:text-rose-400 transition-opacity"
                  title="從此自選清單移除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {displayedWatchlist.length === 0 && directoryMatches.length === 0 && !customQuery && (
          <div className="py-12 text-center text-xs text-pro-muted px-4 space-y-1">
            <p>目前「{activeGroup.name}」清單尚無自選股</p>
            <p className="text-[11px] opacity-75">可在上方搜尋公司名稱或代號，按下「+ 加入自選」即可加入！</p>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="px-3 py-1.5 border-t border-pro-border bg-pro-bg/50 text-[10px] text-pro-muted flex items-center justify-between font-mono">
        <span>清單: {activeGroup.name}</span>
        <span>共 {symbols.length} 檔</span>
      </div>
    </div>
  );
};
