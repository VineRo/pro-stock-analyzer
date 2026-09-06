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
  PieChart,
  History,
  Calendar,
  ShieldCheck,
  Activity,
  Zap,
  Flame,
  BarChart2,
  CandlestickChart,
} from "lucide-react";
import { KLineData } from "klinecharts";
import {
  StockSymbol,
  PaperAccount,
  PaperTradeType,
  PaperPriceType,
  PaperOrderCondition,
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

interface PaperTradingWorkspaceProps {
  onBackToChart: () => void;
  currentSymbol: StockSymbol;
  onSelectSymbol: (symbol: StockSymbol) => void;
  colorTheme: "international" | "asia";
  klineData?: KLineData[];
}

type TabType = "ORDER" | "POSITIONS" | "ORDERS" | "HISTORY" | "SETTLEMENT";

export const PaperTradingWorkspace: React.FC<PaperTradingWorkspaceProps> = ({
  onBackToChart,
  currentSymbol,
  onSelectSymbol,
  colorTheme,
  klineData,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("ORDER");
  const [account, setAccount] = useState<PaperAccount>(PaperTradingService.getAccount());

  // 中間圖表分頁切換狀態 (分時走勢 INTRADAY / 即時 K 線 KLINE / 成交量走勢 VOLUME)
  const [centerChartTab, setCenterChartTab] = useState<"INTRADAY" | "KLINE" | "VOLUME">("INTRADAY");
  const [intradayHoverIdx, setIntradayHoverIdx] = useState<number | null>(null);
  const [klineHoverIdx, setKlineHoverIdx] = useState<number | null>(null);
  const [volHoverIdx, setVolHoverIdx] = useState<number | null>(null);

  // 下單核心狀態
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [tradeType, setTradeType] = useState<PaperTradeType>("COMMON");
  const [priceType, setPriceType] = useState<PaperPriceType>("LIMIT");
  const [condition, setCondition] = useState<PaperOrderCondition>("ROD");
  const [price, setPrice] = useState<number>(currentSymbol.price);
  const [quantityMode, setQuantityMode] = useState<"LOT" | "SHARE">("LOT");
  const [quantity, setQuantity] = useState<number>(1);
  const [orderFilter, setOrderFilter] = useState<"ALL" | "PENDING" | "FILLED" | "CANCELLED">("ALL");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 標的搜尋下拉狀態
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLDivElement>(null);

  // 當股票或進入工作台時同步價格
  useEffect(() => {
    const updated = PaperTradingService.updatePrices({
      [currentSymbol.symbol]: currentSymbol.price,
    });
    setAccount(updated);
    setPrice(currentSymbol.price);
  }, [currentSymbol]);

  // 點選外部收起搜尋框
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // 鍵盤 Esc 快捷鍵返回技術圖表
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isSearchOpen) {
          setIsSearchOpen(false);
        } else {
          onBackToChart();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen, onBackToChart]);

  const isGreenUp = colorTheme === "international";
  const isAsiaTheme = colorTheme === "asia";

  // 1. 市場時段與規則
  const session = useMemo(
    () => getMarketSessionInfo(currentSymbol.symbol, currentSymbol.currency),
    [currentSymbol.symbol, currentSymbol.currency]
  );

  // 2. 漲跌停與平盤參考價
  const changePercent = currentSymbol.changePercent || 0;
  const prevClose = roundToTick(currentSymbol.price / (1 + changePercent / 100));
  const limitUpPrice = roundToTick(prevClose * 1.10);
  const limitDownPrice = roundToTick(prevClose * 0.90);

  // 3. 委買/委賣五檔深度與多空比計算
  const depthInfo = useMemo(
    () => calculateDepthAndRatio(currentSymbol.symbol, currentSymbol.price),
    [currentSymbol.symbol, currentSymbol.price]
  );

  // 4. 分時逐筆成交明細 (Time & Sales)
  const timeAndSalesData = useMemo(
    () => generateTimeAndSales(currentSymbol.symbol, currentSymbol.price, prevClose),
    [currentSymbol.symbol, currentSymbol.price, prevClose]
  );

  // 5. 分時走勢圖數據 (Intraday Minute Data)
  const intradayData = useMemo(
    () => generateIntradayMinuteData(currentSymbol.symbol, currentSymbol.price, prevClose),
    [currentSymbol.symbol, currentSymbol.price, prevClose]
  );

  // 6. 分時走勢與量能統計 (包含累計量能與對稱上下界)
  const intradayStats = useMemo(() => {
    if (!intradayData || intradayData.length === 0) {
      return {
        yMax: prevClose * 1.02,
        yMin: prevClose * 0.98,
        maxDev: prevClose * 0.02,
        maxDevPercent: 2,
        maxVol: 100,
        totalIntradayVol: 0,
        pointsWithCum: [] as (typeof intradayData[0] & { cumVolume: number })[],
      };
    }
    const maxDev = Math.max(
      ...intradayData.map((p) => Math.abs(p.price - prevClose)),
      ...intradayData.map((p) => Math.abs(p.avgPrice - prevClose)),
      prevClose * 0.015
    );
    const maxDevPercent = Number(((maxDev / (prevClose || 1)) * 100).toFixed(2));
    const yMax = Number((prevClose + maxDev).toFixed(2));
    const yMin = Number((prevClose - maxDev).toFixed(2));
    const maxVol = Math.max(...intradayData.map((p) => p.volume), 50);

    let runningSum = 0;
    const pointsWithCum = intradayData.map((p) => {
      runningSum += p.volume;
      return {
        ...p,
        cumVolume: runningSum,
      };
    });

    return {
      yMax,
      yMin,
      maxDev,
      maxDevPercent,
      maxVol,
      totalIntradayVol: runningSum,
      pointsWithCum,
    };
  }, [intradayData, prevClose]);

  // 7. 即時 K 線圖歷史資料 (近 30 根 K 線與 MA5, MA20 均線計算)
  const candlesWithMA = useMemo(() => {
    const raw = (klineData && klineData.length > 0)
      ? klineData.slice(-30)
      : generateRealisticKLineData(currentSymbol.symbol, currentSymbol.price, "1D").slice(-30);

    return raw.map((c, idx, arr) => {
      let sum5 = 0;
      let count5 = 0;
      for (let j = Math.max(0, idx - 4); j <= idx; j++) {
        sum5 += arr[j].close;
        count5++;
      }
      const ma5 = count5 > 0 ? Number((sum5 / count5).toFixed(2)) : c.close;

      let sum20 = 0;
      let count20 = 0;
      for (let j = Math.max(0, idx - 19); j <= idx; j++) {
        sum20 += arr[j].close;
        count20++;
      }
      const ma20 = count20 > 0 ? Number((sum20 / count20).toFixed(2)) : c.close;
      const volumeLots = Math.max(1, Math.round((c.volume || 1000) / 1000));

      const d = new Date(c.timestamp);
      const dateStr = `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;

      return {
        ...c,
        dateStr,
        volumeLots,
        ma5,
        ma20,
      };
    });
  }, [klineData, currentSymbol.symbol, currentSymbol.price]);

  // 8. 台灣證交法 T+2 資金與交割帳務統計
  const settlementSummary = useMemo(
    () => getSettlementAccountSummary(account),
    [account]
  );

  // 下單金額試算
  const totalShares = quantityMode === "LOT" ? quantity * 1000 : quantity;
  const effectivePrice = priceType === "MARKET" ? currentSymbol.price : price;
  const est = calculateEstimate(effectivePrice, totalShares, side);

  // 持股狀況
  const heldPosition = account.positions.find((p) => p.symbol === currentSymbol.symbol);
  const heldShares = heldPosition ? heldPosition.shares : 0;

  // 帳戶整體數據
  const totalMarketValue = account.positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const netEquity = account.balance + totalMarketValue;
  const totalProfit = netEquity - account.initialCapital;
  const totalProfitPercent = Number(((totalProfit / account.initialCapital) * 100).toFixed(2));
  const isOverallProfit = totalProfit >= 0;
  const pendingOrdersCount = account.orders.filter((o) => o.status === "PENDING").length;

  // 搜尋過濾
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchStockDirectory(searchQuery.trim(), "ALL").slice(0, 8);
  }, [searchQuery]);

  // 價格與數量步進控制器
  const handlePriceStep = (dir: "UP" | "DOWN") => {
    if (priceType === "MARKET") {
      setPriceType("LIMIT");
      setPrice(stepPrice(currentSymbol.price, dir));
    } else {
      setPrice(stepPrice(price, dir));
    }
  };

  const handleQuantityStep = (dir: "UP" | "DOWN") => {
    if (quantityMode === "LOT") {
      if (dir === "UP") setQuantity((q) => q + 1);
      else setQuantity((q) => Math.max(1, q - 1));
    } else {
      if (dir === "UP") setQuantity((q) => q + 100);
      else setQuantity((q) => Math.max(1, q - 100));
    }
  };

  // 送出委託下單
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    const res = PaperTradingService.placeOrder({
      symbol: currentSymbol.symbol,
      name: currentSymbol.name,
      side,
      tradeType,
      priceType,
      orderPrice: priceType === "MARKET" ? currentSymbol.price : price,
      shares: totalShares,
      condition,
      currentMarketPrice: currentSymbol.price,
      currency: currentSymbol.currency || "TWD",
      referenceClosePrice: prevClose,
    });

    if (res.success) {
      setNotice({ type: "success", text: res.message });
      setAccount(PaperTradingService.getAccount());
    } else {
      setNotice({ type: "error", text: res.message });
    }
  };

  // 撤銷指定委託
  const handleCancelOrder = (orderId: string) => {
    const res = PaperTradingService.cancelOrder(orderId);
    if (res.success) {
      setNotice({ type: "success", text: res.message });
      setAccount(PaperTradingService.getAccount());
    } else {
      setNotice({ type: "error", text: res.message });
    }
  };

  // 一鍵全部撤單
  const handleCancelAll = () => {
    if (window.confirm("確定要撤銷目前所有「委託中」的排隊掛單嗎？")) {
      const res = PaperTradingService.cancelAllOrders();
      setNotice({ type: "success", text: `已成功撤銷 ${res.count} 筆委託單` });
      setAccount(PaperTradingService.getAccount());
    }
  };

  // 市價平倉指定部位
  const handleClosePosition = (symbol: string, posShares: number) => {
    if (window.confirm(`確定要以現價市價全數平倉 ${posShares.toLocaleString()} 股嗎？`)) {
      const res = PaperTradingService.placeOrder({
        symbol,
        name: currentSymbol.name,
        side: "SELL",
        tradeType: "COMMON",
        priceType: "MARKET",
        orderPrice: currentSymbol.price,
        shares: posShares,
        currentMarketPrice: currentSymbol.price,
      });

      if (res.success) {
        setNotice({ type: "success", text: res.message });
        setAccount(PaperTradingService.getAccount());
      } else {
        setNotice({ type: "error", text: res.message });
      }
    }
  };

  // 重置帳戶
  const handleResetAccount = () => {
    if (window.confirm("確定要將模擬交易帳戶重置回初始資金 $1,000,000 嗎？所有持倉、委託與 T+2 交割流水帳將歸零。")) {
      const reset = PaperTradingService.resetAccount(1000000);
      setAccount(reset);
      setNotice({ type: "success", text: "模擬帳戶已成功重置為 $1,000,000！" });
    }
  };

  // 檢查 T+2 資金與持股
  const isInsufficientFund = side === "BUY" && settlementSummary.availableForTrading < est.total;
  const isInsufficientShares = side === "SELL" && heldShares < totalShares;
  const isMarketOrderProhibited = priceType === "MARKET" && !session.canTradeMarketOrder;

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-[#131722] text-slate-200 overflow-hidden select-none font-sans">
      
      {/* 頂部旗艦導覽列：返回按鈕、標的切換搜尋、即時行情徽章與 T+2 資金快捷看盤 */}
      <div className="h-12 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between px-3 sm:px-5 shrink-0 z-10">
        
        {/* 左側：返回看盤 + 標的識別與搜尋切換 */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToChart}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131722] hover:bg-[#252a37] text-slate-300 hover:text-white border border-[#2a2e39] text-xs font-bold transition-colors shadow-sm"
            title="返回主技術圖表 (快捷鍵: Esc)"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">返回 K 線圖</span>
            <span className="text-[10px] text-slate-400 font-mono hidden md:inline">Esc</span>
          </button>

          {/* 標的選擇卡片與搜尋下拉 */}
          <div className="relative" ref={searchRef}>
            <button
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className="flex items-center gap-2 bg-[#131722] hover:bg-[#252a37] border border-[#2a2e39] hover:border-slate-500 px-3 py-1.5 rounded-xl transition-colors text-left shadow-sm"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-white font-mono tracking-wider">{currentSymbol.symbol}</span>
                <span className="text-xs font-bold text-slate-300 truncate max-w-[110px] sm:max-w-[160px]">{currentSymbol.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">
                  {session.market}
                </span>
              </div>
              <Search className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* 標的搜尋浮層 */}
            {isSearchOpen && (
              <div className="absolute left-0 top-11 w-80 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl p-2.5 z-50 animate-fade-in space-y-2">
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

          {/* 時段徽章 */}
          <div className="hidden lg:flex items-center">
            {session.status === "OPEN" ? (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {session.sessionName}
              </span>
            ) : session.status === "CALL_AUCTION" ? (
              <span className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                {session.sessionName}
              </span>
            ) : (
              <span
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-700/60 text-slate-300 border border-slate-600/40 flex items-center gap-1.5 font-medium"
                title={session.description}
              >
                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                {session.sessionName}
              </span>
            )}
          </div>
        </div>

        {/* 右側：台灣證交法 T+2 資金快捷提示欄 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 bg-[#131722] border border-[#2a2e39] px-3.5 py-1 rounded-xl font-mono text-xs">
            <div>
              <div className="text-[10px] text-slate-400 font-sans">目前可用於交易額度 (購買力)</div>
              <div className="text-sm font-black text-emerald-400">
                ${settlementSummary.availableForTrading.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="hidden md:block border-l border-slate-700/60 pl-3">
              <div className="text-[10px] text-slate-400 font-sans">銀行總現金</div>
              <div className="text-xs font-bold text-white">
                ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          <button
            onClick={handleResetAccount}
            className="p-2 text-slate-400 hover:text-white rounded-lg border border-[#2a2e39] hover:bg-[#252a37] transition-colors"
            title="重置模擬本金至 $1,000,000"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 系統即時提示訊息 */}
      {notice && (
        <div className={`px-5 py-2 text-xs flex items-center justify-between border-b ${
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
          <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 主三欄工作區 (上層：撮合行情五檔 + 分時交易資料 + 元大下單面板) */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* COLUMN 1: 即時撮合價格看板、多空比與五檔深度盤 (佔 4 格) */}
          <div className="lg:col-span-4 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 space-y-3.5">
            
            {/* 撮合價格大字看板 */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-bold text-slate-300">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  目前盤面撮合價格
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  撮合成交量: {depthInfo.matchedVolumeLots}張
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-2 font-mono">
                <span className={`text-3xl font-black ${
                  changePercent > 0
                    ? isGreenUp ? "text-emerald-400" : "text-rose-400"
                    : changePercent < 0
                    ? isGreenUp ? "text-rose-400" : "text-emerald-400"
                    : "text-white"
                }`}>
                  ${currentSymbol.price.toFixed(2)}
                </span>
                <div className="text-right">
                  <span className={`text-sm font-extrabold ${
                    changePercent > 0
                      ? isGreenUp ? "text-emerald-400" : "text-rose-400"
                      : changePercent < 0
                      ? isGreenUp ? "text-rose-400" : "text-emerald-400"
                      : "text-slate-300"
                  }`}>
                    {changePercent > 0 ? "+" : ""}{changePercent.toFixed(2)}%
                  </span>
                  <div className="text-[10px] text-slate-400">昨收 ${prevClose.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* 委買 / 委賣 多空比與買賣氣勢能量條 */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-200 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  委買 / 委賣 多空比
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded font-mono font-extrabold ${
                  depthInfo.sentiment === "BULLISH"
                    ? isAsiaTheme ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : depthInfo.sentiment === "BEARISH"
                    ? isAsiaTheme ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    : "bg-slate-700/50 text-slate-300"
                }`}>
                  {depthInfo.sentimentLabel}
                </span>
              </div>

              {/* 多空能量條 */}
              <div className="space-y-1.5">
                <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${depthInfo.longRatio}%` }}
                    className={`h-full transition-all duration-300 ${
                      isAsiaTheme ? "bg-rose-500" : "bg-emerald-500"
                    }`}
                  />
                  <div
                    style={{ width: `${depthInfo.shortRatio}%` }}
                    className={`h-full transition-all duration-300 ${
                      isAsiaTheme ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className={`font-bold ${isAsiaTheme ? "text-rose-400" : "text-emerald-400"}`}>
                    委買: {depthInfo.totalBidVol}張 ({depthInfo.longRatio}%)
                  </span>
                  <span className="text-slate-400 font-bold">比值: {depthInfo.powerRatio}</span>
                  <span className={`font-bold ${isAsiaTheme ? "text-emerald-400" : "text-rose-400"}`}>
                    委賣: {depthInfo.totalAskVol}張 ({depthInfo.shortRatio}%)
                  </span>
                </div>
              </div>
            </div>

            {/* 最佳五檔深度買賣盤 (點擊價格自動帶入下單面板) */}
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between text-[10px] text-slate-400 px-2 pb-1 border-b border-[#2a2e39]">
                <span>檔位 / 張數</span>
                <span>深度量能</span>
                <span>委託價格 (點擊帶入)</span>
              </div>

              {/* 賣五檔 (由高至低) */}
              {depthInfo.asks.map((a, idx) => (
                <div
                  key={`ask-${idx}`}
                  onClick={() => {
                    setPriceType("LIMIT");
                    setPrice(a.price);
                  }}
                  className="relative flex items-center justify-between py-1 px-2 rounded hover:bg-[#252a37] cursor-pointer transition-colors overflow-hidden group"
                >
                  {/* 量能長條背景 */}
                  <div
                    style={{ width: `${a.percent}%` }}
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/10 group-hover:bg-rose-500/20 pointer-events-none transition-all"
                  />
                  <span className="text-slate-400 text-[11px] relative z-10">賣 {5 - idx} ({a.vol}張)</span>
                  <span className="text-[10px] text-slate-400 relative z-10">{a.percent}%</span>
                  <span className={`font-bold relative z-10 ${isGreenUp ? "text-rose-400" : "text-emerald-400"}`}>
                    ${a.price.toFixed(2)}
                  </span>
                </div>
              ))}

              {/* 當前最新撮合價分界線 */}
              <div className="py-1 px-2.5 my-1 bg-[#131722] rounded-lg border border-[#2a2e39] flex items-center justify-between text-white font-bold">
                <span className="text-[11px] text-slate-400 font-sans">最新撮合價</span>
                <span className="text-sm font-black text-amber-400">${currentSymbol.price.toFixed(2)}</span>
                <span className="text-[11px] text-slate-400">{currentSymbol.volume24h || "1,280張"}</span>
              </div>

              {/* 買五檔 (由高至低) */}
              {depthInfo.bids.map((b, idx) => (
                <div
                  key={`bid-${idx}`}
                  onClick={() => {
                    setPriceType("LIMIT");
                    setPrice(b.price);
                  }}
                  className="relative flex items-center justify-between py-1 px-2 rounded hover:bg-[#252a37] cursor-pointer transition-colors overflow-hidden group"
                >
                  {/* 量能長條背景 */}
                  <div
                    style={{ width: `${b.percent}%` }}
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 group-hover:bg-emerald-500/20 pointer-events-none transition-all"
                  />
                  <span className="text-slate-400 text-[11px] relative z-10">買 {idx + 1} ({b.vol}張)</span>
                  <span className="text-[10px] text-slate-400 relative z-10">{b.percent}%</span>
                  <span className={`font-bold relative z-10 ${isGreenUp ? "text-emerald-400" : "text-rose-400"}`}>
                    ${b.price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* COLUMN 2: 分時走勢 / 即時 K 線 / 成交量走勢 與分時逐筆成交明細 Time & Sales (佔 4 格) */}
          <div className="lg:col-span-4 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 space-y-3.5 flex flex-col">
            
            {/* 中間圖表核心分頁切換列 (分時走勢 / 即時 K 線 / 成交量走勢) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-[#2a2e39]">
              <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-xl border border-[#2a2e39]">
                <button
                  type="button"
                  onClick={() => setCenterChartTab("INTRADAY")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    centerChartTab === "INTRADAY"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-[#1e222d]"
                  }`}
                  title="切換為分時走勢與 VWAP 均價線"
                >
                  <Activity size={13} className={centerChartTab === "INTRADAY" ? "text-white" : "text-sky-400"} />
                  <span>分時走勢</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCenterChartTab("KLINE")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    centerChartTab === "KLINE"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-[#1e222d]"
                  }`}
                  title="切換為即時 K 線圖 (含 MA5 / MA20 均線)"
                >
                  <CandlestickChart size={13} className={centerChartTab === "KLINE" ? "text-white" : "text-amber-400"} />
                  <span>即時 K 線</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCenterChartTab("VOLUME")}
                  className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    centerChartTab === "VOLUME"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white hover:bg-[#1e222d]"
                  }`}
                  title="切換為成交量走勢圖 (含均量與累計量能曲線)"
                >
                  <BarChart2 size={13} className={centerChartTab === "VOLUME" ? "text-white" : "text-emerald-400"} />
                  <span>成交量走勢</span>
                </button>
              </div>

              {/* 單位標示徽章 (明確告知幣別單位與張數單位) */}
              <div className="flex items-center gap-1.5 text-[10px] text-slate-300 font-mono self-end sm:self-center">
                <span className="bg-[#131722] px-2 py-0.5 rounded-md border border-[#2a2e39] text-slate-400">
                  價格: <span className="text-white font-bold">{currentSymbol.currency || "TWD"} (元)</span>
                </span>
                <span className="bg-[#131722] px-2 py-0.5 rounded-md border border-[#2a2e39] text-slate-400">
                  量能: <span className="text-white font-bold">張 (1,000股)</span>
                </span>
              </div>
            </div>

            {/* TAB 1: 分時走勢圖 (價格與 VWAP 均價線 + 細緻向量線條 + 完整單位標示) */}
            {centerChartTab === "INTRADAY" && (
              <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden select-none">
                {/* 頂部即時數據 HUD 列 */}
                <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono border-b border-[#2a2e39]/60 pb-1.5 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">平盤 ${prevClose.toFixed(2)}</span>
                    {intradayHoverIdx !== null && intradayData[intradayHoverIdx] ? (
                      <span className="bg-blue-600/30 border border-blue-500/40 px-1.5 py-0.5 rounded text-sky-200">
                        時間: {intradayData[intradayHoverIdx].time} | 現價: ${intradayData[intradayHoverIdx].price.toFixed(2)} (
                        {intradayData[intradayHoverIdx].price >= prevClose ? "+" : ""}
                        {((intradayData[intradayHoverIdx].price - prevClose) / prevClose * 100).toFixed(2)}%) | 
                        VWAP: ${intradayData[intradayHoverIdx].avgPrice.toFixed(2)} | 
                        單分量: {intradayData[intradayHoverIdx].volume}張
                      </span>
                    ) : (
                      <span className="text-slate-400 hidden sm:inline">
                        現價: <span className={currentSymbol.change >= 0 ? (isAsiaTheme ? "text-rose-400" : "text-emerald-400") : (isAsiaTheme ? "text-emerald-400" : "text-rose-400")}>
                          ${currentSymbol.price.toFixed(2)} ({currentSymbol.change >= 0 ? "+" : ""}{currentSymbol.changePercent}%)
                        </span>
                        {" "}| VWAP: <span className="text-amber-400">${(intradayData[intradayData.length - 1]?.avgPrice || currentSymbol.price).toFixed(2)}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-rose-400">漲停 ${limitUpPrice.toFixed(2)}</span>
                    <span className="text-emerald-400">跌停 ${limitDownPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* SVG 分時圖畫布 */}
                <div className="relative w-full h-48 my-1">
                  <svg
                    className="w-full h-full"
                    viewBox="0 0 520 200"
                    preserveAspectRatio="none"
                    onMouseLeave={() => setIntradayHoverIdx(null)}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const mouseX = e.clientX - rect.left;
                      const relX = (mouseX / rect.width) * 520;
                      if (relX >= 52 && relX <= 468 && intradayData.length > 1) {
                        const idx = Math.round(((relX - 52) / 416) * (intradayData.length - 1));
                        setIntradayHoverIdx(Math.max(0, Math.min(intradayData.length - 1, idx)));
                      } else {
                        setIntradayHoverIdx(null);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="intradayPriceArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* 橫向參考格線 */}
                    <line x1="52" y1="18" x2="468" y2="18" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    <line x1="52" y1="48" x2="468" y2="48" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    {/* 昨收平盤基準線 (加強中性灰虛線) */}
                    <line x1="52" y1="78" x2="468" y2="78" stroke="#64748b" strokeDasharray="3,3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    <line x1="52" y1="108" x2="468" y2="108" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    <line x1="52" y1="138" x2="468" y2="138" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />

                    {/* 左側價格單位標尺 (元) */}
                    <text x="46" y="22" textAnchor="end" fill={isAsiaTheme ? "#f43f5e" : "#10b981"} fontSize="10" fontFamily="monospace">
                      ${intradayStats.yMax.toFixed(2)}
                    </text>
                    <text x="46" y="52" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      ${(prevClose + intradayStats.maxDev * 0.5).toFixed(2)}
                    </text>
                    <text x="46" y="81" textAnchor="end" fill="#cbd5e1" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      ${prevClose.toFixed(2)}
                    </text>
                    <text x="46" y="111" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      ${(prevClose - intradayStats.maxDev * 0.5).toFixed(2)}
                    </text>
                    <text x="46" y="141" textAnchor="end" fill={isAsiaTheme ? "#10b981" : "#f43f5e"} fontSize="10" fontFamily="monospace">
                      ${intradayStats.yMin.toFixed(2)}
                    </text>

                    {/* 右側漲跌幅單位標尺 (%) */}
                    <text x="474" y="22" textAnchor="start" fill={isAsiaTheme ? "#f43f5e" : "#10b981"} fontSize="10" fontFamily="monospace">
                      +{intradayStats.maxDevPercent}%
                    </text>
                    <text x="474" y="52" textAnchor="start" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      +{(intradayStats.maxDevPercent / 2).toFixed(2)}%
                    </text>
                    <text x="474" y="81" textAnchor="start" fill="#cbd5e1" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      0.00%
                    </text>
                    <text x="474" y="111" textAnchor="start" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                      -{(intradayStats.maxDevPercent / 2).toFixed(2)}%
                    </text>
                    <text x="474" y="141" textAnchor="start" fill={isAsiaTheme ? "#10b981" : "#f43f5e"} fontSize="10" fontFamily="monospace">
                      -{intradayStats.maxDevPercent}%
                    </text>

                    {/* 價格面積半透明漸層 */}
                    {intradayData.length > 1 && (
                      <polygon
                        fill="url(#intradayPriceArea)"
                        points={`52,138 ${intradayData
                          .map((p, i) => {
                            const x = 52 + (i / (intradayData.length - 1)) * 416;
                            const y = 78 - ((p.price - prevClose) / (intradayStats.maxDev || 1)) * 60;
                            return `${x},${Math.max(16, Math.min(140, y))}`;
                          })
                          .join(" ")} 468,138`}
                      />
                    )}

                    {/* VWAP 均價線 (細微純淨黃色線，寬度 1px，絕不粗暴) */}
                    {intradayData.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#fbbf24"
                        strokeWidth="1.0"
                        strokeOpacity="0.85"
                        vectorEffect="non-scaling-stroke"
                        points={intradayData
                          .map((p, i) => {
                            const x = 52 + (i / (intradayData.length - 1)) * 416;
                            const y = 78 - ((p.avgPrice - prevClose) / (intradayStats.maxDev || 1)) * 60;
                            return `${x},${Math.max(16, Math.min(140, y))}`;
                          })
                          .join(" ")}
                      />
                    )}

                    {/* 現價分時曲線 (青藍色纖細線條，寬度 1.2px) */}
                    {intradayData.length > 1 && (
                      <polyline
                        fill="none"
                        stroke="#38bdf8"
                        strokeWidth="1.2"
                        vectorEffect="non-scaling-stroke"
                        points={intradayData
                          .map((p, i) => {
                            const x = 52 + (i / (intradayData.length - 1)) * 416;
                            const y = 78 - ((p.price - prevClose) / (intradayStats.maxDev || 1)) * 60;
                            return `${x},${Math.max(16, Math.min(140, y))}`;
                          })
                          .join(" ")}
                      />
                    )}

                    {/* 下方分時成交量柱狀圖 (量能單位: 張) */}
                    <line x1="52" y1="148" x2="468" y2="148" stroke="#2a2e39" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                    <text x="46" y="156" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                      量(張)
                    </text>
                    <text x="474" y="156" textAnchor="start" fill="#64748b" fontSize="8" fontFamily="monospace">
                      {intradayStats.maxVol}
                    </text>

                    {intradayData.map((p, i) => {
                      const bx = 52 + (i / (intradayData.length - 1)) * 416;
                      const bw = Math.max(2, 416 / intradayData.length - 1.2);
                      const bh = (p.volume / (intradayStats.maxVol || 1)) * 34;
                      const by = 184 - bh;
                      const isUp = p.price >= prevClose;
                      const barFill = isUp
                        ? isAsiaTheme ? "#f43f5e" : "#10b981"
                        : isAsiaTheme ? "#10b981" : "#f43f5e";
                      return (
                        <rect
                          key={`vol_${i}`}
                          x={bx - bw / 2}
                          y={by}
                          width={bw}
                          height={Math.max(1, bh)}
                          fill={barFill}
                          opacity={intradayHoverIdx === i ? 1 : 0.65}
                        />
                      );
                    })}

                    {/* 底部時間刻度單位 (09:00 ~ 13:30) */}
                    <text x="52" y="196" textAnchor="start" fill="#64748b" fontSize="8" fontFamily="monospace">09:00</text>
                    <text x="145" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">10:00</text>
                    <text x="238" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">11:00</text>
                    <text x="331" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">12:00</text>
                    <text x="424" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">13:00</text>
                    <text x="468" y="196" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">13:30 (收)</text>

                    {/* 懸浮十字線與數據圓點 */}
                    {intradayHoverIdx !== null && intradayData[intradayHoverIdx] && (
                      <g>
                        <line
                          x1={52 + (intradayHoverIdx / (intradayData.length - 1)) * 416}
                          y1="18"
                          x2={52 + (intradayHoverIdx / (intradayData.length - 1)) * 416}
                          y2="184"
                          stroke="#e2e8f0"
                          strokeWidth="0.8"
                          strokeDasharray="2,2"
                          vectorEffect="non-scaling-stroke"
                        />
                        <circle
                          cx={52 + (intradayHoverIdx / (intradayData.length - 1)) * 416}
                          cy={Math.max(16, Math.min(140, 78 - ((intradayData[intradayHoverIdx].price - prevClose) / (intradayStats.maxDev || 1)) * 60))}
                          r="3"
                          fill="#38bdf8"
                          stroke="#ffffff"
                          strokeWidth="1"
                        />
                      </g>
                    )}
                  </svg>
                </div>

                {/* 底部圖例說明列 */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2a2e39]/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-sky-400">
                      <span className="w-2.5 h-0.5 bg-sky-400 inline-block"></span>現價走勢 (元)
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>VWAP均價 (元)
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-slate-400 inline-block"></span>昨收平盤
                    </span>
                  </div>
                  <span className="text-slate-400">累計成交量: <span className="text-white font-bold">{intradayStats.totalIntradayVol.toLocaleString()}</span> 張</span>
                </div>
              </div>
            )}

            {/* TAB 2: 即時 K 線圖 (近 30 根 K 線 + MA5 / MA20 均線 + 完整 OHLC 報價) */}
            {centerChartTab === "KLINE" && (
              <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden select-none">
                {/* 頂部 K 線數據 HUD 列 */}
                <div className="flex justify-between items-center text-[10px] text-slate-300 font-mono border-b border-[#2a2e39]/60 pb-1.5 mb-1">
                  {(() => {
                    const activeCandle = (klineHoverIdx !== null && candlesWithMA[klineHoverIdx])
                      ? candlesWithMA[klineHoverIdx]
                      : candlesWithMA[candlesWithMA.length - 1];
                    if (!activeCandle) return <span>載入中...</span>;
                    const chg = activeCandle.close - activeCandle.open;
                    const chgPct = activeCandle.open > 0 ? ((chg / activeCandle.open) * 100).toFixed(2) : "0.00";
                    return (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-slate-300">
                          [{activeCandle.dateStr}] 開: <span className="font-bold text-white">${activeCandle.open.toFixed(2)}</span>
                          {" "}高: <span className="font-bold text-white">${activeCandle.high.toFixed(2)}</span>
                          {" "}低: <span className="font-bold text-white">${activeCandle.low.toFixed(2)}</span>
                          {" "}收: <span className={`font-bold ${chg >= 0 ? (isAsiaTheme ? "text-rose-400" : "text-emerald-400") : (isAsiaTheme ? "text-emerald-400" : "text-rose-400")}`}>
                            ${activeCandle.close.toFixed(2)} ({chg >= 0 ? "+" : ""}{chgPct}%)
                          </span>
                          {" "}量: <span className="font-bold text-amber-300">{activeCandle.volumeLots.toLocaleString()}張</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">MA5: ${activeCandle.ma5.toFixed(2)}</span>
                          <span className="text-purple-400">MA20: ${activeCandle.ma20.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* SVG K 線圖畫布 */}
                <div className="relative w-full h-48 my-1">
                  {(() => {
                    const N = candlesWithMA.length;
                    if (N === 0) return null;
                    const kHigh = Math.max(...candlesWithMA.map((c) => c.high), ...candlesWithMA.map((c) => c.ma5)) * 1.006;
                    const kLow = Math.min(...candlesWithMA.map((c) => c.low), ...candlesWithMA.map((c) => c.ma20)) * 0.994;
                    const kRange = kHigh - kLow || 1;
                    const getKY = (val: number) => 18 + (1 - (val - kLow) / kRange) * 120;
                    const maxVol = Math.max(...candlesWithMA.map((c) => c.volumeLots), 10);

                    return (
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 520 200"
                        preserveAspectRatio="none"
                        onMouseLeave={() => setKlineHoverIdx(null)}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mouseX = e.clientX - rect.left;
                          const relX = (mouseX / rect.width) * 520;
                          if (relX >= 52 && relX <= 468 && N > 1) {
                            const idx = Math.round(((relX - 52) / 416) * (N - 1));
                            setKlineHoverIdx(Math.max(0, Math.min(N - 1, idx)));
                          } else {
                            setKlineHoverIdx(null);
                          }
                        }}
                      >
                        {/* 橫向參考線 */}
                        <line x1="52" y1="18" x2="468" y2="18" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <line x1="52" y1="78" x2="468" y2="78" stroke="#242b38" strokeDasharray="3,3" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <line x1="52" y1="138" x2="468" y2="138" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />

                        {/* 左側價格刻度 */}
                        <text x="46" y="22" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          ${kHigh.toFixed(2)}
                        </text>
                        <text x="46" y="81" textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                          ${((kHigh + kLow) / 2).toFixed(2)}
                        </text>
                        <text x="46" y="141" textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          ${kLow.toFixed(2)}
                        </text>

                        {/* 下方量能隔線 */}
                        <line x1="52" y1="148" x2="468" y2="148" stroke="#2a2e39" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <text x="46" y="156" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">量(張)</text>
                        <text x="474" y="156" textAnchor="start" fill="#64748b" fontSize="8" fontFamily="monospace">{maxVol}</text>

                        {/* 繪製蠟燭與成交量柱 */}
                        {candlesWithMA.map((c, i) => {
                          const cx = 52 + (i / (N - 1)) * 416;
                          const cw = Math.max(3.5, Math.min(8.5, (416 / N) * 0.7));
                          const isUp = c.close >= c.open;
                          const color = isUp
                            ? isAsiaTheme ? "#f43f5e" : "#10b981"
                            : isAsiaTheme ? "#10b981" : "#f43f5e";

                          const yOpen = getKY(c.open);
                          const yClose = getKY(c.close);
                          const yHigh = getKY(c.high);
                          const yLow = getKY(c.low);

                          const vh = (c.volumeLots / maxVol) * 34;
                          const vy = 184 - vh;

                          return (
                            <g key={`candle_${i}`}>
                              {/* 影線 */}
                              <line
                                x1={cx}
                                y1={yHigh}
                                x2={cx}
                                y2={yLow}
                                stroke={color}
                                strokeWidth="1"
                                vectorEffect="non-scaling-stroke"
                              />
                              {/* 實體 */}
                              <rect
                                x={cx - cw / 2}
                                y={Math.min(yOpen, yClose)}
                                width={cw}
                                height={Math.max(2, Math.abs(yClose - yOpen))}
                                fill={color}
                              />
                              {/* 成交量柱 */}
                              <rect
                                x={cx - cw / 2}
                                y={vy}
                                width={cw}
                                height={Math.max(1, vh)}
                                fill={color}
                                opacity={klineHoverIdx === i ? 1 : 0.7}
                              />
                            </g>
                          );
                        })}

                        {/* MA5 均線 */}
                        <polyline
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.2"
                          vectorEffect="non-scaling-stroke"
                          points={candlesWithMA.map((c, i) => `${52 + (i / (N - 1)) * 416},${getKY(c.ma5)}`).join(" ")}
                        />

                        {/* MA20 均線 */}
                        <polyline
                          fill="none"
                          stroke="#a855f7"
                          strokeWidth="1.2"
                          vectorEffect="non-scaling-stroke"
                          points={candlesWithMA.map((c, i) => `${52 + (i / (N - 1)) * 416},${getKY(c.ma20)}`).join(" ")}
                        />

                        {/* 底部日期刻度標籤 */}
                        {candlesWithMA.map((c, i) => {
                          if (i === 0 || i === Math.floor(N / 3) || i === Math.floor((N * 2) / 3) || i === N - 1) {
                            const cx = 52 + (i / (N - 1)) * 416;
                            return (
                              <text key={`d_${i}`} x={cx} y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">
                                {c.dateStr}
                              </text>
                            );
                          }
                          return null;
                        })}

                        {/* 懸浮游標 */}
                        {klineHoverIdx !== null && (
                          <line
                            x1={52 + (klineHoverIdx / (N - 1)) * 416}
                            y1="18"
                            x2={52 + (klineHoverIdx / (N - 1)) * 416}
                            y2="184"
                            stroke="#e2e8f0"
                            strokeWidth="0.8"
                            strokeDasharray="2,2"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                      </svg>
                    );
                  })()}
                </div>

                {/* 底部圖例說明列 */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2a2e39]/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>MA5 5日均線 (元)
                    </span>
                    <span className="flex items-center gap-1 text-purple-400">
                      <span className="w-2.5 h-0.5 bg-purple-400 inline-block"></span>MA20 20日均線 (元)
                    </span>
                  </div>
                  <span className="text-slate-400">近 30 交易日燭線</span>
                </div>
              </div>
            )}

            {/* TAB 3: 成交量走勢圖 (VOLUME TREND - 內外盤柱狀分佈 + 均量線 + 累計量能曲線) */}
            {centerChartTab === "VOLUME" && (
              <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-2.5 flex flex-col justify-between relative overflow-hidden select-none">
                {/* 頂部量能指標卡片列 */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono border-b border-[#2a2e39]/60 pb-1.5 mb-1">
                  <div className="bg-[#1e222d] p-1.5 rounded-lg border border-[#2a2e39]">
                    <div className="text-[9px] text-slate-400">今日總量</div>
                    <div className="font-bold text-white text-xs">{(timeAndSalesData.totalOutLots + timeAndSalesData.totalInLots).toLocaleString()} 張</div>
                  </div>
                  <div className="bg-[#1e222d] p-1.5 rounded-lg border border-[#2a2e39]">
                    <div className="text-[9px] text-slate-400">外盤(主動買)</div>
                    <div className={`font-bold text-xs ${isAsiaTheme ? "text-rose-400" : "text-emerald-400"}`}>{timeAndSalesData.totalOutLots.toLocaleString()} 張</div>
                  </div>
                  <div className="bg-[#1e222d] p-1.5 rounded-lg border border-[#2a2e39]">
                    <div className="text-[9px] text-slate-400">內盤(主動賣)</div>
                    <div className={`font-bold text-xs ${isAsiaTheme ? "text-emerald-400" : "text-rose-400"}`}>{timeAndSalesData.totalInLots.toLocaleString()} 張</div>
                  </div>
                  <div className="bg-[#1e222d] p-1.5 rounded-lg border border-[#2a2e39]">
                    <div className="text-[9px] text-slate-400">外盤佔比</div>
                    <div className="font-bold text-amber-300 text-xs">{timeAndSalesData.outRatio}%</div>
                  </div>
                </div>

                {/* SVG 成交量走勢畫布 */}
                <div className="relative w-full h-48 my-1">
                  {(() => {
                    const N = intradayStats.pointsWithCum.length;
                    if (N === 0) return null;
                    const maxMinuteVol = intradayStats.maxVol;
                    const maxCumVol = intradayStats.totalIntradayVol || 100;

                    return (
                      <svg
                        className="w-full h-full"
                        viewBox="0 0 520 200"
                        preserveAspectRatio="none"
                        onMouseLeave={() => setVolHoverIdx(null)}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const mouseX = e.clientX - rect.left;
                          const relX = (mouseX / rect.width) * 520;
                          if (relX >= 52 && relX <= 468 && N > 1) {
                            const idx = Math.round(((relX - 52) / 416) * (N - 1));
                            setVolHoverIdx(Math.max(0, Math.min(N - 1, idx)));
                          } else {
                            setVolHoverIdx(null);
                          }
                        }}
                      >
                        <defs>
                          <linearGradient id="cumVolArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* 橫向量能標線 */}
                        <line x1="52" y1="20" x2="468" y2="20" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <line x1="52" y1="50" x2="468" y2="50" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <line x1="52" y1="85" x2="468" y2="85" stroke="#242b38" strokeDasharray="3,3" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <line x1="52" y1="135" x2="468" y2="135" stroke="#1f2430" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
                        <line x1="52" y1="184" x2="468" y2="184" stroke="#2a2e39" strokeWidth="1" vectorEffect="non-scaling-stroke" />

                        {/* 左側單分量刻度 (張) */}
                        <text x="46" y="90" textAnchor="end" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                          {maxMinuteVol}張
                        </text>
                        <text x="46" y="137" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                          {Math.round(maxMinuteVol / 2)}張
                        </text>
                        <text x="46" y="184" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">
                          0張
                        </text>

                        {/* 右側累計量刻度 (張) */}
                        <text x="474" y="24" textAnchor="start" fill="#22d3ee" fontSize="8" fontFamily="monospace">
                          累計 {maxCumVol}張
                        </text>
                        <text x="474" y="54" textAnchor="start" fill="#0891b2" fontSize="8" fontFamily="monospace">
                          {Math.round(maxCumVol / 2)}張
                        </text>

                        {/* 累計成交量走勢曲線 (cyan) 與漸層 */}
                        <polygon
                          fill="url(#cumVolArea)"
                          points={`52,85 ${intradayStats.pointsWithCum
                            .map((p, i) => {
                              const x = 52 + (i / (N - 1)) * 416;
                              const y = 85 - (p.cumVolume / maxCumVol) * 65;
                              return `${x},${Math.max(20, y)}`;
                            })
                            .join(" ")} 468,85`}
                        />

                        <polyline
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.2"
                          vectorEffect="non-scaling-stroke"
                          points={intradayStats.pointsWithCum
                            .map((p, i) => {
                              const x = 52 + (i / (N - 1)) * 416;
                              const y = 85 - (p.cumVolume / maxCumVol) * 65;
                              return `${x},${Math.max(20, y)}`;
                            })
                            .join(" ")}
                        />

                        {/* 單分量長條圖 (下半部 Y: 184 ~ 90) */}
                        {intradayStats.pointsWithCum.map((p, i) => {
                          const bx = 52 + (i / (N - 1)) * 416;
                          const bw = Math.max(2.5, 416 / N - 1.2);
                          const bh = (p.volume / (maxMinuteVol || 1)) * 90;
                          const by = 184 - bh;
                          const isBuyDominant = p.price >= prevClose;
                          const fill = isBuyDominant
                            ? isAsiaTheme ? "#f43f5e" : "#10b981"
                            : isAsiaTheme ? "#10b981" : "#f43f5e";

                          return (
                            <rect
                              key={`bar_${i}`}
                              x={bx - bw / 2}
                              y={by}
                              width={bw}
                              height={Math.max(1, bh)}
                              fill={fill}
                              opacity={volHoverIdx === i ? 1 : 0.75}
                            />
                          );
                        })}

                        {/* Vol-MA5 (5週期分時均量線) */}
                        <polyline
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.2"
                          vectorEffect="non-scaling-stroke"
                          points={intradayStats.pointsWithCum
                            .map((p, i, arr) => {
                              let s = 0, c = 0;
                              for (let k = Math.max(0, i - 4); k <= i; k++) {
                                s += arr[k].volume;
                                c++;
                              }
                              const ma = c > 0 ? s / c : p.volume;
                              const x = 52 + (i / (N - 1)) * 416;
                              const y = 184 - (ma / (maxMinuteVol || 1)) * 90;
                              return `${x},${Math.max(90, y)}`;
                            })
                            .join(" ")}
                        />

                        {/* 底部時間軸刻度 */}
                        <text x="52" y="196" textAnchor="start" fill="#64748b" fontSize="8" fontFamily="monospace">09:00</text>
                        <text x="145" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">10:00</text>
                        <text x="238" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">11:00</text>
                        <text x="331" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">12:00</text>
                        <text x="424" y="196" textAnchor="middle" fill="#64748b" fontSize="8" fontFamily="monospace">13:00</text>
                        <text x="468" y="196" textAnchor="end" fill="#64748b" fontSize="8" fontFamily="monospace">13:30 (收)</text>

                        {/* 懸浮線 */}
                        {volHoverIdx !== null && intradayStats.pointsWithCum[volHoverIdx] && (
                          <g>
                            <line
                              x1={52 + (volHoverIdx / (N - 1)) * 416}
                              y1="20"
                              x2={52 + (volHoverIdx / (N - 1)) * 416}
                              y2="184"
                              stroke="#e2e8f0"
                              strokeWidth="0.8"
                              strokeDasharray="2,2"
                              vectorEffect="non-scaling-stroke"
                            />
                          </g>
                        )}
                      </svg>
                    );
                  })()}
                </div>

                {/* 底部圖例說明列 */}
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1 border-t border-[#2a2e39]/60">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-cyan-400">
                      <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span>當日累計量能曲線 (張)
                    </span>
                    <span className="flex items-center gap-1 text-amber-400">
                      <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span>5週期分時均量 (張)
                    </span>
                  </div>
                  <span className="text-slate-400">內外盤即時量能直方圖</span>
                </div>
              </div>
            )}

            {/* 內外盤成交量統計 */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-2.5 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-sans">內外盤統計:</span>
                <span className={isAsiaTheme ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  外盤 {timeAndSalesData.totalOutLots}張 ({timeAndSalesData.outRatio}%)
                </span>
              </div>
              <span className={isAsiaTheme ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                內盤 {timeAndSalesData.totalInLots}張 ({100 - timeAndSalesData.outRatio}%)
              </span>
            </div>

            {/* 逐筆成交明細 Time & Sales 滾動列表 */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              <div className="text-[10px] font-bold text-slate-400 px-2 pb-1 border-b border-[#2a2e39] flex justify-between">
                <span>成交時間</span>
                <span>成交價格</span>
                <span>單量(張)</span>
                <span>盤別</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1 max-h-[220px] font-mono text-xs">
                {timeAndSalesData.ticks.map((tick) => (
                  <div
                    key={tick.id}
                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#252a37] transition-colors"
                  >
                    <span className="text-slate-400 text-[11px]">{tick.time}</span>
                    <span className={`font-bold ${
                      tick.change > 0
                        ? isGreenUp ? "text-emerald-400" : "text-rose-400"
                        : tick.change < 0
                        ? isGreenUp ? "text-rose-400" : "text-emerald-400"
                        : "text-white"
                    }`}>
                      ${tick.price.toFixed(2)}
                    </span>
                    <span className="text-white font-semibold flex items-center gap-1">
                      {tick.volumeLots}
                      {tick.isBlockTrade && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-sans font-bold">
                          大單
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-sans font-bold ${
                      tick.type === "BUY_OUT"
                        ? isAsiaTheme ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                        : isAsiaTheme ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                    }`}>
                      {tick.type === "BUY_OUT" ? "外盤" : "內盤"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUMN 3: 元大證券級專業下單卡片 (佔 4 格) */}
          <form onSubmit={handleSubmitOrder} className="lg:col-span-4 bg-[#1e222d] border border-[#2a2e39] rounded-2xl p-4 space-y-3.5">
            
            {/* 買進 / 賣出 大按鈕 */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSide("BUY")}
                className={`py-2.5 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                  side === "BUY"
                    ? isAsiaTheme
                      ? "bg-rose-600 text-white shadow-lg shadow-rose-950/40 border-2 border-rose-500"
                      : "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 border-2 border-emerald-500"
                    : "bg-[#131722] text-slate-400 hover:text-white border border-[#2a2e39]"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>買 進 (做多)</span>
              </button>

              <button
                type="button"
                onClick={() => setSide("SELL")}
                className={`py-2.5 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                  side === "SELL"
                    ? isAsiaTheme
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 border-2 border-emerald-500"
                      : "bg-rose-600 text-white shadow-lg shadow-rose-950/40 border-2 border-rose-500"
                    : "bg-[#131722] text-slate-400 hover:text-white border border-[#2a2e39]"
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>賣 出 (做空)</span>
              </button>
            </div>

            {/* 交易別 (現股 / 融資 / 融券 / 零股) */}
            <div className="flex items-center justify-between bg-[#131722] p-1 rounded-xl border border-[#2a2e39] text-xs font-semibold">
              {[
                { key: "COMMON", label: "現股" },
                { key: "MARGIN_BUY", label: "融資" },
                { key: "MARGIN_SELL", label: "融券" },
                { key: "ODD_LOT", label: "零股" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setTradeType(item.key as PaperTradeType);
                    if (item.key === "ODD_LOT") {
                      setQuantityMode("SHARE");
                      if (quantity >= 1000) setQuantity(100);
                    }
                  }}
                  className={`flex-1 py-1 rounded-lg transition-colors ${
                    tradeType === item.key
                      ? "bg-blue-600 text-white font-bold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* 委託條件與價格模式 (ROD/IOC/FOK + 限價/市價) */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
                {(["ROD", "IOC", "FOK"] as PaperOrderCondition[]).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setCondition(cond)}
                    className={`px-2 py-0.5 rounded font-mono ${
                      condition === cond ? "bg-slate-700 text-white font-bold" : "text-slate-400"
                    }`}
                  >
                    {cond}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
                <button
                  type="button"
                  onClick={() => setPriceType("LIMIT")}
                  className={`px-3 py-0.5 rounded font-bold transition-colors ${
                    priceType === "LIMIT" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  限價
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType("MARKET")}
                  className={`px-3 py-0.5 rounded font-bold transition-colors ${
                    priceType === "MARKET" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  市價
                </button>
              </div>
            </div>

            {/* 價格步進器 [-] [價格] [+] */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
                <span>委託價格 (TWD)</span>
                <span className="font-mono text-[10px] text-slate-400">
                  Tick: ${getTickSize(priceType === "MARKET" ? currentSymbol.price : price)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={priceType === "MARKET"}
                  onClick={() => handlePriceStep("DOWN")}
                  className="w-10 h-9 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#252a37] text-white flex items-center justify-center font-bold disabled:opacity-40 transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 relative">
                  {priceType === "MARKET" ? (
                    <div className="w-full h-9 bg-[#131722] border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-400 font-bold font-mono text-xs">
                      市場即時撮合價 (市價)
                    </div>
                  ) : (
                    <input
                      type="number"
                      step={getTickSize(price)}
                      value={price}
                      onChange={(e) => setPrice(Number(parseFloat(e.target.value) || 0))}
                      className="w-full h-9 bg-[#131722] border border-[#2a2e39] focus:border-blue-500 rounded-xl px-3 text-center font-mono font-bold text-white text-sm outline-none"
                    />
                  )}
                </div>

                <button
                  type="button"
                  disabled={priceType === "MARKET"}
                  onClick={() => handlePriceStep("UP")}
                  className="w-10 h-9 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#252a37] text-white flex items-center justify-center font-bold disabled:opacity-40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 快捷價格 */}
              <div className="grid grid-cols-5 gap-1 mt-1.5 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setPriceType("LIMIT");
                    setPrice(limitUpPrice);
                  }}
                  className="py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold"
                >
                  漲停
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceType("LIMIT");
                    setPrice(limitDownPrice);
                  }}
                  className="py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold"
                >
                  跌停
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceType("LIMIT");
                    setPrice(prevClose);
                  }}
                  className="py-1 rounded bg-[#131722] hover:bg-[#252a37] text-slate-300 border border-[#2a2e39]"
                >
                  平盤
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPriceType("LIMIT");
                    setPrice(currentSymbol.price);
                  }}
                  className="py-1 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold"
                >
                  現價
                </button>
                <button
                  type="button"
                  onClick={() => setPriceType("MARKET")}
                  className={`py-1 rounded border font-bold ${
                    priceType === "MARKET"
                      ? "bg-amber-600 text-white border-amber-500"
                      : "bg-[#131722] hover:bg-[#252a37] text-amber-400 border-[#2a2e39]"
                  }`}
                >
                  市價
                </button>
              </div>
            </div>

            {/* 數量步進器 [-] [數量] [+] */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-medium">
                <div className="flex items-center gap-2">
                  <span>委託數量</span>
                  <div className="flex items-center bg-[#131722] rounded p-0.5 border border-[#2a2e39]">
                    <button
                      type="button"
                      onClick={() => {
                        setQuantityMode("LOT");
                        setQuantity(1);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        quantityMode === "LOT" ? "bg-blue-600 text-white" : "text-slate-400"
                      }`}
                    >
                      張
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuantityMode("SHARE");
                        setQuantity(100);
                      }}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        quantityMode === "SHARE" ? "bg-blue-600 text-white" : "text-slate-400"
                      }`}
                    >
                      零股
                    </button>
                  </div>
                </div>

                <span className="font-mono text-white text-xs font-semibold">
                  共 {totalShares.toLocaleString()} 股
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityStep("DOWN")}
                  className="w-10 h-9 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#252a37] text-white flex items-center justify-center font-bold transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full h-9 bg-[#131722] border border-[#2a2e39] focus:border-blue-500 rounded-xl px-3 text-center font-mono font-bold text-white text-sm outline-none"
                  />
                  <span className="absolute right-3 top-2 text-[10px] text-slate-400">
                    {quantityMode === "LOT" ? "張" : "股"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuantityStep("UP")}
                  className="w-10 h-9 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#252a37] text-white flex items-center justify-center font-bold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 快捷張數/股數選取 */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {quantityMode === "LOT" ? (
                  <>
                    {[1, 2, 3, 5, 10].map((lot) => (
                      <button
                        key={lot}
                        type="button"
                        onClick={() => setQuantity(lot)}
                        className="flex-1 py-1 rounded bg-[#131722] hover:bg-[#252a37] text-slate-300 border border-[#2a2e39] text-[10px] font-mono"
                      >
                        {lot}張
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    {[100, 200, 500, 800, 999].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQuantity(s)}
                        className="flex-1 py-1 rounded bg-[#131722] hover:bg-[#252a37] text-slate-300 border border-[#2a2e39] text-[10px] font-mono"
                      >
                        {s}股
                      </button>
                    ))}
                  </>
                )}
                {side === "SELL" && heldShares > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (heldShares % 1000 === 0) {
                        setQuantityMode("LOT");
                        setQuantity(heldShares / 1000);
                      } else {
                        setQuantityMode("SHARE");
                        setQuantity(heldShares);
                      }
                    }}
                    className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold"
                  >
                    全部平倉 ({heldShares}股)
                  </button>
                )}
              </div>
            </div>

            {/* 台灣證交法 T+2 交易試算 HUD */}
            <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>預估成交金額</span>
                <span className="font-mono text-white font-bold">${est.amount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>券商手續費 (0.1425%, 最低20)</span>
                <span className="font-mono text-slate-300">${est.fee.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>證券交易稅 (0.3%)</span>
                <span className="font-mono text-slate-300">
                  {side === "SELL" ? `$${est.tax.toLocaleString()}` : "買進免稅 ($0)"}
                </span>
              </div>
              <div className="pt-1.5 border-t border-[#2a2e39] flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  {side === "BUY" ? "預估應備款 (T+2 10:00扣款)" : "預估交割實收款 (入帳)"}
                </span>
                <span className={`font-mono text-sm font-black ${
                  side === "BUY" ? "text-amber-400" : "text-emerald-400"
                }`}>
                  ${est.total.toLocaleString()}
                </span>
              </div>

              {/* T+2 剩餘可用於交易額度告知 */}
              <div className="pt-1 border-t border-[#2a2e39] flex items-center justify-between text-[11px]">
                <span className="text-slate-400">交易後剩餘可用額度:</span>
                <span className={`font-mono font-bold ${
                  side === "BUY" && settlementSummary.availableForTrading - est.total < 0
                    ? "text-rose-400"
                    : "text-emerald-400"
                }`}>
                  ${Math.max(0, settlementSummary.availableForTrading - (side === "BUY" ? est.total : 0)).toLocaleString()}
                </span>
              </div>

              {/* 警示橫幅 */}
              {isInsufficientFund && (
                <div className="text-[11px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>【T+2額度不足】尚缺 ${(est.total - settlementSummary.availableForTrading).toLocaleString()}</span>
                </div>
              )}
              {isInsufficientShares && (
                <div className="text-[11px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>持股不足！目前僅持有 {heldShares.toLocaleString()} 股</span>
                </div>
              )}
              {isMarketOrderProhibited && (
                <div className="text-[11px] text-amber-300 font-bold bg-amber-500/10 p-2 rounded border border-amber-500/20 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>【證交法規則退單】非逐筆撮合時段禁止市價單，請改選限價單。</span>
                </div>
              )}
            </div>

            {/* 送出下單按鈕 */}
            <button
              type="submit"
              disabled={isInsufficientFund || isInsufficientShares || isMarketOrderProhibited}
              className={`w-full py-3 rounded-xl font-black text-xs sm:text-sm tracking-wider text-white shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                side === "BUY"
                  ? isAsiaTheme
                    ? "bg-rose-600 hover:bg-rose-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                  : isAsiaTheme
                  ? "bg-emerald-600 hover:bg-emerald-500"
                  : "bg-rose-600 hover:bg-rose-500"
              }`}
            >
              {isMarketOrderProhibited
                ? "休市時段禁止市價單 (請改選限價預約)"
                : session.status !== "OPEN"
                ? `確認送出開盤預約單 (${side === "BUY" ? "買進" : "賣出"} ${currentSymbol.symbol} ${quantityMode === "LOT" ? `${quantity}張` : `${quantity}股`} @ ${priceType === "MARKET" ? "市價" : `$${price}`})`
                : (side === "BUY" && price < currentSymbol.price) || (side === "SELL" && price > currentSymbol.price)
                ? `確認送出排隊委託 (${side === "BUY" ? "買進" : "賣出"} ${currentSymbol.symbol} ${quantityMode === "LOT" ? `${quantity}張` : `${quantity}股`} @ $${price})`
                : `確認送出逐筆委託 (${side === "BUY" ? "買進" : "賣出"} ${currentSymbol.symbol} ${quantityMode === "LOT" ? `${quantity}張` : `${quantity}股`} @ ${priceType === "MARKET" ? "市價" : `$${price}`})`}
            </button>
          </form>
        </div>

        {/* 下層：四大管理分頁（庫存持倉 / 委託回報 / 成交明細 / 台灣證交法 T+2 資金與交割中心） */}
        <div className="bg-[#1e222d] border border-[#2a2e39] rounded-2xl overflow-hidden">
          
          {/* 分頁按鈕列 */}
          <div className="flex items-center justify-between px-4 border-b border-[#2a2e39] bg-[#171b26] overflow-x-auto text-xs font-medium">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab("ORDER")}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
                  activeTab === "ORDER"
                    ? "border-blue-500 text-blue-400 bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>下單交易</span>
              </button>

              <button
                onClick={() => setActiveTab("POSITIONS")}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap relative ${
                  activeTab === "POSITIONS"
                    ? "border-blue-500 text-blue-400 bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>庫存持倉</span>
                {account.positions.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-mono">
                    {account.positions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("ORDERS")}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap relative ${
                  activeTab === "ORDERS"
                    ? "border-blue-500 text-blue-400 bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>委託回報</span>
                {pendingOrdersCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black font-bold text-[10px] font-mono">
                    {pendingOrdersCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("HISTORY")}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
                  activeTab === "HISTORY"
                    ? "border-blue-500 text-blue-400 bg-blue-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>成交紀錄</span>
              </button>

              <button
                onClick={() => setActiveTab("SETTLEMENT")}
                className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold transition-colors whitespace-nowrap ${
                  activeTab === "SETTLEMENT"
                    ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>🏦 台灣證交法 T+2 資金與交割中心</span>
              </button>
            </div>

            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono pr-2">
              <span className="text-slate-400">總資產淨值:</span>
              <span className="font-bold text-white">${netEquity.toLocaleString()}</span>
              <span className={`font-bold ${isOverallProfit ? isGreenUp ? "text-emerald-400" : "text-rose-400" : isGreenUp ? "text-rose-400" : "text-emerald-400"}`}>
                ({isOverallProfit ? "+" : ""}{totalProfitPercent}%)
              </span>
            </div>
          </div>

          {/* 分頁內容展示 */}
          <div className="p-4">
            {/* TAB 1: 庫存持倉 (POSITIONS) */}
            {activeTab === "POSITIONS" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white">證券庫存部位 ({account.positions.length})</h4>
                  <span className="text-xs text-slate-400 font-mono">持股市值: ${totalMarketValue.toLocaleString()}</span>
                </div>

                {account.positions.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 bg-[#131722] rounded-xl border border-[#2a2e39]">
                    目前帳戶無任何庫存持股部位
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-[#2a2e39] text-slate-400 font-sans">
                          <th className="py-2.5 px-3">代號 / 名稱</th>
                          <th className="py-2.5 px-3">持有數量</th>
                          <th className="py-2.5 px-3">買進均價</th>
                          <th className="py-2.5 px-3">當前市價</th>
                          <th className="py-2.5 px-3">持股市值</th>
                          <th className="py-2.5 px-3">未實現損益</th>
                          <th className="py-2.5 px-3">報酬率</th>
                          <th className="py-2.5 px-3 text-right font-sans">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2e39]">
                        {account.positions.map((pos) => {
                          const isProf = pos.unrealizedProfit >= 0;
                          const pnlColor = isProf
                            ? isGreenUp ? "text-emerald-400" : "text-rose-400"
                            : isGreenUp ? "text-rose-400" : "text-emerald-400";

                          return (
                            <tr key={pos.symbol} className="hover:bg-[#131722] transition-colors">
                              <td className="py-3 px-3 font-sans font-bold text-white">
                                {pos.symbol} <span className="text-slate-400 font-normal">{pos.name}</span>
                              </td>
                              <td className="py-3 px-3 text-slate-200">
                                {pos.shares.toLocaleString()} 股 ({Math.floor(pos.shares / 1000)}張)
                              </td>
                              <td className="py-3 px-3 text-slate-300">${pos.avgCostPrice.toFixed(2)}</td>
                              <td className="py-3 px-3 font-bold text-white">${pos.currentPrice.toFixed(2)}</td>
                              <td className="py-3 px-3 text-slate-200">${(pos.shares * pos.currentPrice).toLocaleString()}</td>
                              <td className={`py-3 px-3 font-bold ${pnlColor}`}>
                                {isProf ? "+" : ""}${pos.unrealizedProfit.toLocaleString()}
                              </td>
                              <td className={`py-3 px-3 font-bold ${pnlColor}`}>
                                {isProf ? "+" : ""}{pos.unrealizedProfitPercent}%
                              </td>
                              <td className="py-3 px-3 text-right font-sans">
                                <button
                                  onClick={() => handleClosePosition(pos.symbol, pos.shares)}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold"
                                >
                                  市價平倉
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: 委託回報 (ORDERS) */}
            {activeTab === "ORDERS" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">委託回報清單</h4>
                    <div className="flex items-center bg-[#131722] p-0.5 rounded-lg border border-[#2a2e39] text-xs">
                      {(["ALL", "PENDING", "FILLED", "CANCELLED"] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setOrderFilter(filter)}
                          className={`px-2.5 py-0.5 rounded-md font-semibold transition-colors ${
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

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const res = PaperTradingService.triggerSimulatedMatching({
                          [currentSymbol.symbol]: currentSymbol.price,
                        });
                        setAccount(PaperTradingService.getAccount());
                        setNotice({
                          type: res.success ? "success" : "error",
                          text: res.message,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>⚡ 盤面觸價撮合測試</span>
                    </button>

                    {pendingOrdersCount > 0 && (
                      <button
                        onClick={handleCancelAll}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold"
                      >
                        全部撤單 ({pendingOrdersCount})
                      </button>
                    )}
                  </div>
                </div>

                {account.orders.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 bg-[#131722] rounded-xl border border-[#2a2e39]">
                    目前尚無任何委託掛單紀錄
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-[#2a2e39] text-slate-400 font-sans">
                          <th className="py-2.5 px-3">時間</th>
                          <th className="py-2.5 px-3">股票標的</th>
                          <th className="py-2.5 px-3">買賣別</th>
                          <th className="py-2.5 px-3">交易別</th>
                          <th className="py-2.5 px-3">委託價格</th>
                          <th className="py-2.5 px-3">委託數量</th>
                          <th className="py-2.5 px-3">撮合狀態 / 證交說明</th>
                          <th className="py-2.5 px-3 text-right font-sans">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2e39]">
                        {account.orders
                          .filter((o) => orderFilter === "ALL" || o.status === orderFilter)
                          .map((order) => (
                            <tr key={order.id} className="hover:bg-[#131722] transition-colors">
                              <td className="py-2.5 px-3 text-slate-400 font-sans">
                                {new Date(order.timestamp).toLocaleTimeString("zh-TW")}
                              </td>
                              <td className="py-2.5 px-3 font-sans font-bold text-white">
                                {order.symbol} <span className="text-slate-400 font-normal">{order.name}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                                  order.side === "BUY"
                                    ? isAsiaTheme ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                                    : isAsiaTheme ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                                }`}>
                                  {order.side === "BUY" ? "買進" : "賣出"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-300 font-sans">
                                {order.tradeType === "COMMON" && "現股"}
                                {order.tradeType === "MARGIN_BUY" && "融資"}
                                {order.tradeType === "MARGIN_SELL" && "融券"}
                                {order.tradeType === "ODD_LOT" && "零股"}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-white">
                                {order.priceType === "MARKET" ? "市價" : `$${order.orderPrice.toFixed(2)}`}
                              </td>
                              <td className="py-2.5 px-3 text-slate-200">
                                {order.shares.toLocaleString()} 股 ({Math.floor(order.shares / 1000)}張)
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                {order.status === "PENDING" && (
                                  <div>
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-xs">
                                      {order.isPreOrder ? "開盤預約中" : "委託排隊中"}
                                    </span>
                                    {order.note && (
                                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-[200px]" title={order.note}>
                                        {order.note}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {order.status === "FILLED" && (
                                  <div>
                                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-xs">
                                      完全成交
                                    </span>
                                    {order.note && (
                                      <div className="text-[10px] text-slate-400 mt-0.5 font-mono truncate max-w-[200px]" title={order.note}>
                                        {order.note}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {order.status === "CANCELLED" && (
                                  <div>
                                    <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-400 text-xs">
                                      已撤銷
                                    </span>
                                    {order.note && (
                                      <div className="text-[10px] text-slate-500 mt-0.5 font-mono truncate max-w-[200px]" title={order.note}>
                                        {order.note}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-sans">
                                {order.status === "PENDING" ? (
                                  <button
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold"
                                  >
                                    撤單
                                  </button>
                                ) : (
                                  <span className="text-slate-500 text-xs">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: 成交紀錄 (HISTORY) */}
            {activeTab === "HISTORY" && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-white">歷史成交明細紀錄 ({account.history.length})</h4>

                {account.history.length === 0 ? (
                  <div className="text-center py-10 text-xs text-slate-400 bg-[#131722] rounded-xl border border-[#2a2e39]">
                    目前帳戶暫無任何成交紀錄
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse font-mono">
                      <thead>
                        <tr className="border-b border-[#2a2e39] text-slate-400 font-sans">
                          <th className="py-2.5 px-3">成交時間</th>
                          <th className="py-2.5 px-3">股票標的</th>
                          <th className="py-2.5 px-3">買賣別</th>
                          <th className="py-2.5 px-3">成交價格</th>
                          <th className="py-2.5 px-3">成交數量</th>
                          <th className="py-2.5 px-3">成交總值</th>
                          <th className="py-2.5 px-3">手續費</th>
                          <th className="py-2.5 px-3">證交稅</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2e39]">
                        {account.history.map((h) => (
                          <tr key={h.id} className="hover:bg-[#131722] transition-colors">
                            <td className="py-2.5 px-3 text-slate-400 font-sans">
                              {new Date(h.timestamp).toLocaleString("zh-TW")}
                            </td>
                            <td className="py-2.5 px-3 font-sans font-bold text-white">{h.symbol}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                                h.type === "BUY"
                                  ? isAsiaTheme ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                                  : isAsiaTheme ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                              }`}>
                                {h.type === "BUY" ? "買進" : "賣出"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-white">${h.price.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-200">{h.shares.toLocaleString()} 股</td>
                            <td className="py-2.5 px-3 text-white font-bold">${h.amount.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-slate-300">${h.fee.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-slate-300">${(h.tax || 0).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: 🏦 台灣證交法 T+2 資金與交割中心 (核心創新頁面) */}
            {(activeTab === "SETTLEMENT" || activeTab === "ORDER") && (
              <div className="space-y-4">
                {/* 4 大 T+2 核心資金卡片 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  
                  {/* 卡片 1: 目前可用於交易額度 */}
                  <div className="bg-[#131722] border border-emerald-500/40 rounded-xl p-3.5 relative overflow-hidden">
                    <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                      <span>目前可用於交易額度 (購買力)</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                      ${settlementSummary.availableForTrading.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      扣除待扣款與掛單後，目前可下單金額
                    </div>
                  </div>

                  {/* 卡片 2: 銀行帳戶現金餘額 */}
                  <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                      <span>銀行在手現金總額</span>
                      <PieChart className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-black text-white mt-1 font-mono">
                      ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">尚未劃撥扣款之在手現金</div>
                  </div>

                  {/* 卡片 3: T+1 待交割淨額 */}
                  <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                      <span>T+1 預計待交割淨額</span>
                      <Calendar className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className={`text-2xl font-black mt-1 font-mono ${
                      settlementSummary.t1PendingNet < 0
                        ? "text-rose-400"
                        : settlementSummary.t1PendingNet > 0
                        ? "text-emerald-400"
                        : "text-slate-400"
                    }`}>
                      {settlementSummary.t1PendingNet < 0 ? "-" : "+"}$
                      {Math.abs(settlementSummary.t1PendingNet).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {settlementSummary.t1PendingNet < 0 ? "明日 10:00 預計扣款" : "明日 10:00 預計入帳"}
                    </div>
                  </div>

                  {/* 卡片 4: T+2 待交割淨額 */}
                  <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-bold flex items-center justify-between">
                      <span>T+2 預計待交割淨額</span>
                      <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className={`text-2xl font-black mt-1 font-mono ${
                      settlementSummary.t2PendingNet < 0
                        ? "text-rose-400"
                        : settlementSummary.t2PendingNet > 0
                        ? "text-emerald-400"
                        : "text-slate-400"
                    }`}>
                      {settlementSummary.t2PendingNet < 0 ? "-" : "+"}$
                      {Math.abs(settlementSummary.t2PendingNet).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {settlementSummary.t2PendingNet < 0 ? "後日 10:00 預計扣款" : "後日 10:00 預計入帳"}
                    </div>
                  </div>
                </div>

                {/* 臺灣證交所 T+2 營業日交割時序表與流水清單 */}
                <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                        臺灣證交所普通交割買賣（T+2）帳簿時序表
                      </h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        依證交所《營業細則》第 104 條規定：於成交日（T日）後第二營業日（T+2日）上午 10 時前辦理交割；週六、日及國定假日順延。
                      </p>
                    </div>

                    <button
                      onClick={handleResetAccount}
                      className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-bold"
                    >
                      重置模擬資金 ($1,000,000)
                    </button>
                  </div>

                  {settlementSummary.settlementEntries.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 bg-[#1e222d] rounded-lg border border-[#2a2e39]">
                      目前無任何 T+2 交割流水紀錄
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse font-mono">
                        <thead>
                          <tr className="border-b border-[#2a2e39] text-slate-400 font-sans">
                            <th className="py-2 px-3">T日 (成交日)</th>
                            <th className="py-2 px-3">T+2日 (上午 10:00 扣款/入帳)</th>
                            <th className="py-2 px-3">標的</th>
                            <th className="py-2 px-3">買賣別</th>
                            <th className="py-2 px-3">成交價格</th>
                            <th className="py-2 px-3">數量</th>
                            <th className="py-2 px-3">應收 / 應付交割淨額</th>
                            <th className="py-2 px-3">交割狀態</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2a2e39]">
                          {settlementSummary.settlementEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-[#1e222d] transition-colors">
                              <td className="py-2.5 px-3 text-slate-300 font-sans">{entry.tradeDateString}</td>
                              <td className="py-2.5 px-3 text-amber-300 font-sans font-bold">{entry.settlementDateString}</td>
                              <td className="py-2.5 px-3 text-white font-sans font-bold">{entry.symbol} {entry.name}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                                  entry.side === "BUY"
                                    ? isAsiaTheme ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
                                    : isAsiaTheme ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"
                                }`}>
                                  {entry.side === "BUY" ? "買進交割" : "賣出交割"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-white">${entry.price.toFixed(2)}</td>
                              <td className="py-2.5 px-3 text-slate-200">{entry.shares.toLocaleString()} 股</td>
                              <td className={`py-2.5 px-3 font-bold text-sm ${
                                entry.netAmount < 0 ? "text-rose-400" : "text-emerald-400"
                              }`}>
                                {entry.netAmount < 0 ? "應付扣款 " : "應收入帳 +"}
                                ${Math.abs(entry.netAmount).toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 font-sans">
                                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                                  待交割劃撥
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
