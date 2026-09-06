import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  Search,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Layers,
  FileText,
  History,
  Calendar,
  ShieldCheck,
  Activity,
  DollarSign,
  ChevronUp,
  ChevronDown,
  Settings,
  Grid,
} from "lucide-react";
import { KLineData } from "klinecharts";
import {
  StockSymbol,
  PaperAccount,
  PaperTradeType,
  PaperPriceType,
  PaperOrderCondition,
  PaperTradeSessionMode,
  MarketType,
} from "../types/stock";
import {
  PaperTradingService,
  getTickSize,
  stepPrice,
  roundToTick,
  calculateEstimate,
  getMarketSessionInfo,
  getSettlementAccountSummary,
  calculateDepthAndRatio,
  generateTimeAndSales,
  generateIntradayMinuteData,
} from "../services/paperTradingService";
import { searchStockDirectory, DirectoryStock } from "../data/stockDirectory";
import { generateRealisticKLineData } from "../data/stockService";
import { calculateVolumeProfile } from "../utils/volumeProfile";
import { analyzeSMC } from "../utils/smcAnalysis";
import { ChartContainer } from "./ChartContainer";
import { VolumeProfileHudCard, SMCHudCard } from "./AnalysisHudCards";

interface PaperTradingWorkspaceProps {
  onBackToChart: () => void;
  currentSymbol: StockSymbol;
  onSelectSymbol: (symbol: StockSymbol) => void;
  colorTheme: "international" | "asia";
  klineData?: KLineData[];
}

type ManagementTab = "POSITIONS" | "ORDERS" | "HISTORY" | "SETTLEMENT" | "TIMESALES";

export const PaperTradingWorkspace: React.FC<PaperTradingWorkspaceProps> = ({
  onBackToChart,
  currentSymbol,
  onSelectSymbol,
  colorTheme,
  klineData,
}) => {
  const [account, setAccount] = useState<PaperAccount>(PaperTradingService.getAccount());

  // 週期切換：分時、日K、週K、月K
  const [period, setPeriod] = useState<"分時" | "日K" | "週K" | "月K">("日K");

  // 輔助開關 (模擬交易預設關閉，防止浮層卡在走勢圖上遮蔽看盤)
  const [showSMC, setShowSMC] = useState<boolean>(false);
  const [showVolumeProfile, setShowVolumeProfile] = useState<boolean>(false);
  const [isMagnet, setIsMagnet] = useState<boolean>(false);

  // 四大法定交易模式：整張交易、盤中零股、盤後零股、盤後定價
  const [sessionMode, setSessionMode] = useState<PaperTradeSessionMode>("ROUND_LOT");

  // 下單參數
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [tradeType, setTradeType] = useState<PaperTradeType>("COMMON");
  const [priceType, setPriceType] = useState<PaperPriceType>("LIMIT");
  const [condition, setCondition] = useState<PaperOrderCondition>("ROD");
  const [price, setPrice] = useState<number>(currentSymbol.price);
  const [quantityLots, setQuantityLots] = useState<number>(1);
  const [quantityShares, setQuantityShares] = useState<number>(100);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // 底欄管理抽屜狀態
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ManagementTab>("POSITIONS");
  const [orderFilter, setOrderFilter] = useState<"ALL" | "PENDING" | "FILLED" | "CANCELLED">("ALL");

  // 標的搜尋下拉
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  // 提示訊息
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 分時圖懸停索引
  const [intradayHoverIdx, setIntradayHoverIdx] = useState<number | null>(null);

  // 當標的切換或更新時同步價格
  useEffect(() => {
    const updated = PaperTradingService.updatePrices({
      [currentSymbol.symbol]: currentSymbol.price,
    });
    setAccount(updated);
    setPrice(currentSymbol.price);
  }, [currentSymbol]);

  // 點擊外部收起搜尋框
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 按下 Esc 鍵返回技術圖表
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else {
          onBackToChart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, isDrawerOpen, onBackToChart]);

  const isGreenUp = colorTheme === "international";
  const isAsiaTheme = colorTheme === "asia";

  // 市場時段資訊
  const session = useMemo(
    () => getMarketSessionInfo(currentSymbol.symbol, currentSymbol.currency),
    [currentSymbol.symbol, currentSymbol.currency]
  );

  // 當前價格與漲跌幅
  const currentPrice = currentSymbol.price;
  const changePercent = currentSymbol.changePercent || 0;
  const change = currentSymbol.change || (currentPrice * changePercent) / 100;
  const prevClose = roundToTick(currentPrice / (1 + changePercent / 100));
  const limitUpPrice = roundToTick(prevClose * 1.10);
  const limitDownPrice = roundToTick(prevClose * 0.90);

  // 當選擇盤後定價時，價格自動鎖定為收盤價
  useEffect(() => {
    if (sessionMode === "AFTER_HOURS_FIXED") {
      setPrice(prevClose || currentPrice);
    }
  }, [sessionMode, prevClose, currentPrice]);

  // 委託股數計算
  const effectiveShares = useMemo(() => {
    if (sessionMode === "ROUND_LOT" || sessionMode === "AFTER_HOURS_FIXED") {
      return quantityLots * 1000;
    }
    return quantityShares;
  }, [sessionMode, quantityLots, quantityShares]);

  const effectivePrice = useMemo(() => {
    if (sessionMode === "AFTER_HOURS_FIXED") {
      return prevClose || currentPrice;
    }
    return priceType === "MARKET" ? currentPrice : price;
  }, [sessionMode, prevClose, currentPrice, priceType, price]);

  // 金額試算
  const est = useMemo(
    () => calculateEstimate(effectivePrice, effectiveShares, side),
    [effectivePrice, effectiveShares, side]
  );

  // 五檔深度報價與多空比
  const depthInfo = useMemo(
    () => calculateDepthAndRatio(currentSymbol.symbol, currentPrice),
    [currentSymbol.symbol, currentPrice]
  );

  // 逐筆成交明細
  const timeAndSalesData = useMemo(
    () => generateTimeAndSales(currentSymbol.symbol, currentPrice, prevClose),
    [currentSymbol.symbol, currentPrice, prevClose]
  );

  // 分時走勢圖數據
  const intradayData = useMemo(
    () => generateIntradayMinuteData(currentSymbol.symbol, currentPrice, prevClose),
    [currentSymbol.symbol, currentPrice, prevClose]
  );

  // T+2 結算總覽
  const settlementSummary = useMemo(
    () => getSettlementAccountSummary(account),
    [account]
  );

  // 帳戶整體損益
  const totalMarketValue = account.positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const netEquity = account.balance + totalMarketValue;
  const totalProfit = netEquity - account.initialCapital;
  const totalProfitPercent = Number(((totalProfit / account.initialCapital) * 100).toFixed(2));
  const isOverallProfit = totalProfit >= 0;
  const pendingOrdersCount = account.orders.filter((o) => o.status === "PENDING").length;

  // 持股狀況
  const heldPosition = account.positions.find((p) => p.symbol === currentSymbol.symbol);
  const heldShares = heldPosition ? heldPosition.shares : 0;

  // 歷史 K 線序列 (用於 ChartContainer 或計算 MA)
  const currentKLineData: KLineData[] = useMemo(() => {
    if (period === "日K") {
      return klineData && klineData.length > 0
        ? klineData
        : generateRealisticKLineData(currentSymbol.symbol, currentPrice, "1D");
    }
    if (period === "週K") {
      return generateRealisticKLineData(currentSymbol.symbol, currentPrice, "1W");
    }
    if (period === "月K") {
      return generateRealisticKLineData(currentSymbol.symbol, currentPrice, "1M");
    }
    return klineData || [];
  }, [period, klineData, currentSymbol.symbol, currentPrice]);

  // 計算 Volume Profile 與 SMC 分析結果
  const vpResult = useMemo(() => {
    const data = currentKLineData && currentKLineData.length >= 5
      ? currentKLineData
      : generateRealisticKLineData(currentSymbol.symbol, currentPrice, "1D");
    return calculateVolumeProfile(data, 24);
  }, [currentKLineData, currentSymbol.symbol, currentPrice]);

  const smcResult = useMemo(() => {
    const data = currentKLineData && currentKLineData.length >= 10
      ? currentKLineData
      : generateRealisticKLineData(currentSymbol.symbol, currentPrice, "1D");
    return analyzeSMC(data);
  }, [currentKLineData, currentSymbol.symbol, currentPrice]);

  // 最新 K 棒數據與 MA 均線計算 (用於頂部 Decoupled HUD)
  const { ohlcValues, maValues } = useMemo(() => {
    const list = currentKLineData && currentKLineData.length > 0
      ? currentKLineData
      : generateRealisticKLineData(currentSymbol.symbol, currentPrice, "1D");
    const last = list[list.length - 1] || {
      open: prevClose,
      high: Math.max(currentPrice, prevClose),
      low: Math.min(currentPrice, prevClose),
      close: currentPrice,
      volume: 38421000,
    };

    const calcMA = (p: number) => {
      if (list.length < p) return last.close;
      const slice = list.slice(-p);
      const sum = slice.reduce((acc, c) => acc + c.close, 0);
      return Number((sum / p).toFixed(2));
    };

    return {
      ohlcValues: {
        open: last.open,
        high: last.high,
        low: last.low,
        close: last.close,
        volumeLots: Math.round((last.volume || 38421000) / 1000),
        avgPrice: Number(((last.high + last.low + last.close) / 3).toFixed(2)),
      },
      maValues: {
        ma5: calcMA(5),
        ma10: calcMA(10),
        ma20: calcMA(20),
        ma60: calcMA(60),
      },
    };
  }, [currentKLineData, currentSymbol.symbol, currentPrice, prevClose]);

  // 分時圖統計資料
  const intradayStats = useMemo(() => {
    if (!intradayData || intradayData.length === 0) {
      return {
        yMax: prevClose * 1.02,
        yMin: prevClose * 0.98,
        maxDev: prevClose * 0.02,
        maxDevPercent: 2,
        maxVol: 100,
      };
    }
    const maxDev = Math.max(
      ...intradayData.map((p) => Math.abs(p.price - prevClose)),
      prevClose * 0.015
    );
    const maxDevPercent = Number(((maxDev / (prevClose || 1)) * 100).toFixed(2));
    const yMax = Number((prevClose + maxDev).toFixed(2));
    const yMin = Number((prevClose - maxDev).toFixed(2));
    const maxVol = Math.max(...intradayData.map((p) => p.volume), 50);

    return { yMax, yMin, maxDev, maxDevPercent, maxVol };
  }, [intradayData, prevClose]);

  // 搜尋過濾
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchStockDirectory(searchQuery.trim(), "ALL").slice(0, 8);
  }, [searchQuery]);

  // 價格與數量步進
  const handlePriceStep = (dir: "UP" | "DOWN") => {
    if (sessionMode === "AFTER_HOURS_FIXED") return;
    if (priceType === "MARKET") {
      setPriceType("LIMIT");
      setPrice(stepPrice(currentPrice, dir));
    } else {
      setPrice(stepPrice(price, dir));
    }
  };

  const handleQuantityStep = (dir: "UP" | "DOWN") => {
    if (sessionMode === "ROUND_LOT" || sessionMode === "AFTER_HOURS_FIXED") {
      if (dir === "UP") setQuantityLots((q) => q + 1);
      else setQuantityLots((q) => Math.max(1, q - 1));
    } else {
      if (dir === "UP") setQuantityShares((q) => Math.min(999, q + 50));
      else setQuantityShares((q) => Math.max(1, q - 50));
    }
  };

  // 送出委託下單
  const executeOrder = (orderSide: "BUY" | "SELL") => {
    setNotice(null);

    const isBuy = orderSide === "BUY";
    if (isBuy && settlementSummary.availableForTrading < est.total) {
      setNotice({
        type: "error",
        text: `【T+2資金不足】可用於交易餘額僅剩 $${settlementSummary.availableForTrading.toLocaleString()}，預估需款 $${est.total.toLocaleString()}`,
      });
      return;
    }
    if (!isBuy && heldShares < effectiveShares) {
      setNotice({
        type: "error",
        text: `【持股不足】目前持有 ${heldShares.toLocaleString()} 股，無法委託賣出 ${effectiveShares.toLocaleString()} 股`,
      });
      return;
    }

    const res = PaperTradingService.placeOrder({
      symbol: currentSymbol.symbol,
      name: currentSymbol.name,
      side: orderSide,
      tradeType,
      priceType: sessionMode === "AFTER_HOURS_FIXED" ? "LIMIT" : priceType,
      orderPrice: sessionMode === "AFTER_HOURS_FIXED" ? (prevClose || currentPrice) : price,
      shares: effectiveShares,
      condition,
      currentMarketPrice: currentPrice,
      currency: currentSymbol.currency || "TWD",
      referenceClosePrice: prevClose,
      sessionMode,
    });

    if (res.success) {
      setAccount(PaperTradingService.getAccount());
      setNotice({ type: "success", text: res.message });
    } else {
      setNotice({ type: "error", text: res.message });
    }
  };

  // 平倉指定部位
  const handleClosePosition = (symbol: string, posShares: number) => {
    if (window.confirm(`確定要以現價市價全數平倉 ${posShares.toLocaleString()} 股嗎？`)) {
      const res = PaperTradingService.placeOrder({
        symbol,
        name: currentSymbol.name,
        side: "SELL",
        tradeType: "COMMON",
        priceType: "MARKET",
        orderPrice: currentPrice,
        shares: posShares,
        currentMarketPrice: currentPrice,
        currency: currentSymbol.currency || "TWD",
      });

      if (res.success) {
        setAccount(PaperTradingService.getAccount());
        setNotice({ type: "success", text: res.message });
      } else {
        setNotice({ type: "error", text: res.message });
      }
    }
  };

  // 撤銷委託單
  const handleCancelOrder = (orderId: string) => {
    const res = PaperTradingService.cancelOrder(orderId);
    if (res.success) {
      setAccount(PaperTradingService.getAccount());
      setNotice({ type: "success", text: res.message });
    } else {
      setNotice({ type: "error", text: res.message });
    }
  };

  // 重置帳戶
  const handleResetAccount = () => {
    if (window.confirm("確定要將模擬交易帳戶重置為初始資金 $1,000,000 嗎？所有持倉與委託將歸零。")) {
      const reset = PaperTradingService.resetAccount(1000000);
      setAccount(reset);
      setNotice({ type: "success", text: "帳戶已成功重置為初始本金 $1,000,000！" });
    }
  };

  const isUp = change >= 0;
  const priceColor = isUp ? (isGreenUp ? "text-emerald-400" : "text-rose-500") : (isGreenUp ? "text-rose-500" : "text-emerald-400");

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#0d1017] text-slate-200 overflow-hidden select-none font-sans">
      
      {/* 🌟 1. 頂部旗艦導覽列 (Window Header) */}
      <div className="h-12 bg-[#141720] border-b border-[#252836] flex items-center justify-between px-3 sm:px-4 shrink-0 z-30">
        
        {/* 左側：macOS 視窗控制紅黃綠點、標的選擇膠囊、類別說明與週期切換 */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* macOS window dots */}
          <div className="flex items-center gap-1.5 mr-1 hidden sm:flex">
            <button
              onClick={onBackToChart}
              className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 transition-opacity cursor-pointer"
              title="返回技術看盤圖表 (Esc)"
            />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>

          {/* 標的選擇膠囊 (點擊可快速搜尋切換) */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setIsSearchOpen((p) => !p)}
              className="flex items-center gap-2 bg-[#1e222d] hover:bg-[#262b3a] border border-[#363a45] hover:border-slate-500 px-3 py-1 rounded-xl transition-all shadow-sm"
              title="點擊切換/搜尋標的"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-mono font-black text-white text-xs sm:text-sm tracking-wide">{currentSymbol.symbol}</span>
              <span className="font-bold text-slate-200 text-xs truncate max-w-[120px] sm:max-w-[180px]">{currentSymbol.name}</span>
              <Search className="w-3 h-3 text-slate-400 ml-0.5" />
            </button>

            {/* 標的搜尋浮層 */}
            {isSearchOpen && (
              <div className="absolute left-0 top-11 w-80 bg-[#1e222d] border border-[#363a45] rounded-xl shadow-2xl p-2.5 z-50 animate-fade-in space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="輸入股票代號或公司名稱搜尋..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 bg-[#131722] border border-[#2a2e39] focus:border-blue-500 rounded-lg text-xs text-white outline-none"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((stock: DirectoryStock) => (
                    <div
                      key={stock.symbol}
                      onClick={() => {
                        onSelectSymbol(stock);
                        setIsSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-[#2a2e39] cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono">{stock.symbol}</span>
                        <span className="text-slate-300">{stock.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{stock.market}</span>
                    </div>
                  ))}
                  {searchQuery && searchResults.length === 0 && (
                    <div className="py-4 text-center text-xs text-slate-400">查無相關標的</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 上市半導體 • TWSE */}
          <span className="text-xs text-slate-400 font-medium hidden md:inline truncate">
            {currentSymbol.category || (session.market === "TWSE" ? "上市半導體" : "科技板塊")} • {session.market}
          </span>

          {/* 週期切換膠囊 [分時] [日K] [週K] [月K] */}
          <div className="flex items-center bg-[#131722] p-0.5 rounded-xl border border-[#2a2e39] ml-1 sm:ml-2">
            {(["分時", "日K", "週K", "月K"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                  period === p
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-[#1e222d]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 右側：SMC 訂單流 ON、Volume Profile ON、磁吸模式 ON、返回看盤按鈕 */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          {/* SMC 訂單流 */}
          <button
            onClick={() => setShowSMC((p) => !p)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
              showSMC
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                : "bg-[#1e222d] text-slate-400 border-[#363a45] hover:text-white"
            }`}
          >
            <span>SMC 訂單流 {showSMC ? "ON" : "OFF"}</span>
          </button>

          {/* Volume Profile */}
          <button
            onClick={() => setShowVolumeProfile((p) => !p)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border ${
              showVolumeProfile
                ? "bg-purple-600/20 text-purple-300 border-purple-500/50 shadow-sm"
                : "bg-[#1e222d] text-slate-400 border-[#363a45] hover:text-white"
            }`}
          >
            <span>Volume Profile {showVolumeProfile ? "ON" : "OFF"}</span>
          </button>

          {/* 🧲 磁吸模式 */}
          <button
            onClick={() => setIsMagnet((p) => !p)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 ${
              isMagnet
                ? "bg-emerald-600/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                : "bg-[#1e222d] text-slate-400 border-[#363a45] hover:text-white"
            }`}
          >
            <span>🧲</span>
            <span className="hidden sm:inline">磁吸模式</span>
          </button>

          {/* 返回看盤按鈕 */}
          <button
            onClick={onBackToChart}
            className="flex items-center gap-1 px-3 py-1 bg-[#1e222d] hover:bg-[#252a37] text-slate-300 hover:text-white border border-[#363a45] rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer ml-1"
            title="返回主技術看盤圖表 (Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">返回看盤</span>
            <span className="text-[10px] text-slate-400 font-mono hidden lg:inline">Esc</span>
          </button>

          {/* 浮動分析卡片：緊鄰頂部按鈕下方，兩卡片並排絕不重疊 */}
          {(showVolumeProfile || showSMC) && (
            <div className="absolute right-0 top-full mt-2 z-50 flex flex-col sm:flex-row items-end sm:items-start gap-2.5 pointer-events-auto">
              {showSMC && smcResult && (
                <SMCHudCard
                  result={smcResult}
                  onClose={() => setShowSMC(false)}
                />
              )}
              {showVolumeProfile && vpResult && (
                <VolumeProfileHudCard
                  result={vpResult}
                  onClose={() => setShowVolumeProfile(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* 🌟 2. 圖表上方即時報價 Decoupled HUD (精準對齊截圖之兩行排版) */}
      <div className="w-full bg-[#10131b] border-b border-[#202330] px-3 sm:px-4 py-2 shrink-0 flex flex-col gap-1 z-20">
        
        {/* ROW 1: 現價大字 + 漲跌幅 + 開高低收量均價 + Decoupled HUD 徽章 */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {/* 大字現價 */}
            <span className={`text-2xl sm:text-3xl font-mono font-black tracking-tight ${priceColor}`}>
              {currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            {/* 漲跌幅 */}
            <span className={`text-xs sm:text-sm font-mono font-bold flex items-center gap-1 ${priceColor}`}>
              <span>{isUp ? "▲" : "▼"}</span>
              <span>{isUp ? "+" : ""}{change.toFixed(2)} ({isUp ? "+" : ""}{changePercent.toFixed(2)}%)</span>
            </span>

            {/* OHLCV 明細 */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-mono text-slate-300">
              <span>開 <b className="text-white">{ohlcValues.open.toFixed(2)}</b></span>
              <span>高 <b className={isGreenUp ? "text-emerald-400" : "text-rose-400"}>{ohlcValues.high.toFixed(2)}</b></span>
              <span>低 <b className={isGreenUp ? "text-rose-400" : "text-emerald-400"}>{ohlcValues.low.toFixed(2)}</b></span>
              <span>收 <b className="text-white">{ohlcValues.close.toFixed(2)}</b></span>
              <span>量 <b className="text-sky-400">{ohlcValues.volumeLots.toLocaleString()} 張</b></span>
              <span>均價 <b className="text-amber-400">${ohlcValues.avgPrice.toFixed(2)}</b></span>
            </div>
          </div>

          {/* 右側 Decoupled HUD 徽章 */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-950/30 border border-blue-500/30 text-sky-400 rounded-lg text-xs font-mono shrink-0 hidden sm:flex">
            <Grid size={13} className="text-blue-400" />
            <span>獨立外置 HUD • 即時盤面數值</span>
          </div>
        </div>

        {/* ROW 2: MA 均線數值列 */}
        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <span style={{ color: "#fbc02d" }} className="font-bold">
            MA5: {maValues.ma5.toFixed(2)}
          </span>
          <span style={{ color: "#00bcd4" }} className="font-bold">
            MA10: {maValues.ma10.toFixed(2)}
          </span>
          <span style={{ color: "#e91e63" }} className="font-bold">
            MA20: {maValues.ma20.toFixed(2)}
          </span>
          <span style={{ color: "#00e676" }} className="font-bold">
            MA60: {maValues.ma60.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 🌟 3. 系統即時通知 Banner */}
      {notice && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b shrink-0 z-20 ${
          notice.type === "success"
            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
            : "bg-rose-500/10 text-rose-300 border-rose-500/20"
        }`}>
          <div className="flex items-center gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{notice.text}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100 cursor-pointer">✕</button>
        </div>
      )}

      {/* 🌟 4. 主工作雙欄架構 (左：K線/分時圖，右：Level 2 五檔 + T+2 結算與下單) */}
      <div className="flex-1 w-full relative overflow-hidden flex flex-col lg:flex-row">
        
        {/* 左側主圖表區 (~72% 寬度) */}
        <div className="flex-1 h-full min-w-0 relative flex flex-col bg-[#0b0e14] overflow-hidden">
          {period === "分時" ? (
            /* 分時走勢圖 (SVG 即時走勢與 VWAP 均價線) */
            <div className="flex-1 w-full h-full p-3 flex flex-col justify-between select-none">
              <div className="flex justify-between items-center text-xs font-mono pb-2 border-b border-[#1e222d]">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">平盤 ${prevClose.toFixed(2)}</span>
                  <span className="text-amber-400">
                    VWAP: ${(intradayData[intradayData.length - 1]?.avgPrice || currentPrice).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-rose-400">漲停 ${limitUpPrice.toFixed(2)}</span>
                  <span className="text-emerald-400">跌停 ${limitDownPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* 分時 SVG 曲線 */}
              <div className="flex-1 w-full my-2 relative">
                <svg
                  className="w-full h-full"
                  viewBox="0 0 600 240"
                  preserveAspectRatio="none"
                  onMouseLeave={() => setIntradayHoverIdx(null)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const relX = (mouseX / rect.width) * 600;
                    if (relX >= 50 && relX <= 550 && intradayData.length > 1) {
                      const idx = Math.round(((relX - 50) / 500) * (intradayData.length - 1));
                      setIntradayHoverIdx(Math.max(0, Math.min(intradayData.length - 1, idx)));
                    } else {
                      setIntradayHoverIdx(null);
                    }
                  }}
                >
                  <defs>
                    <linearGradient id="intradayGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* 格線 */}
                  <line x1="50" y1="20" x2="550" y2="20" stroke="#1f2430" strokeWidth="0.8" />
                  <line x1="50" y1="70" x2="550" y2="70" stroke="#1f2430" strokeWidth="0.8" />
                  <line x1="50" y1="120" x2="550" y2="120" stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" />
                  <line x1="50" y1="170" x2="550" y2="170" stroke="#1f2430" strokeWidth="0.8" />

                  {/* 刻度標籤 */}
                  <text x="44" y="24" textAnchor="end" fill={isAsiaTheme ? "#f43f5e" : "#10b981"} fontSize="10" fontFamily="monospace">
                    ${intradayStats.yMax.toFixed(2)}
                  </text>
                  <text x="44" y="124" textAnchor="end" fill="#cbd5e1" fontSize="10" fontWeight="bold" fontFamily="monospace">
                    ${prevClose.toFixed(2)}
                  </text>
                  <text x="44" y="174" textAnchor="end" fill={isAsiaTheme ? "#10b981" : "#f43f5e"} fontSize="10" fontFamily="monospace">
                    ${intradayStats.yMin.toFixed(2)}
                  </text>

                  {/* 面積 */}
                  {intradayData.length > 1 && (
                    <polygon
                      fill="url(#intradayGradient)"
                      points={`50,170 ${intradayData
                        .map((p, i) => {
                          const x = 50 + (i / (intradayData.length - 1)) * 500;
                          const y = 120 - ((p.price - prevClose) / (intradayStats.maxDev || 1)) * 100;
                          return `${x},${Math.max(15, Math.min(180, y))}`;
                        })
                        .join(" ")} 550,170`}
                    />
                  )}

                  {/* VWAP 均價線 (黃色 1px) */}
                  {intradayData.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth="1.0"
                      strokeOpacity="0.85"
                      points={intradayData
                        .map((p, i) => {
                          const x = 50 + (i / (intradayData.length - 1)) * 500;
                          const y = 120 - ((p.avgPrice - prevClose) / (intradayStats.maxDev || 1)) * 100;
                          return `${x},${Math.max(15, Math.min(180, y))}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* 現價線 (天藍色 1.2px) */}
                  {intradayData.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="#38bdf8"
                      strokeWidth="1.2"
                      points={intradayData
                        .map((p, i) => {
                          const x = 50 + (i / (intradayData.length - 1)) * 500;
                          const y = 120 - ((p.price - prevClose) / (intradayStats.maxDev || 1)) * 100;
                          return `${x},${Math.max(15, Math.min(180, y))}`;
                        })
                        .join(" ")}
                    />
                  )}

                  {/* 成交量柱狀圖 */}
                  {intradayData.map((p, i) => {
                    const bx = 50 + (i / (intradayData.length - 1)) * 500;
                    const bw = Math.max(2, 500 / intradayData.length - 1);
                    const bh = (p.volume / (intradayStats.maxVol || 1)) * 40;
                    const by = 230 - bh;
                    const isUpTick = p.price >= prevClose;
                    return (
                      <rect
                        key={`vol_${i}`}
                        x={bx - bw / 2}
                        y={by}
                        width={bw}
                        height={Math.max(1, bh)}
                        fill={isUpTick ? (isAsiaTheme ? "#f43f5e" : "#10b981") : (isAsiaTheme ? "#10b981" : "#f43f5e")}
                        opacity={0.8}
                      />
                    );
                  })}
                  {/* 滑鼠懸停十字游標與指示 */}
                  {intradayHoverIdx !== null && intradayData[intradayHoverIdx] && (
                    <g>
                      <line
                        x1={50 + (intradayHoverIdx / (intradayData.length - 1)) * 500}
                        y1={15}
                        x2={50 + (intradayHoverIdx / (intradayData.length - 1)) * 500}
                        y2={230}
                        stroke="#94a3b8"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                      <circle
                        cx={50 + (intradayHoverIdx / (intradayData.length - 1)) * 500}
                        cy={Math.max(15, Math.min(180, 120 - ((intradayData[intradayHoverIdx].price - prevClose) / (intradayStats.maxDev || 1)) * 100))}
                        r="3.5"
                        fill="#38bdf8"
                        stroke="#0d1017"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                </svg>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-[#1e222d]">
                <div className="flex items-center gap-3">
                  <span className="text-sky-400">─ 現價走勢</span>
                  <span className="text-amber-400">─ VWAP 均價線</span>
                  {intradayHoverIdx !== null && intradayData[intradayHoverIdx] && (
                    <span className="text-white font-bold bg-[#1e222d] px-1.5 py-0.5 rounded">
                      {intradayData[intradayHoverIdx].time} : ${intradayData[intradayHoverIdx].price.toFixed(2)} (量: {intradayData[intradayHoverIdx].volume})
                    </span>
                  )}
                </div>
                <span>時間: 09:00 ~ 13:30</span>
              </div>
            </div>
          ) : (
            /* 日K / 週K / 月K：嵌入專業 KlineCharts */
            <div className="flex-1 w-full h-full relative">
              <ChartContainer
                symbol={currentSymbol.symbol}
                stockName={currentSymbol.name}
                market={session.market as MarketType}
                period={period}
                data={currentKLineData}
                colorTheme={colorTheme}
                mainIndicators={["MA"]}
                subIndicators={["VOL"]}
                activeTool="none"
                isMagnet={isMagnet}
                onFinishDrawing={() => {}}
                onDrawingCountChange={() => {}}
                showVolumeProfile={showVolumeProfile}
                onToggleVolumeProfile={() => setShowVolumeProfile((p) => !p)}
                showSMC={showSMC}
                onToggleSMC={() => setShowSMC((p) => !p)}
                showLastPriceLine={true}
                hideHeader={true}
              />
            </div>
          )}
        </div>

        {/* 右側交易側邊欄 (Level 2 五檔 + T+2 結算與四大交易模式) (~380px 寬度，緊湊直覺免滾輪) */}
        <div className="w-full lg:w-[360px] xl:w-[380px] shrink-0 h-full flex flex-col gap-2 p-2 xl:p-2.5 bg-[#131722] border-t lg:border-t-0 lg:border-l border-[#252836] overflow-y-auto">
          
          {/* 🌟 卡片 1: 五檔撮合深度 (Level 2) - 緊湊高密度佈局 */}
          <div className="bg-[#181c27] border border-[#2a2e3d] rounded-xl p-2 sm:p-2.5 space-y-1 shadow-lg shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-[#2a2e3d]">
              <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                <span>五檔撮合深度 (Level 2)</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                REALTIME
              </span>
            </div>

            {/* 賣五至賣一 (由高至低) */}
            <div className="space-y-0.5 font-mono text-[11px]">
              {depthInfo.asks.map((a, idx) => {
                const isBestAsk = idx === depthInfo.asks.length - 1; // 賣一
                return (
                  <div
                    key={`ask-${idx}`}
                    onClick={() => {
                      if (sessionMode !== "AFTER_HOURS_FIXED") {
                        setPriceType("LIMIT");
                        setPrice(a.price);
                      }
                    }}
                    className={`relative flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#252a37] cursor-pointer transition-colors overflow-hidden group leading-none ${
                      isBestAsk ? "bg-rose-950/20" : ""
                    }`}
                    title="點擊帶入此價格"
                  >
                    {/* 紅色深度量能長條 */}
                    <div
                      style={{ width: `${a.percent}%` }}
                      className="absolute right-0 top-0 bottom-0 bg-rose-500/15 group-hover:bg-rose-500/25 pointer-events-none transition-all"
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className={`text-[10px] ${isBestAsk ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                        賣{5 - idx}
                      </span>
                      <span className={`font-bold ${isBestAsk ? "text-rose-400" : isAsiaTheme ? "text-slate-200" : "text-rose-400"}`}>
                        {a.price.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-slate-300 font-semibold text-[10px] relative z-10">
                      {a.vol.toLocaleString()} 張
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 最佳委託價差 Spread */}
            <div className="py-0.5 px-2 bg-[#12151e] rounded border border-[#2a2e3d] flex items-center justify-between text-[10px] font-mono my-0.5">
              <span className="text-slate-400">最佳委託價差</span>
              <span className="text-amber-400 font-bold">
                Spread: {((depthInfo.asks[depthInfo.asks.length - 1]?.price || currentPrice) - (depthInfo.bids[0]?.price || currentPrice)).toFixed(2)} (
                {(((depthInfo.asks[depthInfo.asks.length - 1]?.price || currentPrice) - (depthInfo.bids[0]?.price || currentPrice)) / (currentPrice || 1) * 100).toFixed(2)}%)
              </span>
            </div>

            {/* 買一至買五 (由高至低) */}
            <div className="space-y-0.5 font-mono text-[11px]">
              {depthInfo.bids.map((b, idx) => {
                const isBestBid = idx === 0; // 買一
                return (
                  <div
                    key={`bid-${idx}`}
                    onClick={() => {
                      if (sessionMode !== "AFTER_HOURS_FIXED") {
                        setPriceType("LIMIT");
                        setPrice(b.price);
                      }
                    }}
                    className={`relative flex items-center justify-between py-0.5 px-2 rounded hover:bg-[#252a37] cursor-pointer transition-colors overflow-hidden group leading-none ${
                      isBestBid ? "bg-emerald-950/20" : ""
                    }`}
                    title="點擊帶入此價格"
                  >
                    {/* 綠色深度量能長條 */}
                    <div
                      style={{ width: `${b.percent}%` }}
                      className="absolute right-0 top-0 bottom-0 bg-emerald-500/15 group-hover:bg-emerald-500/25 pointer-events-none transition-all"
                    />
                    <div className="flex items-center gap-2 relative z-10">
                      <span className={`text-[10px] ${isBestBid ? "text-emerald-400 font-bold" : "text-slate-400"}`}>
                        買{idx + 1}
                      </span>
                      <span className={`font-bold ${isBestBid ? "text-emerald-400" : isAsiaTheme ? "text-slate-200" : "text-emerald-400"}`}>
                        {b.price.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-slate-300 font-semibold text-[10px] relative z-10">
                      {b.vol.toLocaleString()} 張
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 多空能量條與比值 (保留原始完整多空比資訊) */}
            <div className="pt-1 border-t border-[#2a2e3d]/80 space-y-0.5 text-[10px]">
              <div className="flex justify-between items-center text-[9px] font-mono">
                <span className={isAsiaTheme ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  委買 {depthInfo.totalBidVol}張 ({depthInfo.longRatio}%)
                </span>
                <span className="text-amber-400 font-bold">比值: {depthInfo.powerRatio}</span>
                <span className={isAsiaTheme ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                  委賣 {depthInfo.totalAskVol}張 ({depthInfo.shortRatio}%)
                </span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${depthInfo.longRatio}%` }}
                  className={`h-full transition-all duration-300 ${isAsiaTheme ? "bg-rose-500" : "bg-emerald-500"}`}
                />
                <div
                  style={{ width: `${depthInfo.shortRatio}%` }}
                  className={`h-full transition-all duration-300 ${isAsiaTheme ? "bg-emerald-500" : "bg-rose-500"}`}
                />
              </div>
            </div>
          </div>

          {/* 🌟 卡片 2: T+2 模擬交易結算 & 四大交易模式下單 - 緊湊下單免滾輪 */}
          <div className="bg-[#181c27] border border-[#2a2e3d] rounded-xl p-2 sm:p-2.5 space-y-2 shadow-lg flex flex-col justify-between">
            <div className="space-y-1.5">
              {/* Header */}
              <div className="flex items-center justify-between pb-1 border-b border-[#2a2e3d]">
                <div className="flex items-center gap-1.5 font-bold text-white text-[11px]">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>T+2 模擬交易結算</span>
                </div>
                <span className="text-[9px] text-slate-400 font-sans">證交所法定規則</span>
              </div>

              {/* 雙欄資金統計: 可用資金 vs T+2 預估交割 */}
              <div className="grid grid-cols-2 gap-2 bg-[#12151e] p-1.5 rounded-lg border border-[#2a2e3d]">
                <div>
                  <div className="text-[9px] text-slate-400">可用資金 (Cash)</div>
                  <div className="text-xs sm:text-sm font-mono font-black text-white truncate">
                    ${settlementSummary.availableForTrading.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-slate-400">T+2 預估應交割</div>
                  <div className={`text-xs sm:text-sm font-mono font-bold truncate ${
                    settlementSummary.totalPendingReceivables - settlementSummary.totalPendingPayables >= 0
                      ? "text-emerald-400"
                      : "text-rose-400"
                  }`}>
                    {settlementSummary.totalPendingReceivables - settlementSummary.totalPendingPayables >= 0 ? "+" : ""}
                    ${(settlementSummary.totalPendingReceivables - settlementSummary.totalPendingPayables).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* 🧩 四大台股法定交易模式切換膠囊 (整張 / 盤中零股 / 盤後零股 / 盤後定價) */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5">
                  <span className="font-bold text-slate-300">交易時段與類別</span>
                  <span className="text-blue-400 font-mono">
                    {sessionMode === "ROUND_LOT" && "一般逐筆撮合 (張)"}
                    {sessionMode === "INTRADAY_ODD" && "5秒集合競價 (股)"}
                    {sessionMode === "AFTER_HOURS_ODD" && "14:30 集合撮合"}
                    {sessionMode === "AFTER_HOURS_FIXED" && "14:30 收盤價撮合"}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 bg-[#12151e] p-0.5 rounded-lg border border-[#2a2e3d] text-[10px] font-bold">
                  {[
                    { id: "ROUND_LOT", label: "整張交易" },
                    { id: "INTRADAY_ODD", label: "盤中零股" },
                    { id: "AFTER_HOURS_ODD", label: "盤後零股" },
                    { id: "AFTER_HOURS_FIXED", label: "盤後定價" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSessionMode(m.id as PaperTradeSessionMode)}
                      className={`py-1 rounded-md text-center transition-all ${
                        sessionMode === m.id
                          ? "bg-blue-600 text-white shadow font-black"
                          : "text-slate-400 hover:text-white hover:bg-[#1e222d]"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 價格與數量快速面板 */}
              <div className="space-y-1.5 bg-[#12151e] p-2 rounded-lg border border-[#2a2e3d]">
                {/* 委託價格行 */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">價格</span>
                  <div className="flex items-center gap-1 flex-1 justify-end">
                    {sessionMode === "AFTER_HOURS_FIXED" ? (
                      <span className="text-[11px] font-mono font-bold text-amber-400 px-2 py-0.5 bg-[#181c27] rounded border border-[#2a2e3d]">
                        收盤定價 ${prevClose.toFixed(2)} (固定)
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handlePriceStep("DOWN")}
                          className="w-6 h-6 rounded bg-[#181c27] hover:bg-[#252a37] text-slate-200 border border-[#2a2e3d] flex items-center justify-center font-mono active:scale-95"
                        >
                          <Minus size={11} />
                        </button>
                        <input
                          type="number"
                          step={getTickSize(price)}
                          value={priceType === "MARKET" ? currentPrice : price}
                          onChange={(e) => {
                            setPriceType("LIMIT");
                            setPrice(Number(e.target.value));
                          }}
                          className="w-20 h-6 text-center font-mono font-bold text-xs bg-[#181c27] text-white rounded border border-[#2a2e3d] focus:border-blue-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handlePriceStep("UP")}
                          className="w-6 h-6 rounded bg-[#181c27] hover:bg-[#252a37] text-slate-200 border border-[#2a2e3d] flex items-center justify-center font-mono active:scale-95"
                        >
                          <Plus size={11} />
                        </button>

                        {/* 快捷現價按鈕 */}
                        <button
                          type="button"
                          onClick={() => {
                            setPriceType("LIMIT");
                            setPrice(currentPrice);
                          }}
                          className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[#181c27] hover:bg-[#252a37] text-slate-300 border border-[#2a2e3d]"
                        >
                          現價
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 委託數量行 */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] text-slate-400 font-bold shrink-0">
                    數量 ({sessionMode === "ROUND_LOT" || sessionMode === "AFTER_HOURS_FIXED" ? "張" : "股"})
                  </span>
                  <div className="flex items-center gap-1 flex-1 justify-end font-mono">
                    <button
                      type="button"
                      onClick={() => handleQuantityStep("DOWN")}
                      className="w-6 h-6 rounded bg-[#181c27] hover:bg-[#252a37] text-slate-200 border border-[#2a2e3d] flex items-center justify-center active:scale-95"
                    >
                      <Minus size={11} />
                    </button>

                    {sessionMode === "ROUND_LOT" || sessionMode === "AFTER_HOURS_FIXED" ? (
                      <input
                        type="number"
                        min="1"
                        value={quantityLots}
                        onChange={(e) => setQuantityLots(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 h-6 text-center font-mono font-bold text-xs bg-[#181c27] text-white rounded border border-[#2a2e3d] focus:border-blue-500 outline-none"
                      />
                    ) : (
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={quantityShares}
                        onChange={(e) => setQuantityShares(Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                        className="w-20 h-6 text-center font-mono font-bold text-xs bg-[#181c27] text-white rounded border border-[#2a2e3d] focus:border-blue-500 outline-none"
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => handleQuantityStep("UP")}
                      className="w-6 h-6 rounded bg-[#181c27] hover:bg-[#252a37] text-slate-200 border border-[#2a2e3d] flex items-center justify-center active:scale-95"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>

                {/* 快速數量 Chips */}
                <div className="flex items-center justify-end gap-1 pt-0.5 text-[9px] font-mono">
                  {sessionMode === "ROUND_LOT" || sessionMode === "AFTER_HOURS_FIXED" ? (
                    [1, 2, 5, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantityLots(num)}
                        className={`px-1.5 py-0.2 rounded border transition-colors ${
                          quantityLots === num
                            ? "bg-blue-600/30 text-sky-300 border-blue-500/50 font-bold"
                            : "bg-[#181c27] text-slate-400 border-[#2a2e3d] hover:text-white"
                        }`}
                      >
                        {num}張
                      </button>
                    ))
                  ) : (
                    [100, 200, 500, 800].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setQuantityShares(num)}
                        className={`px-1.5 py-0.2 rounded border transition-colors ${
                          quantityShares === num
                            ? "bg-blue-600/30 text-sky-300 border-blue-500/50 font-bold"
                            : "bg-[#181c27] text-slate-400 border-[#2a2e3d] hover:text-white"
                        }`}
                      >
                        {num}股
                      </button>
                    ))
                  )}
                </div>

                {/* 預估應付金額與手續費標示 */}
                <div className="pt-1 border-t border-[#2a2e3d] flex justify-between items-center text-[10px] font-mono">
                  <span className="text-slate-400">
                    預估金額: <b className="text-white">${est.total.toLocaleString()}</b>
                  </span>
                  <span className="text-slate-400 text-[9px]">
                    手續費: ${est.fee} | 稅: ${est.tax}
                  </span>
                </div>
              </div>

              {/* 進階委託條件設定 (現股/融資/融券、市價/限價、ROD/IOC/FOK) */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen((p) => !p)}
                  className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 py-0.5 px-1 cursor-pointer font-medium"
                >
                  <span className="flex items-center gap-1">
                    <Settings size={11} className="text-slate-400" />
                    <span>進階條件 ({tradeType === "COMMON" ? "現股" : tradeType === "MARGIN_BUY" ? "融資" : "融券"} · {priceType === "LIMIT" ? "限價" : "市價"} · {condition})</span>
                  </span>
                  {isAdvancedOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                {isAdvancedOpen && (
                  <div className="p-2 bg-[#12151e] rounded-lg border border-[#2a2e3d] space-y-1.5 text-xs animate-in fade-in">
                    {/* 信用別 */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">信用類別</span>
                      <div className="flex items-center gap-1 bg-[#181c27] p-0.5 rounded border border-[#2a2e3d]">
                        {[
                          { id: "COMMON", label: "現股" },
                          { id: "MARGIN_BUY", label: "融資" },
                          { id: "MARGIN_SELL", label: "融券" },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTradeType(t.id as PaperTradeType)}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              tradeType === t.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 價格類別 */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">價格類別</span>
                      <div className="flex items-center gap-1 bg-[#181c27] p-0.5 rounded border border-[#2a2e3d]">
                        {[
                          { id: "LIMIT", label: "限價" },
                          { id: "MARKET", label: "市價" },
                        ].map((pt) => (
                          <button
                            key={pt.id}
                            type="button"
                            onClick={() => setPriceType(pt.id as PaperPriceType)}
                            className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                              priceType === pt.id ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {pt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 條件 */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">委託條件</span>
                      <div className="flex items-center gap-1 bg-[#181c27] p-0.5 rounded border border-[#2a2e3d]">
                        {(["ROD", "IOC", "FOK"] as const).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCondition(c)}
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                              condition === c ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                            }`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 🔴 🟢 核心動作大按鈕 (委託買進 Buy 與 委託賣出 Sell - 精簡高度免滾輪) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setSide("BUY");
                  executeOrder("BUY");
                }}
                className="py-2.5 px-3 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 border border-rose-500/60"
              >
                <TrendingUp size={15} />
                <span>委託買進 (Buy)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSide("SELL");
                  executeOrder("SELL");
                }}
                className="py-2.5 px-3 rounded-lg font-black text-xs sm:text-sm tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 border border-emerald-500/60"
              >
                <TrendingDown size={15} />
                <span>委託賣出 (Sell)</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 5. 底部 TradingView 風格管理抽屜 (Docking Panel - 保留所有原本庫存、委託、歷史、交割與逐筆明細) */}
      <div className="w-full bg-[#141720] border-t border-[#252836] shrink-0 z-30 flex flex-col">
        {/* 抽屜標籤列 */}
        <div className="h-9 px-3 flex items-center justify-between text-xs font-semibold overflow-x-auto">
          <div className="flex items-center gap-1">
            {[
              { id: "POSITIONS", label: `庫存持倉 (${account.positions.length})`, icon: Layers },
              { id: "ORDERS", label: `委託回報 (${pendingOrdersCount})`, icon: FileText },
              { id: "HISTORY", label: "成交紀錄", icon: History },
              { id: "SETTLEMENT", label: "🏦 台灣證交法 T+2 資金交割中心", icon: Calendar },
              { id: "TIMESALES", label: "⚡ 分時逐筆明細", icon: Activity },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id && isDrawerOpen;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (activeTab === tab.id && isDrawerOpen) {
                      setIsDrawerOpen(false);
                    } else {
                      setActiveTab(tab.id as ManagementTab);
                      setIsDrawerOpen(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-400 hover:text-white hover:bg-[#1e222d]"
                  }`}
                >
                  <Icon size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 右側資產摘要與展開/收起按鈕 */}
          <div className="flex items-center gap-3 font-mono text-[11px] shrink-0 pl-3">
            <span className="text-slate-400 hidden sm:inline">
              總資產: <b className="text-white">${netEquity.toLocaleString()}</b>
            </span>
            <span className={`font-bold hidden md:inline ${isOverallProfit ? "text-emerald-400" : "text-rose-400"}`}>
              {isOverallProfit ? "+" : ""}${totalProfit.toLocaleString()} ({isOverallProfit ? "+" : ""}{totalProfitPercent}%)
            </span>
            <button
              onClick={() => setIsDrawerOpen((p) => !p)}
              className="p-1 rounded hover:bg-[#1e222d] text-slate-300 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
            >
              <span>{isDrawerOpen ? "收起" : "展開管理抽屜"}</span>
              {isDrawerOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {/* 抽屜展開之詳細內容表格 */}
        {isDrawerOpen && (
          <div className="h-64 overflow-y-auto p-3 bg-[#0d1017] border-t border-[#252836] text-xs">
            {/* TAB 1: 庫存持倉 */}
            {activeTab === "POSITIONS" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1 border-b border-[#1e222d]">
                  <span>持倉標的明細 ({account.positions.length})</span>
                  <span>持股市值: ${totalMarketValue.toLocaleString()}</span>
                </div>
                {account.positions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">目前無持股部位</div>
                ) : (
                  <table className="w-full text-left font-mono">
                    <thead className="text-slate-400 text-[11px] border-b border-[#1e222d]">
                      <tr>
                        <th className="py-1.5 px-2">代號 / 名稱</th>
                        <th className="py-1.5 px-2">持有數量</th>
                        <th className="py-1.5 px-2">均價</th>
                        <th className="py-1.5 px-2">現價</th>
                        <th className="py-1.5 px-2">市值</th>
                        <th className="py-1.5 px-2">未實現損益</th>
                        <th className="py-1.5 px-2">報酬率</th>
                        <th className="py-1.5 px-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222d]">
                      {account.positions.map((pos) => {
                        const isPosProfit = pos.unrealizedProfit >= 0;
                        const pColor = isPosProfit ? (isGreenUp ? "text-emerald-400" : "text-rose-400") : (isGreenUp ? "text-rose-400" : "text-emerald-400");
                        return (
                          <tr key={pos.symbol} className="hover:bg-[#131722] transition-colors">
                            <td className="py-2 px-2 font-bold text-white">
                              {pos.symbol} <span className="text-slate-400 font-normal">{pos.name}</span>
                            </td>
                            <td className="py-2 px-2 text-slate-200">
                              {pos.shares.toLocaleString()} 股 ({Math.floor(pos.shares / 1000)}張)
                            </td>
                            <td className="py-2 px-2 text-slate-300">${pos.avgCostPrice.toFixed(2)}</td>
                            <td className="py-2 px-2 font-bold text-white">${pos.currentPrice.toFixed(2)}</td>
                            <td className="py-2 px-2 text-slate-200">${(pos.shares * pos.currentPrice).toLocaleString()}</td>
                            <td className={`py-2 px-2 font-bold ${pColor}`}>
                              {isPosProfit ? "+" : ""}${pos.unrealizedProfit.toLocaleString()}
                            </td>
                            <td className={`py-2 px-2 font-bold ${pColor}`}>
                              {isPosProfit ? "+" : ""}{pos.unrealizedProfitPercent}%
                            </td>
                            <td className="py-2 px-2 text-right">
                              <button
                                onClick={() => handleClosePosition(pos.symbol, pos.shares)}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                市價平倉
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 2: 委託回報 */}
            {activeTab === "ORDERS" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center pb-1 border-b border-[#1e222d]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[11px]">委託清單</span>
                    <div className="flex items-center bg-[#131722] p-0.5 rounded-lg border border-[#2a2e39] text-[10px]">
                      {(["ALL", "PENDING", "FILLED", "CANCELLED"] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setOrderFilter(filter)}
                          className={`px-2 py-0.5 rounded font-bold ${
                            orderFilter === filter ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {filter === "ALL" && "全部"}
                          {filter === "PENDING" && `委託中 (${pendingOrdersCount})`}
                          {filter === "FILLED" && "已成交"}
                          {filter === "CANCELLED" && "已撤銷"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleResetAccount}
                    className="text-[10px] text-slate-400 hover:text-rose-400 flex items-center gap-1"
                  >
                    <RefreshCw size={11} />
                    <span>重置帳戶 ($1,000,000)</span>
                  </button>
                </div>

                {account.orders.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">目前無任何委託單</div>
                ) : (
                  <table className="w-full text-left font-mono">
                    <thead className="text-slate-400 text-[11px] border-b border-[#1e222d]">
                      <tr>
                        <th className="py-1.5 px-2">時間</th>
                        <th className="py-1.5 px-2">標的</th>
                        <th className="py-1.5 px-2">買賣</th>
                        <th className="py-1.5 px-2">模式/條件</th>
                        <th className="py-1.5 px-2">委託價</th>
                        <th className="py-1.5 px-2">數量</th>
                        <th className="py-1.5 px-2">狀態</th>
                        <th className="py-1.5 px-2">備註</th>
                        <th className="py-1.5 px-2 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222d]">
                      {account.orders
                        .filter((o) => (orderFilter === "ALL" ? true : o.status === orderFilter))
                        .map((ord) => (
                          <tr key={ord.id} className="hover:bg-[#131722] transition-colors">
                            <td className="py-2 px-2 text-slate-400 text-[11px]">
                              {new Date(ord.timestamp).toTimeString().slice(0, 8)}
                            </td>
                            <td className="py-2 px-2 font-bold text-white">
                              {ord.symbol} {ord.name}
                            </td>
                            <td className={`py-2 px-2 font-bold ${ord.side === "BUY" ? "text-rose-400" : "text-emerald-400"}`}>
                              {ord.side === "BUY" ? "買進" : "賣出"}
                            </td>
                            <td className="py-2 px-2 text-slate-300 text-[11px]">
                              {ord.sessionMode === "INTRADAY_ODD" ? "盤中零股" : ord.sessionMode === "AFTER_HOURS_ODD" ? "盤後零股" : ord.sessionMode === "AFTER_HOURS_FIXED" ? "盤後定價" : "整張"} · {ord.condition}
                            </td>
                            <td className="py-2 px-2 text-white font-bold">${ord.orderPrice.toFixed(2)}</td>
                            <td className="py-2 px-2 text-slate-200">
                              {ord.shares.toLocaleString()} 股 {ord.shares >= 1000 && `(${ord.shares / 1000}張)`}
                            </td>
                            <td className="py-2 px-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                ord.status === "FILLED"
                                  ? "bg-emerald-500/20 text-emerald-300"
                                  : ord.status === "PENDING"
                                  ? "bg-amber-500/20 text-amber-300"
                                  : "bg-slate-700/50 text-slate-400"
                              }`}>
                                {ord.status === "FILLED" ? "已成交" : ord.status === "PENDING" ? "排隊中" : "已撤銷"}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-slate-400 text-[11px] truncate max-w-[150px]">{ord.note || "---"}</td>
                            <td className="py-2 px-2 text-right">
                              {ord.status === "PENDING" && (
                                <button
                                  onClick={() => handleCancelOrder(ord.id)}
                                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  撤單
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 3: 成交明細 */}
            {activeTab === "HISTORY" && (
              <div className="space-y-2">
                <div className="text-slate-400 text-[11px] pb-1 border-b border-[#1e222d]">歷史成交紀錄明細</div>
                {account.history.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">尚無成交紀錄</div>
                ) : (
                  <table className="w-full text-left font-mono">
                    <thead className="text-slate-400 text-[11px] border-b border-[#1e222d]">
                      <tr>
                        <th className="py-1.5 px-2">成交時間</th>
                        <th className="py-1.5 px-2">標的</th>
                        <th className="py-1.5 px-2">買賣</th>
                        <th className="py-1.5 px-2">成交價</th>
                        <th className="py-1.5 px-2">數量</th>
                        <th className="py-1.5 px-2">成交金額</th>
                        <th className="py-1.5 px-2">手續費</th>
                        <th className="py-1.5 px-2">證交稅</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222d]">
                      {account.history.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#131722] transition-colors">
                          <td className="py-2 px-2 text-slate-400 text-[11px]">
                            {new Date(rec.timestamp).toLocaleString()}
                          </td>
                          <td className="py-2 px-2 font-bold text-white">
                            {rec.symbol} {rec.name}
                          </td>
                          <td className={`py-2 px-2 font-bold ${rec.type === "BUY" ? "text-rose-400" : "text-emerald-400"}`}>
                            {rec.type === "BUY" ? "買進" : "賣出"}
                          </td>
                          <td className="py-2 px-2 font-bold text-white">${rec.price.toFixed(2)}</td>
                          <td className="py-2 px-2 text-slate-200">
                            {rec.shares.toLocaleString()} 股 {rec.shares >= 1000 && `(${rec.shares / 1000}張)`}
                          </td>
                          <td className="py-2 px-2 text-white">${rec.amount.toLocaleString()}</td>
                          <td className="py-2 px-2 text-slate-300">${rec.fee}</td>
                          <td className="py-2 px-2 text-slate-300">${rec.tax || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 4: 台灣證交法 T+2 資金與交割中心 */}
            {activeTab === "SETTLEMENT" && (
              <div className="space-y-3">
                <div className="bg-[#141720] border border-[#2a2e3d] rounded-xl p-3 flex flex-wrap justify-between items-center gap-3">
                  <div>
                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      台灣證券交易所 T+2 營業日法定交割排程
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      依據證券交易法規，買賣成交後於次二營業日 (T+2) 上午 10:00 執行交割款自動扣款或撥付。
                    </p>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-400">
                      T+2 應收交割款: <b className="text-emerald-400">+${settlementSummary.totalPendingReceivables.toLocaleString()}</b>
                    </span>
                    <span className="text-slate-400">
                      T+2 應付交割款: <b className="text-rose-400">-${settlementSummary.totalPendingPayables.toLocaleString()}</b>
                    </span>
                  </div>
                </div>

                {(!account.settlementLedger || account.settlementLedger.length === 0) ? (
                  <div className="text-center py-6 text-slate-500 text-xs">目前無待交割款項</div>
                ) : (
                  <table className="w-full text-left font-mono">
                    <thead className="text-slate-400 text-[11px] border-b border-[#1e222d]">
                      <tr>
                        <th className="py-1.5 px-2">成交 T 日</th>
                        <th className="py-1.5 px-2">法定 T+2 交割時限</th>
                        <th className="py-1.5 px-2">標的</th>
                        <th className="py-1.5 px-2">買賣</th>
                        <th className="py-1.5 px-2">成交金額</th>
                        <th className="py-1.5 px-2">應收/應付淨額</th>
                        <th className="py-1.5 px-2">交割狀態</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e222d]">
                      {account.settlementLedger.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#131722] transition-colors">
                          <td className="py-2 px-2 text-slate-300">{entry.tradeDateString}</td>
                          <td className="py-2 px-2 text-amber-400 font-bold">{entry.settlementDateString}</td>
                          <td className="py-2 px-2 font-bold text-white">{entry.symbol} {entry.name}</td>
                          <td className={`py-2 px-2 font-bold ${entry.side === "BUY" ? "text-rose-400" : "text-emerald-400"}`}>
                            {entry.side === "BUY" ? "買進扣款" : "賣出撥款"}
                          </td>
                          <td className="py-2 px-2 text-slate-200">${entry.amount.toLocaleString()}</td>
                          <td className={`py-2 px-2 font-bold ${entry.netAmount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {entry.netAmount >= 0 ? "+" : ""}${entry.netAmount.toLocaleString()}
                          </td>
                          <td className="py-2 px-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                              {entry.status === "PENDING" ? "待交割" : "已結算"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* TAB 5: 分時逐筆成交明細 (Time & Sales) */}
            {activeTab === "TIMESALES" && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-400 text-[11px] pb-1 border-b border-[#1e222d]">
                  <span>分時逐筆明細 (內盤 / 外盤撮合流)</span>
                  <span>
                    外盤 {timeAndSalesData.totalOutLots}張 ({timeAndSalesData.outRatio}%) | 內盤 {timeAndSalesData.totalInLots}張 ({100 - timeAndSalesData.outRatio}%)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
                  {timeAndSalesData.ticks.slice(0, 16).map((tick) => (
                    <div
                      key={tick.id}
                      className="p-2 rounded-lg bg-[#141720] border border-[#222634] flex items-center justify-between"
                    >
                      <span className="text-slate-400 text-[11px]">{tick.time}</span>
                      <span className={`font-bold ${tick.change >= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                        ${tick.price.toFixed(2)}
                      </span>
                      <span className="text-white font-semibold flex items-center gap-1">
                        {tick.volumeLots}張
                        {tick.isBlockTrade && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-bold">
                            大單
                          </span>
                        )}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                        tick.type === "BUY_OUT" ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}>
                        {tick.type === "BUY_OUT" ? "外盤" : "內盤"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
