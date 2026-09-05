import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { ChartActionBar } from './components/ChartActionBar';
import { SmartSummaryBanner } from './components/SmartSummaryBanner';
import { DrawingToolbar } from './components/DrawingToolbar';
import { ChartContainer } from './components/ChartContainer';
import { WatchlistSidebar } from './components/WatchlistSidebar';
import { IndicatorModal } from './components/IndicatorModal';
import { EducationModal } from './components/EducationModal';
import { SystemHealthModal } from './components/SystemHealthModal';
import { ScreenerModal } from './components/ScreenerModal';
import { BacktestModal } from './components/BacktestModal';
import { FundamentalModal } from './components/FundamentalModal';
import { PaperTradingModal } from './components/PaperTradingModal';
import { AlertsModal } from './components/AlertsModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { UpdateModal } from './components/UpdateModal';
import { GlobalMarketIndicesPage } from './components/GlobalMarketIndicesPage';
import { ErrorBoundary } from './components/ErrorBoundary';

import { ColorTheme, DataStatus, DrawingToolType, MarketCategory, Period, StockSymbol, WatchlistGroup } from './types/stock';
import { UpdaterState } from './types/updater';
import { ShortcutMap } from './types/shortcuts';
import { loadShortcuts, saveShortcuts, resetShortcuts, matchKeyEvent } from './utils/shortcutManager';
import { POPULAR_SYMBOLS, generateRealisticKLineData } from './data/stockService';
import { fetchStockCandles } from './data/stockApi';
import { analyzeMarketStatus } from './utils/smartDiagnosis';
import { AlertService } from './services/alertService';
import { PaperTradingService } from './services/paperTradingService';
import { loadWatchlistGroups, saveWatchlistGroups, getActiveGroupId, setActiveGroupId } from './services/watchlistStore';
import { KLineData } from 'klinecharts';

export const App: React.FC = () => {
  // 1. 股票標的與四大市場分頁分類狀態 (國內股票 / 國外股票 / 大盤指數 / 虛擬貨幣)
  const [currentCategory, setCurrentCategory] = useState<MarketCategory>('domestic');
  const [selectedSymbol, setSelectedSymbol] = useState<StockSymbol>(() => {
    return POPULAR_SYMBOLS.find((s) => s.symbol === '2330.TW') || POPULAR_SYMBOLS[0];
  });
  const [activeTab, setActiveTab] = useState<'chart' | 'indices'>('chart');
  const [period, setPeriod] = useState<Period>('1D');
  const [klineData, setKlineData] = useState<KLineData[]>([]);
  const [dataStatus, setDataStatus] = useState<DataStatus>('simulated');
  const [isAdjusted, setIsAdjusted] = useState<boolean>(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState<boolean>(false);
  const [showSMC, setShowSMC] = useState<boolean>(false);
  const [isDualSplit, setIsDualSplit] = useState<boolean>(false);

  // 2. 配色與顯示模式
  const [colorTheme, setColorTheme] = useState<ColorTheme>(() => {
    return (localStorage.getItem('prostock_color_theme') as ColorTheme) || 'international';
  });

  // 3. 指標狀態
  const [mainIndicators, setMainIndicators] = useState<string[]>(() => {
    const saved = localStorage.getItem('prostock_main_indicators');
    return saved ? JSON.parse(saved) : ['MA', 'BOLL'];
  });
  const [subIndicators, setSubIndicators] = useState<string[]>(() => {
    const saved = localStorage.getItem('prostock_sub_indicators');
    return saved ? JSON.parse(saved) : ['VOL', 'MACD', 'RSI'];
  });

  // 4. 畫線工具、顏色與磁吸
  const [activeTool, setActiveTool] = useState<DrawingToolType>('none');
  const [isMagnet, setIsMagnet] = useState<boolean>(true);
  const [selectedColor, setSelectedColor] = useState<string>('auto');
  const [drawingCount, setDrawingCount] = useState<number>(0);

  // 最新現價水平線開關狀態 (支援記憶庫持久化，預設開啟)
  const [showLastPriceLine, setShowLastPriceLine] = useState<boolean>(() => {
    const saved = localStorage.getItem('pro_stock_show_last_price_line');
    return saved !== null ? saved === 'true' : true;
  });

  const handleToggleLastPriceLine = useCallback(() => {
    setShowLastPriceLine((prev) => {
      const next = !prev;
      localStorage.setItem('pro_stock_show_last_price_line', String(next));
      return next;
    });
  }, []);

  // 5. 側邊欄與各類彈窗
  const [isWatchlistOpen, setIsWatchlistOpen] = useState<boolean>(true);
  const [searchFocusTrigger, setSearchFocusTrigger] = useState<number>(0);

  // 自選股清單群組與管理狀態
  const [watchlistGroups, setWatchlistGroups] = useState<WatchlistGroup[]>(() => loadWatchlistGroups());
  const [activeGroupId, setActiveGroupIdState] = useState<string>(() => getActiveGroupId());

  const activeWatchlistGroup = useMemo(() => {
    return watchlistGroups.find((g) => g.id === activeGroupId) || watchlistGroups[0] || {
      id: 'default',
      name: '核心自選',
      symbols: [],
      createdAt: Date.now(),
    };
  }, [watchlistGroups, activeGroupId]);

  const isInWatchlist = useMemo(() => {
    if (!activeWatchlistGroup) return false;
    return activeWatchlistGroup.symbols.some((s) => s.symbol === selectedSymbol.symbol);
  }, [activeWatchlistGroup, selectedSymbol.symbol]);

  const handleUpdateWatchlistGroups = useCallback((newGroups: WatchlistGroup[]) => {
    setWatchlistGroups(newGroups);
    saveWatchlistGroups(newGroups);
  }, []);

  const handleSelectWatchlistGroup = useCallback((groupId: string) => {
    setActiveGroupIdState(groupId);
    setActiveGroupId(groupId);
  }, []);

  const handleToggleWatchlist = useCallback(() => {
    if (!activeWatchlistGroup) return;
    const exists = activeWatchlistGroup.symbols.some((s) => s.symbol === selectedSymbol.symbol);
    const updatedSymbols = exists
      ? activeWatchlistGroup.symbols.filter((s) => s.symbol !== selectedSymbol.symbol)
      : [selectedSymbol, ...activeWatchlistGroup.symbols];

    const updatedGroups = watchlistGroups.map((g) =>
      g.id === activeWatchlistGroup.id ? { ...g, symbols: updatedSymbols } : g
    );

    handleUpdateWatchlistGroups(updatedGroups);
  }, [activeWatchlistGroup, selectedSymbol, watchlistGroups, handleUpdateWatchlistGroups]);

  const [isIndicatorModalOpen, setIsIndicatorModalOpen] = useState<boolean>(false);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState<boolean>(false);
  const [educationTargetId, setEducationTargetId] = useState<string>('MA');
  const [isHealthModalOpen, setIsHealthModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);

  // 旗艦功能彈窗
  const [isScreenerOpen, setIsScreenerOpen] = useState<boolean>(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState<boolean>(false);
  const [isFundamentalOpen, setIsFundamentalOpen] = useState<boolean>(false);
  const [isPaperTradingOpen, setIsPaperTradingOpen] = useState<boolean>(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);
  const [updaterState, setUpdaterState] = useState<UpdaterState>({
    status: 'idle',
    currentVersion: '1.0.0',
    info: null,
    progress: null,
    error: null,
    lastCheckedTime: null
  });

  // 全域更新推播監聽 (由 Electron 主進程安全推送)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electronAPI?.updater) {
      const { updater } = window.electronAPI;
      updater.getCurrentState().then((state) => {
        if (state) setUpdaterState((prev) => ({ ...prev, ...state }));
      }).catch(() => {});

      updater.getAppVersion().then((version) => {
        if (version) {
          setUpdaterState((prev) => ({ ...prev, currentVersion: version }));
        }
      }).catch(() => {});

      const unsubscribe = updater.onStatusChanged((newState) => {
        setUpdaterState(newState);
        if (newState.status === 'available') {
          setIsUpdateModalOpen(true);
        }
      });

      return () => {
        unsubscribe();
      };
    }
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.checkForUpdates();
    } else {
      setUpdaterState((prev) => ({ ...prev, status: 'checking', error: null }));
      setTimeout(() => {
        setUpdaterState((prev) => ({
          ...prev,
          status: 'available',
          info: {
            version: '1.1.0',
            releaseDate: new Date().toISOString(),
            releaseNotes: '### ✨ ProStock v1.1.0 重大更新\n- 🛡️ 全面導入 SHA-512 完整性防偽檢驗\n- 📈 機構級 VWAP 與籌碼分佈 (Volume Profile)\n- ⚡ 畫線引擎效能優化',
            sha512: 'mock_sha512_hash_verified'
          }
        }));
      }, 1000);
    }
  }, []);

  const handleStartDownload = useCallback(async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.startDownloadUpdate();
    } else {
      setUpdaterState((prev) => ({
        ...prev,
        status: 'downloading',
        progress: { percent: 20, bytesPerSecond: 1048576, transferred: 10485760, total: 52428800 }
      }));
      setTimeout(() => {
        setUpdaterState((prev) => ({
          ...prev,
          status: 'downloading',
          progress: { percent: 70, bytesPerSecond: 2097152, transferred: 36700160, total: 52428800 }
        }));
      }, 800);
      setTimeout(() => {
        setUpdaterState((prev) => ({
          ...prev,
          status: 'downloaded',
          progress: { percent: 100, bytesPerSecond: 2097152, transferred: 52428800, total: 52428800 }
        }));
      }, 1600);
    }
  }, []);

  const handleQuitAndInstall = useCallback(async () => {
    if (window.electronAPI?.updater) {
      await window.electronAPI.updater.quitAndInstall();
    } else {
      alert('已成功模擬安裝新版本，正在重啟！');
      setUpdaterState((prev) => ({ ...prev, status: 'idle', currentVersion: '1.1.0' }));
      setIsUpdateModalOpen(false);
    }
  }, []);

  // 6. 使用者客製化快捷鍵管理
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(() => loadShortcuts());

  const handleUpdateShortcut = (id: string, newKey: string) => {
    setShortcuts((prev) => {
      const next = { ...prev, [id]: newKey };
      saveShortcuts(next);
      return next;
    });
  };

  const handleResetShortcuts = () => {
    const defaultMap = resetShortcuts();
    setShortcuts(defaultMap);
  };

  // 7. 全域鍵盤極速流操作引擎 (Keyboard-First Engine)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 若當前焦點在輸入框或文字區塊，不觸發全域快捷鍵 (Esc 萬能取消除外)
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.tagName === 'SELECT' || 
        target.isContentEditable
      );

      if (e.key === 'Escape') {
        // 萬能關閉或退出畫線模式
        if (isShortcutsModalOpen) setIsShortcutsModalOpen(false);
        else if (isIndicatorModalOpen) setIsIndicatorModalOpen(false);
        else if (isEducationModalOpen) setIsEducationModalOpen(false);
        else if (isHealthModalOpen) setIsHealthModalOpen(false);
        else if (isScreenerOpen) setIsScreenerOpen(false);
        else if (isBacktestOpen) setIsBacktestOpen(false);
        else if (isFundamentalOpen) setIsFundamentalOpen(false);
        else if (isPaperTradingOpen) setIsPaperTradingOpen(false);
        else if (isAlertsOpen) setIsAlertsOpen(false);
        else if (activeTool !== 'none') setActiveTool('none');
        return;
      }

      if (isInput) return;

      // 檢查是否處於彈窗開啟狀態，若開啟中則只允許特定按鍵
      const isAnyModalOpen =
        isShortcutsModalOpen ||
        isIndicatorModalOpen ||
        isEducationModalOpen ||
        isHealthModalOpen ||
        isScreenerOpen ||
        isBacktestOpen ||
        isFundamentalOpen ||
        isPaperTradingOpen ||
        isAlertsOpen;

      if (isAnyModalOpen) return;

      // 1) 標的切換：下一檔股票 (預設 Space)
      if (matchKeyEvent(e, shortcuts.nextSymbol || 'Space')) {
        e.preventDefault();
        const curIdx = POPULAR_SYMBOLS.findIndex((s) => s.symbol === selectedSymbol.symbol);
        const nextIdx = (curIdx + 1) % POPULAR_SYMBOLS.length;
        setSelectedSymbol(POPULAR_SYMBOLS[nextIdx]);
        return;
      }

      // 2) 標的切換：上一檔股票 (預設 ArrowUp)
      if (matchKeyEvent(e, shortcuts.prevSymbol || 'ArrowUp')) {
        e.preventDefault();
        const curIdx = POPULAR_SYMBOLS.findIndex((s) => s.symbol === selectedSymbol.symbol);
        const prevIdx = (curIdx - 1 + POPULAR_SYMBOLS.length) % POPULAR_SYMBOLS.length;
        setSelectedSymbol(POPULAR_SYMBOLS[prevIdx]);
        return;
      }

      // 3) 標的切換：向下瀏覽 (預設 ArrowDown)
      if (matchKeyEvent(e, shortcuts.nextSymbolDown || 'ArrowDown')) {
        e.preventDefault();
        const curIdx = POPULAR_SYMBOLS.findIndex((s) => s.symbol === selectedSymbol.symbol);
        const nextIdx = (curIdx + 1) % POPULAR_SYMBOLS.length;
        setSelectedSymbol(POPULAR_SYMBOLS[nextIdx]);
        return;
      }

      // 4) 聚焦股票搜尋 (預設 /)
      if (matchKeyEvent(e, shortcuts.focusSearch || '/')) {
        e.preventDefault();
        setIsWatchlistOpen(true);
        setSearchFocusTrigger(Date.now());
        return;
      }

      // 5) 時間週期切換 (1, 5, 3, 6, D, W)
      if (matchKeyEvent(e, shortcuts.period1m || '1')) {
        e.preventDefault();
        setPeriod('1m');
        return;
      }
      if (matchKeyEvent(e, shortcuts.period5m || '5')) {
        e.preventDefault();
        setPeriod('5m');
        return;
      }
      if (matchKeyEvent(e, shortcuts.period15m || '3')) {
        e.preventDefault();
        setPeriod('15m');
        return;
      }
      if (matchKeyEvent(e, shortcuts.period1h || '6')) {
        e.preventDefault();
        setPeriod('1h');
        return;
      }
      if (matchKeyEvent(e, shortcuts.period1D || 'd')) {
        e.preventDefault();
        setPeriod('1D');
        return;
      }
      if (matchKeyEvent(e, shortcuts.period1W || 'w')) {
        e.preventDefault();
        setPeriod('1W');
        return;
      }

      // 6) 畫線工具快捷 (Alt+T, Alt+H, Alt+F, M)
      if (matchKeyEvent(e, shortcuts.toolTrend || 'Alt+t')) {
        e.preventDefault();
        setActiveTool('trendLine');
        return;
      }
      if (matchKeyEvent(e, shortcuts.toolHorizontal || 'Alt+h')) {
        e.preventDefault();
        setActiveTool('horizontalStraightLine');
        return;
      }
      if (matchKeyEvent(e, shortcuts.toolFibonacci || 'Alt+f')) {
        e.preventDefault();
        setActiveTool('fibonacciLine');
        return;
      }
      if (matchKeyEvent(e, shortcuts.toggleMagnet || 'm')) {
        e.preventDefault();
        setIsMagnet((prev) => !prev);
        return;
      }

      // 7) 介面視圖 (C 切換配色, Tab 收合側欄, F 全螢幕)
      if (matchKeyEvent(e, shortcuts.toggleTheme || 'c')) {
        e.preventDefault();
        setColorTheme((prev) => (prev === 'international' ? 'asia' : 'international'));
        return;
      }
      if (matchKeyEvent(e, 'Alt+g') || (e.altKey && e.key.toLowerCase() === 'g')) {
        e.preventDefault();
        setActiveTab((prev) => (prev === 'chart' ? 'indices' : 'chart'));
        return;
      }
      if (matchKeyEvent(e, shortcuts.toggleWatchlist || 'Tab')) {
        e.preventDefault();
        setIsWatchlistOpen((prev) => !prev);
        return;
      }
      if (matchKeyEvent(e, shortcuts.toggleFullscreen || 'f')) {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }

      // 8) 功能彈窗 (I 指標庫, ? 小白百科, K 快捷鍵中心)
      if (matchKeyEvent(e, shortcuts.openIndicators || 'i')) {
        e.preventDefault();
        setIsIndicatorModalOpen(true);
        return;
      }
      if (matchKeyEvent(e, shortcuts.openEducation || '?')) {
        e.preventDefault();
        setIsEducationModalOpen(true);
        return;
      }
      if (matchKeyEvent(e, shortcuts.openShortcuts || 'k')) {
        e.preventDefault();
        setIsShortcutsModalOpen(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    shortcuts,
    selectedSymbol,
    activeTool,
    isShortcutsModalOpen,
    isIndicatorModalOpen,
    isEducationModalOpen,
    isHealthModalOpen,
    isScreenerOpen,
    isBacktestOpen,
    isFundamentalOpen,
    isPaperTradingOpen,
    isAlertsOpen,
  ]);

  // 權威日K基準走勢快取：確保跨週期切換 (1m, 5m, 15m, 1h, 1D, 1W) 時，宏觀盤面多空診斷評分絕對固定精確，不因分時圖雜訊隨意跳動
  const [dailyBenchmarkMap, setDailyBenchmarkMap] = useState<Record<string, KLineData[]>>({});

  // 8. 載入即時/快取/擬真金融 K 線數據
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      const result = await fetchStockCandles(
        selectedSymbol.symbol,
        selectedSymbol.price,
        period,
        isAdjusted
      );

      if (!isCancelled) {
        setKlineData(result.data);
        setDataStatus(result.status);

        // 若當前載入的是日K數據，同步快取為日K權威基準
        if (period === '1D' && result.data && result.data.length > 0) {
          setDailyBenchmarkMap((prev) => ({ ...prev, [selectedSymbol.symbol]: result.data }));
        }

        if (result.currentPrice && result.currentPrice !== selectedSymbol.price) {
          setSelectedSymbol((prev) => ({
            ...prev,
            price: result.currentPrice!,
            change: result.change ?? prev.change,
            changePercent: result.changePercent ?? prev.changePercent,
          }));

          // 自動檢查到價預警
          AlertService.checkAlerts(selectedSymbol.symbol, result.currentPrice);

          // 更新模擬帳戶持倉即時估值
          PaperTradingService.updatePrices({ [selectedSymbol.symbol]: result.currentPrice });
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol.symbol, period, isAdjusted]);

  // 確保所選標的之日K權威基準數據隨時就緒，即使初次進入即切換分時圖亦能維持定錨評級
  useEffect(() => {
    let isCancelled = false;
    const sym = selectedSymbol.symbol;
    if (!dailyBenchmarkMap[sym] || dailyBenchmarkMap[sym].length === 0) {
      fetchStockCandles(sym, selectedSymbol.price, '1D', false)
        .then((res) => {
          if (!isCancelled && res.data && res.data.length > 0) {
            setDailyBenchmarkMap((prev) => ({ ...prev, [sym]: res.data }));
          }
        })
        .catch(() => {});
    }
    return () => {
      isCancelled = true;
    };
  }, [selectedSymbol.symbol, selectedSymbol.price]);

  // 基準日K數據解析：若快取有真實日K則採用，若正在日K週期則採用，否則以確定性種子擬真日K兜底
  const dailyBenchmarkData = useMemo(() => {
    const sym = selectedSymbol.symbol;
    if (dailyBenchmarkMap[sym] && dailyBenchmarkMap[sym].length > 0) {
      return dailyBenchmarkMap[sym];
    }
    if (period === '1D' && klineData.length > 0) {
      return klineData;
    }
    return generateRealisticKLineData(sym, selectedSymbol.price, '1D', 350);
  }, [dailyBenchmarkMap, selectedSymbol.symbol, selectedSymbol.price, period, klineData]);

  // 9. 計算即時小白盤面診斷報告 (以日K權威基準與機構基本面定錨，切換時間週期線時評分固定不亂跳)
  const technicalSummary = useMemo(() => {
    return analyzeMarketStatus(dailyBenchmarkData, selectedSymbol.symbol);
  }, [dailyBenchmarkData, selectedSymbol.symbol]);

  // 儲存配置變更
  useEffect(() => {
    localStorage.setItem('prostock_color_theme', colorTheme);
  }, [colorTheme]);

  useEffect(() => {
    localStorage.setItem('prostock_main_indicators', JSON.stringify(mainIndicators));
  }, [mainIndicators]);

  useEffect(() => {
    localStorage.setItem('prostock_sub_indicators', JSON.stringify(subIndicators));
  }, [subIndicators]);

  // 主副圖指標切換處理
  const handleToggleMainIndicator = (name: string) => {
    setMainIndicators((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  const handleToggleSubIndicator = (name: string) => {
    setSubIndicators((prev) =>
      prev.includes(name) ? prev.filter((i) => i !== name) : [...prev, name]
    );
  };

  // 小白一鍵指標範本
  const handleApplyPreset = (preset: 'novice' | 'oscillator' | 'trend') => {
    if (preset === 'novice') {
      setMainIndicators(['MA']);
      setSubIndicators(['VOL']);
    } else if (preset === 'oscillator') {
      setMainIndicators(['BOLL']);
      setSubIndicators(['RSI', 'KDJ']);
    } else if (preset === 'trend') {
      setMainIndicators(['EMA', 'VWAP']);
      setSubIndicators(['VOL', 'MACD']);
    }
  };

  const handleOpenEducationWithTarget = (id: string) => {
    setEducationTargetId(id);
    setIsEducationModalOpen(true);
  };

  const handleClearAllDrawings = useCallback(() => {
    if (window.confirm(`確定要清除【${selectedSymbol.name}】圖表上的所有畫線標記嗎？`)) {
      if ((window as any).__proStockClearDrawings) {
        (window as any).__proStockClearDrawings();
      }
      setDrawingCount(0);
      setActiveTool('none');
    }
  }, [selectedSymbol.name]);

  // 四大核心分類切換處理函式
  const handleCategoryChange = useCallback((category: MarketCategory) => {
    setCurrentCategory(category);
    if (category === 'indices') {
      setActiveTab('indices');
    } else {
      setActiveTab('chart');
      if (category === 'domestic' && selectedSymbol.market !== 'TW') {
        const defaultTw = POPULAR_SYMBOLS.find((s) => s.market === 'TW') || POPULAR_SYMBOLS[6];
        setSelectedSymbol(defaultTw);
      } else if (category === 'foreign' && (selectedSymbol.market === 'TW' || selectedSymbol.market === 'CRYPTO' || selectedSymbol.isIndex)) {
        const defaultUs = POPULAR_SYMBOLS.find((s) => s.market === 'US') || POPULAR_SYMBOLS[1];
        setSelectedSymbol(defaultUs);
      } else if (category === 'crypto' && selectedSymbol.market !== 'CRYPTO') {
        const defaultCrypto = POPULAR_SYMBOLS.find((s) => s.market === 'CRYPTO') || POPULAR_SYMBOLS[10];
        setSelectedSymbol(defaultCrypto);
      }
    }
  }, [selectedSymbol]);

  // 標的切換 (自選股、搜尋、跳轉) 時自動匹配所屬核心分類
  const handleSelectSymbol = useCallback((symbol: StockSymbol) => {
    setSelectedSymbol(symbol);
    if (symbol.isIndex) {
      setCurrentCategory('indices');
      setActiveTab('chart');
    } else if (symbol.market === 'TW') {
      setCurrentCategory('domestic');
      setActiveTab('chart');
    } else if (symbol.market === 'CRYPTO') {
      setCurrentCategory('crypto');
      setActiveTab('chart');
    } else {
      setCurrentCategory('foreign');
      setActiveTab('chart');
    }
  }, []);

  const handleFinishDrawing = useCallback(() => {
    setActiveTool('none');
  }, []);

  const handleSelectIndexFromHub = useCallback((symbol: StockSymbol) => {
    setSelectedSymbol(symbol);
    setCurrentCategory('indices');
    setActiveTab('chart');
  }, []);

  return (
    <ErrorBoundary>
      <div className="flex flex-col w-screen h-screen bg-pro-bg overflow-hidden text-pro-text select-none">
        {/* 頂部旗艦導覽列 (44px 標準高密排版 + 四大核心分類分頁 + 工具箱下拉) */}
        <Navbar
          currentCategory={currentCategory}
          onChangeCategory={handleCategoryChange}
          colorTheme={colorTheme}
          onToggleColorTheme={() =>
            setColorTheme((prev) => (prev === 'international' ? 'asia' : 'international'))
          }
          onOpenIndicators={() => setIsIndicatorModalOpen(true)}
          onOpenEducation={() => {
            setEducationTargetId('MA');
            setIsEducationModalOpen(true);
          }}
          onOpenHealth={() => setIsHealthModalOpen(true)}
          onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
          activeIndicatorsCount={mainIndicators.length + subIndicators.length}
          onOpenScreener={() => setIsScreenerOpen(true)}
          onOpenBacktest={() => setIsBacktestOpen(true)}
          onOpenFundamentals={() => setIsFundamentalOpen(true)}
          onOpenPaperTrading={() => setIsPaperTradingOpen(true)}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenUpdate={() => setIsUpdateModalOpen(true)}
          hasUpdateAvailable={updaterState.status === 'available' || updaterState.status === 'downloaded'}
          isUpdateDownloading={updaterState.status === 'downloading'}
          updateVersion={updaterState.info?.version}
        />

        {/* 主工作區：依據 activeTab 切換「全球大盤看板」或「個股與幣種技術圖表視圖」 */}
        {activeTab === 'indices' ? (
          <GlobalMarketIndicesPage
            colorTheme={colorTheme}
            onSelectIndex={handleSelectIndexFromHub}
          />
        ) : (
          <>
            {/* 圖表功能與標的實時數據操作列 (40px 高清晰排版，大字標的識別與即時數據) */}
            <ChartActionBar
              currentSymbol={selectedSymbol}
              period={period}
              onChangePeriod={setPeriod}
              colorTheme={colorTheme}
              dataStatus={dataStatus}
              isAdjusted={isAdjusted}
              onToggleAdjusted={() => setIsAdjusted((prev) => !prev)}
              isInWatchlist={isInWatchlist}
              onToggleWatchlist={handleToggleWatchlist}
              showVolumeProfile={showVolumeProfile}
              onToggleVolumeProfile={() => setShowVolumeProfile((prev) => !prev)}
              showSMC={showSMC}
              onToggleSMC={() => setShowSMC((prev) => !prev)}
              isDualSplit={isDualSplit}
              onToggleDualSplit={() => setIsDualSplit((prev) => !prev)}
              onOpenSearch={() => {
                setIsWatchlistOpen(true);
                setSearchFocusTrigger((prev) => prev + 1);
              }}
            />

            {/* 盤面現況智慧診斷橫幅 (三層認知漸進式揭露) */}
            <SmartSummaryBanner
              summary={technicalSummary}
              symbolName={selectedSymbol.name}
              onOpenEducation={() => {
                setEducationTargetId('MA');
                setIsEducationModalOpen(true);
              }}
            />

            {/* 中央主工作區 (左側畫線工具 + 中間 K 線圖表 + 右側自選股行情) */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* 左側專業畫線工具箱 (44px 寬度 + 磁吸 + 快捷提示 + 專屬色盤 + 現價線切換) */}
              <DrawingToolbar
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                isMagnet={isMagnet}
                onToggleMagnet={() => setIsMagnet((prev) => !prev)}
                onClearAll={handleClearAllDrawings}
                shortcuts={shortcuts}
                selectedColor={selectedColor}
                onSelectColor={setSelectedColor}
                drawingCount={drawingCount}
                showLastPriceLine={showLastPriceLine}
                onToggleLastPriceLine={handleToggleLastPriceLine}
              />

              {/* 中央金融圖表 (大字浮水印 + 頂部醒目標題 + 零遮蔽右側刻度軸) */}
              <ChartContainer
                symbol={selectedSymbol.symbol}
                stockName={selectedSymbol.name}
                market={selectedSymbol.market}
                period={period}
                data={klineData}
                colorTheme={colorTheme}
                mainIndicators={mainIndicators}
                subIndicators={subIndicators}
                activeTool={activeTool}
                isMagnet={isMagnet}
                selectedColor={selectedColor}
                onFinishDrawing={handleFinishDrawing}
                onDrawingCountChange={setDrawingCount}
                showVolumeProfile={showVolumeProfile}
                onToggleVolumeProfile={() => setShowVolumeProfile((prev) => !prev)}
                showSMC={showSMC}
                onToggleSMC={() => setShowSMC((prev) => !prev)}
                isDualSplit={isDualSplit}
                showLastPriceLine={showLastPriceLine}
              />

              {/* 右側自選股清單 (支援多自選清單、四大市場分類過濾、即時行情) */}
              <WatchlistSidebar
                isOpen={isWatchlistOpen}
                onToggle={() => setIsWatchlistOpen((prev) => !prev)}
                selectedSymbol={selectedSymbol}
                onSelectSymbol={handleSelectSymbol}
                colorTheme={colorTheme}
                searchFocusTrigger={searchFocusTrigger}
                groups={watchlistGroups}
                activeGroupId={activeGroupId}
                onUpdateGroups={handleUpdateWatchlistGroups}
                onSelectGroup={handleSelectWatchlistGroup}
                currentCategory={currentCategory}
              />
            </div>
          </>
        )}

        {/* 彈窗管理 */}
        <IndicatorModal
          isOpen={isIndicatorModalOpen}
          onClose={() => setIsIndicatorModalOpen(false)}
          mainIndicators={mainIndicators}
          subIndicators={subIndicators}
          onToggleMain={handleToggleMainIndicator}
          onToggleSub={handleToggleSubIndicator}
          onOpenEducation={handleOpenEducationWithTarget}
          onApplyPreset={handleApplyPreset}
        />

        <EducationModal
          isOpen={isEducationModalOpen}
          onClose={() => setIsEducationModalOpen(false)}
          initialIndicatorId={educationTargetId}
        />

        <SystemHealthModal
          isOpen={isHealthModalOpen}
          onClose={() => setIsHealthModalOpen(false)}
          symbol={selectedSymbol.symbol}
          period={period}
          klineCount={klineData.length}
          mainIndicatorsCount={mainIndicators.length}
          subIndicatorsCount={subIndicators.length}
          drawingCount={drawingCount}
          currentVersion={updaterState.currentVersion}
          onOpenUpdateModal={() => {
            setIsHealthModalOpen(false);
            setIsUpdateModalOpen(true);
          }}
        />

        {/* 軟體升級與發布中心彈窗 */}
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updaterState={updaterState}
          onCheckForUpdates={handleCheckForUpdates}
          onStartDownload={handleStartDownload}
          onQuitAndInstall={handleQuitAndInstall}
        />

        {/* 快捷鍵客製化彈窗 */}
        <ShortcutsModal
          isOpen={isShortcutsModalOpen}
          onClose={() => setIsShortcutsModalOpen(false)}
          shortcuts={shortcuts}
          onUpdateShortcut={handleUpdateShortcut}
          onResetShortcuts={handleResetShortcuts}
        />

        {/* 旗艦功能彈窗 */}
        <ScreenerModal
          isOpen={isScreenerOpen}
          onClose={() => setIsScreenerOpen(false)}
          onSelectSymbol={handleSelectSymbol}
          colorTheme={colorTheme}
        />

        <BacktestModal
          isOpen={isBacktestOpen}
          onClose={() => setIsBacktestOpen(false)}
          klineData={klineData}
          currentSymbol={selectedSymbol}
        />

        <FundamentalModal
          isOpen={isFundamentalOpen}
          onClose={() => setIsFundamentalOpen(false)}
          symbol={selectedSymbol}
          onOpenEducation={(targetId) => {
            setEducationTargetId(targetId);
            setIsEducationModalOpen(true);
          }}
        />

        <PaperTradingModal
          isOpen={isPaperTradingOpen}
          onClose={() => setIsPaperTradingOpen(false)}
          currentSymbol={selectedSymbol}
          colorTheme={colorTheme}
        />

        <AlertsModal
          isOpen={isAlertsOpen}
          onClose={() => setIsAlertsOpen(false)}
          currentSymbol={selectedSymbol}
        />
      </div>
    </ErrorBoundary>
  );
};
