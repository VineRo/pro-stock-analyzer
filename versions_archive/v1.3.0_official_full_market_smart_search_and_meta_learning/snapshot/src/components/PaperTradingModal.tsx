import React, { useState, useEffect } from 'react';
import { X, Wallet, RefreshCw, History } from 'lucide-react';
import { StockSymbol, PaperAccount } from '../types/stock';
import { PaperTradingService } from '../services/paperTradingService';

interface PaperTradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: StockSymbol;
  colorTheme: 'international' | 'asia';
}

export const PaperTradingModal: React.FC<PaperTradingModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
  colorTheme,
}) => {
  const [account, setAccount] = useState<PaperAccount>(PaperTradingService.getAccount());
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [shares, setShares] = useState<number>(10);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 依當前標的價格更新帳戶部位估值
      const updated = PaperTradingService.updatePrices({
        [currentSymbol.symbol]: currentSymbol.price,
      });
      setAccount(updated);
    }
  }, [isOpen, currentSymbol]);

  if (!isOpen) return null;

  const handleExecuteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);

    let res: { success: boolean; message: string };
    if (orderType === 'BUY') {
      res = PaperTradingService.buy(
        currentSymbol.symbol,
        currentSymbol.name,
        currentSymbol.price,
        shares,
        currentSymbol.currency
      );
    } else {
      res = PaperTradingService.sell(currentSymbol.symbol, currentSymbol.price, shares);
    }

    if (res.success) {
      setNotice({ type: 'success', text: res.message });
      setAccount(PaperTradingService.getAccount());
    } else {
      setNotice({ type: 'error', text: res.message });
    }
  };

  const handleClosePosition = (symbol: string, currentPrice: number, posShares: number) => {
    if (window.confirm(`確定要以現價 $${currentPrice} 全數平倉 ${posShares} 股嗎？`)) {
      const res = PaperTradingService.sell(symbol, currentPrice, posShares);
      if (res.success) {
        setNotice({ type: 'success', text: res.message });
        setAccount(PaperTradingService.getAccount());
      }
    }
  };

  const handleReset = () => {
    if (window.confirm('確定要將模擬帳戶重置回初始本金 $100,000 嗎？所有持倉與紀錄將歸零。')) {
      const reset = PaperTradingService.resetAccount();
      setAccount(reset);
      setNotice({ type: 'success', text: '模擬帳戶已成功重置！' });
    }
  };

  // 計算總資產 (現金 + 持倉市值)
  const totalPositionValue = account.positions.reduce((sum, p) => sum + p.shares * p.currentPrice, 0);
  const totalPortfolioValue = account.balance + totalPositionValue;
  const totalReturnPercent = Number((((totalPortfolioValue - account.initialCapital) / account.initialCapital) * 100).toFixed(2));
  const isGreenUp = colorTheme === 'international';
  const isProfit = totalReturnPercent >= 0;

  const currentHeld = account.positions.find((p) => p.symbol === currentSymbol.symbol)?.shares || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-pro-panel border border-pro-border rounded-xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden text-pro-text">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                模擬交易實戰帳戶 (Paper Trading)
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  虛擬零風險
                </span>
              </h2>
              <p className="text-xs text-pro-muted">磨練技術分析進出場紀律，驗證交易策略的最佳實盤模擬沙盒</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg border border-pro-border hover:bg-pro-border text-xs text-pro-muted hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重置帳戶
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-pro-border text-pro-muted hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 帳戶總覽橫幅 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 border-b border-pro-border bg-pro-bg/40">
          <div className="bg-pro-bg border border-pro-border rounded-xl p-3.5">
            <div className="text-xs text-pro-muted">帳戶總資產 (淨值)</div>
            <div className="text-xl font-bold text-white mt-1">
              ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`text-xs mt-0.5 font-semibold ${isProfit ? isGreenUp ? 'text-emerald-400' : 'text-rose-400' : isGreenUp ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isProfit ? '+' : ''}{totalReturnPercent}% (總報酬)
            </div>
          </div>

          <div className="bg-pro-bg border border-pro-border rounded-xl p-3.5">
            <div className="text-xs text-pro-muted">可用現金餘額</div>
            <div className="text-xl font-bold text-white mt-1">
              ${account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-pro-muted mt-0.5">未動用保證金</div>
          </div>

          <div className="bg-pro-bg border border-pro-border rounded-xl p-3.5">
            <div className="text-xs text-pro-muted">持有證券市值</div>
            <div className="text-xl font-bold text-blue-400 mt-1">
              ${totalPositionValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-pro-muted mt-0.5">{account.positions.length} 檔持倉部位</div>
          </div>

          <div className="bg-pro-bg border border-pro-border rounded-xl p-3.5">
            <div className="text-xs text-pro-muted">當前標的持股</div>
            <div className="text-xl font-bold text-yellow-400 mt-1">
              {currentHeld} 股
            </div>
            <div className="text-[11px] text-pro-muted mt-0.5">{currentSymbol.symbol} 現價 ${currentSymbol.price}</div>
          </div>
        </div>

        {/* 提示訊息 */}
        {notice && (
          <div className={`px-6 py-2.5 text-xs flex items-center justify-between ${
            notice.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-b border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-b border-rose-500/20'
          }`}>
            <span>{notice.text}</span>
            <button onClick={() => setNotice(null)} className="text-xs opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {/* 內容區域：左側下單卡片 + 右側部位與紀錄 */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* 下單卡片 */}
          <form onSubmit={handleExecuteOrder} className="w-full md:w-80 p-5 border-r border-pro-border bg-pro-bg/20 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>快速下單交易</span>
                <span className="text-blue-400">{currentSymbol.symbol}</span>
              </div>

              {/* 買賣方向切換 */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-pro-bg rounded-lg border border-pro-border text-xs">
                <button
                  type="button"
                  onClick={() => setOrderType('BUY')}
                  className={`py-1.5 rounded font-bold transition-all ${
                    orderType === 'BUY'
                      ? isGreenUp ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      : 'text-pro-muted hover:text-white'
                  }`}
                >
                  買進做多 (BUY)
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('SELL')}
                  className={`py-1.5 rounded font-bold transition-all ${
                    orderType === 'SELL'
                      ? isGreenUp ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                      : 'text-pro-muted hover:text-white'
                  }`}
                >
                  賣出平倉 (SELL)
                </button>
              </div>

              <div>
                <label className="block text-[11px] text-pro-muted mb-1">成交市價 (USD/TWD)</label>
                <input
                  type="text"
                  disabled
                  value={`$${currentSymbol.price}`}
                  className="w-full bg-pro-bg border border-pro-border rounded-lg px-3 py-1.5 text-xs text-pro-muted"
                />
              </div>

              <div>
                <label className="block text-[11px] text-pro-muted mb-1">委託股數 (Shares)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={shares}
                  onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-pro-bg border border-pro-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <div className="flex gap-1.5 mt-1.5">
                  {[10, 50, 100, 500].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setShares(num)}
                      className="px-2 py-0.5 rounded bg-pro-bg border border-pro-border text-[10px] text-pro-muted hover:text-white"
                    >
                      {num}股
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-pro-bg border border-pro-border text-xs space-y-1.5">
                <div className="flex justify-between text-pro-muted text-[11px]">
                  <span>預估成交總值:</span>
                  <span className="text-white font-medium">${(currentSymbol.price * shares).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-pro-muted text-[11px]">
                  <span>手續費 (0.15%):</span>
                  <span className="text-white">${(currentSymbol.price * shares * 0.0015).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className={`w-full py-2.5 rounded-lg text-xs font-bold text-white transition-all mt-4 ${
                orderType === 'BUY'
                  ? isGreenUp ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  : isGreenUp ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              確認送出 {orderType === 'BUY' ? '買進' : '賣出'} 委託單
            </button>
          </form>

          {/* 右側部位列表與成交紀錄 */}
          <div className="flex-1 p-5 overflow-y-auto space-y-5">
            {/* 持倉部位清單 */}
            <div>
              <div className="text-xs font-bold text-white mb-2.5 flex items-center justify-between">
                <span>目前持倉部位 ({account.positions.length})</span>
                <span className="text-[11px] font-normal text-pro-muted">浮動損益即時結算</span>
              </div>

              {account.positions.length === 0 ? (
                <div className="text-center py-6 bg-pro-bg rounded-xl border border-pro-border text-xs text-pro-muted">
                  目前尚未持有任何股票部位，可利用左側面板立即模擬建倉
                </div>
              ) : (
                <div className="space-y-2">
                  {account.positions.map((pos) => {
                    const isPosProfit = pos.unrealizedProfit >= 0;
                    const pnlColor = isPosProfit
                      ? isGreenUp ? 'text-emerald-400' : 'text-rose-400'
                      : isGreenUp ? 'text-rose-400' : 'text-emerald-400';

                    return (
                      <div
                        key={pos.symbol}
                        className="flex items-center justify-between p-3 rounded-lg bg-pro-bg border border-pro-border text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{pos.symbol} • {pos.name}</div>
                          <div className="text-[11px] text-pro-muted mt-0.5">
                            持股 {pos.shares} 股 • 成本 ${pos.avgCostPrice} • 現價 ${pos.currentPrice}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className={`font-bold ${pnlColor}`}>
                              {isPosProfit ? '+' : ''}${pos.unrealizedProfit.toLocaleString()}
                            </div>
                            <div className={`text-[10px] ${pnlColor}`}>
                              {isPosProfit ? '+' : ''}{pos.unrealizedProfitPercent}%
                            </div>
                          </div>

                          <button
                            onClick={() => handleClosePosition(pos.symbol, pos.currentPrice, pos.shares)}
                            className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] transition-colors"
                          >
                            平倉
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 最近交易紀錄 */}
            <div>
              <div className="text-xs font-bold text-white mb-2.5 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-400" />
                <span>最近成交明細</span>
              </div>

              <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                {account.history.length === 0 ? (
                  <div className="text-center py-4 text-xs text-pro-muted">暫無交易紀錄</div>
                ) : (
                  account.history.slice(0, 10).map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between p-2 rounded bg-pro-bg/50 border border-pro-border/60 text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          h.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {h.type}
                        </span>
                        <span className="text-white font-medium">{h.symbol}</span>
                        <span className="text-pro-muted">{new Date(h.timestamp).toLocaleTimeString('zh-TW')}</span>
                      </div>
                      <div className="text-white">
                        {h.shares} 股 @ ${h.price} (總額: ${h.amount.toLocaleString()})
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
