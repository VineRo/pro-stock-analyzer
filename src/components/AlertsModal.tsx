import React, { useState, useEffect } from 'react';
import { X, Bell, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { StockAlert, StockSymbol } from '../types/stock';
import { AlertService } from '../services/alertService';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSymbol: StockSymbol;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  currentSymbol,
}) => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [type, setType] = useState<StockAlert['type']>('price_above');
  const [threshold, setThreshold] = useState<string>(currentSymbol.price.toString());
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (isOpen) {
      setAlerts(AlertService.getAlerts());
      setThreshold(currentSymbol.price.toString());
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, [isOpen, currentSymbol]);

  if (!isOpen) return null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(threshold);
    if (isNaN(val) || val <= 0) return;

    AlertService.addAlert({
      symbol: currentSymbol.symbol,
      name: currentSymbol.name,
      type,
      threshold: val,
    });

    setAlerts(AlertService.getAlerts());
  };

  const handleToggle = (id: string) => {
    AlertService.toggleAlert(id);
    setAlerts(AlertService.getAlerts());
  };

  const handleDelete = (id: string) => {
    AlertService.removeAlert(id);
    setAlerts(AlertService.getAlerts());
  };

  const requestNotification = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then((p) => {
        setPermission(p);
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-pro-panel border border-pro-border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-pro-text">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pro-border bg-pro-bg/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">智慧即時預警通知 (Alerts)</h2>
              <p className="text-xs text-pro-muted">當價格或指標達到指定條件時發送桌面即時提醒</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-pro-border text-pro-muted hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 系統通知權限提示 */}
        {permission !== 'granted' && (
          <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2.5 flex items-center justify-between text-xs text-blue-300">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
              啟用系統桌面通知以獲得最佳即時預警體驗
            </span>
            <button
              onClick={requestNotification}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors"
            >
              啟用通知
            </button>
          </div>
        )}

        {/* 新增預警表單 */}
        <form onSubmit={handleCreate} className="p-6 border-b border-pro-border bg-pro-bg/30">
          <div className="text-xs font-semibold text-white mb-2">
            為 <span className="text-blue-400 font-bold">{currentSymbol.name} ({currentSymbol.symbol})</span> 設定新預警：
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-[11px] text-pro-muted mb-1">觸發條件</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-pro-bg border border-pro-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="price_above">價格突破大於等於 (&gt;=)</option>
                <option value="price_below">價格跌破小於等於 (&lt;=)</option>
                <option value="rsi_overbought">RSI 超買預警 (&gt;= 70)</option>
                <option value="rsi_oversold">RSI 超賣預警 (&lt;= 30)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-pro-muted mb-1">預警數值 (現價 ${currentSymbol.price})</label>
              <input
                type="number"
                step="any"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="w-full bg-pro-bg border border-pro-border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                placeholder="例如: 240.5"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            建立預警條件
          </button>
        </form>

        {/* 既有預警列表 */}
        <div className="max-h-60 overflow-y-auto p-6 space-y-2.5">
          <div className="text-xs font-medium text-pro-muted mb-1 flex items-center justify-between">
            <span>已配置預警 ({alerts.length})</span>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-6 text-pro-muted text-xs">
              尚未設定任何價格預警條件
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between p-3 rounded-lg border text-xs transition-colors ${
                  a.active
                    ? 'bg-pro-bg border-pro-border text-white'
                    : 'bg-pro-bg/40 border-pro-border/50 text-pro-muted line-through'
                }`}
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(a.id)}
                    className={`p-1 rounded ${a.active ? 'text-emerald-400 hover:text-emerald-300' : 'text-pro-muted'}`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                  <div>
                    <span className="font-semibold mr-1.5">{a.symbol}</span>
                    <span>
                      {a.type === 'price_above'
                        ? `突破 $${a.threshold}`
                        : a.type === 'price_below'
                        ? `跌破 $${a.threshold}`
                        : a.type === 'rsi_overbought'
                        ? `RSI >= ${a.threshold} (超買)`
                        : `RSI <= ${a.threshold} (超賣)`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-1 hover:bg-rose-500/10 text-pro-muted hover:text-rose-400 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
