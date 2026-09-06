import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Wallet,
  RefreshCw,
  History,
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowUpDown,
  FileText,
  PieChart,
} from 'lucide-react';
import {
  StockSymbol,
  PaperAccount,
  PaperTradeType,
  PaperPriceType,
  PaperOrderCondition,
} from '../types/stock';
import {
  PaperTradingService,
  getTickSize,
  stepPrice,
  roundToTick,
  calculateEstimate,
  getMarketSessionInfo,
} from '../services/paperTradingService';

interface PaperTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: StockSymbol;
  colorTheme: 'international' | 'asia';
}

type TabType = 'ORDER' | 'POSITIONS' | 'ORDERS' | 'HISTORY' | 'ASSETS';

export const PaperTradingModal: React.FC<PaperTradingModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  colorTheme,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('ORDER');
  const [account, setAccount] = useState<PaperAccount>(PaperTradingService.getAccount());

  // 下單核心狀態
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeType, setTradeType] = useState<PaperTradeType>('COMMON');
  const [priceType, setPriceType] = useState<PaperPriceType>('LIMIT');
  const [condition, setCondition] = useState<PaperOrderCondition>('ROD');
  const [price, setPrice] = useState<number>(currentSymbol.price);
  const [quantityMode, setQuantityMode] = useState<'LOT' | 'SHARE'>('LOT');
  const [quantity, setQuantity] = useState<number>(1); // LOT mode: 1張; SHARE mode: 100股
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'PENDING' | 'FILLED' | 'CANCELLED'>('ALL');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 當股票或彈窗打開時同步現價
  useEffect(() => {
    if (isOpen) {
      const updated = PaperTradingService.updatePrices({
        [currentSymbol.symbol]: currentSymbol.price,
      });
      setAccount(updated);
      setPrice(currentSymbol.price);
    }
  }, [isOpen, currentSymbol]);

  // 模擬五檔買賣盤報價 (元大投資先生經典點擊帶價功能)
  const depthQuotes = useMemo(() => {
    const baseP = currentSymbol.price;
    const asks: { price: number; vol: number }[] = [];
    const bids: { price: number; vol: number }[] = [];

    // 賣五檔 (Asks: 高於現價)
    let pAsk = baseP;
    for (let i = 0; i < 5; i++) {
      pAsk = stepPrice(pAsk, 'UP');
      asks.unshift({ price: pAsk, vol: Math.floor(20 + Math.random() * 80) });
    }

    // 買五檔 (Bids: 低於或等於現價)
    let pBid = baseP;
    for (let i = 0; i < 5; i++) {
      if (i > 0) pBid = stepPrice(pBid, 'DOWN');
      bids.push({ price: pBid, vol: Math.floor(30 + Math.random() * 120) });
    }

    return { asks, bids };
  }, [currentSymbol.price]);

  const isGreenUp = colorTheme === 'international';
  const isAsiaTheme = colorTheme === 'asia';

  // 依證交法計算當前市場交易時段與委託限制
  const session = useMemo(
    () => getMarketSessionInfo(currentSymbol.symbol, currentSymbol.currency),
    [currentSymbol.symbol, currentSymbol.currency]
  );

  // 換算總股數
  const totalShares = quantityMode === 'LOT' ? quantity * 1000 : quantity;
  const effectivePrice = priceType === 'MARKET' ? currentSymbol.price : price;
  const est = calculateEstimate(effectivePrice, totalShares, side);

  // 漲跌停與平盤參考價
  const changePercent = currentSymbol.changePercent || 0;
  const prevClose = roundToTick(currentSymbol.price / (1 + changePercent / 100));
  const limitUpPrice = roundToTick(prevClose * 1.10);
  const limitDownPrice = roundToTick(prevClose * 0.90);

  // 持股狀態
  const heldPosition = account.positions.find((p) => p.symbol === currentSymbol.symbol);
  const heldShares = heldPosition ? heldPosition.shares : 0;
  const heldLots = Math.floor(heldShares / 1000);

  // 帳戶整體數據
  const totalMarketValue = account.positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const netEquity = account.balance + totalMarketValue;
  const totalProfit = netEquity - account.initialCapital;
  const totalProfitPercent = Number(((totalProfit / account.initialCapital) * 100).toFixed(2));
  const isOverallProfit = totalProfit >= 0;
  const pendingOrdersCount = account.orders.filter((o) => o.status === 'PENDING').length;

  // 價格步進
  const handlePriceStep = (dir: 'UP' | 'DOWN') => {
    if (priceType === 'MARKET') {
      setPriceType('LIMIT');
      setPrice(stepPrice(currentSymbol.price, dir));
    } else {
      setPrice(stepPrice(price, dir));
    }
  };

  // 數量步進
  const handleQuantityStep = (dir: 'UP' | 'DOWN') => {
    if (quantityMode === 'LOT') {
      if (dir === 'UP') setQuantity((q) => q + 1);
      else setQuantity((q) => Math.max(1, q - 1));
    } else {
      if (dir === 'UP') setQuantity((q) => q + 100);
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
      orderPrice: priceType === 'MARKET' ? currentSymbol.price : price,
      shares: totalShares,
      condition,
      currentMarketPrice: currentSymbol.price,
      currency: currentSymbol.currency || 'TWD',
      referenceClosePrice: prevClose,
    });

    if (res.success) {
      setNotice({ type: 'success', text: res.message });
      setAccount(PaperTradingService.getAccount());
    } else {
      setNotice({ type: 'error', text: res.message });
    }
  };

  // 撤銷委託單
  const handleCancelOrder = (orderId: string) => {
    const res = PaperTradingService.cancelOrder(orderId);
    if (res.success) {
      setNotice({ type: 'success', text: res.message });
      setAccount(PaperTradingService.getAccount());
    } else {
      setNotice({ type: 'error', text: res.message });
    }
  };

  // 全部撤單
  const handleCancelAll = () => {
    if (window.confirm('確定要撤銷目前所有「委託中」的掛單嗎？')) {
      const res = PaperTradingService.cancelAllOrders();
      setNotice({ type: 'success', text: `已成功撤銷 ${res.count} 筆委託單` });
      setAccount(PaperTradingService.getAccount());
    }
  };

  // 平倉指定持股
  const handleClosePosition = (symbol: string, posShares: number) => {
    if (window.confirm(`確定要以現價市價全數平倉 ${posShares.toLocaleString()} 股嗎？`)) {
      const res = PaperTradingService.placeOrder({
        symbol,
        name: currentSymbol.name,
        side: 'SELL',
        tradeType: 'COMMON',
        priceType: 'MARKET',
        orderPrice: currentSymbol.price,
        shares: posShares,
        currentMarketPrice: currentSymbol.price,
      });

      if (res.success) {
        setNotice({ type: 'success', text: res.message });
        setAccount(PaperTradingService.getAccount());
      } else {
        setNotice({ type: 'error', text: res.message });
      }
    }
  };

  // 重置帳戶
  const handleResetAccount = () => {
    if (window.confirm('確定要將模擬交易帳戶重置回初始資金 $1,000,000 嗎？所有持倉與委託紀錄將歸零。')) {
      const reset = PaperTradingService.resetAccount(1000000);
      setAccount(reset);
      setNotice({ type: 'success', text: '模擬帳戶已成功重置為 $1,000,000！' });
    }
  };

  // 檢查買進資金或賣出持股是否充足
  const isInsufficientFund = side === 'BUY' && account.balance < est.total;
  const isInsufficientShares = side === 'SELL' && heldShares < totalShares;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-6 animate-fade-in font-sans">
      <div className="bg-[#131722] border border-[#2a2e39] rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* 頂部：標的報價與帳戶即時狀態 (元大看盤下單抬頭) */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-[#2a2e39] bg-[#1e222d]/80">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-bold text-xs">
                元大
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-white tracking-wide">{currentSymbol.symbol}</span>
                  <span className="text-sm font-semibold text-slate-300">{currentSymbol.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono">
                    {session.market}
                  </span>
                  {session.status === 'OPEN' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      {session.sessionName}
                    </span>
                  ) : session.status === 'CALL_AUCTION' ? (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-sans">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                      {session.sessionName}
                    </span>
                  ) : (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 border border-slate-600/40 flex items-center gap-1 font-sans"
                      title={session.description}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      {session.sessionName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs mt-0.5 font-mono">
                  <span className={`text-base font-extrabold ${
                    changePercent > 0
                      ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                      : changePercent < 0
                      ? isGreenUp ? 'text-rose-400' : 'text-emerald-400'
                      : 'text-slate-300'
                  }`}>
                    ${currentSymbol.price.toFixed(2)}
                  </span>
                  <span className={`font-semibold ${
                    changePercent > 0
                      ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                      : changePercent < 0
                      ? isGreenUp ? 'text-rose-400' : 'text-emerald-400'
                      : 'text-slate-300'
                  }`}>
                    {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
                  </span>
                  <span className="text-slate-400 text-[11px]">昨收 ${prevClose}</span>
                </div>
              </div>
            </div>

            {/* 漲停/跌停提示 chips */}
            <div className="hidden lg:flex items-center gap-2 border-l border-slate-700/60 pl-4 text-xs font-mono">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">漲停</span>
                <span className="text-rose-400 font-bold">${limitUpPrice}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">跌停</span>
                <span className="text-emerald-400 font-bold">${limitDownPrice}</span>
              </div>
            </div>
          </div>

          {/* 右上：可用資金與關閉控制 */}
          <div className="flex items-center gap-3">
            <div className="bg-[#131722] border border-[#2a2e39] px-3 py-1.5 rounded-lg text-right">
              <div className="text-[10px] text-slate-400">可用下單資金 (購買力)</div>
              <div className="text-sm font-extrabold text-white font-mono">
                ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
            </div>

            <button
              onClick={handleResetAccount}
              className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg border border-[#2a2e39] hover:bg-[#2a2e39] transition-colors flex items-center gap-1"
              title="重置模擬本金至 $1,000,000"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">重置</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#2a2e39] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 導航分頁列 (元大風格五大功能頁面) */}
        <div className="flex items-center justify-between px-5 border-b border-[#2a2e39] bg-[#171b26] overflow-x-auto text-xs font-medium">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('ORDER')}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold transition-colors whitespace-nowrap ${
                activeTab === 'ORDER'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e222d]'
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>下單交易</span>
            </button>

            <button
              onClick={() => setActiveTab('POSITIONS')}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold transition-colors whitespace-nowrap relative ${
                activeTab === 'POSITIONS'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e222d]'
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
              onClick={() => setActiveTab('ORDERS')}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold transition-colors whitespace-nowrap relative ${
                activeTab === 'ORDERS'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e222d]'
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
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold transition-colors whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e222d]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>成交紀錄</span>
            </button>

            <button
              onClick={() => setActiveTab('ASSETS')}
              className={`flex items-center gap-1.5 px-4 py-3 border-b-2 font-bold transition-colors whitespace-nowrap ${
                activeTab === 'ASSETS'
                  ? 'border-blue-500 text-blue-400 bg-blue-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1e222d]'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>帳戶資產</span>
            </button>
          </div>

          {/* 快速資產資訊 */}
          <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono pr-2">
            <span className="text-slate-400">總資產:</span>
            <span className="font-bold text-white">${netEquity.toLocaleString()}</span>
            <span className={`font-bold ${isOverallProfit ? isGreenUp ? 'text-emerald-400' : 'text-rose-400' : isGreenUp ? 'text-rose-400' : 'text-emerald-400'}`}>
              ({isOverallProfit ? '+' : ''}{totalProfitPercent}%)
            </span>
          </div>
        </div>

        {/* 系統即時提示訊息 */}
        {notice && (
          <div className={`px-5 py-2 text-xs flex items-center justify-between border-b ${
            notice.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
          }`}>
            <div className="flex items-center gap-2">
              {notice.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span className="font-medium">{notice.text}</span>
            </div>
            <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* 主內容工作區 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5">
          {/* TAB 1: 下單交易 (元大專業下單卡片與五檔) */}
          {activeTab === 'ORDER' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* 左側：主下單面板 (佔 7 格) */}
              <form onSubmit={handleSubmitOrder} className="lg:col-span-7 bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 space-y-4">
                
                {/* 買進 / 賣出 大按鈕切換 (元大經典高對比) */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSide('BUY')}
                    className={`py-3 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                      side === 'BUY'
                        ? isAsiaTheme
                          ? 'bg-rose-600 text-white shadow-lg shadow-rose-950/40 border-2 border-rose-500'
                          : 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 border-2 border-emerald-500'
                        : 'bg-[#131722] text-slate-400 hover:text-white border border-[#2a2e39]'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>買 進 (做多)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSide('SELL')}
                    className={`py-3 rounded-xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all ${
                      side === 'SELL'
                        ? isAsiaTheme
                          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40 border-2 border-emerald-500'
                          : 'bg-rose-600 text-white shadow-lg shadow-rose-950/40 border-2 border-rose-500'
                        : 'bg-[#131722] text-slate-400 hover:text-white border border-[#2a2e39]'
                    }`}
                  >
                    <TrendingDown className="w-4 h-4" />
                    <span>賣 出 (做空/平倉)</span>
                  </button>
                </div>

                {/* 交易別切換 (現股 / 融資 / 融券 / 零股) */}
                <div className="flex items-center justify-between bg-[#131722] p-1 rounded-xl border border-[#2a2e39] text-xs font-semibold">
                  {[
                    { key: 'COMMON', label: '現股' },
                    { key: 'MARGIN_BUY', label: '融資' },
                    { key: 'MARGIN_SELL', label: '融券' },
                    { key: 'ODD_LOT', label: '零股' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        setTradeType(item.key as PaperTradeType);
                        if (item.key === 'ODD_LOT') {
                          setQuantityMode('SHARE');
                          if (quantity >= 1000) setQuantity(100);
                        }
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-colors ${
                        tradeType === item.key
                          ? 'bg-blue-600 text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {/* 委託條件與價格模式 (ROD/IOC/FOK + 限價/市價) */}
                <div className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
                    {(['ROD', 'IOC', 'FOK'] as PaperOrderCondition[]).map((cond) => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setCondition(cond)}
                        className={`px-2.5 py-1 rounded font-mono ${
                          condition === cond ? 'bg-slate-700 text-white font-bold' : 'text-slate-400'
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1 bg-[#131722] p-1 rounded-lg border border-[#2a2e39]">
                    <button
                      type="button"
                      onClick={() => setPriceType('LIMIT')}
                      className={`px-3 py-1 rounded font-bold transition-colors ${
                        priceType === 'LIMIT' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      限價
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceType('MARKET')}
                      className={`px-3 py-1 rounded font-bold transition-colors ${
                        priceType === 'MARKET' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      市價
                    </button>
                  </div>
                </div>

                {/* 價格輸入與步進控制器 [ - ] [ 價格 ] [ + ] (元大跳動單位 Tick Size) */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                    <span>委託價格 (TWD)</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      當前檔位跳動: ${getTickSize(priceType === 'MARKET' ? currentSymbol.price : price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={priceType === 'MARKET'}
                      onClick={() => handlePriceStep('DOWN')}
                      className="w-12 h-10 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#2a2e39] text-white flex items-center justify-center font-bold disabled:opacity-40 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 relative">
                      {priceType === 'MARKET' ? (
                        <div className="w-full h-10 bg-[#131722] border border-amber-500/40 rounded-xl flex items-center justify-center text-amber-400 font-bold font-mono text-sm">
                          市場即時撮合價 (市價)
                        </div>
                      ) : (
                        <input
                          type="number"
                          step={getTickSize(price)}
                          value={price}
                          onChange={(e) => setPrice(Number(parseFloat(e.target.value) || 0))}
                          className="w-full h-10 bg-[#131722] border border-[#2a2e39] focus:border-blue-500 rounded-xl px-4 text-center font-mono font-bold text-white text-base outline-none"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={priceType === 'MARKET'}
                      onClick={() => handlePriceStep('UP')}
                      className="w-12 h-10 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#2a2e39] text-white flex items-center justify-center font-bold disabled:opacity-40 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 快捷價格點選列 */}
                  <div className="grid grid-cols-5 gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPriceType('LIMIT');
                        setPrice(limitUpPrice);
                      }}
                      className="py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold font-mono"
                    >
                      漲停 ${limitUpPrice}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPriceType('LIMIT');
                        setPrice(limitDownPrice);
                      }}
                      className="py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold font-mono"
                    >
                      跌停 ${limitDownPrice}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPriceType('LIMIT');
                        setPrice(prevClose);
                      }}
                      className="py-1 rounded-lg bg-[#131722] hover:bg-[#2a2e39] text-slate-300 border border-[#2a2e39] text-[11px] font-mono"
                    >
                      平盤 ${prevClose}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPriceType('LIMIT');
                        setPrice(currentSymbol.price);
                      }}
                      className="py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[11px] font-mono"
                    >
                      現價 ${currentSymbol.price}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriceType('MARKET')}
                      className={`py-1 rounded-lg border text-[11px] font-bold ${
                        priceType === 'MARKET'
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'bg-[#131722] hover:bg-[#2a2e39] text-amber-400 border-[#2a2e39]'
                      }`}
                    >
                      市價
                    </button>
                  </div>
                </div>

                {/* 數量輸入與步進控制器 [ - ] [ 數量 ] [ + ] */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
                    <div className="flex items-center gap-2">
                      <span>委託數量</span>
                      <div className="flex items-center bg-[#131722] rounded p-0.5 border border-[#2a2e39]">
                        <button
                          type="button"
                          onClick={() => {
                            setQuantityMode('LOT');
                            setQuantity(1);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            quantityMode === 'LOT' ? 'bg-blue-600 text-white' : 'text-slate-400'
                          }`}
                        >
                          張 (1000股)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setQuantityMode('SHARE');
                            setQuantity(100);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            quantityMode === 'SHARE' ? 'bg-blue-600 text-white' : 'text-slate-400'
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
                      onClick={() => handleQuantityStep('DOWN')}
                      className="w-12 h-10 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#2a2e39] text-white flex items-center justify-center font-bold transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full h-10 bg-[#131722] border border-[#2a2e39] focus:border-blue-500 rounded-xl px-4 text-center font-mono font-bold text-white text-base outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400">
                        {quantityMode === 'LOT' ? '張' : '股'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuantityStep('UP')}
                      className="w-12 h-10 rounded-xl bg-[#131722] border border-[#2a2e39] hover:bg-[#2a2e39] text-white flex items-center justify-center font-bold transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 快捷張數/股數選取鈕 */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {quantityMode === 'LOT' ? (
                      <>
                        {[1, 2, 3, 5, 10].map((lot) => (
                          <button
                            key={lot}
                            type="button"
                            onClick={() => setQuantity(lot)}
                            className="flex-1 py-1 rounded-lg bg-[#131722] hover:bg-[#2a2e39] text-slate-300 border border-[#2a2e39] text-xs font-mono"
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
                            className="flex-1 py-1 rounded-lg bg-[#131722] hover:bg-[#2a2e39] text-slate-300 border border-[#2a2e39] text-xs font-mono"
                          >
                            {s}股
                          </button>
                        ))}
                      </>
                    )}

                    {side === 'SELL' && heldShares > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (heldShares % 1000 === 0) {
                            setQuantityMode('LOT');
                            setQuantity(heldShares / 1000);
                          } else {
                            setQuantityMode('SHARE');
                            setQuantity(heldShares);
                          }
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold"
                      >
                        全部平倉 ({heldShares.toLocaleString()}股)
                      </button>
                    )}
                  </div>
                </div>

                {/* 元大風格交易試算資訊欄 (HUD) */}
                <div className="bg-[#131722] border border-[#2a2e39] rounded-xl p-3.5 space-y-2 text-xs">
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
                      {side === 'SELL' ? `$${est.tax.toLocaleString()}` : '買進免稅 ($0)'}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-[#2a2e39] flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {side === 'BUY' ? '預計應備款 (扣款交割)' : '預估實收交割款 (入帳)'}
                    </span>
                    <span className={`font-mono text-base font-extrabold ${
                      side === 'BUY' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      ${est.total.toLocaleString()}
                    </span>
                  </div>

                  {/* 資金或部位警示 */}
                  {isInsufficientFund && (
                    <div className="text-[11px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>可用資金不足！尚缺 ${(est.total - account.balance).toLocaleString()}</span>
                    </div>
                  )}
                  {isInsufficientShares && (
                    <div className="text-[11px] text-rose-400 font-bold bg-rose-500/10 p-2 rounded border border-rose-500/20 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>持股不足！目前僅持有 {heldShares.toLocaleString()} 股</span>
                    </div>
                  )}

                  {/* 證券法規與真實撮合提示 */}
                  {priceType === 'MARKET' && !session.canTradeMarketOrder && (
                    <div className="text-[11px] text-amber-300 font-bold bg-amber-500/10 p-2 rounded border border-amber-500/20 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>【證交法規則退單提示】目前處於「{session.sessionName}」，依證交所營業細則不接受市價單，請改選「限價」進行預約掛單。</span>
                    </div>
                  )}

                  {session.status !== 'OPEN' && priceType === 'LIMIT' && (
                    <div className="text-[11px] text-blue-300 bg-blue-500/10 p-2 rounded border border-blue-500/20 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>【開盤預約機制】目前為非開盤時段，送出後將作為預約單排入委託佇列，待開盤後依盤面價格撮合（不會直接成交）。</span>
                    </div>
                  )}

                  {session.status === 'OPEN' && priceType === 'LIMIT' && (
                    side === 'BUY' && price < currentSymbol.price ? (
                      <div className="text-[11px] text-sky-300 bg-sky-500/10 p-2 rounded border border-sky-500/20 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>【買盤低接排隊】買進限價 (${price}) 低於當前市價 (${currentSymbol.price})，送出後將於委託簿排隊等待下殺撮合，不會立即成交。</span>
                      </div>
                    ) : side === 'SELL' && price > currentSymbol.price ? (
                      <div className="text-[11px] text-sky-300 bg-sky-500/10 p-2 rounded border border-sky-500/20 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>【賣盤高掛排隊】賣出限價 (${price}) 高於當前市價 (${currentSymbol.price})，送出後將於委託簿排隊等待拉升撮合，不會立即成交。</span>
                      </div>
                    ) : null
                  )}
                </div>

                {/* 大尺寸送出確認按鈕 (元大經典醒目送出委託) */}
                <button
                  type="submit"
                  disabled={isInsufficientFund || isInsufficientShares || (priceType === 'MARKET' && !session.canTradeMarketOrder)}
                  className={`w-full py-3.5 rounded-xl font-black text-sm tracking-wider text-white shadow-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                    side === 'BUY'
                      ? isAsiaTheme
                        ? 'bg-rose-600 hover:bg-rose-500'
                        : 'bg-emerald-600 hover:bg-emerald-500'
                      : isAsiaTheme
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {priceType === 'MARKET' && !session.canTradeMarketOrder
                    ? '休市期間禁止市價單 (請改選限價預約)'
                    : session.status !== 'OPEN'
                    ? `確認送出預約掛單 (${side === 'BUY' ? '買進' : '賣出'} ${currentSymbol.symbol} ${quantityMode === 'LOT' ? `${quantity}張` : `${quantity}股`} @ ${priceType === 'MARKET' ? '市價' : `$${price}`})`
                    : (side === 'BUY' && price < currentSymbol.price) || (side === 'SELL' && price > currentSymbol.price)
                    ? `確認送出排隊委託 (${side === 'BUY' ? '買進' : '賣出'} ${currentSymbol.symbol} ${quantityMode === 'LOT' ? `${quantity}張` : `${quantity}股`} @ $${price})`
                    : `確認送出逐筆委託 (${side === 'BUY' ? '買進' : '賣出'} ${currentSymbol.symbol} ${quantityMode === 'LOT' ? `${quantity}張` : `${quantity}股`} @ ${priceType === 'MARKET' ? '市價' : `$${price}`})`}
                </button>
              </form>

              {/* 右側：即時五檔報價與標的部位速查 (佔 5 格) */}
              <div className="lg:col-span-5 space-y-4">
                
                {/* 模擬即時五檔盤 (點擊價格直接代入下單) */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4">
                  <div className="flex items-center justify-between text-xs text-slate-300 font-bold mb-3">
                    <span className="flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
                      模擬最佳五檔買賣報價
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal">點擊價格快速帶入</span>
                  </div>

                  <div className="space-y-1 font-mono text-xs">
                    {/* 賣五檔 (由高至低) */}
                    {depthQuotes.asks.map((a, idx) => (
                      <div
                        key={`ask-${idx}`}
                        onClick={() => {
                          setPriceType('LIMIT');
                          setPrice(a.price);
                        }}
                        className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#2a2e39] cursor-pointer transition-colors"
                      >
                        <span className="text-slate-400 text-[11px]">賣 {5 - idx}</span>
                        <span className="text-slate-400 text-[11px]">{a.vol}張</span>
                        <span className={`font-bold ${isGreenUp ? 'text-rose-400' : 'text-emerald-400'}`}>
                          ${a.price.toFixed(2)}
                        </span>
                      </div>
                    ))}

                    {/* 當前最新價分割線 */}
                    <div className="py-1 px-2 my-1 bg-[#131722] rounded border border-[#2a2e39] flex items-center justify-between text-white font-bold">
                      <span className="text-xs text-slate-400 font-sans">最新成交</span>
                      <span className="text-sm font-extrabold text-amber-400">${currentSymbol.price.toFixed(2)}</span>
                      <span className="text-xs text-slate-400">{currentSymbol.volume24h || '1,280張'}</span>
                    </div>

                    {/* 買五檔 (由高至低) */}
                    {depthQuotes.bids.map((b, idx) => (
                      <div
                        key={`bid-${idx}`}
                        onClick={() => {
                          setPriceType('LIMIT');
                          setPrice(b.price);
                        }}
                        className="flex items-center justify-between py-1 px-2 rounded hover:bg-[#2a2e39] cursor-pointer transition-colors"
                      >
                        <span className={`font-bold ${isGreenUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ${b.price.toFixed(2)}
                        </span>
                        <span className="text-slate-400 text-[11px]">{b.vol}張</span>
                        <span className="text-slate-400 text-[11px]">買 {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 當前標的庫存概覽卡 */}
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4 space-y-3">
                  <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>當前標的持股狀態</span>
                    <span className="text-blue-400 font-mono">{currentSymbol.symbol}</span>
                  </div>

                  {heldShares > 0 && heldPosition ? (
                    <div className="bg-[#131722] p-3 rounded-lg border border-[#2a2e39] space-y-2 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>持股數量</span>
                        <span className="text-white font-bold font-mono">
                          {heldShares.toLocaleString()} 股 ({heldLots}張)
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>平均成本</span>
                        <span className="text-white font-mono">${heldPosition.avgCostPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>未實現損益</span>
                        <span className={`font-mono font-bold ${
                          heldPosition.unrealizedProfit >= 0
                            ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                            : isGreenUp ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {heldPosition.unrealizedProfit >= 0 ? '+' : ''}${heldPosition.unrealizedProfit.toLocaleString()}
                          ({heldPosition.unrealizedProfitPercent}%)
                        </span>
                      </div>
                      <div className="pt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSide('SELL');
                            setQuantityMode('LOT');
                            setQuantity(heldLots > 0 ? heldLots : 1);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 font-semibold"
                        >
                          代入賣出下單
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClosePosition(currentSymbol.symbol, heldShares)}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-semibold"
                        >
                          市價平倉
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-slate-400 bg-[#131722] rounded-lg border border-[#2a2e39]">
                      目前未持有 {currentSymbol.name} ({currentSymbol.symbol}) 股票
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 庫存持倉 (POSITIONS) */}
          {activeTab === 'POSITIONS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  庫存證券部位 ({account.positions.length})
                </h3>
                <div className="text-xs text-slate-400 font-mono">
                  持股市值: ${totalMarketValue.toLocaleString()}
                </div>
              </div>

              {account.positions.length === 0 ? (
                <div className="text-center py-16 bg-[#1e222d] rounded-xl border border-[#2a2e39] text-slate-400 text-xs">
                  目前帳戶無任何庫存部位，請前往「下單交易」建立部位
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a2e39] bg-[#171b26] text-slate-400 font-semibold">
                        <th className="py-3 px-4">股票代號 / 名稱</th>
                        <th className="py-3 px-3">持有數量</th>
                        <th className="py-3 px-3">買進均價</th>
                        <th className="py-3 px-3">當前市價</th>
                        <th className="py-3 px-3">持股市值</th>
                        <th className="py-3 px-3">未實現損益</th>
                        <th className="py-3 px-3">報酬率</th>
                        <th className="py-3 px-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39] font-mono">
                      {account.positions.map((pos) => {
                        const isProf = pos.unrealizedProfit >= 0;
                        const pnlColor = isProf
                          ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                          : isGreenUp ? 'text-rose-400' : 'text-emerald-400';

                        return (
                          <tr key={pos.symbol} className="hover:bg-[#1e222d] transition-colors">
                            <td className="py-3.5 px-4 font-sans font-bold text-white">
                              {pos.symbol} <span className="text-slate-400 font-normal">{pos.name}</span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-200">
                              {pos.shares.toLocaleString()} 股 ({Math.floor(pos.shares / 1000)}張)
                            </td>
                            <td className="py-3.5 px-3 text-slate-300">${pos.avgCostPrice.toFixed(2)}</td>
                            <td className="py-3.5 px-3 font-bold text-white">${pos.currentPrice.toFixed(2)}</td>
                            <td className="py-3.5 px-3 text-slate-200">${(pos.shares * pos.currentPrice).toLocaleString()}</td>
                            <td className={`py-3.5 px-3 font-bold ${pnlColor}`}>
                              {isProf ? '+' : ''}${pos.unrealizedProfit.toLocaleString()}
                            </td>
                            <td className={`py-3.5 px-3 font-bold ${pnlColor}`}>
                              {isProf ? '+' : ''}{pos.unrealizedProfitPercent}%
                            </td>
                            <td className="py-3.5 px-4 text-right font-sans">
                              <button
                                onClick={() => handleClosePosition(pos.symbol, pos.shares)}
                                className="px-3 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition-colors font-semibold"
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

          {/* TAB 3: 委託回報 (ORDERS / 撤單) */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white">委託單回報清單</h3>
                  <div className="flex items-center bg-[#1e222d] p-0.5 rounded-lg border border-[#2a2e39] text-xs">
                    {(['ALL', 'PENDING', 'FILLED', 'CANCELLED'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setOrderFilter(filter)}
                        className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                          orderFilter === filter
                            ? 'bg-blue-600 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {filter === 'ALL' && '全部'}
                        {filter === 'PENDING' && `委託中 (${pendingOrdersCount})`}
                        {filter === 'FILLED' && '已成交'}
                        {filter === 'CANCELLED' && '已撤銷'}
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
                        type: res.success ? 'success' : 'error',
                        text: res.message,
                      });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="以當前盤面行情觸發排隊單撮合檢核"
                  >
                    <span>⚡ 盤面觸價撮合測試</span>
                  </button>

                  {pendingOrdersCount > 0 && (
                    <button
                      onClick={handleCancelAll}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors"
                    >
                      全部撤單 ({pendingOrdersCount})
                    </button>
                  )}
                </div>
              </div>

              {account.orders.length === 0 ? (
                <div className="text-center py-16 bg-[#1e222d] rounded-xl border border-[#2a2e39] text-slate-400 text-xs">
                  目前尚無任何委託掛單紀錄
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a2e39] bg-[#171b26] text-slate-400 font-semibold">
                        <th className="py-3 px-4">時間</th>
                        <th className="py-3 px-3">股票標的</th>
                        <th className="py-3 px-3">買賣別</th>
                        <th className="py-3 px-3">交易別</th>
                        <th className="py-3 px-3">委託價格</th>
                        <th className="py-3 px-3">委託股數</th>
                        <th className="py-3 px-3">撮合狀態 / 證交說明</th>
                        <th className="py-3 px-4 text-right">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39] font-mono">
                      {account.orders
                        .filter((o) => orderFilter === 'ALL' || o.status === orderFilter)
                        .map((order) => (
                          <tr key={order.id} className="hover:bg-[#1e222d] transition-colors">
                            <td className="py-3.5 px-4 text-slate-400 font-sans">
                              {new Date(order.timestamp).toLocaleTimeString('zh-TW')}
                            </td>
                            <td className="py-3.5 px-3 font-sans font-bold text-white">
                              {order.symbol} <span className="text-slate-400 font-normal">{order.name}</span>
                            </td>
                            <td className="py-3.5 px-3">
                              <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                                order.side === 'BUY'
                                  ? isAsiaTheme ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                                  : isAsiaTheme ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                              }`}>
                                {order.side === 'BUY' ? '買進' : '賣出'}
                              </span>
                            </td>
                            <td className="py-3.5 px-3 text-slate-300 font-sans">
                              {order.tradeType === 'COMMON' && '現股'}
                              {order.tradeType === 'MARGIN_BUY' && '融資'}
                              {order.tradeType === 'MARGIN_SELL' && '融券'}
                              {order.tradeType === 'ODD_LOT' && '零股'}
                            </td>
                            <td className="py-3.5 px-3 font-bold text-white">
                              {order.priceType === 'MARKET' ? '市價' : `$${order.orderPrice.toFixed(2)}`}
                            </td>
                            <td className="py-3.5 px-3 text-slate-200">
                              {order.shares.toLocaleString()} 股 ({Math.floor(order.shares / 1000)}張)
                            </td>
                            <td className="py-3.5 px-3 font-sans">
                              {order.status === 'PENDING' && (
                                <div>
                                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-xs">
                                    {order.isPreOrder ? '開盤預約中' : '委託排隊中'}
                                  </span>
                                  {order.note && (
                                    <div className="text-[10px] text-slate-400 mt-1 font-mono max-w-[220px] truncate" title={order.note}>
                                      {order.note}
                                    </div>
                                  )}
                                </div>
                              )}
                              {order.status === 'FILLED' && (
                                <div>
                                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold text-xs">
                                    完全成交
                                  </span>
                                  {order.note && (
                                    <div className="text-[10px] text-slate-400 mt-1 font-mono max-w-[220px] truncate" title={order.note}>
                                      {order.note}
                                    </div>
                                  )}
                                </div>
                              )}
                              {order.status === 'CANCELLED' && (
                                <div>
                                  <span className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-400 text-xs">
                                    已撤銷
                                  </span>
                                  {order.note && (
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-mono max-w-[220px] truncate" title={order.note}>
                                      {order.note}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-sans">
                              {order.status === 'PENDING' ? (
                                <button
                                  onClick={() => handleCancelOrder(order.id)}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs transition-colors font-bold"
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

          {/* TAB 4: 成交紀錄 (HISTORY) */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">歷史成交明細紀錄 ({account.history.length})</h3>

              {account.history.length === 0 ? (
                <div className="text-center py-16 bg-[#1e222d] rounded-xl border border-[#2a2e39] text-slate-400 text-xs">
                  目前帳戶暫無任何成交紀錄
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#2a2e39] bg-[#171b26] text-slate-400 font-semibold">
                        <th className="py-3 px-4">成交時間</th>
                        <th className="py-3 px-3">股票標的</th>
                        <th className="py-3 px-3">買賣別</th>
                        <th className="py-3 px-3">成交價格</th>
                        <th className="py-3 px-3">成交股數</th>
                        <th className="py-3 px-3">成交總值</th>
                        <th className="py-3 px-3">手續費</th>
                        <th className="py-3 px-3">證交稅</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2a2e39] font-mono">
                      {account.history.map((h) => (
                        <tr key={h.id} className="hover:bg-[#1e222d] transition-colors">
                          <td className="py-3 px-4 text-slate-400 font-sans">
                            {new Date(h.timestamp).toLocaleString('zh-TW')}
                          </td>
                          <td className="py-3 px-3 font-sans font-bold text-white">{h.symbol}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded font-bold text-xs ${
                              h.type === 'BUY'
                                ? isAsiaTheme ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                                : isAsiaTheme ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {h.type === 'BUY' ? '買進' : '賣出'}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-bold text-white">${h.price.toFixed(2)}</td>
                          <td className="py-3 px-3 text-slate-200">{h.shares.toLocaleString()} 股</td>
                          <td className="py-3 px-3 text-white font-bold">${h.amount.toLocaleString()}</td>
                          <td className="py-3 px-3 text-slate-300">${h.fee.toLocaleString()}</td>
                          <td className="py-3 px-3 text-slate-300">${(h.tax || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: 帳戶資產 (ASSETS) */}
          {activeTab === 'ASSETS' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4">
                  <div className="text-xs text-slate-400">總資產淨值 (權益數)</div>
                  <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${netEquity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className={`text-xs mt-1 font-bold ${
                    isOverallProfit
                      ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                      : isGreenUp ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {isOverallProfit ? '+' : ''}{totalProfitPercent}% 累計報酬率
                  </div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4">
                  <div className="text-xs text-slate-400">可用現金餘額</div>
                  <div className="text-2xl font-extrabold text-blue-400 mt-1 font-mono">
                    ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">未動用保證金</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4">
                  <div className="text-xs text-slate-400">持股市值</div>
                  <div className="text-2xl font-extrabold text-white mt-1 font-mono">
                    ${totalMarketValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">{account.positions.length} 檔持股部位</div>
                </div>

                <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-4">
                  <div className="text-xs text-slate-400">未實現損益總計</div>
                  <div className={`text-2xl font-extrabold mt-1 font-mono ${
                    totalProfit >= 0
                      ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                      : isGreenUp ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">本金 ${account.initialCapital.toLocaleString()}</div>
                </div>
              </div>

              {/* 重置與規則說明卡 */}
              <div className="bg-[#1e222d] border border-[#2a2e39] rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-emerald-400" />
                    模擬交易規則與費率說明
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    遵循台灣證券交易所（TWSE）撮合規則。券商手續費 0.1425%（最低 $20），證券交易稅 0.3%（賣出時扣除）。
                  </p>
                </div>
                <button
                  onClick={handleResetAccount}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold transition-colors whitespace-nowrap"
                >
                  重置模擬本金 ($1,000,000)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
